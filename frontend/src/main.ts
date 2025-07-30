import "./style.css";
import "./draw";
import {
  BASE_ENTITY_COMPONENT_DEF,
  type ClientMessage,
  type Packet,
  mergeDeep,
  Vector2,
} from "core";
import { draw } from "./draw";
import {
  addComponent,
  destroyEntity,
  getComponent,
  removeComponent,
  runQuery,
} from "./ecsProvider";
import { inputMap } from "./input";

let websocket: WebSocket;
let playerEntity: number | undefined;
let timeUpdateReceived = Date.now();

// Helper function to reconstruct Vector2 instances from serialized data
const reconstructVector2InComponent = (obj: any): any => {
  if (obj && typeof obj === 'object') {
    if (obj._isVector2 || (typeof obj.x === 'number' && typeof obj.y === 'number' && (obj.position || obj.velocity || Object.keys(obj).length === 2))) {
      return new Vector2(obj.x, obj.y);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => reconstructVector2InComponent(item));
    }
    
    const reconstructed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'position' || key === 'velocity') {
        // These should be Vector2 instances
        if (value && typeof value === 'object' && typeof (value as any).x === 'number' && typeof (value as any).y === 'number') {
          reconstructed[key] = new Vector2((value as any).x, (value as any).y);
        } else {
          reconstructed[key] = value;
        }
      } else if (key === 'points' && Array.isArray(value)) {
        // Asteroid points should be Vector2 array
        reconstructed[key] = value.map(point => {
          if (point && typeof point === 'object' && typeof point.x === 'number' && typeof point.y === 'number') {
            return new Vector2(point.x, point.y);
          }
          return point;
        });
      } else {
        reconstructed[key] = reconstructVector2InComponent(value);
      }
    }
    return reconstructed;
  }
  
  return obj;
};

const mergePacket = (packet: Packet) => {
  for (const [entity, components] of Object.entries(packet)) {
    if (components === null) {
      destroyEntity(Number.parseInt(entity));
      continue;
    }
    for (const [type, component] of Object.entries(components)) {
      if (component === null) {
        removeComponent(Number.parseInt(entity), { type });
        continue;
      }
      component.type = type;

      // Reconstruct Vector2 instances in the component
      const reconstructedComponent = reconstructVector2InComponent(component);

      const existingComponent = getComponent(Number(entity), reconstructedComponent);
      if (existingComponent === undefined) {
        addComponent(Number(entity), reconstructedComponent);
        continue;
      }

      if (Number.parseInt(entity) === playerEntity && type === "baseEntity") {
        continue;
      }
      mergeDeep(existingComponent, reconstructedComponent);
    }
  }
};

const receiveServerUpdate = (packet: any) => {
  timeUpdateReceived = Date.now();
  mergePacket(packet);
};

const receiveMessage = (message: any) => {
  const messageData = JSON.parse(message.data, (key, value) => {
    // Deserialize Vector2 objects from network data
    if (value && typeof value === 'object' && value._isVector2) {
      return new Vector2(value.x, value.y);
    }
    return value;
  });

  if (messageData.type === "initialization") {
    playerEntity = messageData.playerEntity;
    receiveServerUpdate(messageData.catchupPacket);
  } else if (messageData.type === "update") {
    receiveServerUpdate(messageData.packet);
  }
};

// Function to connect to the WebSocket
const connectWebSocket = () => {
  websocket = new WebSocket("ws://localhost:3000");

  websocket.addEventListener("open", (_event) => {
    console.log("Connected to WebSocket server");
  });

  websocket.addEventListener("message", receiveMessage);

  websocket.addEventListener("close", (event) => {
    console.log("WebSocket connection closed:", event);
    // Attempt to reconnect after a delay
    setTimeout(connectWebSocket, 3000); // Reconnect after 3 seconds
  });

  websocket.addEventListener("error", (error) => {
    console.error("WebSocket error:", error);
  });
};

// Initial connection
connectWebSocket();

let mouseClicked = false;

// Mouse event listeners
window.addEventListener("mousedown", () => {
  mouseClicked = true;
});

window.addEventListener("mouseup", () => {
  mouseClicked = false;
});

window.addEventListener("mousemove", (event) => {
  window.mouseX = event.clientX;
  window.mouseY = event.clientY;
});

// Prevent right-click context menu
window.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

export const CLIENT_BASE_ENTITY_COMPONENT_DEF: {
  type: "clientBaseEntity";
  position: Vector2;
  velocity: Vector2;
} = {
  type: "clientBaseEntity",
  position: Vector2.zero(),
  velocity: Vector2.zero(),
};

let shootCooldown = 0;
const SHOOT_COOLDOWN_TIME = 0.2;

const ROTATION_SPEED = 3; // radians per second
const THRUST_FORCE = 400; // Reduced for better control
let lastFrameTime = Date.now();

let canvas: HTMLCanvasElement;
let fpsCounter: HTMLElement;
let frameCount = 0;
let lastFPSUpdate = Date.now();
let currentFPS = 0;

const update = () => {
  const frameTime = Date.now();
  const deltaTime = (frameTime - lastFrameTime) / 1000;
  lastFrameTime = frameTime;

  frameCount++;
  if (frameTime - lastFPSUpdate >= 1000) {
    currentFPS = Math.round((frameCount * 1000) / (frameTime - lastFPSUpdate));
    fpsCounter.textContent = `${currentFPS} FPS`;
    frameCount = 0;
    lastFPSUpdate = frameTime;
  }

  if (playerEntity === undefined) {
    window.requestAnimationFrame(update);
    return;
  }

  const rawInterpolationPercent = (Date.now() - timeUpdateReceived) / 1000;
  const interpolationPercent = Math.cbrt(rawInterpolationPercent);
  runQuery([BASE_ENTITY_COMPONENT_DEF], (entity, [serverEntity]) => {
    let clientEntity = getComponent(entity, CLIENT_BASE_ENTITY_COMPONENT_DEF);
    if (clientEntity === undefined) {
      addComponent(entity, CLIENT_BASE_ENTITY_COMPONENT_DEF);
      clientEntity = getComponent(entity, CLIENT_BASE_ENTITY_COMPONENT_DEF);
      if (clientEntity === undefined) {
        throw new Error("Client entity not found");
      }

      clientEntity.position.setFrom(serverEntity.position);
    }
    if (entity === playerEntity) {
      return;
    }

    // Interpolate position towards server position
    const positionDelta = serverEntity.position.subtract(clientEntity.position);
    clientEntity.position.addMut(positionDelta.multiply(interpolationPercent));
  });

  // updateCollisionSystem(ecsInstance);
  const clientBaseEntity = getComponent(
    playerEntity,
    CLIENT_BASE_ENTITY_COMPONENT_DEF,
  );

  const player = getComponent(playerEntity, BASE_ENTITY_COMPONENT_DEF);

  if (clientBaseEntity && player) {
    // Ensure velocity is valid
    if (typeof clientBaseEntity.velocity.x !== "number") clientBaseEntity.velocity.x = 0;
    if (typeof clientBaseEntity.velocity.y !== "number") clientBaseEntity.velocity.y = 0;

    // Tank controls: A/D for rotation
    if (inputMap.d) {
      player.angle += ROTATION_SPEED * deltaTime;
    }
    if (inputMap.a) {
      player.angle -= ROTATION_SPEED * deltaTime;
    }

    // W/S for forward/backward thrust in the direction we're facing
    if (inputMap.w) {
      // Thrust forward
      const thrustDirection = Vector2.fromPolar(player.angle, THRUST_FORCE * deltaTime);
      clientBaseEntity.velocity.addMut(thrustDirection);
    }
    if (inputMap.s) {
      // Thrust backward
      const thrustDirection = Vector2.fromPolar(player.angle, -THRUST_FORCE * deltaTime);
      clientBaseEntity.velocity.addMut(thrustDirection);
    }

    // Update position based on velocity
    const movement = clientBaseEntity.velocity.multiply(deltaTime);
    clientBaseEntity.position.addMut(movement);

    // Apply very light damping to velocity for space-like physics
    const dampingFactor = Math.pow(0.995, deltaTime * 60); // Consistent regardless of framerate
    clientBaseEntity.velocity.multiplyMut(dampingFactor);

    // Send player position, angle, and velocity update for better sync
    const moveMessage = {
      type: "move",
      position: clientBaseEntity.position.toObject(),
      velocity: clientBaseEntity.velocity.toObject(),
      angle: player.angle,
    };
    
    // Serialize Vector2 objects for network transmission
    const serializedMessage = JSON.stringify(moveMessage, (key, value) => {
      if (value instanceof Vector2) {
        return { x: value.x, y: value.y, _isVector2: true };
      }
      return value;
    });
    websocket.send(serializedMessage);

    // Handle shooting - now shoots in the direction player is facing
    if (shootCooldown > 0) {
      shootCooldown -= deltaTime;
    }

    if (mouseClicked && shootCooldown <= 0) {
      // Shoot in the direction the player is facing
      const shootDistance = 1000; // How far ahead to shoot
      const shootDirection = Vector2.fromPolar(player.angle, shootDistance);
      const targetPosition = clientBaseEntity.position.add(shootDirection);
      
      const shootMessage = {
        type: "shoot",
        targetPosition: targetPosition.toObject(),
      };
      
      // Serialize Vector2 objects for network transmission
      const serializedShootMessage = JSON.stringify(shootMessage, (key, value) => {
        if (value instanceof Vector2) {
          return { x: value.x, y: value.y, _isVector2: true };
        }
        return value;
      });
      websocket.send(serializedShootMessage);
      shootCooldown = SHOOT_COOLDOWN_TIME;
    }
  }

  if (clientBaseEntity) {
    draw(clientBaseEntity.position);
  }
  window.requestAnimationFrame(update);
};

document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("canvas") as HTMLCanvasElement;
  fpsCounter = document.getElementById("fps-counter") as HTMLParagraphElement;
  window.requestAnimationFrame(update);
});

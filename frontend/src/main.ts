import "./style.css";
import "./draw";
import {
  POSITION_COMPONENT_DEF,
  VELOCITY_COMPONENT_DEF,
} from "../../core/collision";
import { provideECSInstanceFunctions } from "../../core/ecs";
import type { Packet } from "../../core/network";
import { mergeDeep } from "../../core/objectMerge";

import { draw } from "./draw";
import { inputMap, mouseClicked, mousePosition } from "./input";

export const {
  ecsInstance,

  createEntity,
  destroyEntity,

  addComponent,
  removeComponent,

  getComponent,
  queryComponents,

  runQuery,
} = provideECSInstanceFunctions({});

// Added shooting cooldown
let shootCooldown = 0;
const SHOOT_COOLDOWN_TIME = 100; // frames between shots

let playerEntity: number | undefined = undefined;
export const mergePacket = (packet: Packet) => {
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

      const existingComponent = getComponent(Number(entity), component);
      if (existingComponent === undefined) {
        addComponent(Number(entity), component);
        continue;
      }

      if (Number.parseInt(entity) === playerEntity && type === "position") {
        continue;
      }
      mergeDeep(existingComponent, component);
    }
  }
};

let timeUpdateReceived = Date.now();
const websocket = new WebSocket(`ws://${window.location.hostname}:3000`);
websocket.onopen = () => {
  console.log("Connected to WebSocket server");
};
websocket.onmessage = (event) => {
  timeUpdateReceived = Date.now();
  const messageObject = JSON.parse(event.data);
  switch (messageObject.type) {
    case "initialization":
      playerEntity = messageObject.playerEntity;
      mergePacket(messageObject.catchupPacket);
      break;
    case "update":
      mergePacket(messageObject.packet);
      break;

    default:
      console.log(messageObject);
  }
};
websocket.onerror = (error) => {
  console.error("WebSocket error:", error);
};
websocket.onclose = () => {
  console.log("Disconnected from WebSocket server");
};

export const CLIENT_POSITION_COMPONENT_DEF: {
  type: "clientPosition";
  x: number;
  y: number;
} = {
  type: "clientPosition",
  x: 0,
  y: 0,
};

const DAMPING_FORCE = 5;
const PLAYER_SPEED = 1000;
let lastFrameTime = Date.now();

const PLAYER_COMPONENT_DEF = {
  type: "player",
  shootCooldown: 30,
  currentCooldown: 0,
  isDead: false,
  respawnTime: 0,
  respawnDuration: 180,
} as const;

type PlayerComponent = typeof PLAYER_COMPONENT_DEF;

let deathOverlay: HTMLElement;
let respawnCountdown: HTMLElement;
const update = () => {
  const frameTime = Date.now();
  const deltaTime = (frameTime - lastFrameTime) / 1000;
  lastFrameTime = frameTime;

  if (playerEntity === undefined) {
    window.requestAnimationFrame(update);
    return;
  }

  // Check player state for death overlay
  const player = getComponent(playerEntity, PLAYER_COMPONENT_DEF) as
    | PlayerComponent
    | undefined;
  if (player) {
    if (player.isDead) {
      deathOverlay.classList.remove("hidden");
      const secondsLeft = Math.ceil(player.respawnTime / 60); // Convert frames to seconds
      respawnCountdown.textContent = secondsLeft.toString();

      // Don't process movement or shooting while dead
      draw(getComponent(playerEntity, CLIENT_POSITION_COMPONENT_DEF));
      window.requestAnimationFrame(update);
      return;
    }
    deathOverlay.classList.add("hidden");
  }

  const rawInterpolationPercent = (Date.now() - timeUpdateReceived) / 1000;
  const interpolationPercent = Math.cbrt(rawInterpolationPercent);
  runQuery([POSITION_COMPONENT_DEF], (entity, [serverPosition]) => {
    let clientPosition = getComponent(entity, CLIENT_POSITION_COMPONENT_DEF);
    if (clientPosition === undefined) {
      addComponent(entity, CLIENT_POSITION_COMPONENT_DEF);
      clientPosition = getComponent(entity, CLIENT_POSITION_COMPONENT_DEF);
      if (clientPosition === undefined) {
        throw new Error("Client position not found");
      }

      clientPosition.x = serverPosition.x;
      clientPosition.y = serverPosition.y;
    }
    if (entity === playerEntity) {
      return;
    }

    const dx = serverPosition.x - clientPosition.x;
    const dy = serverPosition.y - clientPosition.y;
    clientPosition.x += dx * interpolationPercent;
    clientPosition.y += dy * interpolationPercent;
  });

  // updateCollisionSystem(ecsInstance);
  const position = getComponent(playerEntity, CLIENT_POSITION_COMPONENT_DEF);
  const velocity = getComponent(playerEntity, VELOCITY_COMPONENT_DEF);

  if (
    position !== undefined &&
    velocity !== undefined &&
    player &&
    !player.isDead
  ) {
    // Reset velocity when dead
    if (player.isDead) {
      velocity.x = 0;
      velocity.y = 0;
    } else {
      if (inputMap.d) {
        velocity.x += PLAYER_SPEED * deltaTime;
      }
      if (inputMap.a) {
        velocity.x -= PLAYER_SPEED * deltaTime;
      }
      if (inputMap.s) {
        velocity.y += PLAYER_SPEED * deltaTime;
      }
      if (inputMap.w) {
        velocity.y -= PLAYER_SPEED * deltaTime;
      }

      velocity.x -= velocity.x * DAMPING_FORCE * deltaTime;
      velocity.y -= velocity.y * DAMPING_FORCE * deltaTime;

      position.x += velocity.x * deltaTime;
      position.y += velocity.y * deltaTime;

      // Send player position update
      const moveMessage = {
        type: "move",
        x: position.x,
        y: position.y,
      };
      websocket.send(JSON.stringify(moveMessage));

      // Calculate mouse position in world coordinates
      mousePosition.worldX = mousePosition.x - canvas.width / 2 + position.x;
      mousePosition.worldY = mousePosition.y - canvas.height / 2 + position.y;

      // Handle shooting
      if (shootCooldown > 0) {
        shootCooldown--;
      }

      if (mouseClicked && shootCooldown <= 0) {
        // Send shoot command to server
        const shootMessage = {
          type: "shoot",
          targetX: mousePosition.worldX,
          targetY: mousePosition.worldY,
        };
        websocket.send(JSON.stringify(shootMessage));
        shootCooldown = SHOOT_COOLDOWN_TIME;
      }
    }
  }
  draw(position);
  window.requestAnimationFrame(update);
};

// Get canvas for coordinate calculations
let canvas: HTMLCanvasElement;
document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("canvas") as HTMLCanvasElement;
  deathOverlay = document.getElementById("death-overlay") as HTMLElement;
  respawnCountdown = document.getElementById(
    "respawn-countdown",
  ) as HTMLElement;
  window.requestAnimationFrame(update);
});

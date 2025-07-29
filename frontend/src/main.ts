import "./style.css";
import "./draw";
import { POSITION_COMPONENT_DEF, VELOCITY_COMPONENT_DEF } from "core";

import { type Packet, mergeDeep } from "core";
import { PLAYER_COMPONENT_DEF } from "core";
import type { CreateItemMessage } from "core";
import { draw } from "./draw";
import {
  addComponent,
  destroyEntity,
  getComponent,
  removeComponent,
  runQuery,
} from "./ecsProvider";
import { inputMap, mouseClicked, mousePosition } from "./input";

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
const websocket = new WebSocket("/websocket");
websocket.onopen = () => {

};
const parseSocketMessage = (messageString: string) => {
  try {
    return JSON.parse(messageString);
  } catch {
    return messageString;
  }
};
websocket.onmessage = (event) => {
  timeUpdateReceived = Date.now();
  const messageObject = parseSocketMessage(event.data);
  if (typeof messageObject !== "object") {
    console.log(messageObject);
    return;
  }
  switch (messageObject.type) {
    case "initialization":
      playerEntity = messageObject.playerEntity;
      mergePacket(messageObject.catchupPacket);
      break;
    case "update":
      console.log(messageObject);
      mergePacket(messageObject.packet);
      break;

    default:
      console.warn(
        `Received unknown message type: ${messageObject.type}`,
        messageObject,
      );
  }
};
websocket.onerror = (error) => {
  console.error("WebSocket error:", error);
};
websocket.onclose = () => {
  console.log("Disconnected from server");
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

let shootCooldown = 0;
const SHOOT_COOLDOWN_TIME = 0.2;

const DAMPING_FORCE = 5;
const PLAYER_SPEED = 1000;
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

  const player = getComponent(playerEntity, PLAYER_COMPONENT_DEF);
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
      const worldX = mousePosition.x - canvas.offsetWidth / 2 + position.x;
      const worldY = mousePosition.y - canvas.offsetHeight / 2 + position.y;

      // Handle shooting
      if (shootCooldown > 0) {
        shootCooldown -= deltaTime;
      }

      if (mouseClicked && shootCooldown <= 0) {
        const shootMessage = {
          type: "shoot",
          targetX: worldX,
          targetY: worldY,
        };
        websocket.send(JSON.stringify(shootMessage));
        shootCooldown = SHOOT_COOLDOWN_TIME;
      }
    }
  }
  if (position) {
    draw(position, playerEntity);
  }
  window.requestAnimationFrame(update);
};

document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("canvas") as HTMLCanvasElement;
  fpsCounter = document.getElementById("fps-counter") as HTMLParagraphElement;
  window.requestAnimationFrame(update);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const message: CreateItemMessage = {
      type: "createItem",
      offsetX: 0,
      offsetY: 0,
    };
    websocket.send(JSON.stringify(message));
  }
});

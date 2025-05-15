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
import { inputMap } from "./input";

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

let playerEntity: number | undefined = undefined;
export const mergePacket = (packet: Packet) => {
  console.log(packet);
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
const websocket = new WebSocket("ws://localhost:3000");
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

const DAMPING_FORCE = 0.3;
const PLAYER_SPEED = 1;
const update = () => {
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

  if (position !== undefined) {
    if (inputMap.d) {
      velocity.x += PLAYER_SPEED;
    }
    if (inputMap.a) {
      velocity.x -= PLAYER_SPEED;
    }
    if (inputMap.s) {
      velocity.y += PLAYER_SPEED;
    }
    if (inputMap.w) {
      velocity.y -= PLAYER_SPEED;
    }

    velocity.x -= velocity.x * DAMPING_FORCE;
    velocity.y -= velocity.y * DAMPING_FORCE;

    position.x += velocity.x;
    position.y += velocity.y;

    websocket.send(`${position.x.toString()} ${position.y.toString()}`);
  }
  draw();
  window.requestAnimationFrame(update);
};

document.addEventListener("DOMContentLoaded", () => {
  window.requestAnimationFrame(update);
});

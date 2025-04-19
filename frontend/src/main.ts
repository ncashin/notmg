import "./style.css";
import "./draw";
import { draw } from "./draw";
import { inputMap } from "./input";
import { ECSInstance, provideECSInstanceFunctions } from "../../core/ecs";
import { POSITION_COMPONENT_DEF } from "../../core/collision";

export let {
  ecsInstance,

  createEntity,
  destroyEntity,

  addComponent,
  removeComponent,

  getComponent,
  queryComponents,

  runQuery,
} = provideECSInstanceFunctions();

export const updateObjectRecursive = (object: any, objectToUpdateWith: any) => {
  Object.entries(objectToUpdateWith).forEach(([key, value]) => {
    object[key] = value;
  });
};

let playerEntity: number | undefined = undefined;
export const mergePacket = (packet) => {
  Object.entries(packet).forEach(([entity, components]) => {
    Object.entries(components).forEach(([type, component]) => {
      component.type = type;
      console.log(entity, component);
      const existingComponent = getComponent(entity, component);
      if (existingComponent === undefined) {
        addComponent(entity, component);
        return;
      }
      updateObjectRecursive(existingComponent, component);
    });
  });
};
const websocket = new WebSocket("ws://localhost:3000");
websocket.onopen = () => {
  console.log("Connected to WebSocket server");
};
websocket.onmessage = (event) => {
  const messageObject = JSON.parse(event.data);
  if (messageObject.type === "initialization") {
    playerEntity = messageObject.playerEntity;
    mergePacket(messageObject.catchupPacket);
    return;
  }

  if (messageObject.type === "update") {
    mergePacket(messageObject.packet);
  }
};
websocket.onerror = (error) => {
  console.error("WebSocket error:", error);
};
websocket.onclose = () => {
  console.log("Disconnected from WebSocket server");
};

const DAMPING_FORCE = 0.2;
const PLAYER_SPEED = 3;
const update = () => {
  if (playerEntity === undefined) {
    window.requestAnimationFrame(update);
    return;
  }

  // updateCollisionSystem(ecsInstance);
  let position = getComponent(playerEntity, POSITION_COMPONENT_DEF);
  if (position !== undefined) {
    if (inputMap["d"]) {
      position.x += PLAYER_SPEED;
    }
    if (inputMap["a"]) {
      position.x -= PLAYER_SPEED;
    }
    if (inputMap["s"]) {
      position.y += PLAYER_SPEED;
    }
    if (inputMap["w"]) {
      position.y -= PLAYER_SPEED;
    }
    websocket.send(position.x.toString() + " " + position.y.toString());
  }
  draw();
  window.requestAnimationFrame(update);
};

document.addEventListener("DOMContentLoaded", () => {
  window.requestAnimationFrame(update);
});

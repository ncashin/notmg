import "./style.css";
import "./draw";
import { draw } from "./draw";
import { inputMap } from "./input";
import { provideECSInstanceFunctions } from "../../core/ecs";
import {
  POSITION_COMPONENT_DEF,
} from "../../core/collision";

export const {
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

const websocket = new WebSocket("ws://localhost:3000");
websocket.onopen = () => {
  console.log("Connected to WebSocket server");
};
let playerEntity: number | undefined = undefined;
websocket.onmessage = (event) => {
  const [entityString, componentString] = event.data.split("*");
  const entity = Number.parseInt(entityString);
  playerEntity = entity;
  const messageComponent = JSON.parse(componentString);
  const existingComponent = getComponent(entity, messageComponent);
  if (existingComponent === undefined) {
    addComponent(entity, messageComponent);
    console.log(ecsInstance);
    return;
  }
  updateObjectRecursive(existingComponent, messageComponent);
};
websocket.onerror = (error) => {
  console.error("WebSocket error:", error);
};
websocket.onclose = () => {
  console.log("Disconnected from WebSocket server");
};

const DAMPING_FORCE = 0.2;
const PLAYER_SPEED = 1;
const update = () => {
  // updateCollisionSystem(ecsInstance);
  if (playerEntity != undefined) {
    let position = getComponent(playerEntity, POSITION_COMPONENT_DEF);
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

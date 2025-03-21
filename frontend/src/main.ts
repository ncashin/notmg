import "./style.css";
import "./draw";
import { draw } from "./draw";
import { inputMap } from "./input";
import { provideECSInstanceFunctions } from "../../core/ecs";
import {
  AABB_COLLIDER_COMPONENT_DEF,
  createKinematicEntity,
  POSITION_COMPONENT_DEF,
  updateCollisionSystem,
  VELOCITY_COMPONENT_DEF,
} from "../../core/collision";

const websocket = new WebSocket("ws://localhost:3000");
websocket.onopen = () => {
  console.log("Connected to WebSocket server");
};
websocket.onmessage = (event) => {
  console.log("Received:", event.data);
};
websocket.onerror = (error) => {
  console.error("WebSocket error:", error);
};
websocket.onclose = () => {
  console.log("Disconnected from WebSocket server");
};

export const {
  ecsInstance,

  createEntity,
  destroyEntity,

  addComponent,
  removeComponent,

  getComponent,
  queryComponents,

  runSystem,
} = provideECSInstanceFunctions();

export const COLOR_COMPONENT_DEF: {
  type: "color";
  color: string;
} = {
  type: "color",
  color: "red",
};
const PLAYER_SPEED = 0.5;
const playerEntity = createKinematicEntity(ecsInstance);
addComponent(playerEntity, COLOR_COMPONENT_DEF);


let position = getComponent(playerEntity, POSITION_COMPONENT_DEF);
let velocity = getComponent(playerEntity, VELOCITY_COMPONENT_DEF);
let color = getComponent(playerEntity, COLOR_COMPONENT_DEF);

position.x = 100;
position.y = 100;
color.color = "blue";

//testCollider
let testCollisionEntity = createEntity();
addComponent(testCollisionEntity, POSITION_COMPONENT_DEF);
addComponent(testCollisionEntity, AABB_COLLIDER_COMPONENT_DEF);
addComponent(testCollisionEntity, COLOR_COMPONENT_DEF);

//testCollider
testCollisionEntity = createEntity();

addComponent(testCollisionEntity, POSITION_COMPONENT_DEF);
addComponent(testCollisionEntity, AABB_COLLIDER_COMPONENT_DEF);
addComponent(testCollisionEntity, COLOR_COMPONENT_DEF);

let testPosition = getComponent(testCollisionEntity, POSITION_COMPONENT_DEF);
let testCollider = getComponent(
  testCollisionEntity,
  AABB_COLLIDER_COMPONENT_DEF
);

testPosition.x = 500;
testPosition.y = 300;
testCollider.width = 64;
testCollider.height = 500;

const DAMPING_FORCE = 0.05;
const update = () => {
  if (inputMap["d"]) {
    velocity.x += PLAYER_SPEED;
  }
  if (inputMap["a"]) {
    velocity.x -= PLAYER_SPEED;
  }
  if (inputMap["s"]) {
    velocity.y += PLAYER_SPEED;
  }
  if (inputMap["w"]) {
    velocity.y -= PLAYER_SPEED;
  }

  velocity.x -= velocity.x * DAMPING_FORCE
  velocity.y -= velocity.y * DAMPING_FORCE

  updateCollisionSystem(ecsInstance);
  draw();
  window.requestAnimationFrame(update);
};
document.addEventListener("DOMContentLoaded", () => {
  window.requestAnimationFrame(update);
});

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

<<<<<<< HEAD
let position = getComponent(playerEntity, POSITION_COMPONENT_DEF);
let velocity = getComponent(playerEntity, VELOCITY_COMPONENT_DEF);
let color = getComponent(playerEntity, COLOR_COMPONENT_DEF);

position.x = 100;
position.y = 100;
color.color = "blue";

const movementTestEntity = createKinematicEntity(ecsInstance);
addComponent(movementTestEntity, COLOR_COMPONENT_DEF);

let moveTestPosition = getComponent(movementTestEntity, POSITION_COMPONENT_DEF);
let moveTestVelocity = getComponent(movementTestEntity, VELOCITY_COMPONENT_DEF);
let moveTestColor = getComponent(movementTestEntity, COLOR_COMPONENT_DEF);

moveTestPosition.x = 1000;
moveTestPosition.y = 300;
moveTestColor.color = "green";

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
  AABB_COLLIDER_COMPONENT_DEF,
);

testPosition.x = 500;
testPosition.y = 700;
testCollider.width = 1000;
testCollider.height = 64;
=======
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
>>>>>>> 78a1fa6 (oops)

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

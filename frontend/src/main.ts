import "./style.css";
import "./draw";
import { draw } from "./draw";
import { inputMap } from "./input";
import { provideECSInstanceFunctions } from "../../core/ecs";

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
  createEntity,
  destroyEntity,

  addComponent,
  removeComponent,

  getComponent,
  queryComponents,

  runSystem,
} = provideECSInstanceFunctions();

export const POSITION_COMPONENT_DEF: {
  type: "position";
  x: number;
  y: number;
} = {
  type: "position",
  x: 0,
  y: 0,
};
export const RECTANGLE_COLLIDER_COMPONENT_DEF: {
  type: "rectangleCollider";
  width: number;
  height: number;
} = {
  type: "rectangleCollider",
  width: 64,
  height: 64,
};
export const COLOR_COMPONENT_DEF: {
  type: "color";
  color: string;
} = {
  type: "color",
  color: "red",
};
const PLAYER_SPEED = 5;
const playerEntity = createEntity();
addComponent(playerEntity, POSITION_COMPONENT_DEF);
addComponent(playerEntity, RECTANGLE_COLLIDER_COMPONENT_DEF);
addComponent(playerEntity, COLOR_COMPONENT_DEF);

let position = getComponent(playerEntity, POSITION_COMPONENT_DEF);
let color = getComponent(playerEntity, COLOR_COMPONENT_DEF);
let playerCollider = getComponent(
  playerEntity,
  RECTANGLE_COLLIDER_COMPONENT_DEF
);

position.x = 100;
position.y = 100;
color.color = "blue";

let testCollisionEntity = createEntity();
addComponent(testCollisionEntity, POSITION_COMPONENT_DEF);
addComponent(testCollisionEntity, RECTANGLE_COLLIDER_COMPONENT_DEF);
addComponent(testCollisionEntity, COLOR_COMPONENT_DEF);

testCollisionEntity = createEntity();
addComponent(testCollisionEntity, POSITION_COMPONENT_DEF);
addComponent(testCollisionEntity, RECTANGLE_COLLIDER_COMPONENT_DEF);
addComponent(testCollisionEntity, COLOR_COMPONENT_DEF);
let testPosition = getComponent(testCollisionEntity, POSITION_COMPONENT_DEF);
let testCollider = getComponent(
  testCollisionEntity,
  RECTANGLE_COLLIDER_COMPONENT_DEF
);
testPosition.x = 500;
testPosition.y = 300;
testCollider.width = 64;
testCollider.height = 500;

const update = () => {
  let velocityX = 0;
  let velocityY = 0;
  if (inputMap["d"]) {
    velocityX += PLAYER_SPEED;
  }
  if (inputMap["a"]) {
    velocityX -= PLAYER_SPEED;
  }
  if (inputMap["s"]) {
    velocityY += PLAYER_SPEED;
  }
  if (inputMap["w"]) {
    velocityY -= PLAYER_SPEED;
  }

  runSystem(
    [POSITION_COMPONENT_DEF, RECTANGLE_COLLIDER_COMPONENT_DEF],
    (entity, [colliderPosition, collider]) => {
      if (entity === playerEntity) return;

      const newPositionX = position.x + velocityX;
      const distanceX = Math.abs(newPositionX - colliderPosition.x);
      const horizontalOverlap =
        distanceX < (collider.width + playerCollider.width) / 2;

      const newPositionY = position.y + velocityY;
      const distanceY = Math.abs(newPositionY - colliderPosition.y);
      const verticalOverlap =
        distanceY < (collider.height + playerCollider.height) / 2;

      if (!horizontalOverlap || !verticalOverlap) return;

      const oldDistanceX = Math.abs(position.x - colliderPosition.x);
      let priorHorizontalOverlap =
        oldDistanceX < (collider.width + playerCollider.width) / 2;

      const oldDistanceY = Math.abs(position.y - colliderPosition.y);
      let priorVerticalOverlap =
        oldDistanceY < (collider.height + playerCollider.height) / 2;

      if (!priorHorizontalOverlap && !priorVerticalOverlap) {
        priorVerticalOverlap =
          oldDistanceX >= oldDistanceY * (collider.width / collider.height);
      }
      if (priorVerticalOverlap) {
        if (position.x <= colliderPosition.x) {
          velocityX =
            colliderPosition.x -
            collider.width / 2 -
            (position.x + playerCollider.width / 2);
        } else {
          velocityX =
            colliderPosition.x +
            collider.width / 2 -
            (position.x - playerCollider.width / 2);
        }
        return;
      }

      if (position.y <= colliderPosition.y) {
        velocityY =
          colliderPosition.y -
          collider.height / 2 -
          (position.y + playerCollider.height / 2);
      } else {
        velocityY =
          colliderPosition.y +
          collider.height / 2 -
          (position.y - playerCollider.height / 2);
      }
    }
  );
  position.x += velocityX;
  position.y += velocityY;

  draw();
  window.requestAnimationFrame(update);
};
document.addEventListener("DOMContentLoaded", () => {
  window.requestAnimationFrame(update);
});

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
export const COLOR_COMPONENT_DEF: {
  type: "color";
  color: string;
} = {
  type: "color",
  color: "red",
};
const playerEntity = createEntity();
addComponent(playerEntity, POSITION_COMPONENT_DEF);
let position = getComponent(playerEntity, POSITION_COMPONENT_DEF);

addComponent(playerEntity, COLOR_COMPONENT_DEF);
let color = getComponent(playerEntity, COLOR_COMPONENT_DEF);
color.color = "yellow";

const PLAYER_SPEED = 5;

let i = 0;
const update = () => {
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

  if (i < 500) {
    const testEntity = createEntity();
    addComponent(testEntity, POSITION_COMPONENT_DEF);
    addComponent(testEntity, COLOR_COMPONENT_DEF);

    let testPosition = getComponent(testEntity, POSITION_COMPONENT_DEF);
    testPosition.x = Math.random() * 1000;
    testPosition.y = Math.random() * 1000;

    let testColor = getComponent(testEntity, COLOR_COMPONENT_DEF);
    testColor.color = Math.random() < 0.5 ? "green" : "red";

    i++;
  }

  draw();
  window.requestAnimationFrame(update);
};
document.addEventListener("DOMContentLoaded", () => {
  window.requestAnimationFrame(update);
});

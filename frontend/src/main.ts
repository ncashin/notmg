import "./style.css";
import "./draw";
import { draw } from "./draw";
import { addComponent, createEntity, getComponent } from "../../core/ecs";
import { inputMap } from "./input";

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

const playerEntity = createEntity();
export const POSITION_COMPONENT_DEF: {
  type: "position";
  x: number;
  y: number;
} = {
  type: "position",
  x: 0,
  y: 0,
};
addComponent(playerEntity, POSITION_COMPONENT_DEF);
let position = getComponent(playerEntity, POSITION_COMPONENT_DEF);

const PLAYER_SPEED = 5;

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

  draw();
  window.requestAnimationFrame(update);
};
window.requestAnimationFrame(update);

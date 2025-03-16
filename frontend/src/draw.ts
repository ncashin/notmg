import { getComponent, queryEntities } from "../../core/ecs";
import { POSITION_COMPONENT_DEF } from "./main";

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;

document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const updateCanvasSize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
  };
  canvas.addEventListener("resize", updateCanvasSize);
  updateCanvasSize();
  context = canvas.getContext("2d") as CanvasRenderingContext2D;
});

export const draw = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "red";
  queryEntities([POSITION_COMPONENT_DEF], ([position]) => {
    context.fillRect(position.x, position.y, 32, 32);
  });
};

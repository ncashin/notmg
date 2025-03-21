import {
  AABB_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
} from "../../core/collision";
import { COLOR_COMPONENT_DEF, runSystem } from "./main";

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

  runSystem(
    [POSITION_COMPONENT_DEF, AABB_COLLIDER_COMPONENT_DEF, COLOR_COMPONENT_DEF],
    (_entity, [position, collider, color]) => {
      context.strokeStyle = color.color;

      context.strokeRect(
        position.x - collider.width / 2,
        position.y - collider.height / 2,
        collider.width,
        collider.height
      );
    }
  );
};

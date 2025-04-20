import {
  AABB_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
  VELOCITY_COMPONENT_DEF,
} from "../../core/collision";
import { CLIENT_POSITION_COMPONENT_DEF, runQuery } from "./main";

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

window.ENABLE_DEBUG_DRAW = true;
export const draw = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (window.ENABLE_DEBUG_DRAW) {
    debugDraw();
  }
};

export const debugDraw = () => {
  context.strokeStyle = "blue";
  runQuery(
    [CLIENT_POSITION_COMPONENT_DEF, AABB_COLLIDER_COMPONENT_DEF],
    (_entity, [position, collider]) => {
      context.strokeRect(
        position.x - collider.width / 2,
        position.y - collider.height / 2,
        collider.width,
        collider.height,
      );
    },
  );

  context.strokeStyle = "purple";
  runQuery(
    [POSITION_COMPONENT_DEF, VELOCITY_COMPONENT_DEF],
    (_entity, [position, velocity]) => {
      context.beginPath();
      context.moveTo(position.x, position.y);
      context.lineTo(position.x + velocity.x, position.y + velocity.y);
      context.closePath();
      context.stroke();
      context.moveTo(0, 0);
    },
  );
};

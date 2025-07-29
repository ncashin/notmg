import {
  CIRCLE_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
  VELOCITY_COMPONENT_DEF,
} from "core";
import { runQuery } from "./ecsProvider";
import { CLIENT_POSITION_COMPONENT_DEF } from "./main";

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;
document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const updateCanvasSize = () => {
    const scale = 1.3;
    canvas.width = Math.floor(window.innerWidth * scale);
    canvas.height = Math.floor(window.innerHeight * scale);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  };
  window.addEventListener("resize", updateCanvasSize);
  updateCanvasSize();
  context = canvas.getContext("2d") as CanvasRenderingContext2D;
});

declare global {
  interface Window {
    DEBUG_DRAW: boolean;
    mouseX: number;
    mouseY: number;
  }
}

window.DEBUG_DRAW = true;
export const draw = (
  centerPoint: { x: number; y: number },
) => {
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.save();

  context.translate(
    canvas.width / 2 - centerPoint.x,
    canvas.height / 2 - centerPoint.y,
  );

  canvas.style.backgroundPosition = `${-centerPoint.x}px ${-centerPoint.y}px`;

  if (window.DEBUG_DRAW) {
    drawCircleColliders();
    drawVelocity();
  }

  context.restore();
};

const drawCircleColliders = () => {
  context.strokeStyle = "blue";
  runQuery(
    [CLIENT_POSITION_COMPONENT_DEF, CIRCLE_COLLIDER_COMPONENT_DEF],
    (_entity, [position, collider]) => {
      // Calculate radius as half of the larger dimension
      context.beginPath();
      context.arc(position.x, position.y, collider.radius, 0, Math.PI * 2);
      context.stroke();
    },
  );
};

const drawVelocity = () => {
  context.strokeStyle = "purple";
  runQuery(
    [
      CLIENT_POSITION_COMPONENT_DEF,
      POSITION_COMPONENT_DEF,
      VELOCITY_COMPONENT_DEF,
    ],
    (_entity, [clientPosition, position, velocity]) => {
      const pos = clientPosition || position;
      context.beginPath();
      context.moveTo(pos.x, pos.y);
      context.lineTo(pos.x + velocity.x, pos.y + velocity.y);
      context.closePath();
      context.stroke();
      context.moveTo(0, 0);
    },
  );
};

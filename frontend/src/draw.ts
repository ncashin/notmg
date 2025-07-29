import { BASE_ENTITY_COMPONENT_DEF } from "core";
import { runQuery } from "./ecsProvider";

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
export const draw = (centerPoint: { x: number; y: number }) => {
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.save();

  context.translate(
    canvas.width / 2 - centerPoint.x,
    canvas.height / 2 - centerPoint.y,
  );

  canvas.style.backgroundPosition = `${-centerPoint.x}px ${-centerPoint.y}px`;

  if (window.DEBUG_DRAW) {
    drawBaseEntities();
  }

  context.restore();
};

const drawBaseEntities = () => {
  context.strokeStyle = "blue";
  runQuery([BASE_ENTITY_COMPONENT_DEF], (_entity, [baseEntity]) => {
    const radius = 20;
    context.beginPath();
    context.arc(baseEntity.x, baseEntity.y, radius, 0, Math.PI * 2);
    context.stroke();

    // Draw velocity vector as a line from the entity's position
      context.strokeStyle = "red";
      context.beginPath();
      context.moveTo(baseEntity.x, baseEntity.y);
      context.lineTo(baseEntity.x + baseEntity.vx * 10, baseEntity.y + baseEntity.vy * 10);
      context.stroke();
    
  });
};

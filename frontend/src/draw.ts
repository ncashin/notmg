import { ASTEROID_COMPONENT_DEF, BASE_ENTITY_COMPONENT_DEF, PLAYER_COMPONENT_DEF, Vector2 } from "core";
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
export const draw = (centerPoint: Vector2) => {
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
  runQuery([BASE_ENTITY_COMPONENT_DEF, PLAYER_COMPONENT_DEF], (_entity, [baseEntity, _player]) => {
    const size = 15; // Triangle size
    
    context.strokeStyle = "white";

    // Draw triangle pointing in the direction of baseEntity.angle
    context.save();
    context.translate(baseEntity.position.x, baseEntity.position.y);
    context.rotate(baseEntity.angle);
    
    context.beginPath();
    // Triangle pointing right (0 angle)
    context.moveTo(size, 0);              // Front point
    context.lineTo(-size * 0.7, -size * 0.5);  // Back left
    context.lineTo(-size * 0.7, size * 0.5);   // Back right
    context.closePath();
    context.stroke();
    
    context.restore();

    
  });
  runQuery([BASE_ENTITY_COMPONENT_DEF], (_entity, [baseEntity]) => {
    if (window.DEBUG_DRAW) {
      context.strokeStyle = "red";
      context.beginPath();
      context.moveTo(baseEntity.position.x, baseEntity.position.y);
      context.lineTo(baseEntity.position.x + baseEntity.velocity.x, baseEntity.position.y + baseEntity.velocity.y);
      context.stroke();
    }
  });

  // Draw asteroids
  runQuery([BASE_ENTITY_COMPONENT_DEF, ASTEROID_COMPONENT_DEF], (_entity, [baseEntity, asteroid]) => {
    if (!asteroid.points || asteroid.points.length === 0) return;

    context.save();
    context.strokeStyle = "gray";
    context.beginPath();
    // Move to the first point
    context.moveTo(
      asteroid.points[0].x + baseEntity.position.x,
      asteroid.points[0].y + baseEntity.position.y
    );
    // Draw lines to each subsequent point
    for (let i = 1; i < asteroid.points.length; i++) {
      context.lineTo(
        asteroid.points[i].x + baseEntity.position.x,
        asteroid.points[i].y + baseEntity.position.y
      );
    }
    context.closePath();
    context.stroke();
    context.restore();
  });
};

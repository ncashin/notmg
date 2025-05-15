import {
  AABB_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
  VELOCITY_COMPONENT_DEF,
} from "../../core/collision";
import {
  PROJECTILE_COMPONENT_DEF,
  SPRITE_COMPONENT_DEF,
} from "../../core/game";
import { CLIENT_POSITION_COMPONENT_DEF, runQuery } from "./main";

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;
document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const updateCanvasSize = () => {
    canvas.width = Math.floor(window.innerWidth);
    canvas.height = Math.floor(window.innerHeight);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  };
  window.addEventListener("resize", updateCanvasSize);
  updateCanvasSize();
  context = canvas.getContext("2d") as CanvasRenderingContext2D;
});

declare global {
  interface Window {
    ENABLE_DEBUG_DRAW: boolean;
  }
}

window.ENABLE_DEBUG_DRAW = true;
export const draw = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (window.ENABLE_DEBUG_DRAW) {
    debugDraw();
  }
};

export const inventoryDraw = () => {
  const inventoryCell = new Image();
  inventoryCell.src = "/inventorycell.png";

  const padding = 4;
  context.fillStyle = "#222222";
  context.fillRect(0, 0, 32 * 10 + padding * 2, 32 * 6 + padding * 2);
  for (let column = 0; column < 10; column++) {
    for (let row = 0; row < 6; row++) {
      context.drawImage(
        inventoryCell,
        column * 32 + padding,
        row * 32 + padding,
      );
    }
  }

  const healthSize = 64;
  const healthPadding = 10;
  const health = new Image();
  health.src = "/heart.svg";
  context.drawImage(
    health,
    0 + healthPadding,
    canvas.height - healthSize - healthPadding,
    healthSize,
    healthSize,
  );
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
  runQuery(
    [CLIENT_POSITION_COMPONENT_DEF, SPRITE_COMPONENT_DEF],
    (_entity, [position, sprite]) => {
      const image = new Image();
      image.src = sprite.imageSrc;
      context.drawImage(
        image,
        position.x - sprite.size / 2,
        position.y - sprite.size / 2,
        sprite.size,
        sprite.size,
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

  // Draw projectiles as wireframe circles with white background
  runQuery(
    [POSITION_COMPONENT_DEF, PROJECTILE_COMPONENT_DEF],
    (_entity, [position, projectile]) => {
      // Draw white background circle
      context.fillStyle = "white";
      context.beginPath();
      context.arc(position.x, position.y, projectile.radius, 0, Math.PI * 2);
      context.fill();

      // Draw wireframe circle
      context.strokeStyle = "red";
      context.beginPath();
      context.arc(position.x, position.y, projectile.radius, 0, Math.PI * 2);
      context.stroke();
    },
  );
  inventoryDraw();
};

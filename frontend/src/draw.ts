import {
  AABB_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
  VELOCITY_COMPONENT_DEF,
} from "../../core/collision";
import {
  HEALTH_COMPONENT_DEF,
  PROJECTILE_COMPONENT_DEF,
  SPRITE_COMPONENT_DEF,
} from "../../core/game";
import { CLIENT_POSITION_COMPONENT_DEF, getComponent, runQuery } from "./main";

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
    DEBUG_DRAW: boolean;
  }
}

window.DEBUG_DRAW = true;
export const draw = (
  centerPoint: { x: number; y: number } = { x: 0, y: 0 },
) => {
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.save();

  context.translate(
    canvas.width / 2 - centerPoint.x,
    canvas.height / 2 - centerPoint.y,
  );

  canvas.style.backgroundPosition = `${-centerPoint.x}px ${-centerPoint.y}px`;

  drawSprites();
  drawProjectiles();
  drawHealthBars();

  if (window.DEBUG_DRAW) {
    drawAABB();
    drawVelocity();
  }

  context.restore();

  drawInventory();
};

const drawSprites = () => {
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
};

const drawProjectiles = () => {
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
};

export const drawInventory = () => {
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

const drawAABB = () => {
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

const drawHealthBars = () => {
  runQuery(
    [CLIENT_POSITION_COMPONENT_DEF, HEALTH_COMPONENT_DEF],
    (_entity, [position, health]) => {
      const barWidth = 64;
      const barHeight = 6;
      const padding = 2;
      const yOffset = -40; // Position above the entity

      // Draw background (empty health bar)
      context.fillStyle = "#333333";
      context.fillRect(
        position.x - barWidth / 2,
        position.y + yOffset,
        barWidth,
        barHeight,
      );

      // Draw health fill
      const healthPercent = health.currentHealth / health.maxHealth;
      context.fillStyle =
        healthPercent > 0.5
          ? "#00ff00"
          : healthPercent > 0.25
            ? "#ffff00"
            : "#ff0000";
      context.fillRect(
        position.x - barWidth / 2 + padding,
        position.y + yOffset + padding,
        (barWidth - padding * 2) * healthPercent,
        barHeight - padding * 2,
      );
    },
  );
};

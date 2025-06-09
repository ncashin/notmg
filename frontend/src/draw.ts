import {
  AABB_COLLIDER_COMPONENT_DEF,
  CIRCLE_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
  VELOCITY_COMPONENT_DEF,
} from "../../core/collision";
import {
  HEALTH_COMPONENT_DEF,
  PROJECTILE_COMPONENT_DEF,
  SPRITE_COMPONENT_DEF,
} from "../../core/game";
import {
  INVENTORY_COMPONENT_DEF,
  PLAYER_COMPONENT_DEF,
} from "../../core/player";
import { getComponent, runQuery } from "./ecsProvider";
import { mousePosition } from "./input";
import { CLIENT_POSITION_COMPONENT_DEF } from "./main";

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
    mouseX: number;
    mouseY: number;
  }
}

window.DEBUG_DRAW = true;
export const draw = (
  centerPoint: { x: number; y: number },
  playerEntity: number,
) => {
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.save();

  context.translate(
    canvas.width / 2 - centerPoint.x,
    canvas.height / 2 - centerPoint.y,
  );

  canvas.style.backgroundPosition = `${-centerPoint.x}px ${-centerPoint.y}px`;

  drawSprites();
  drawHealthBars();

  if (window.DEBUG_DRAW) {
    drawCircleColliders();
    drawVelocity();
  }

  context.restore();

  const playerInventory = getComponent(playerEntity, INVENTORY_COMPONENT_DEF);
  if (playerInventory) {
    drawInventory(playerInventory, centerPoint);
  }
};

const drawSprites = () => {
  runQuery(
    [CLIENT_POSITION_COMPONENT_DEF, SPRITE_COMPONENT_DEF],
    (entity, [position, sprite]) => {
      const image = new Image();
      image.src = sprite.imageSrc;
      context.drawImage(
        image,
        position.x - sprite.size / 2,
        position.y - sprite.size / 2,
        sprite.size,
        sprite.size,
      );

      // Draw player name if this is a player
      const player = getComponent(entity, PLAYER_COMPONENT_DEF);
      if (player) {
        context.font = "16px Arial";
        context.fillStyle = "white";
        context.textAlign = "center";
        context.textBaseline = "bottom";
        // Draw text shadow for better visibility
        context.shadowColor = "black";
        context.shadowBlur = 2;
        context.fillText(
          player.username,
          position.x,
          position.y - sprite.size / 2 - 5,
        );
        // Reset shadow
        context.shadowBlur = 0;
      }
    },
  );
};

// Helper function to convert screen coordinates to inventory cell coordinates
const getCellFromScreenPosition = (
  screenX: number,
  screenY: number,
  cellSize: number,
  padding: number,
) => {
  const row = Math.floor((screenY - padding) / cellSize);
  const column = Math.floor((screenX - padding) / cellSize);
  return { row, column };
};

export const drawInventory = (
  inventory: typeof INVENTORY_COMPONENT_DEF,
  centerPoint: { x: number; y: number } = { x: 0, y: 0 },
) => {
  const inventoryCell = new Image();
  inventoryCell.src = "/inventorycell.png";

  const padding = 6;
  const cellSize = 48;
  const inventoryWidth = cellSize * 10 + padding * 2;
  const inventoryHeight = cellSize * 6 + padding * 2;

  // Draw inventory background
  context.fillStyle = "#222222";
  context.fillRect(0, 0, inventoryWidth, inventoryHeight);

  // Draw inventory grid
  for (let column = 0; column < 10; column++) {
    for (let row = 0; row < 6; row++) {
      context.drawImage(
        inventoryCell,
        column * cellSize + padding,
        row * cellSize + padding,
        cellSize,
        cellSize,
      );
    }
  }

  // Draw inventory items
  for (const item of inventory.items) {
    const itemPadding = 6;
    const itemX = item.offsetX * cellSize + padding + itemPadding;
    const itemY = item.offsetY * cellSize + padding + itemPadding;
    const itemSize = cellSize - itemPadding * 2;

    // Draw placeholder rectangle for item
    if (item.equipped) {
      context.fillStyle = "#FFFF00"; // Yellow color
      context.fillRect(itemX, itemY, itemSize, itemSize);
    }
    const swordImage = new Image();
    swordImage.src = "/sword.svg";

    context.save();
    context.translate(itemX + itemSize / 2, itemY + itemSize / 2);
    context.scale(itemSize / 48, itemSize / 48);
    // Draw the sword SVG centered at origin
    context.drawImage(swordImage, -24, -24, 48, 48);

    context.restore();

    if (mousePosition) {
      const { column: mouseColumn, row: mouseRow } = getCellFromScreenPosition(
        mousePosition.x,
        mousePosition.y,
        cellSize,
        padding,
      );

      // Check if mouse is over this item's cell
      if (mouseColumn === item.offsetX && mouseRow === item.offsetY) {
        // Draw hover overlay
        context.save();
        context.fillStyle = "rgba(255, 255, 255, 0.1)"; // Very transparent white
        context.fillRect(itemX, itemY, itemSize, itemSize);
        context.restore();

        // Draw tooltip
        context.save();
        // Set up text styling for item tooltip
        context.font = "bold 18px Arial";
        context.fillStyle = "white";
        context.textAlign = "left";
        context.textBaseline = "top";

        // Item stats
        const itemName = "Epic Sword of Power";
        const itemStats = [
          "Damage: +25",
          "Attack Speed: 1.2",
          "Rarity: Epic",
          "Level Required: 10",
        ];

        const tooltipX = itemX + itemSize + 12;
        const tooltipY = itemY;

        // Calculate total height needed for tooltip
        const lineHeight = 24;
        const totalHeight = (itemStats.length + 1) * lineHeight;

        // Draw tooltip background
        context.fillStyle = "rgba(0, 0, 0, 0.8)";
        const nameMetrics = context.measureText(itemName);
        const padding = 12;
        const maxWidth = Math.max(
          nameMetrics.width,
          ...itemStats.map((stat) => context.measureText(stat).width),
        );

        context.fillRect(
          tooltipX - padding,
          tooltipY - padding,
          maxWidth + padding * 2,
          totalHeight + padding * 2,
        );

        // Draw text shadow for better visibility
        context.shadowColor = "black";
        context.shadowBlur = 3;

        // Draw item name in gold color
        context.fillStyle = "#FFD700";
        context.fillText(itemName, tooltipX, tooltipY);

        // Draw stats
        context.font = "16px Arial";
        context.fillStyle = "white";
        itemStats.forEach((stat, index) => {
          context.fillText(stat, tooltipX, tooltipY + lineHeight * (index + 1));
        });

        context.restore();
      }
    }
  }
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

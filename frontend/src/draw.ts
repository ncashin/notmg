import {
  CIRCLE_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
  VELOCITY_COMPONENT_DEF,
} from "../../core/collision";
import { HEALTH_COMPONENT_DEF, SPRITE_COMPONENT_DEF } from "../../core/game";
import {
  INVENTORY_COMPONENT_DEF,
  PLAYER_COMPONENT_DEF,
} from "../../core/player";
import { getComponent, runQuery } from "./ecsProvider";
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

let lastInventoryState: string | null = null;
export const drawInventory = (inventory: typeof INVENTORY_COMPONENT_DEF) => {
  // Serialize inventory for change detection
  const items = inventory.items as Array<{
    offsetX: number;
    offsetY: number;
    equipped?: boolean;
    id?: string | number;
  }>;
  // Sort and stringify for stable comparison
  const serialized = JSON.stringify(
    items
      .map((item) => ({
        offsetX: item.offsetX,
        offsetY: item.offsetY,
        equipped: !!item.equipped,
        id: item.id ?? null,
      }))
      .sort((a, b) =>
        a.offsetY !== b.offsetY ? a.offsetY - b.offsetY : a.offsetX - b.offsetX,
      ),
  );
  if (serialized === lastInventoryState) return; // No change
  lastInventoryState = serialized;

  // Get the inventory grid (4 rows x 6 columns = 24 slots)
  const inventoryGrid = document.getElementById("inventory");
  if (!inventoryGrid) return;
  const slots = Array.from(
    inventoryGrid.getElementsByClassName("inventory-slot"),
  ) as HTMLElement[];

  // Clear all slots
  for (const slot of slots) {
    slot.innerHTML = "";
    slot.classList.remove("equipped");
    slot.removeAttribute("data-tooltip");
  }

  // Group items by slot
  const columns = 6;
  const rows = 4;
  const slotMap: Record<string, typeof items> = {};
  for (const item of items) {
    if (
      typeof item.offsetX !== "number" ||
      typeof item.offsetY !== "number" ||
      item.offsetX < 0 ||
      item.offsetX >= columns ||
      item.offsetY < 0 ||
      item.offsetY >= rows
    ) {
      continue; // skip invalid
    }
    const slotKey = `${item.offsetX},${item.offsetY}`;
    if (!slotMap[slotKey]) slotMap[slotKey] = [];
    slotMap[slotKey].push(item);
  }

  // Render items in each slot (stacked if multiple)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const slotIndex = row * columns + col;
      const slot = slots[slotIndex];
      if (!slot) continue;
      const slotKey = `${col},${row}`;
      const itemsInSlot = slotMap[slotKey] || [];
      itemsInSlot.forEach((item, i) => {
        const img = document.createElement("img");
        img.src = "/sword.svg";
        img.alt = "Item";
        img.className = "item";
        img.style.left = "0";
        img.style.top = "0";
        img.style.zIndex = String(i + 1);
        slot.appendChild(img);
        if (item.equipped) {
          slot.classList.add("equipped");
          slot.style.outline = "2px solid yellow";
        } else {
          slot.classList.remove("equipped");
          slot.style.outline = "";
        }
        // Tooltip (static for now)
        img.title =
          "Epic Sword of Power\nDamage: +25\nAttack Speed: 1.2\nRarity: Epic\nLevel Required: 10";
      });
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

import { context, inputMap } from "./app";

const inventoryOpen = true;
const cellSize = 64;

// item props: x, y, width, height
const items = [
  {
    x: 0,
    y: 0,
    colliders: [
      {
        offsetX: 0,
        offsetY: 0,
        width: 1,
        height: 2,
      },
      {
        offsetX: 1,
        offsetY: 0,
        width: 1,
        height: 1,
      },
    ],
  },
  {
    x: 3,
    y: 1,
    colliders: [
      {
        offsetX: 0,
        offsetY: 0,
        width: 1,
        height: 3,
      },
    ],
  },
];
const inventory = {
  slots: [
    {
      x: 0,
      y: 0,
      width: 4,
      height: 3,
    },
    {
      x: 3,
      y: 3,
      width: 1,
      height: 2,
    },
    {
      x: 6,
      y: 3,
      width: 3,
      height: 3,
    },
  ],
  items,
};

let itemSelected = false;
let selectedItem;
let ghostItem;
let pickupOffset;
const selectItem = (inventory, x, y) => {
  selectedItem = inventory.items.find((item) => {
    return item.colliders.reduce((isColliding, collider) => {
      const cx = item.x + collider.offsetX;
      const cy = item.y + collider.offsetY;

      const xOverlap = cx <= x && x < cx + collider.width;
      const yOverlap = cy <= y && y < cy + collider.height;

      return isColliding || (xOverlap && yOverlap);
    }, false);
  });
  pickupOffset = [selectedItem.x - x, selectedItem.y - y];
  ghostItem = structuredClone(selectedItem);
};
const inventorySlotCheck = (inventory, x, y) => {
  return inventory.slots.reduce((slotExists, slot) => {
    const overlapX = slot.x <= x && x < slot.x + slot.width;
    const overlapY = slot.y <= y && y < slot.y + slot.height;

    return slotExists || (overlapX && overlapY);
  }, false);
};
const inventoryItemCheck = (inventory, item, x, y) => {
  return item.colliders.reduce((slotsExist, collider) => {
    for (let dx = 0; dx < collider.width; dx++) {
      for (let dy = 0; dy < collider.height; dy++) {
        const slotExists = inventorySlotCheck(
          inventory,
          x + collider.offsetX + dx,
          y + collider.offsetY + dy,
        );
        if (!slotExists) return false;
      }
    }
    return slotsExist;
  }, true);
};
const getInventoryCellFromMousePosition = (inventory, mouseX, mouseY) => {
  const gridX = Math.floor(mouseX / cellSize);
  const gridY = Math.floor(mouseY / cellSize);
  if (!inventorySlotCheck(inventory, gridX, gridY)) return;
  return [gridX, gridY];
};
const getCollidingItem = (inventory, itemToCollide, x, y) =>
  itemToCollide.colliders.find((collider) => {
    const cx = x + collider.offsetX;
    const cy = y + collider.offsetY;
    return (
      inventory.items.find((item) => {
        if (item === selectedItem) return false;

        return (
          item.colliders.find((ccollider) => {
            const ccx = item.x + ccollider.offsetX;
            const ccy = item.y + ccollider.offsetY;
            const noXOverlap =
              ccx + ccollider.width - 1 < cx || ccx > cx + collider.width - 1;
            const noYOverlap =
              ccy + ccollider.height - 1 < cy || ccy > cy + collider.height - 1;

            return !(noXOverlap || noYOverlap);
          }) !== undefined
        );
      }) !== undefined
    );
  }) !== undefined;
export const handleInventoryMouseDown = (event) => {
  const clickedCell = getInventoryCellFromMousePosition(
    inventory,
    event.clientX,
    event.clientY,
  );
  if (!clickedCell) return false;
  const [x, y] = clickedCell;

  if (selectedItem) {
    const [pickupX, pickupY] = pickupOffset;
    const slotCheck = !inventoryItemCheck(
      inventory,
      selectedItem,
      x + pickupX,
      y + pickupY,
    );
    const collisionCheck = getCollidingItem(
      inventory,
      selectedItem,
      x + pickupX,
      y + pickupY,
    );
    if (slotCheck || collisionCheck) return true;

    selectedItem.x = x + pickupX;
    selectedItem.y = y + pickupY;
    selectedItem = undefined;
    pickupOffset = undefined;
    return true;
  }

  selectItem(inventory, x, y);
  return true;
};
export const handleInventoryMouseMove = (event) => {
  const hoveredCell = getInventoryCellFromMousePosition(
    inventory,
    event.clientX,
    event.clientY,
  );
  if (!hoveredCell) return false;
  const [x, y] = hoveredCell;
};
const drawItemColliders = (item, x, y) => {
  item.colliders.forEach((collider) => {
    context.fillRect(
      x + collider.offsetX * cellSize,
      y + collider.offsetY * cellSize,
      collider.width * cellSize,
      collider.height * cellSize,
    );
  });
};
const drawInventorySlots = (inventory) => {
  inventory.slots.forEach((slot) => {
    context.fillStyle = "white";

    context.fillRect(
      slot.x * cellSize,
      slot.y * cellSize,
      slot.width * cellSize,
      slot.height * cellSize,
    );
    context.fillStyle = "black";
    for (let i = 0; i < slot.width + 1; i++) {
      context.fillRect(
        slot.x * cellSize + i * cellSize,
        slot.y * cellSize,
        1,
        slot.height * cellSize,
      );
    }
    for (let i = 0; i < slot.height + 1; i++) {
      context.fillRect(
        slot.x * cellSize,
        slot.y * cellSize + i * cellSize,
        slot.width * cellSize,
        1,
      );
    }
  });
};
export const drawUI = () => {
  if (!inventoryOpen) return;

  drawInventorySlots(inventory);

  items.forEach((item) => {
    context.fillStyle = "red";
    if (item === selectedItem) {
      context.fillStyle = "blue";
    }
    drawItemColliders(item, cellSize * item.x, cellSize * item.y);
  });
  if (selectedItem) {
    const [x, y] = inputMap.mousePosition;
    const [pickupX, pickupY] = pickupOffset;

    const cellPos = getInventoryCellFromMousePosition(inventory, x, y);
    if (cellPos) {
      const [cellX, cellY] = cellPos;
      const slotCheck = !inventoryItemCheck(
        inventory,
        selectedItem,
        cellX + pickupX,
        cellY + pickupY,
      );
      const collisionCheck = getCollidingItem(
        inventory,
        selectedItem,
        cellX + pickupX,
        cellY + pickupY,
      );
      if (!slotCheck && !collisionCheck) {
        context.fillStyle = "yellow";
        drawItemColliders(
          selectedItem,
          cellSize * (cellX + pickupX),
          cellSize * (cellY + pickupY),
        );
      }
    }
    context.fillStyle = "purple";
    drawItemColliders(
      ghostItem,
      x - cellSize / 2 + pickupX * cellSize,
      y - cellSize / 2 + pickupY * cellSize,
    );
  }

  context.fillStyle = "red";
  context.fillText("Inventory", 25, 25);
};

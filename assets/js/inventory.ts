import { channel, context, inputMap } from "./app";

export let inventoryOpen = false;

export const toggleInventory = () => {
  inventoryOpen = !inventoryOpen;
};

const cellSize = 32;

export type Inventory = {
  slots: any[];
  items: Record<string, any>;
};

let inventory: Inventory = {
  slots: [],
  items: {},
};
export const setInventory = (i) => {
  inventory = i;
  window.inventory = inventory;
};

let itemSelected = false;
let selectedItem;
let ghostItem;
let pickupOffset;
const selectItem = (inventory, x, y) => {
  selectedItem = Object.values(inventory.items).find((item) => {
    return item.colliders.reduce((isColliding, collider) => {
      const cx = item.x + collider.offset_x;
      const cy = item.y + collider.offset_y;

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
          x + collider.offset_x + dx,
          y + collider.offset_y + dy
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
    const cx = x + collider.offset_x;
    const cy = y + collider.offset_y;
    return (
      Object.values(inventory.items).find((item) => {
        if (item === selectedItem) return false;

        return (
          item.colliders.find((ccollider) => {
            const ccx = item.x + ccollider.offset_x;
            const ccy = item.y + ccollider.offset_y;
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
    event.clientY
  );
  if (!clickedCell) return false;
  const [x, y] = clickedCell;

  if (selectedItem) {
    const [pickupX, pickupY] = pickupOffset;
    const slotCheck = !inventoryItemCheck(
      inventory,
      selectedItem,
      x + pickupX,
      y + pickupY
    );
    const collisionCheck = getCollidingItem(
      inventory,
      selectedItem,
      x + pickupX,
      y + pickupY
    );
    if (slotCheck || collisionCheck) return true;

    selectedItem.x = x + pickupX;
    selectedItem.y = y + pickupY;

    channel.push("inventory", selectedItem).receive("ok", (resp) => {
      setInventory(resp);
    });

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
    event.clientY
  );
  if (!hoveredCell) return false;
  const [x, y] = hoveredCell;
};
const drawItemColliders = (item, x, y) => {
  item.colliders.forEach((collider) => {
    context.fillRect(
      x + collider.offset_x * cellSize,
      y + collider.offset_y * cellSize,
      collider.width * cellSize,
      collider.height * cellSize
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
      slot.height * cellSize
    );
    context.fillStyle = "black";
    for (let i = 0; i < slot.width + 1; i++) {
      context.fillRect(
        slot.x * cellSize + i * cellSize,
        slot.y * cellSize,
        1,
        slot.height * cellSize
      );
    }
    for (let i = 0; i < slot.height + 1; i++) {
      context.fillRect(
        slot.x * cellSize,
        slot.y * cellSize + i * cellSize,
        slot.width * cellSize,
        1
      );
    }
  });
};
export const drawUI = () => {
  if (!inventoryOpen) return;

  drawInventorySlots(inventory);

  Object.values(inventory.items).forEach((item) => {
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
        cellY + pickupY
      );
      const collisionCheck = getCollidingItem(
        inventory,
        selectedItem,
        cellX + pickupX,
        cellY + pickupY
      );
      if (!slotCheck && !collisionCheck) {
        context.fillStyle = "yellow";
        drawItemColliders(
          selectedItem,
          cellSize * (cellX + pickupX),
          cellSize * (cellY + pickupY)
        );
      }
    }
    context.fillStyle = "purple";
    drawItemColliders(
      ghostItem,
      x - cellSize / 2 + pickupX * cellSize,
      y - cellSize / 2 + pickupY * cellSize
    );
  }

  context.fillStyle = "red";
  context.fillText("Inventory", 25, 25);
};

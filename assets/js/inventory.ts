import { channel, context, inputMap } from "./app";
import { Inventory, InventoryItem } from "./types";
import { invariant } from "./tiny-invariant";

const cellSize = 32;

let selectedItem: InventoryItem | undefined;
let ghostItem: InventoryItem | undefined;
let pickupOffset: [number, number] | undefined;

export let inventoryOpen = false;
export const toggleInventory = () => {
  inventoryOpen = !inventoryOpen;
};

let inventory: Inventory = {
  slots: [],
  items: {},
};
export const setInventory = (i: Inventory) => {
  inventory = i;
  window.inventory = inventory;
};

const selectItem = (inventory: Inventory, x: number, y: number) => {
  selectedItem = Object.values(inventory.items).find((item) => {
    invariant(item, "Item is undefined");
    return item.colliders.reduce((isColliding, collider) => {
      const cx = item.x + collider.offset_x;
      const cy = item.y + collider.offset_y;

      const xOverlap = cx <= x && x < cx + collider.width;
      const yOverlap = cy <= y && y < cy + collider.height;

      return isColliding || (xOverlap && yOverlap);
    }, false);
  });
  invariant(selectedItem, "No item selected");

  pickupOffset = [selectedItem.x - x, selectedItem.y - y];
  ghostItem = structuredClone(selectedItem);
};

const inventorySlotCheck = (inventory: Inventory, x: number, y: number) => {
  return inventory.slots.reduce((slotExists, slot) => {
    const overlapX = slot.x <= x && x < slot.x + slot.width;
    const overlapY = slot.y <= y && y < slot.y + slot.height;

    return slotExists || (overlapX && overlapY);
  }, false);
};

const inventoryItemCheck = (
  inventory: Inventory,
  item: InventoryItem,
  x: number,
  y: number,
) => {
  return item.colliders.reduce((slotsExist, collider) => {
    for (let dx = 0; dx < collider.width; dx++) {
      for (let dy = 0; dy < collider.height; dy++) {
        const slotExists = inventorySlotCheck(
          inventory,
          x + collider.offset_x + dx,
          y + collider.offset_y + dy,
        );
        if (!slotExists) return false;
      }
    }
    return slotsExist;
  }, true);
};

const getInventoryCellFromMousePosition = (
  inventory: Inventory,
  mouseX: number,
  mouseY: number,
) => {
  const gridX = Math.floor(mouseX / cellSize);
  const gridY = Math.floor(mouseY / cellSize);
  if (!inventorySlotCheck(inventory, gridX, gridY)) return;
  return [gridX, gridY];
};

const getCollidingItem = (
  inventory: Inventory,
  itemToCollide: InventoryItem,
  x: number,
  y: number,
) =>
  itemToCollide.colliders.find((collider) => {
    const cx = x + collider.offset_x;
    const cy = y + collider.offset_y;
    return (
      Object.values(inventory.items).find((item) => {
        invariant(item, "Item is undefined");
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

export const handleInventoryMouseDown = (event: MouseEvent) => {
  const clickedCell = getInventoryCellFromMousePosition(
    inventory,
    event.clientX,
    event.clientY,
  );
  if (!clickedCell) return false;
  const [x, y] = clickedCell;

  if (selectedItem) {
    invariant(pickupOffset, "No pickup offset");
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

export const handleInventoryMouseMove = (event: MouseEvent) => {
  const hoveredCell = getInventoryCellFromMousePosition(
    inventory,
    event.clientX,
    event.clientY,
  );
  if (!hoveredCell) return false;
  const [x, y] = hoveredCell;
};

const drawItemColliders = (item: InventoryItem, x: number, y: number) => {
  item.colliders.forEach((collider) => {
    context.fillRect(
      x + collider.offset_x * cellSize,
      y + collider.offset_y * cellSize,
      collider.width * cellSize,
      collider.height * cellSize,
    );
  });
};

const drawInventorySlots = (inventory: Inventory) => {
  inventory.slots.forEach((slot) => {
    switch (slot.type) {
      case "none":
        context.fillStyle = "white";
        break;
      case "weapon":
        context.fillStyle = "gray";
        break;
    }

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

  Object.values(inventory.items).forEach((item) => {
    invariant(item, "Item is undefined");
    context.fillStyle = "red";
    if (item === selectedItem) {
      context.fillStyle = "blue";
    }
    drawItemColliders(item, cellSize * item.x, cellSize * item.y);
  });
  if (selectedItem) {
    const [x, y] = inputMap.mousePosition;
    invariant(pickupOffset, "No pickup offset");
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
    invariant(ghostItem, "No ghost item");
    drawItemColliders(
      ghostItem,
      x - cellSize / 2 + pickupX * cellSize,
      y - cellSize / 2 + pickupY * cellSize,
    );
  }

  context.fillStyle = "red";
  context.fillText("Inventory", 25, 25);
};

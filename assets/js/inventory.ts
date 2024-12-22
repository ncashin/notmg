import { context, inputMap } from "./app";

const inventoryOpen = true;
const inventoryGridX = 10;
const inventoryGridY = 5;

const cellSize = 50;
const inventoryWidth = cellSize * (inventoryGridX + 1);
const inventoryHeight = cellSize * (inventoryGridY + 1);
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
    x: 4,
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
      width: 10,
      height: 5,
    },
  ],
  items,
};

let itemSelected = false;
const getInventoryCellFromMousePosition = (mouseX, mouseY) => {
  if (mouseX < cellSize || mouseX > inventoryWidth) return;
  if (mouseY < cellSize || mouseY > inventoryHeight) return;
  return [
    Math.floor((mouseX - cellSize) / cellSize),
    Math.floor((mouseY - cellSize) / cellSize),
  ];
};
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
const inventorySlotCheck = (inventory, itemToCollide) => {
  return inventory.slots.reduce((item) => {
    const noXOverlap =
      item.x + item.width - 1 < itemToCollide.x ||
      item.x > itemToCollide.x + itemToCollide.width - 1;
    const noYOverlap =
      item.y + item.height - 1 < itemToCollide.y ||
      item.y > itemToCollide.y + itemToCollide.height - 1;

    return !(noXOverlap || noYOverlap);
  });
};
const getCollidingItem = (inventory, itemToCollide, x, y) =>
  itemToCollide.colliders.find((collider) => {
    const cx = x + collider.offsetX;
    const cy = y + collider.offsetY;
    return (
      inventory.items.find((item) => {
        if (item === selectedItem) return false;
        console.log(item, collider);

        return (
          item.colliders.find((ccollider) => {
            const ccx = item.x + ccollider.offsetX;
            const ccy = item.y + ccollider.offsetY;
            const noXOverlap =
              ccx + ccollider.width - 1 < cx || ccx > cx + collider.width - 1;
            const noYOverlap =
              ccy + ccollider.height - 1 < cy || ccy > cy + collider.height - 1;
            console.log(ccx, ccy, cx, cy);

            return !(noXOverlap || noYOverlap);
          }) !== undefined
        );
      }) !== undefined
    );
  }) !== undefined;
export const handleInventoryMouseDown = (event) => {
  const clickedCell = getInventoryCellFromMousePosition(
    event.clientX,
    event.clientY,
  );
  if (!clickedCell) return false;
  const [x, y] = clickedCell;

  if (selectedItem) {
    const [pickupX, pickupY] = pickupOffset;
    if (getCollidingItem(inventory, selectedItem, x + pickupX, y + pickupY))
      return true;

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
export const drawUI = () => {
  if (!inventoryOpen) return;

  context.fillStyle = "gray";
  context.fillRect(cellSize / 2, cellSize / 2, inventoryWidth, inventoryHeight);
  context.fillStyle = "white";
  context.fillRect(
    cellSize,
    cellSize,
    inventoryWidth - cellSize,
    inventoryHeight - cellSize,
  );

  context.fillStyle = "black";
  for (let i = 0; i < inventoryGridX + 1; i++) {
    context.fillRect(
      cellSize + i * cellSize,
      cellSize,
      1,
      inventoryHeight - cellSize,
    );
  }
  for (let i = 0; i < inventoryGridY + 1; i++) {
    context.fillRect(
      cellSize,
      cellSize + i * cellSize,
      inventoryWidth - cellSize,
      1,
    );
  }

  items.forEach((item) => {
    context.fillStyle = "red";
    if (item === selectedItem) {
      context.fillStyle = "blue";
    }
    drawItemColliders(
      item,
      cellSize + cellSize * item.x,
      cellSize + cellSize * item.y,
    );
  });
  if (selectedItem) {
    const [x, y] = inputMap.mousePosition;
    const [pickupX, pickupY] = pickupOffset;

    const cellPos = getInventoryCellFromMousePosition(x, y);
    if (cellPos) {
      [cellX, cellY] = cellPos;
      context.fillStyle = "yellow";
      drawItemColliders(
        selectedItem,
        cellSize + cellSize * (cellX + pickupX),
        cellSize + cellSize * (cellY + pickupY),
      );
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

export const inputMap: Record<string, boolean> = {};
document.addEventListener("keydown", (event) => {
  inputMap[event.key] = true;
});
document.addEventListener("keyup", (event) => {
  inputMap[event.key] = false;
});

// Add mouse position tracking
export const mousePosition = { x: 0, y: 0 };
export let mouseClicked = false;

document.addEventListener("mousemove", (event) => {
  mousePosition.x = event.clientX;
  mousePosition.y = event.clientY;
});

document.addEventListener("mousedown", (event) => {
  if (event.button === 0) {
    // Left mouse button
    mouseClicked = true;
  }
});

document.addEventListener("mouseup", (event) => {
  if (event.button === 0) {
    // Left mouse button
    mouseClicked = false;
  }
});

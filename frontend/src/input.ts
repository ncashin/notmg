export const inputMap: Record<string, boolean> = {};
document.addEventListener("keydown", (event) => {
  inputMap[event.key] = true;
});
document.addEventListener("keyup", (event) => {
  inputMap[event.key] = false;
});

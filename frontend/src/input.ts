export const inputMap: any = {};
document.addEventListener("keydown", (event) => {
  inputMap[event.key] = true;
});
document.addEventListener("keyup", (event) => {
  inputMap[event.key] = false;
});

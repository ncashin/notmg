let _inputMap: any = {};
document.addEventListener("keydown", (event) => {
  _inputMap[event.key] = true;
});
document.addEventListener("keyup", (event) => {
  _inputMap[event.key] = false;
});
export const useInput = () => structuredClone(_inputMap);

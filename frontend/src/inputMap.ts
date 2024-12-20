let _inputMap: any = {};
document.addEventListener("keydown", (event) => {
  _inputMap[event.key] = true;
});
document.addEventListener("keyup", (event) => {
  _inputMap[event.key] = false;
});

document.addEventListener("mousemove", function (event) {
  _inputMap.mousePosition = {
    x: event.clientX,
    y: event.clientY,
  };
  console.log("Mouse X:");
});

export const useInput = () => structuredClone(_inputMap);

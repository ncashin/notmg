const updateCallbacks: (() => void)[] = [];
export const addUpdateCallback = (lambda: () => void) => {
  updateCallbacks.push(lambda);
};
const update = () => {
  for (const callback of updateCallbacks) {
    callback();
  }
};

setInterval(update, 1000 / 60);

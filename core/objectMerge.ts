export function isObject(item: unknown): item is Record<string, object> {
  return item !== null && typeof item === "object" && !Array.isArray(item);
}
export function mergeDeep(target: object, ...sources: object[]) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (source[key] === null) {
        delete target[key];
      } else if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

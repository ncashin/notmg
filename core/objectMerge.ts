import { Vector2, cloneWithVector2 } from './vector2';

export function isObject(item: unknown): item is Record<string, object> {
  return item !== null && typeof item === "object" && !Array.isArray(item);
}

export function mergeDeep(target: object, ...sources: object[]) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = (target as any)[key];
      
      // Handle Vector2 instances specially
      if (sourceValue instanceof Vector2) {
        (target as any)[key] = sourceValue.clone();
      } else if (sourceValue && typeof sourceValue === 'object' && sourceValue._isVector2) {
        // Reconstruct Vector2 from serialized data
        (target as any)[key] = new Vector2(sourceValue.x, sourceValue.y);
      } else if (isObject(sourceValue)) {
        if (!isObject(targetValue)) {
          (target as any)[key] = {};
        }
        mergeDeep((target as any)[key], sourceValue);
      } else {
        (target as any)[key] = sourceValue;
      }
    }
  }

  return mergeDeep(target, ...sources);
}

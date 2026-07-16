export function findValueByKey(obj: Record<string, unknown>, key: string): unknown | null {
  if (obj == null || typeof obj !== "object") {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    return obj[key];
  }

  for (const nestedKey in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, nestedKey)) {
      const result = findValueByKey(obj[nestedKey] as Record<string, unknown>, key);
      if (result !== null) {
        return result;
      }
    }
  }

  return null;
}

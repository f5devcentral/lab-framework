/**
 * Creates an artificial delay
 * @param {any} ms - Time to delay in milliseconds
 * @returns {Promise<void>}
 */
export async function delay(ms: number): Promise<unknown> {
  return new Promise(res => setTimeout(res, ms));
}

/**
 * Ensures that a given value is an instance of Error.
 * If the value is not an Error, it attempts to stringify the value and wraps it in a new Error instance.
 * Borrowed from: https://medium.com/with-orus/the-5-commandments-of-clean-error-handling-in-typescript-93a9cbdf1af5 
 * @param {unknown} value - The value to check and convert to an Error if necessary.
 * @returns {Error} - The original Error or a new Error with the stringified value.
 */
export function ensureError(value: unknown): Error {
  if (value instanceof Error) return value

  let stringified = '[Unable to stringify the thrown value]'
  try {
    stringified = JSON.stringify(value)
  } catch { /* JSON parse failed */ }

  const error = new Error(`This value was thrown as is, not through an Error: ${stringified}`)
  return error
}

/**
 * Returns true when a value represents an enabled boolean-like flag.
 */
export function isTruthyBooleanLike(value: unknown): boolean {
  if (value === true || value === 1) {
    return true;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "{true}" || normalized === "1" || normalized === "";
  }

  return false;
}

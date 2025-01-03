/**
 * Creates an artificial delay
 * @param {any} ms - Time to delay in milliseconds
 * @returns {Promise<void>}
 */
export async function delay(ms: number): Promise<unknown> {
  return new Promise(res => setTimeout(res, ms));
}

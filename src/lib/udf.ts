/**
 * Helper methods to interact with the UDF metadata api and labinfo api
 * The fetch methods will obtain the requested variable from the desired api
 */

import {
  fetchLabInfoServer,
  fetchUDFInfoServer,
  fetchUdfComponentWebShellServer,
} from "./udf-action";
import { findValueByKey as findNestedValueByKey } from "./object-utils";

/**
 * Recursively searches a JSON object for a key that matches the specified key and returns its value.
 *
 * @param {Record<string, unknown>} obj - The JSON object to search.
 * @param {string} key - The key to search for in the JSON object.
 * @returns {string | null} - The value associated with the specified key, or null if the key is not found.
 *
 * @example
 * const data = {
 *   a: 1,
 *   b: {
 *     c: 2,
 *     d: {
 *       e: 3
 *     }
 *   }
 * };
 * const value = findValueByKey(data, "e"); // returns 3
 */
export function findValueByKey(obj: Record<string, unknown>, key: string): string | null {
  const value = findNestedValueByKey(obj, key);
  return typeof value === "string" ? value : null;
}

/**
 * Pull metadata from the labinfo API
 * 
 * @param {string} variableName - The name of the variable to look up
 * @returns {Promise<unknown | null>} - The value of the variable from the API response, or null if not found
 */
/**
 * Fetches lab information from the LABINFO API.
 * 
 * @param {string} variableName - The name of the variable to look up.
 * @returns {Promise<unknown | null>} - The value of the variable from the API response.
 */
export async function fetchLabInfo<T = unknown>(variableName: string): Promise<T | null> {
  const variableValue = await fetchLabInfoServer<T>(variableName);
  if (variableValue === undefined || variableValue === null) {
    return null;
  }

  return variableValue;
}

/**
 * Fetches UDF information from the UDF API.
 * 
 * @param {string} variableName - The name of the variable to look up.
 * @returns {Promise<unknown | null>} - The value of the variable from the API response.
 */
export async function fetchUDFInfo<T = unknown>(variableName: string): Promise<T | null> {
  return await fetchUDFInfoServer<T>(variableName);
}

/**
 * Gets the Web Shell URL for a UDF component.
 * 
 * @param {string | null} componentName - The UDF component's name.
 * @returns {Promise<string | null>} The web shell URL, if found.
 * 
 */
export async function fetchUdfComponentWebShell(componentName: string | null = null): Promise<string | null> {
  return await fetchUdfComponentWebShellServer(componentName);
}

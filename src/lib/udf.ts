/**
 * Helper methods to interact with the UDF metadata api and labinfo api
 * The fetch methods will obtain the requested variable from the desired api
 */

import { LABINFO_API_URL, UDF_DEPLOYMENT_API_URL } from "./constants";

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
  if (obj == null || typeof obj !== "object") {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    const value = obj[key];
    return typeof value === "string" ? value : null;
  }

  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const result = findValueByKey(obj[k] as Record<string, unknown>, key);
      if (result !== null) {
        return result;
      }
    }
  }

  return null;
}

/**
 * Pull metadata from the labinfo API
 * 
 * @param {string} variableName - The name of the variable to look up
 * @returns {Promise<string | null>} - The value of the variable from the API response, or null if not found
 */
async function fetchInfo(url: string, variableName: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: "cors", cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Search for the variableName in the response body
    const variableValue = findValueByKey(data, variableName);
    return variableValue;
  } catch (error) {
    console.error("Error fetching lab info:", error);
    return null;
  }
}

/**
 * Fetches lab information from the LABINFO API.
 * 
 * @param {string} variableName - The name of the variable to look up.
 * @returns {Promise<string | null>} - The value of the variable from the API response.
 */
export async function fetchLabInfo(variableName: string): Promise<string | null> {
  const variableValue = await fetchInfo(LABINFO_API_URL, variableName);
  if (variableValue === undefined || variableValue === null) {
    return null;
  }

  return variableValue;
}

/**
 * Fetches UDF information from the UDF API.
 * 
 * @param {string} variableName - The name of the variable to look up.
 * @returns {Promise<any>} - The value of the variable from the API response.
 */
export async function fetchUDFInfo(variableName: string): Promise<string | null> {
  return await fetchInfo(UDF_DEPLOYMENT_API_URL, variableName);
}

/**
 * Get Web Shell URL for UDF component
 * 
 * @param {string} componentName - The UDF component"s name
 * @returns {Promise<void>}
 * 
 */
export async function fetchUdfComponentWebShell(componentName: string | null = null): Promise<string | null> {
  if (componentName === null) {
    console.error("fetchUdfComponentWebShell Error: name must be defined");
    return null;
  }

  console.debug("fetchUdfComponentWebShell:componentName: ", componentName);

  // get udf api payload
  const response = await fetch(UDF_DEPLOYMENT_API_URL, { mode: "cors" });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const jsonResponse = await response.json();

  const components = jsonResponse.deployment.components;

  let host = "";

  for (const component of components) {
    if (component.name === componentName) {
      const httpsMethods = component.accessMethods.https;
      for (const method of httpsMethods) {
        if (method.label === "Web Shell") {
          host = method.host
        }
      }
    }
  }

  if (host === "") {
    console.error(`Web Shell host not found for ${componentName}`);
    return null;
  }

  const url = `https://${host}`;

  console.log("fetchUdfComponentWebShell:url: ", url);

  return url;
}

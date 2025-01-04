"use server"
import { ComponentInfo } from "./types";
import { ensureError } from "./utils";
import { getVariable, getComponentName } from "./variables";

/**
 * Retrieves the URL for a given component name.
 * 
 * This function fetches the petname and component data from Redis,
 * constructs the base URL and port, and returns the full URL.
 * 
 * @param {string} name - The URL or component name to check.
 * @param {boolean} tls - A True value will use TLS (https) to connect to the component. A False value is no TLS (http).
 * @returns {Promise<string>} - The full URL of the component.
 * @throws {Error} - Throws an error if petname or component data is missing or invalid.
 */
async function getComponentUrl(name: string, tls: boolean) {
  const protocol = tls ? "https" : "http";
  const componentName = await getComponentName(name);
  const componentData = await getVariable<ComponentInfo>(`components:${componentName}`);
  if (!componentData) throw new Error("Component data is missing or invalid");

  const port = componentData?.ports?.host;
  if (port) return `${protocol}://host.docker.internal:${port}`;

  return `${protocol}://${componentData?.host}`;
}

interface CheckAPIOptions {
  componentName?: string | null;
  url?: string | null;
  path?: string;
  searchString?: string | null;
  headerName?: string | null;
  headerValue?: string | null;
  targetStatusCode?: number;
  tlsComponent?: boolean;
}

/**
 * Checks the API status, response body, and headers for a given URL or component name.
 * 
 * This function determines if the input is a URL or a component name,
 * constructs the appropriate URL, and then makes a fetch request to
 * check if the API returns the expected status code, contains the specified string in the response body,
 * and contains the specified header with the expected value.
 * 
 * @param {Object} params - The parameters for the function.
 * @param {string} [params.componentName=null] - The name of the component (optional if URL is provided).
 * @param {string} [params.url=null] - The URL to check (optional if componentName is provided).
 * @param {string} [params.path="/"] - The path to append to the URL (default is "/").
 * @param {string} [params.searchString=null] - The string to search for in the response body (optional).
 * @param {string} [params.headerName=null] - The name of the header to check (optional).
 * @param {string} [params.headerValue=null] - The expected value of the header (optional).
 * @param {number} [params.targetStatusCode=200] - The expected HTTP status code (default is 200).
 * @param {boolean} [params.tlsComponent=false] - If a component name is specified, use TLS (https) to connect to the component. Default is no TLS (http).
 * @returns {Promise<boolean>} - Returns true if the API returns the expected status code, contains the specified string, and header.
 * @throws {Error} - Throws an error if the API request fails or returns an unexpected status code, response body, or header.
 */
export async function checkAPI({
  componentName = null,
  url = null,
  path = "/",
  searchString = null,
  headerName = null,
  headerValue = null,
  targetStatusCode = 200,
  tlsComponent = false
}: CheckAPIOptions): Promise<boolean> {
  if (componentName == null && url == null) {
    return false;
  }
  if (componentName) {
    const determinedUrl = await getComponentUrl(componentName, tlsComponent);
    url = `${determinedUrl}${path}`;
  }

  try {
    if (!url) {
      throw new Error("URL is null or undefined");
    }
    console.log(`Calling API Check at: ${url}`)
    const response = await fetch(url, { mode: "cors", cache: "no-store" });
    if (response.status != targetStatusCode) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    if (searchString) {
      const responseBody = await response.text();
      if (!responseBody.includes(searchString)) {
        throw new Error(`String "${searchString}" not found in response`);
      }
    }

    if (headerName && headerValue) {
      const header = response.headers.get(headerName);
      if (header !== headerValue) {
        throw new Error(`Header "${headerName}" does not match expected value "${headerValue}"`);
      }
    }

    return true;
  } catch (error) {
    const err = ensureError(error)
    throw new Error(`Failed API request: ${err.message}`);
  }
}

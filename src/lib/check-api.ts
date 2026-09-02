"use server"
import { Instance, InstanceDocker, InstanceType } from "./types";
import { ensureError } from "./utils";

function isDockerInstance(component: Instance): component is InstanceDocker {
  return (
    component.type === InstanceType.Docker ||
    "image" in component ||
    "ports" in component
  );
}

function hasDockerHostPort(component: Instance): component is InstanceDocker {
  return (
    "ports" in component &&
    Array.isArray(component.ports) &&
    component.ports.some((port) => port.hostPort !== undefined)
  );
}

function getPreferredHostPort(component: InstanceDocker, tls: boolean): number | undefined {
  const preferredContainerPort = tls ? 443 : 80;
  const preferredPort = component.ports?.find(
    (port) => port.containerPort === preferredContainerPort && port.hostPort !== undefined
  );

  if (preferredPort?.hostPort !== undefined) {
    return preferredPort.hostPort;
  }

  if (tls) {
    return undefined;
  }

  return component.ports?.find((port) => port.hostPort !== undefined)?.hostPort;
}

function getPreferredContainerPort(component: InstanceDocker, tls: boolean): number | undefined {
  const preferredContainerPort = tls ? 443 : 80;
  const preferredPort = component.ports?.find(
    (port) => port.containerPort === preferredContainerPort
  );

  if (preferredPort?.containerPort !== undefined) {
    return preferredPort.containerPort;
  }

  return component.ports?.find((port) => port.containerPort !== undefined)?.containerPort;
}

/**
 * Retrieves the URL for a given component.
 * 
 * This function constructs the base URL and port, and returns the full URL.
 * 
 * @param {string} component - The component to check.
 * @param {boolean} tls - A True value will use TLS (https) to connect to the component. A False value is no TLS (http).
 * @returns {Promise<string>} - The full URL of the component.
 * @throws {Error} - Throws an error if component data is missing or invalid.
 */
async function getComponentUrl(component: Instance, tls: boolean) {
  const protocol = tls ? "https" : "http";

  if (!component) throw new Error("Component data is missing or invalid");

  if (tls && isDockerInstance(component)) {
    const tlsHostPort = component.ports?.find(
      (port) => port.containerPort === 443 && port.hostPort !== undefined
    )?.hostPort;

    if (tlsHostPort === undefined) {
      // If 443 is not host-mapped, use container network DNS when a component id exists.
      if (typeof component.componentId === "string" && component.componentId.length > 0) {
        return `${protocol}://${component.componentId}:443`;
      }

      throw new Error("TLS requires container port 443 to be host-mapped or a valid component id for container-network access");
    }

    return `${protocol}://host.docker.internal:${tlsHostPort}`;
  }

  if (hasDockerHostPort(component)) {
    const hostPort = getPreferredHostPort(component, tls);
    if (hostPort !== undefined) {
      return `${protocol}://host.docker.internal:${hostPort}`;
    }
  }

  if (isDockerInstance(component)) {
    const hasComponentId = typeof component.componentId === "string" && component.componentId.length > 0;
    if (hasComponentId) {
      const containerPort = getPreferredContainerPort(component, tls);
      if (containerPort !== undefined) {
        return `${protocol}://${component.componentId}:${containerPort}`;
      }
    }
  }

  return `${protocol}://${component?.componentId}`;
}

/**
 * Options for the checkAPI function.
 */
interface CheckAPIOptions {
  component?: Instance | null;
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
 * @param {CheckAPIOptions} params - The parameters for the function.
 * @param {Instance | null} [params.component=null] - The component instance (optional if URL is provided).
 * @param {string | null} [params.url=null] - The URL to check (optional if component is provided).
 * @param {string} [params.path="/"] - The path to append to the URL (default is "/").
 * @param {string | null} [params.searchString=null] - The string to search for in the response body (optional).
 * @param {string | null} [params.headerName=null] - The name of the header to check (optional).
 * @param {string | null} [params.headerValue=null] - The expected value of the header (optional).
 * @param {number} [params.targetStatusCode=200] - The expected HTTP status code (default is 200).
 * @param {boolean} [params.tlsComponent=false] - If a component name is specified, use TLS (https) to connect to the component. Default is no TLS (http).
 * @returns {Promise<boolean>} - Returns true if the API returns the expected status code, contains the specified string, and header.
 * @throws {Error} - Throws an error if the API request fails or returns an unexpected status code, response body, or header.
 */
export async function checkAPI({
  component = null,
  url = null,
  path = "/",
  searchString = null,
  headerName = null,
  headerValue = null,
  targetStatusCode = 200,
  tlsComponent = false
}: CheckAPIOptions): Promise<boolean> {
  if (component == null && url == null) {
    throw new Error("You must specify a URL or component to check");
  }
  if (component !== null) {
    const determinedUrl = await getComponentUrl(component, tlsComponent);
    url = `${determinedUrl}${path}`;
  } else if (url !== null) {
    url = `${url}${path}`;
  }

  try {
    console.log(`Calling API Check at: ${url}`)
    // @ts-expect-error TS2769
    const response = await fetch(url, { mode: "cors", cache: "no-store" }); // url will never be null here. adding a conditional would cause unreachable code here.

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
    if (
      tlsComponent &&
      component !== null &&
      isDockerInstance(component) &&
      component.ports?.some((port) => port.containerPort === 443 && port.hostPort !== undefined) !== true
    ) {
      throw new Error(
        "Failed API request: TLS endpoint is not reachable. Map container port 443 to a host port, or ensure the component id is reachable from the app container network"
      );
    }

    const err = ensureError(error)
    throw new Error(`Failed API request: ${err.message}`);
  }
}

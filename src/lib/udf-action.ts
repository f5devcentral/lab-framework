"use server";

import { getLabInfoApiUrl, getUdfDeploymentApiUrl } from "./constants";
import { findValueByKey } from "./object-utils";

async function fetchInfo<T = unknown>(url: string, variableName: string): Promise<T | null> {
  try {
    const response = await fetch(url, { mode: "cors", cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return findValueByKey(data, variableName) as T | null;
  } catch (error) {
    console.error("Error fetching lab info:", error);
    return null;
  }
}

export async function fetchLabInfoServer<T = unknown>(variableName: string): Promise<T | null> {
  return await fetchInfo<T>(getLabInfoApiUrl(), variableName);
}

export async function fetchUDFInfoServer<T = unknown>(variableName: string): Promise<T | null> {
  return await fetchInfo<T>(getUdfDeploymentApiUrl(), variableName);
}

export async function fetchUdfComponentWebShellServer(componentName: string | null = null): Promise<string | null> {
  if (componentName === null) {
    console.error("fetchUdfComponentWebShell Error: name must be defined");
    return null;
  }

  const response = await fetch(getUdfDeploymentApiUrl(), { mode: "cors" });

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
          host = method.host;
        }
      }
    }
  }

  if (host === "") {
    console.error(`Web Shell host not found for ${componentName}`);
    return null;
  }

  return `https://${host}`;
}

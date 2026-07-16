"use server";

import { DeploymentIdentifier } from "./types";
import { fetchDeploymentIdentifierServer } from "./deployment-identifier-action";
import { fetchLabInfoServer, fetchUDFInfoServer } from "./udf-action";
import { DEPLOYMENT_IDENTIFIER_KEY, getCandidateKeys } from "./variable-keys";

const parseMaybeJson = <T>(value: unknown): T => {
  if (typeof value !== "string") {
    return value as T;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
};

export async function getEnvVariableServer<T = string>(name: string): Promise<T | null> {
  const value = process.env[name];
  if (value === undefined) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

export async function setEnvVariableServer(key: string, value: string): Promise<void> {
  process.env[key] = value;
}

export async function getDeploymentIdentifierServer(): Promise<DeploymentIdentifier> {
  const deploymentIdentifier = await getEnvVariableServer<DeploymentIdentifier>(DEPLOYMENT_IDENTIFIER_KEY);
  if (deploymentIdentifier) {
    return deploymentIdentifier;
  }

  const fetchedDeploymentIdentifier = await fetchDeploymentIdentifierServer();
  if (!fetchedDeploymentIdentifier) {
    return null;
  }

  await setEnvVariableServer(DEPLOYMENT_IDENTIFIER_KEY, fetchedDeploymentIdentifier);
  return fetchedDeploymentIdentifier;
}

export async function getVariableServer<T>(name: string): Promise<T | null> {
  const candidateKeys = getCandidateKeys(name);

  for (const key of candidateKeys) {
    if (key === DEPLOYMENT_IDENTIFIER_KEY) {
      const deploymentIdentifier = await getDeploymentIdentifierServer();
      if (deploymentIdentifier) {
        return deploymentIdentifier as T;
      }
    }

    const envValue = await getEnvVariableServer<T>(key);
    if (envValue) {
      return envValue;
    }

    const labInfoValue = await fetchLabInfoServer<unknown>(key);
    if (labInfoValue !== null && labInfoValue !== undefined) {
      return parseMaybeJson<T>(labInfoValue);
    }

    const udfValue = await fetchUDFInfoServer<unknown>(key);
    if (udfValue !== null && udfValue !== undefined) {
      return parseMaybeJson<T>(udfValue);
    }
  }

  return null;
}

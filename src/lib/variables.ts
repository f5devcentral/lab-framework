/**
 * Utility functions for deployment identifier and variable resolution
 * across browser storage, environment variables, and server sources.
 */

import { DeploymentIdentifier } from "./types";
import {
    getEnvVariableServer,
    getDeploymentIdentifierServer,
    getVariableServer,
    setEnvVariableServer,
} from "./variables-action";
import { DEPLOYMENT_IDENTIFIER_KEY, getCandidateKeys } from "./variable-keys";

export const LOCAL_VARIABLES_STORAGE_KEY = "LAB_VARIABLES";

function isBrowserEnvironment(): boolean {
    return typeof window !== "undefined";
}

function notifyLocalStorageChange(key: string): void {
    if (!isBrowserEnvironment()) {
        return;
    }

    window.dispatchEvent(
        new CustomEvent("local-storage-change", {
            detail: { key },
        })
    );
}

function getLocalStorageString(key: string): string | null {
    if (!isBrowserEnvironment()) {
        return null;
    }

    const value = localStorage.getItem(key);
    if (value === null) {
        return null;
    }

    try {
        const parsed = JSON.parse(value) as unknown;
        return typeof parsed === "string" ? parsed : null;
    } catch {
        return value;
    }
}

function setLocalStorageString(key: string, value: string): void {
    if (!isBrowserEnvironment()) {
        return;
    }
    localStorage.setItem(key, JSON.stringify(value));
    notifyLocalStorageChange(key);
}

function getLocalVariablesMap(): Record<string, string> {
    if (!isBrowserEnvironment()) {
        return {};
    }

    const raw = localStorage.getItem(LOCAL_VARIABLES_STORAGE_KEY);
    if (!raw) {
        return {};
    }

    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return {};
        }

        return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, string>>(
            (acc, [entryKey, entryValue]) => {
                if (typeof entryValue === "string") {
                    acc[entryKey] = entryValue;
                }
                return acc;
            },
            {}
        );
    } catch {
        return {};
    }
}

function setLocalVariablesMap(values: Record<string, string>): void {
    if (!isBrowserEnvironment()) {
        return;
    }

    localStorage.setItem(LOCAL_VARIABLES_STORAGE_KEY, JSON.stringify(values));
    notifyLocalStorageChange(LOCAL_VARIABLES_STORAGE_KEY);
}

/**
 * Stores a client-side variable in browser localStorage and notifies subscribers.
 *
 * @param {string} key - The variable key to store.
 * @param {string} value - The value to store for the variable.
 * @returns {void}
 */
export function setClientVariable(key: string, value: string): void {
    if (!isBrowserEnvironment()) {
        return;
    }

    const variableMap = getLocalVariablesMap();
    if (variableMap[key] === value) {
        return;
    }

    variableMap[key] = value;
    setLocalVariablesMap(variableMap);
    notifyLocalStorageChange(key);
}

function createFallbackDeploymentIdentifier(): string {
    return `lab-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Returns a normalized component name prefixed with a deployment identifier
 * 
 * @param {string} name - a name
 * @return {Promise<string>} - a unique and normalized component name
 */
export async function getComponentName(name: string): Promise<string> {
    const normalizedName = name
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .replace(/ /g, "-")
        .toLowerCase();

    const deploymentIdentifier = await getDeploymentIdentifier();
    if (!deploymentIdentifier) {
        return normalizedName;
    }

    return deploymentIdentifier + "-" + normalizedName;
}



/**
 * Retrieves an environment variable by name.
 *
 * @template T - The expected type of the environment variable
 * @param {string} name - The name of the environment variable to retrieve
 * @returns {Promise<T|null>} The value of the environment variable, parsed as JSON if possible, or null if it does not exist
 */
export async function getEnvVariable<T = string>(name: string): Promise<T | null> {
    return await getEnvVariableServer<T>(name);
}

/**
 * Sets an environment variable by name.
 *
 * @param {string} key - The key of the environment variable to set
 * @param {string} value - The value of the environment variable to set
 * @returns {Promise<void>}
 */
export async function setEnvVariable(key: string, value: string) {
    await setEnvVariableServer(key, value);
}

/**
 * Retrieves a deployment identifier from environment/services with local fallback.
 * 
 * @returns {Promise<string>} A deployment identifier
 */
export async function getDeploymentIdentifier(): Promise<DeploymentIdentifier> {
    if (isBrowserEnvironment()) {
        const localDeploymentIdentifier = getLocalStorageString(DEPLOYMENT_IDENTIFIER_KEY);
        if (localDeploymentIdentifier) {
            return localDeploymentIdentifier;
        }

        const variableMap = getLocalVariablesMap();
        const mappedDeploymentIdentifier =
            variableMap[DEPLOYMENT_IDENTIFIER_KEY] ??
            variableMap.PETNAME ??
            variableMap.petname;

        if (mappedDeploymentIdentifier) {
            setLocalStorageString(DEPLOYMENT_IDENTIFIER_KEY, mappedDeploymentIdentifier);
            return mappedDeploymentIdentifier;
        }
    }

    let deploymentIdentifier: DeploymentIdentifier = null;
    try {
        deploymentIdentifier = await getEnvVariableServer<DeploymentIdentifier>(DEPLOYMENT_IDENTIFIER_KEY);
    } catch {
        deploymentIdentifier = null;
    }

    if (deploymentIdentifier) {
        if (isBrowserEnvironment()) {
            setLocalStorageString(DEPLOYMENT_IDENTIFIER_KEY, deploymentIdentifier);
        }
        return deploymentIdentifier;
    }

    try {
        deploymentIdentifier = await getDeploymentIdentifierServer();
        if (!deploymentIdentifier) {
            if (isBrowserEnvironment()) {
                const fallbackDeploymentIdentifier = createFallbackDeploymentIdentifier();
                setLocalStorageString(DEPLOYMENT_IDENTIFIER_KEY, fallbackDeploymentIdentifier);
                return fallbackDeploymentIdentifier;
            }
            return null;
        }
        if (isBrowserEnvironment()) {
            setLocalStorageString(DEPLOYMENT_IDENTIFIER_KEY, deploymentIdentifier);
        }
        return deploymentIdentifier;
    } catch (error) {
        if (isBrowserEnvironment()) {
            const fallbackDeploymentIdentifier = createFallbackDeploymentIdentifier();
            setLocalStorageString(DEPLOYMENT_IDENTIFIER_KEY, fallbackDeploymentIdentifier);
            return fallbackDeploymentIdentifier;
        }
        console.error("Error fetching deployment identifier:", error);
        return null;
    }
}

/**
 * Retrieves a variable by first checking the following sources:
 *  - Browser LocalStorage
 *  - environment variables 
 *  - LabInfo API
 *  - UDF API
 *
 * @param {string} name - The name of the variable to retrieve
 * @returns {Promise<T | null>} The value of the variable, or null if it does not exist
 */
export async function getVariable<T>(name: string): Promise<T | null> {
    const candidateKeys = getCandidateKeys(name);
    const normalizedName = name.trim().toLowerCase();
    const isDeploymentAliasLookup =
        normalizedName === "petname" || normalizedName === "deployment_identifier";

    if (isBrowserEnvironment()) {
        const variableMap = getLocalVariablesMap();

        for (const key of candidateKeys) {
            if (Object.prototype.hasOwnProperty.call(variableMap, key)) {
                return variableMap[key] as unknown as T;
            }
        }

        if (normalizedName === "deployment_identifier") {
            const topLevelDeploymentIdentifier = getLocalStorageString(DEPLOYMENT_IDENTIFIER_KEY);
            if (topLevelDeploymentIdentifier) {
                return topLevelDeploymentIdentifier as unknown as T;
            }
        }
    }

    try {
        const directValue = await getVariableServer<T>(name);
        if (directValue !== null && directValue !== undefined) {
            return directValue;
        }
    } catch {
        // Fall through to the deployment-identifier alias when no direct variable is found.
    }

    if (isBrowserEnvironment() && normalizedName === "petname") {
        const topLevelDeploymentIdentifier = getLocalStorageString(DEPLOYMENT_IDENTIFIER_KEY);
        if (topLevelDeploymentIdentifier) {
            return topLevelDeploymentIdentifier as unknown as T;
        }
    }

    if (isDeploymentAliasLookup) {
        const deploymentIdentifier = await getDeploymentIdentifier();
        if (deploymentIdentifier) {
            return deploymentIdentifier as T;
        }
    }

    return null;
}

/**
 * Resolves template placeholders such as ${VAR_NAME} using the current variable store.
 *
 * @param {string | null | undefined} value - The raw template string to resolve.
 * @returns {Promise<string | undefined>} The resolved string value, or the original input when no placeholders are present.
 */
export async function resolveTemplateStringValue(value?: string | null): Promise<string | undefined> {
    if (typeof value !== "string" || value.length === 0) {
        return value ?? undefined;
    }

    const matches = Array.from(new Set([...value.matchAll(/\$\{([^}]+)\}/g)].map((match) => match[1])));
    if (matches.length === 0) {
        return value;
    }

    let resolvedValue = value;
    for (const variableName of matches) {
        const variableValue = await getVariable<string>(variableName);
        const replacement = variableValue === null || variableValue === undefined ? "" : String(variableValue);
        resolvedValue = resolvedValue.split(`\${${variableName}}`).join(replacement);
    }

    return resolvedValue;
}

/**
 * Persists a variable value both in local browser state and the server environment.
 *
 * @param {string} key - The variable key to persist.
 * @param {string} value - The value to assign to the variable.
 * @returns {Promise<void>}
 */
export async function setVariable(key: string, value: string) {
    if (isBrowserEnvironment()) {
        const variableMap = getLocalVariablesMap();
        variableMap[key] = value;
        setLocalVariablesMap(variableMap);
        await setEnvVariableServer(key, value);
        notifyLocalStorageChange(key);
        return;
    }

    await setEnvVariableServer(key, value);
}

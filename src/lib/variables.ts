"use server"
import useLocalStorage from "@/app/lib/use-local-storage";
/**
 * Utility functions for interacting with environment variables and Redis.
 */

import { PETNAME_API_URL } from "./constants";
import { Petname } from "./types";
import { fetchLabInfo, fetchUDFInfo } from "./udf";
import { Instance } from "./types";

/**
 * Returns a normalized component name prefixed with petname
 * 
 * @param {string} name - a name
 * @return {Promise<string>} - a unique and normalized component name
 */
export async function getComponentName(name: string): Promise<string> {
    const petname = await getPetname();
    if (!petname) throw new Error(`Error getting component name: ${name}`)
    return petname + "-" + name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/ /g, "-").toLowerCase();
}

export function useInstances(): [Instance[], React.Dispatch<React.SetStateAction<Instance[]>>] {
    return useLocalStorage<Instance[]>(
        "instances",
        []
    );
}

/**
 * Retrieves an environment variable by name.
 *
 * @template T - The expected type of the environment variable
 * @param {string} name - The name of the environment variable to retrieve
 * @returns {Promise<T|null>} The value of the environment variable, parsed as JSON if possible, or null if it does not exist
 */
export async function getEnvVariable<T = string>(name: string): Promise<T | null> {
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

/**
 * Sets an environment variable by name.
 *
 * @param {string} key - The key of the environment variable to set
 * @param {string} value - The value of the environment variable to set
 * @returns {Promise<void>}
 */
export async function setEnvVariable(key: string, value: string) {
    process.env[key] = value;
}

/**
 * Retrieves a random pet name from the UDF pet name service.
 * 
 * @returns {Promise<string>} A random pet name
 */
export async function getPetname(): Promise<Petname> {
    const petnameKey = "petname";
    let petname = await getEnvVariable<Petname>(petnameKey.toUpperCase());
    if (petname) {
        return petname;
    }
    try {
        // Fetch pet name from external service
        const response = await fetch(PETNAME_API_URL, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`Failed to retrieve petname from ${PETNAME_API_URL}`);
        }
        const petData = await response.json();
        petname = petData[petnameKey] as string;
        await setEnvVariable(petnameKey.toUpperCase(), petname);
        return petname;
    } catch (error) {
        console.error("Error fetching pet name:", error);
    }
    return null;
}

/**
 * Retrieves a variable by first checking the following sources:
 *  - environment variables 
 *  - Redis
 *  - LabInfo API
 *  - UDF API
 *
 * @param {string} name - The name of the variable to retrieve
 * @returns {Promise<T | null>} The value of the variable, or null if it does not exist
 */
export async function getVariable<T>(name: string): Promise<T | null> {
    const sources = [getEnvVariable, fetchLabInfo, fetchUDFInfo];
    for (const source of sources) {
        const value = await source(name);
        if (value) {
            try {
                const json = JSON.parse(value);
                return json as T;
            } catch { /* not valid JSON */ }
            return value as T;
        }
    }
    return null;
}

/**
 * Sets a variable in the env storage.
 *
 * @param {string} key - The key of the variable to set
 * @param {string} value - The value of the variable to set
 * @returns {Promise<void>}
 */
export async function setVariable(key: string, value: string) {
    await setEnvVariable(key, value);
}

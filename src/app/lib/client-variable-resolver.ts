import { getCandidateKeys } from "@/lib/variable-keys";
import { LOCAL_VARIABLES_STORAGE_KEY } from "@/lib/variables";

const inflightVariableRequests = new Map<string, Promise<unknown | null>>();

function setLocalVariableValue(name: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const raw = localStorage.getItem(LOCAL_VARIABLES_STORAGE_KEY);
  let variableMap: Record<string, unknown> = {};

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        variableMap = parsed as Record<string, unknown>;
      }
    } catch {
      variableMap = {};
    }
  }

  if (variableMap[name] === value) {
    return;
  }

  variableMap[name] = value;
  localStorage.setItem(LOCAL_VARIABLES_STORAGE_KEY, JSON.stringify(variableMap));
  window.dispatchEvent(new CustomEvent("local-storage-change", { detail: { key: name } }));
}

function getLocalVariableValue(name: string): unknown | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(LOCAL_VARIABLES_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const variableMap = parsed as Record<string, unknown>;
    for (const key of getCandidateKeys(name)) {
      if (Object.prototype.hasOwnProperty.call(variableMap, key)) {
        return variableMap[key] ?? null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function resolveClientVariable<T = unknown>(name: string): Promise<T | null> {
  const localValue = getLocalVariableValue(name);
  if (localValue !== null && localValue !== undefined) {
    return localValue as T;
  }

  const inflightRequest = inflightVariableRequests.get(name);
  if (inflightRequest) {
    return (await inflightRequest) as T | null;
  }

  const request = (async () => {
    const response = await fetch("/api/variables/resolve", {
      body: JSON.stringify({ name }),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      return null;
    }

    const bodyText = await response.text();
    if (bodyText.trim().length === 0) {
      return null;
    }

    let resolvedValue: T | null = null;
    try {
      const data = JSON.parse(bodyText) as { value?: T | null };
      resolvedValue = data.value ?? null;
    } catch {
      resolvedValue = null;
    }

    if (typeof resolvedValue === "string") {
      setLocalVariableValue(name, resolvedValue);
    }
    return resolvedValue;
  })().finally(() => {
    inflightVariableRequests.delete(name);
  });

  inflightVariableRequests.set(name, request);
  return (await request) as T | null;
}
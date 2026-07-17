"use client";

import { useCallback, useEffect, useState } from "react";
import { LOCAL_VARIABLES_STORAGE_KEY } from "@/lib/variables";
import { resolveClientVariable } from "@/app/lib/client-variable-resolver";

const STORAGE_KEY = LOCAL_VARIABLES_STORAGE_KEY;

function normalizeKey(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function shouldReloadForKey(changedKey: string | null | undefined, targetKey: string): boolean {
  const normalizedChangedKey = normalizeKey(changedKey);
  return normalizedChangedKey === targetKey || normalizedChangedKey === normalizeKey(STORAGE_KEY);
}

type GetVariableProps = {
  name?: string;
  fallback?: string;
  loadingText?: string;
  errorText?: string;
  emptyNameText?: string;
};

export function GetVariable({
  name,
  fallback = "",
  loadingText = "loading...",
  errorText = "Error retrieving variable",
  emptyNameText = "Variable name empty",
}: GetVariableProps) {
  const [value, setValue] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadValue = useCallback(async () => {
    if (!name?.trim()) {
      setLoading(false);
      setHasError(false);
      setValue(null);
      return;
    }

    setLoading(true);
    setHasError(false);

    try {
      const nextValue = await resolveClientVariable<unknown>(name);
      setValue(nextValue);
    } catch {
      console.error("unable to retrieve variable:", name);
      setHasError(true);
      setValue(null);
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    const loadId = window.setTimeout(() => {
      void loadValue();
    }, 0);

    return () => {
      window.clearTimeout(loadId);
    };
  }, [loadValue]);

  useEffect(() => {
    if (!name?.trim()) {
      return;
    }

    const normalizedName = normalizeKey(name);

    const onStorage = (event: StorageEvent) => {
      if (shouldReloadForKey(event.key, normalizedName)) {
        void loadValue();
      }
    };

    const onLocalStorageChange = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (shouldReloadForKey(detail?.key, normalizedName)) {
        void loadValue();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("local-storage-change", onLocalStorageChange as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("local-storage-change", onLocalStorageChange as EventListener);
    };
  }, [loadValue, name]);

  if (!name?.trim()) {
    return <span>{emptyNameText}</span>;
  }

  if (loading) {
    return <span>{loadingText}</span>;
  }

  if (hasError) {
    return <span>{errorText}</span>;
  }

  if (value === null || value === undefined) {
    return <span>{fallback}</span>;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return <span>{String(value)}</span>;
  }

  return <span>{fallback}</span>;
}

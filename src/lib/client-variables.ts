"use client";

import useLocalStorage from "@/app/lib/use-local-storage";
import { Instance } from "@/lib/types";

export const LOCAL_INSTANCES_STORAGE_KEY = "LAB_INSTANCES";

export function useInstances(): [Instance[], React.Dispatch<React.SetStateAction<Instance[]>>] {
  return useLocalStorage<Instance[]>(
    LOCAL_INSTANCES_STORAGE_KEY,
    []
  );
}

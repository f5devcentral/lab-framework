"use client";

import useLocalStorage from "@/app/lib/use-local-storage";
import { Instance } from "@/lib/types";

export function useInstances(): [Instance[], React.Dispatch<React.SetStateAction<Instance[]>>] {
  return useLocalStorage<Instance[]>(
    "instances",
    []
  );
}

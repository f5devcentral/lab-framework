"use client";
import { createContext, useContext, ReactNode, useCallback, useEffect, useRef } from "react";
import {
  createContainer,
  getContainerPorts,
  removeContainer,
} from "@/app/lib/docker-lib";
import {
  DockerPortMapping,
  InstanceDockerEnv,
  Instance,
  InstanceDocker,
  InstanceK8s,
  InstanceState,
  InstanceType,
  InstanceUdf,
  Protocol,
} from "@/lib/types";
import {
  getComponentName,
  getVariable,
  resolveTemplateStringValue,
  setClientVariable,
  setVariable,
} from "@/lib/variables";
import { useInstances } from "@/lib/client-variables";
import { syncDockerInstances } from "@/app/lib/docker-instance-sync";
import type { DockerSyncItem } from "@/app/lib/docker-instance-sync";

const isContainerDoesNotExistError = (error: unknown) =>
  error instanceof Error && error.message.includes("no such container");

const isRecoverableDockerState = (state: InstanceState) =>
  state === InstanceState.Unknown ||
  state === InstanceState.Exited ||
  state === InstanceState.Dead;

const resolveDockerEnvValues = async (
  env: InstanceDockerEnv[]
): Promise<InstanceDockerEnv[]> => {
  return await Promise.all(
    env.map(async (entry) => {
      const templateResolvedValue =
        typeof entry.value === "string"
          ? await resolveTemplateStringValue(entry.value)
          : entry.value;

      if (typeof templateResolvedValue === "string" && templateResolvedValue !== entry.value) {
        return {
          ...entry,
          value: templateResolvedValue,
        };
      }

      if (!entry.isVariable || (entry.value ?? "") !== "") {
        return entry;
      }

      const resolvedValue = await getVariable<string>(entry.name);
      if (resolvedValue === null || resolvedValue === undefined) {
        return entry;
      }

      return {
        ...entry,
        value: String(resolvedValue),
      };
    })
  );
};

function reconcileDockerInstances(
  prevInstances: Instance[],
  statusByName: Map<string, InstanceState>,
  snapshotByName: Map<string, InstanceDocker>,
  missingDockerInstanceNames: Set<string>
): { nextInstances: Instance[]; hasChanges: boolean } {
  let hasChanges = false;

  const isSameDockerSnapshot = (
    instance: InstanceDocker,
    nextStatus: InstanceState,
    nextSnapshot: InstanceDocker | undefined,
    nextComponentId: string | undefined
  ) => {
    const currentStatus = instance.status ?? InstanceState.Unknown;

    if (nextSnapshot === undefined) {
      return currentStatus === nextStatus && instance.componentId === nextComponentId;
    }

    return (
      currentStatus === nextStatus &&
      instance.componentId === nextComponentId &&
      instance.image === nextSnapshot.image &&
      instance.name === nextSnapshot.name &&
      JSON.stringify(instance.ports ?? []) === JSON.stringify(nextSnapshot.ports ?? []) &&
      JSON.stringify(instance.env ?? []) === JSON.stringify(nextSnapshot.env ?? []) &&
      JSON.stringify(instance.attrs ?? []) === JSON.stringify(nextSnapshot.attrs ?? []) &&
      instance.stoppedByUser === nextSnapshot.stoppedByUser
    );
  };

  const nextInstances = prevInstances
    .filter((instance) => {
      if (!isInstanceDocker(instance) || !missingDockerInstanceNames.has(instance.name)) {
        return true;
      }

      hasChanges = true;
      return false;
    })
    .map((instance) => {
      if (!isInstanceDocker(instance)) {
        return instance;
      }

      const currentStatus = instance.status ?? InstanceState.Unknown;
      const nextStatus = statusByName.get(instance.name) ?? InstanceState.Unknown;
      const effectiveStatus = nextStatus === InstanceState.Unknown ? currentStatus : nextStatus;
      const nextSnapshot: InstanceDocker | undefined = snapshotByName.get(instance.name);
      const nextComponentId = nextSnapshot?.componentId;

      if (isSameDockerSnapshot(instance, effectiveStatus, nextSnapshot, nextComponentId)) {
        return instance;
      }

      if (nextSnapshot !== undefined) {
        hasChanges = true;
        return {
          ...instance,
          ...nextSnapshot,
          ...(nextComponentId ? { componentId: nextComponentId } : {}),
          status: effectiveStatus,
          ...(effectiveStatus === InstanceState.Running ? { stoppedByUser: false } : {}),
        };
      }

      if (instance.componentId === undefined) {
        hasChanges = true;
        return {
          ...instance,
          componentId: nextComponentId,
          status: effectiveStatus,
          ...(effectiveStatus === InstanceState.Running ? { stoppedByUser: false } : {}),
        };
      }

      hasChanges = true;
      return {
        ...instance,
        status: effectiveStatus,
        ...(effectiveStatus === InstanceState.Running ? { stoppedByUser: false } : {}),
      };
    });

  return { nextInstances, hasChanges };
}

/**
 * Type guard to check if an instance is of type Docker.
 * @param {Instance} instance - The instance to check.
 * @returns {instance is InstanceDocker} - True if the instance is of type Docker.
 */
function isInstanceDocker(instance: Instance): instance is InstanceDocker {
  return (instance as InstanceDocker).type === InstanceType.Docker;
}

/**
 * Type guard to check if an instance is of type K8s.
 * @param {Instance} instance - The instance to check.
 * @returns {instance is InstanceK8s} - True if the instance is of type K8s.
 */
function isInstanceK8s(instance: Instance): instance is InstanceK8s {
  return (instance as InstanceK8s).type === InstanceType.K8s;
}

/**
 * Type guard to check if an instance is of type Udf.
 * @param {Instance} instance - The instance to check.
 * @returns {instance is InstanceUdf} - True if the instance is of type Udf.
 */
function isInstanceUdf(instance: Instance): instance is InstanceUdf {
  return (instance as InstanceUdf).type === InstanceType.Udf;
}

/**
 * Props for the InstancesContextProvider component.
 * @property {ReactNode} children - The child components.
 */
type InstancesContextProviderProps = {
  children: ReactNode;
};

/**
 * Type representing the context state.
 * @property {Instance[] | InstanceDocker[] | InstanceK8s[] | InstanceUdf[] | null} instances - The list of instances.
 * @property {(instance: Instance | InstanceDocker | InstanceK8s) => void} addInstance - Function to add an instance.
 * @property {(instance: Instance | InstanceDocker | InstanceK8s) => void} removeInstance - Function to remove an instance.
 */
type InstancesContextType = {
  instances:
    | Instance[]
    | InstanceDocker[]
    | InstanceK8s[]
    | InstanceUdf[]
    | null;
  addInstance: (instance: Instance | InstanceDocker | InstanceK8s) => Promise<Error | null>;
  removeInstance: (instance: Instance | InstanceDocker | InstanceK8s) => Promise<void>;
  setDockerStoppedByUser: (instanceName: string, stoppedByUser: boolean) => void;
  upsertDockerInstance: (instance: InstanceDocker) => void;
};

/**
 * Context for managing instances.
 */
const InstancesContext = createContext<InstancesContextType | undefined>(
  undefined
);

/**
 * Provider component for InstancesContext.
 * @param {InstancesContextProviderProps} props - The props for the provider.
 * @returns {JSX.Element} - The provider component.
 */
const InstancesContextProvider = ({
  children,
}: InstancesContextProviderProps) => {
  const [instances, setInstances] = useInstances();
  const instancesRef = useRef(instances);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    instancesRef.current = instances;
  }, [instances]);

  const removeInstanceFromState = useCallback((instanceName: string) => {
    setInstances((prevInstances) =>
      prevInstances.filter((i) => i.name !== instanceName)
    );
  }, [setInstances]);

  useEffect(() => {
    let isCancelled = false;

    const syncDockerInstanceState = async () => {
      const currentInstances = instancesRef.current;

      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      if (isCancelled || isSyncingRef.current || currentInstances.length === 0) {
        return;
      }

      const dockerInstances = currentInstances.filter(isInstanceDocker);
      if (dockerInstances.length === 0) {
        return;
      }

      isSyncingRef.current = true;

      try {
        const syncEntries = await syncDockerInstances(dockerInstances.map((instance) => instance.name));

        if (isCancelled) {
          return;
        }

        const statusByName = new Map<string, InstanceState>(
          syncEntries.map(({ name, status }) => [name, status] as const)
        );
          const snapshotEntries: Array<readonly [string, InstanceDocker]> = syncEntries
            .filter(
              (entry): entry is DockerSyncItem & {
                componentId: string;
                image: string;
                isPresent: true;
                ports: InstanceDocker["ports"];
                status: typeof InstanceState.Running;
              } =>
                entry.isPresent &&
                entry.status === InstanceState.Running &&
                typeof entry.componentId === "string" &&
                entry.componentId.length > 0 &&
                typeof entry.image === "string" &&
                entry.image.length > 0 &&
                Array.isArray(entry.ports)
            )
            .map((entry) => [
              entry.name,
              {
                attrs: undefined,
                componentId: entry.componentId,
                env: undefined,
                image: entry.image,
                name: entry.name,
                ports: entry.ports,
                status: entry.status,
                stoppedByUser: false,
                type: InstanceType.Docker,
              },
            ] as const);
          const snapshotByName = new Map<string, InstanceDocker>(snapshotEntries);
        const missingDockerInstanceNames = new Set(
          syncEntries
            .filter(({ isPresent }) => !isPresent)
            .map(({ name }) => name)
        );

        syncEntries.forEach((entry) => {
          if (entry.isPresent && typeof entry.componentId === "string" && entry.componentId.length > 0) {
            setClientVariable(entry.name, entry.componentId);
          }
        });

        setInstances((prevInstances) => {
          const { nextInstances, hasChanges } = reconcileDockerInstances(
            prevInstances,
            statusByName,
            snapshotByName,
            missingDockerInstanceNames
          );

          return hasChanges ? nextInstances : prevInstances;
        });
      } finally {
        isSyncingRef.current = false;
      }
    };

    void syncDockerInstanceState();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncDockerInstanceState();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    const intervalId = setInterval(syncDockerInstanceState, 5000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [setInstances]);

  /**
   * Function to add an instance.
   * @param {Instance} instance - The instance to add.
   * @returns {Promise<void>} - A promise that resolves when the instance is added.
   */
  const addInstance = useCallback(async <T extends Instance>(
    instance: T
  ): Promise<Error | null> => {
    let resolvedDockerPorts: DockerPortMapping[] | undefined;

    const existingInstance = instances !== null
      ? instances.find((i) => i.name === instance.name)
      : undefined;

    if (existingInstance) {
      if (existingInstance.type === InstanceType.Docker) {
        const status = existingInstance.status ?? InstanceState.Unknown;
        if (isRecoverableDockerState(status)) {
          removeInstanceFromState(existingInstance.name);
        } else {
          return new Error("Instance already exists");
        }
      } else {
        return new Error("Instance already exists");
      }
    }
    instance.componentId = await getComponentName(instance.name);

    if (isInstanceDocker(instance)) {
      try { 
        console.log("Creating docker instance");
        const resolvedEnv = await resolveDockerEnvValues(instance.env ?? []);
        await createContainer({
          attrs: instance.attrs,
          componentId: instance.componentId,
          env: resolvedEnv,
          image: instance.image,
          name: instance.name,
          ports: instance.ports,
        } as InstanceDocker);

        const runtimePortMappings = await getContainerPorts(
          instance.name,
          instance.componentId
        );
        if (runtimePortMappings.length > 0) {
          resolvedDockerPorts = runtimePortMappings;
        }

        await setVariable(instance.name, instance.componentId || "");
      } catch (error) {
        console.error("Create Container Error: ", error);
        return error instanceof Error ? error : new Error("Create container failed");
      }
    } else if (isInstanceK8s(instance)) {
      // TODO: Implement this
      console.log("Creating k8s instance");
    } else if (isInstanceUdf(instance)) {
      // TODO: Implement this
      console.log("Creating udf instance");
    }

    const nextInstance: Instance = isInstanceDocker(instance)
      ? {
        ...instance,
        ...(resolvedDockerPorts ? { ports: resolvedDockerPorts } : {}),
        status: InstanceState.Running,
        stoppedByUser: false,
      }
      : instance;

    setInstances((prevInstances) => [
      ...prevInstances,
      nextInstance,
    ]);
    console.log("Instances: ", instances);
    return null;
  }, [instances, setInstances, removeInstanceFromState]);

  /**
   * Function to remove an instance.
   * @param {Instance} instance - The instance to remove.
   * @returns {Promise<void>} - A promise that resolves when the instance is removed.
   */
  const removeInstance = useCallback(async <T extends Instance>(
    instance: T
  ): Promise<void> => {
    if (instance.type === InstanceType.Docker) {
      console.log("Removing docker instance");
      try {
        await removeContainer(instance.name);
        await setVariable(instance.name, "");
        removeInstanceFromState(instance.name);
      } catch (error: unknown) {
        console.error("Remove Container Error: ", error);
        if (isContainerDoesNotExistError(error)) {
          console.log(`Removing stale container instance: ${instance.name}`);
          removeInstanceFromState(instance.name);
        }
      }
    } else if (instance.type === InstanceType.K8s) {
      // TODO: Implement this
      console.log("Removing k8s instance");
    } else if (instance.type === InstanceType.Udf) {
      // TODO: Implement this
      console.log("Removing udf instance");
    }

    removeInstanceFromState(instance.name);
  }, [removeInstanceFromState]);

  /**
   * Function to remove an instance from the state.
   * @param {string} instanceName - The name of the instance to remove.
   */
  const setDockerStoppedByUser = useCallback((instanceName: string, stoppedByUser: boolean) => {
    setInstances((prevInstances) =>
      prevInstances.map((instance) => {
        if (!isInstanceDocker(instance) || instance.name !== instanceName) {
          return instance;
        }

        if (instance.stoppedByUser === stoppedByUser) {
          return instance;
        }

        return {
          ...instance,
          stoppedByUser,
        };
      })
    );
  }, [setInstances]);

  const upsertDockerInstance = useCallback((instance: InstanceDocker) => {
    setInstances((prevInstances) => {
      const nextInstances = prevInstances.filter(
        (currentInstance) => !(isInstanceDocker(currentInstance) && currentInstance.name === instance.name)
      );

      return [...nextInstances, instance];
    });
  }, [setInstances]);

  return (
    <InstancesContext.Provider
      value={{ instances, addInstance, removeInstance, setDockerStoppedByUser, upsertDockerInstance }}
    >
      {children}
    </InstancesContext.Provider>
  );
};

/**
 * Custom hook to use the InstancesContext.
 * @returns {InstancesContextType} - The context state.
 * @throws {Error} - If used outside of InstancesContextProvider.
 */
const useInstancesContext = () => {
  const context = useContext(InstancesContext);
  if (!context) {
    throw new Error(
      "useInstancesContext must be used within a InstancesContextProvider"
    );
  }
  return context;
};

export {
  InstancesContextProvider,
  InstancesContext,
  useInstancesContext,
  InstanceType,
  Protocol,
  isInstanceDocker,
  isInstanceK8s,
  isInstanceUdf,
};

export type {
  InstancesContextType,
  Instance,
  InstanceDocker,
  DockerPortMapping as DockerPortMapping,
  InstanceK8s,
  InstanceUdf,
};

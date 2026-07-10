"use client";
import { createContext, useContext, ReactNode } from "react";
import {
  createContainer,
  removeContainer,
} from "@/app/lib/docker-lib";
import {
  DockerPortMapping,
  Instance,
  InstanceDocker,
  InstanceK8s,
  InstanceType,
  InstanceUdf,
  Protocol,
} from "@/lib/types";
import { getComponentName } from "@/lib/variables";
import { useInstances } from "@/lib/client-variables";

const isContainerDoesNotExistError = (error: unknown) =>
  error instanceof Error && error.message.includes("no such container");

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
  addInstance: (instance: Instance | InstanceDocker | InstanceK8s) => void;
  removeInstance: (instance: Instance | InstanceDocker | InstanceK8s) => void;
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

  /**
   * Function to add an instance.
   * @param {Instance} instance - The instance to add.
   * @returns {Promise<void>} - A promise that resolves when the instance is added.
   */
  const addInstance = async <T extends Instance>(
    instance: T
  ): Promise<void> => {
    if (instances !== null && instances.find((i) => i.name === instance.name)) {
      console.error("Instance already exists");
      return;
    }
    instance.componentId = await getComponentName(instance.name);

    if (isInstanceDocker(instance)) {
      try { 
        console.log("Creating docker instance");
        await createContainer({
          image: instance.image,
          name: instance.name,
          ports: instance.ports,
        } as InstanceDocker);
      } catch (error) {
        console.error("Create Container Error: ", error);
      }
    } else if (isInstanceK8s(instance)) {
      // TODO: Implement this
      console.log("Creating k8s instance");
    } else if (isInstanceUdf(instance)) {
      // TODO: Implement this
      console.log("Creating udf instance");
    }
    setInstances((prevInstances) => [...prevInstances, instance]);
    console.log("Instances: ", instances);
  };

  /**
   * Function to remove an instance.
   * @param {Instance} instance - The instance to remove.
   * @returns {Promise<void>} - A promise that resolves when the instance is removed.
   */
  const removeInstance = async <T extends Instance>(
    instance: T
  ): Promise<void> => {
    if (instance.type === InstanceType.Docker) {
      console.log("Removing docker instance");
      try {
        await removeContainer(instance.name);
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
  };

  /**
   * Function to remove an instance from the state.
   * @param {string} instanceName - The name of the instance to remove.
   */
  const removeInstanceFromState = (instanceName: string) => {
    setInstances((prevInstances) =>
      prevInstances.filter((i) => i.name !== instanceName)
    );
  };

  return (
    <InstancesContext.Provider
      value={{ instances, addInstance, removeInstance }}
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

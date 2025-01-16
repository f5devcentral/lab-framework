"use client"
import { createContext, useContext, ReactNode } from "react";
import {
  createContainer,
  isContainerDoesNotExistError,
  removeContainer,
} from "@/app/lib/docker-lib";
import { InstanceState, InstanceType, Protocol } from "@/lib/types";
import useLocalStorage from "@/app/lib/use-local-storage";

/**
 * Base interface for an instance.
 * @property {string} name - The name of the instance.
 * @property {InstanceState} [status] - The status of the instance.
 */
interface InstanceBase {
  name: string;
  status?: InstanceState;
}

/**
 * Interface for Docker environment variables.
 * @property {string} name - The name of the environment variable.
 * @property {string} [value] - The value of the environment variable.
 * @property {boolean} [isVariable] - Whether it is a variable.
 * @property {boolean} [isSecret] - Whether it is a secret.
 */
interface InstanceDockerEnv {
  name: string;
  value?: string;
  isVariable?: boolean;
  isSecret?: boolean;
}

/**
 * Interface for Docker ports.
 * @property {number} containerPort - The port inside the container.
 * @property {number} [hostPort] - The port on the host machine.
 * @property {Protocol} [protocol] - The protocol used (TCP/UDP).
 */
interface InstanceDockerPorts {
  containerPort: number;
  hostPort?: number;
  protocol?: Protocol;
}

/**
 * Interface for Docker instances.
 * @extends InstanceBase
 * @property {InstanceType.Docker} type - The type of the instance.
 * @property {string} name - The name of the instance.
 * @property {string} [description] - The description of the instance.
 * @property {string} image - The Docker image used.
 * @property {InstanceDockerPorts[]} [ports] - The ports used by the instance.
 * @property {InstanceDockerEnv[]} [env] - The environment variables used by the instance.
 */
interface InstanceDocker extends InstanceBase {
  type: InstanceType.Docker;
  name: string;
  description?: string;
  image: string;
  ports?: InstanceDockerPorts[];
  env?: InstanceDockerEnv[];
}

/**
 * Interface for Kubernetes instances.
 * @extends InstanceBase
 * @property {InstanceType.K8s} type - The type of the instance.
 * @property {string} name - The name of the instance.
 * @property {string} url - The URL of the Kubernetes cluster.
 * @property {string} kubeconfig - The kubeconfig file content.
 */
interface InstanceK8s extends InstanceBase {
  type: InstanceType.K8s;
  name: string;
  url: string;
  kubeconfig: string;
}

/**
 * Interface for UDF instances.
 * @extends InstanceBase
 * @property {InstanceType.Udf} type - The type of the instance.
 * @property {string} name - The name of the instance.
 */
interface InstanceUdf extends InstanceBase {
  type: InstanceType.Udf;
  name: string;
}

/**
 * Type representing any instance.
 */
type Instance = InstanceDocker | InstanceK8s | InstanceUdf;

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
  const [instances, setInstances] = useLocalStorage<Instance[]>(
    "instances",
    []
  );

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
};

export type {
  InstancesContextType,
  Instance,
  InstanceDocker,
  InstanceDockerEnv,
  InstanceDockerPorts,
  InstanceK8s,
  InstanceUdf,
};

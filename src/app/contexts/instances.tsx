"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { createContainer, removeContainer } from "@/app/lib/docker-lib";

enum InstanceType {
  Docker,
  Udf,
  K8s,
}

interface InstanceBase {
  name: string;
}

interface InstanceDockerEnv {
  name: string;
  value?: string;
  isVariable?: boolean;
  isSecret?: boolean;
}

interface InstanceDockerPorts {
  containerPort: number;
  hostPort?: number;
  protocol?: Protocol;
}

enum Protocol {
  Tcp = "tcp",
  Udp = "udp",
}

interface InstanceDocker extends InstanceBase {
  type: InstanceType.Docker;
  name: string;
  description?: string;
  image: string;
  ports?: InstanceDockerPorts[];
  env?: InstanceDockerEnv[];
}

interface InstanceK8s extends InstanceBase {
  type: InstanceType.K8s;
  name: string;
  url: string;
  kubeconfig: string;
}

interface InstanceUdf extends InstanceBase {
  type: InstanceType.Udf;
  name: string;
}

type Instance = InstanceDocker | InstanceK8s | InstanceUdf;

// Type guards
function isInstanceDocker(instance: Instance): instance is InstanceDocker {
  return (instance as InstanceDocker).type === InstanceType.Docker;
}

function isInstanceK8s(instance: Instance): instance is InstanceK8s {
  return (instance as InstanceK8s).type === InstanceType.K8s;
}

function isInstanceUdf(instance: Instance): instance is InstanceUdf {
  return (instance as InstanceUdf).type === InstanceType.Udf;
}

type InstancesContextProviderProps = {
  children: ReactNode;
};

// Define the shape of the context state
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

// Create the context with a default value
const InstancesContext = createContext<InstancesContextType | undefined>(
  undefined
);

// Create a provider component
const InstancesContextProvider = ({
  children,
}: InstancesContextProviderProps) => {
  const [instances, setInstances] = useState<Instance[]>([]);

  // load instances from local storage on first render
  useEffect(() => {
    const savedInstances = localStorage.getItem("instances");
    setInstances(savedInstances ? JSON.parse(savedInstances) : []);
  }, []);

  useEffect(() => {
    if (instances !== null) {
      localStorage.setItem("instances", JSON.stringify(instances));
    }
  }, [instances]);

  const addInstance = async <T extends Instance>(
    instance: T
  ): Promise<void> => {
    if (instances !== null && instances.find((i) => i.name === instance.name)) {
      console.error("Instance already exists");
      return;
    }

    // based on the type of instance, create the instance
    if (isInstanceDocker(instance)) {
      // create docker instance
      try {
        await createContainer({
          image: instance.image,
          name: instance.name,
          ports: instance.ports,
        } as InstanceDocker);
      } catch (error) {
        console.error("Create Container Error: ", error);
      }

      console.log("Creating docker instance");
    }
    // The following code is commented out because the K8s and Udf instances are not implemented yet
    else if (isInstanceK8s(instance)) {
      // create k8s instance
      console.log("Creating k8s instance");
    } else if (isInstanceUdf(instance)) {
      // create udf instance
      console.log("Creating udf instance");
    }

    setInstances((prevInstances) => [...prevInstances, instance]);
  };

  const removeInstance = async <T extends Instance>(
    instance: T
  ): Promise<void> => {
    // based on the type of instance, remove the instance
    if (instance.type === InstanceType.Docker) {
      // remove docker instance
      console.log("Removing docker instance");
      try {
        await removeContainer(instance.name);
        removeInstanceFromState(instance.name);
      } catch (error: unknown) {
        console.error("Remove Container Error: ", error);
        // if the error has the string "no such container" in it then remove the instance from the state
        if (
          error instanceof Error &&
          error.message.includes("no such container")
        ) {
          console.log(`Removing stale container instance: ${instance.name}`);
          removeInstanceFromState(instance.name);
        }
      }
    } else if (instance.type === InstanceType.K8s) {
      // remove k8s instance
      console.log("Removing k8s instance");
    } else if (instance.type === InstanceType.Udf) {
      // remove udf instance
      console.log("Removing udf instance");
    }
    removeInstanceFromState(instance.name);

    function removeInstanceFromState(instanceName: string) {
      setInstances((prevInstances) =>
        prevInstances.filter((i) => i.name !== instanceName)
      );
    }
  };

  return (
    <InstancesContext.Provider
      value={{ instances, addInstance, removeInstance }}
    >
      {children}
    </InstancesContext.Provider>
  );
};

// Custom hook to use the state context
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
  useInstancesContext,
  InstanceType,
  Protocol,
};

export type {
  Instance,
  InstanceDocker,
  InstanceDockerEnv,
  InstanceDockerPorts,
  InstanceK8s,
  InstanceUdf,
};

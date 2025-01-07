"use server";
import Docker from "dockerode";
import { getInstanceDeploymentName } from "./utils";
import {
  InstanceDocker,
  InstanceDockerPorts,
} from "@/app/contexts/instances";
import { Protocol } from "@/lib/types";

const ContainerState = {
  Created: "created",
  Running: "running",
  Paused: "paused",
  Restarting: "restarting",
  Removing: "removing",
  Exited: "exited",
  Dead: "dead",
} as const;

type ContainerState = typeof ContainerState[keyof typeof ContainerState];

/**
 * Creates and starts a Docker container.
 *
 * @param {createContainerType} param0 - The container creation parameters.
 * @param {string} param0.image - The Docker image to use.
 * @param {string} param0.name - The name of the container.
 * @param {string} param0.port - The port to bind to the container.
 * @returns {Promise<void>} - A promise that resolves when the container is started.
 */
// const createContainer = async ({ image, name, port }: createContainerType): Promise<void> => {
const createContainer = async ({
  image,
  name,
  ports,
}: Omit<InstanceDocker, "type">): Promise<void> => {
  const docker = new Docker();
  const defaultProtocol = Protocol.Tcp;
  const mappedPorts = mapPorts(
    ports ?? [{ containerPort: 80, hostPort: 8080, protocol: defaultProtocol }],
    defaultProtocol
  );
  const container = await docker.createContainer({
    Image: image,
    name: getInstanceDeploymentName({ name }),
    HostConfig: {
      PortBindings: mappedPorts,
    },
  });
  await container.start();
};

/**
 * Stops a running Docker container.
 *
 * @param {string} containerId - The ID of the container to stop.
 * @returns {Promise<void>} - A promise that resolves when the container is stopped.
 */
const stopContainer = async (containerId: string): Promise<void> => {
  const docker = new Docker();
  const container = docker.getContainer(
    getInstanceDeploymentName({ name: containerId })
  );
  await container.stop();
};

/**
 * Removes a Docker container. If the container is running, it will be stopped first.
 *
 * @param {string} containerId - The ID of the container to remove.
 * @returns {Promise<void>} - A promise that resolves when the container is removed.
 */
const removeContainer = async (containerId: string): Promise<void> => {
  const docker = new Docker();
  const status = await getContainerStatus(containerId);
  const container = docker.getContainer(
    getInstanceDeploymentName({ name: containerId })
  );

  if (status === ContainerState.Running) {
    await container.stop();
  }
  await container.remove();
};

const mapPorts = (ports: InstanceDockerPorts[], defaultProtocol: Protocol) =>
  ports?.reduce(
    (
      acc: { [key: string]: { HostPort: string }[] },
      { containerPort, hostPort, protocol }
    ) => {
      if (hostPort !== undefined) {
        acc[`${containerPort}/${protocol ?? defaultProtocol}`] = [
          { HostPort: hostPort.toString() },
        ];
      }
      return acc;
    },
    {}
  );

/**
 * Gets the current status of a Docker container.
 *
 * @param {string} containerId - The ID of the container to inspect.
 * @returns {Promise<ContainerState>} - A promise that resolves with the container's status.
 */
const getContainerStatus = async (containerId: string): Promise<ContainerState> => {
  const docker = new Docker();
  const container = docker.getContainer(
    getInstanceDeploymentName({ name: containerId })
  );
  const data = await container.inspect();
  return data.State.Status as ContainerState;
};

export { createContainer, removeContainer, stopContainer };

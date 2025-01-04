"use server";
import Docker from "dockerode";
import { getInstanceDeploymentName } from "./utils";
import {
  InstanceDocker,
  Protocol,
  InstanceDockerPorts,
} from "@/app/contexts/instances";

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
  const container = docker.getContainer(
    getInstanceDeploymentName({ name: containerId })
  );
  await container.stop();
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

export { createContainer, removeContainer, stopContainer };

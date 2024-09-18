"use server";
import Docker from "dockerode";
import { getInstanceDeploymentName } from "./utils";
import type { InstanceDocker } from "@/app/contexts/instances";

// type createContainerType = {
//   image: string;
//   name: string;
//   port: string;
// };

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
}: InstanceDocker): Promise<void> => {
  const docker = new Docker();
  const container = await docker.createContainer({
    Image: image,
    name: getInstanceDeploymentName({ name }),
    HostConfig: {
      PortBindings: {
        "80/tcp": [
          {
            HostPort: ports,
          },
        ],
      },
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

export { createContainer, removeContainer, stopContainer };

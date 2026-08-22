"use server";
import { exec as execCallback } from "child_process";
import Docker from "dockerode";
import { promisify } from "util";
import { getInstanceDeploymentName } from "./utils";
import { getEnvVariable, resolveTemplateStringValue } from "@/lib/variables";
import {
  DockerAttribute,
  InstanceDockerEnv,
  InstanceDocker,
  DockerPortMapping
} from "@/lib/types";
import { InstanceState, InstanceType as DockerInstanceType, Protocol } from "@/lib/types";

const execAsync = promisify(execCallback);

type DockerConnectionConfig = {
  dockerApiUrl?: string | null;
  networkMode?: string | null;
  deploymentIdentifier?: string | null;
};

async function getDockerConnectionConfig(): Promise<DockerConnectionConfig> {
  const [dockerApiUrl, networkModeRaw, deploymentIdentifier] = await Promise.all([
    getEnvVariable<string>("DOCKER_API_URL"),
    getEnvVariable<string>("CONTAINER_DOCKER_NETWORK"),
    getEnvVariable<string>("DEPLOYMENT_IDENTIFIER"),
  ]);

  const networkMode =
    typeof networkModeRaw === "string" && networkModeRaw.trim().length > 0
      ? networkModeRaw
      : "lab-framework";

  return { dockerApiUrl, networkMode, deploymentIdentifier };
}

function getDeploymentNameFromIdentifier(name: string, deploymentIdentifier?: string | null): string {
  if (!deploymentIdentifier || deploymentIdentifier.trim().length === 0) {
    // In local/dev flows DEPLOYMENT_IDENTIFIER may be unset; fall back to the raw instance name.
    return name;
  }
  return getInstanceDeploymentName({ name, deploymentIdentifier });
}

async function resolveDeploymentName(
  name: string,
  deploymentIdentifier?: string | null,
  componentId?: string | null
): Promise<string> {
  if (componentId && componentId.trim().length > 0) {
    return componentId;
  }

  const mappedInstanceName = await getEnvVariable<string>(name).catch(() => null);
  if (typeof mappedInstanceName === "string" && mappedInstanceName.trim().length > 0) {
    return mappedInstanceName;
  }

  return getDeploymentNameFromIdentifier(name, deploymentIdentifier);
}

function createDockerClient(dockerApiUrl?: string | null): Docker {
  if (!dockerApiUrl) {
    return new Docker();
  }

  try {
    const normalizedUrl = dockerApiUrl.startsWith("tcp://")
      ? dockerApiUrl.replace("tcp://", "http://")
      : dockerApiUrl;
    const parsed = new URL(normalizedUrl);
    return new Docker({
      host: parsed.hostname,
      port: Number(parsed.port || (parsed.protocol === "https:" ? "443" : "80")),
      protocol: parsed.protocol.replace(":", "") as "http" | "https",
    });
  } catch {
    return new Docker();
  }
}

async function ensureImageAvailable(docker: Docker, image: string): Promise<void> {
  try {
    await docker.getImage(image).inspect();
    return;
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("No such image")) {
      throw error;
    }
  }

  await pullImage(docker, image);
}

async function pullImage(docker: Docker, image: string): Promise<void> {
  const stream = await new Promise<NodeJS.ReadableStream>((resolve, reject) => {
    docker.pull(image, (error: Error | null, pullStream?: NodeJS.ReadableStream) => {
      if (error) {
        reject(formatImagePullError(image, error));
        return;
      }

      if (!pullStream) {
        reject(new Error(`Docker did not return a pull stream for image ${image}`));
        return;
      }

      resolve(pullStream as NodeJS.ReadableStream);
    });
  });

  await new Promise<void>((resolve, reject) => {
    docker.modem.followProgress(stream, (error: Error | null) => {
      if (error) {
        reject(formatImagePullError(image, error));
        return;
      }
      resolve();
    });
  });
}

function formatImagePullError(image: string, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);

  if (/unauthorized|authentication required|pull access denied/i.test(message)) {
    return new Error(
      `Unable to pull image ${image}. Docker registry authentication is required for this image.`
    );
  }

  return new Error(`Unable to pull image ${image}: ${message}`);
}

function isContainerNameConflictError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const statusCode = (error as Error & { statusCode?: number }).statusCode;
  if (statusCode === 409) {
    return true;
  }

  return /already in use|conflict/i.test(error.message);
}

async function ensureExistingContainerRunning(
  docker: Docker,
  name: string,
  deploymentIdentifier?: string | null
): Promise<void> {
  const deploymentName = await resolveDeploymentName(name, deploymentIdentifier);
  const container = docker.getContainer(deploymentName);
  const data = await container.inspect();
  if (data.State?.Status !== InstanceState.Running) {
    await container.start();
  }
}

async function removeExistingContainer(
  docker: Docker,
  name: string,
  deploymentIdentifier?: string | null
): Promise<void> {
  const deploymentName = await resolveDeploymentName(name, deploymentIdentifier);
  const container = docker.getContainer(deploymentName);

  try {
    const data = await container.inspect();
    if (data.State?.Status === InstanceState.Running) {
      await container.stop();
    }
    await container.remove();
  } catch (error) {
    if (!isContainerDoesNotExistError(error)) {
      throw error;
    }
  }
}

async function removeStoppedExistingContainer(
  docker: Docker,
  deploymentName: string
): Promise<void> {
  const container = docker.getContainer(deploymentName);

  try {
    const data = await container.inspect();
    if (data.State?.Status !== InstanceState.Running) {
      await container.remove();
    }
  } catch (error) {
    if (!isContainerDoesNotExistError(error)) {
      throw error;
    }
  }
}

/**
 * Resolves environment variables with explicit opt-in template expansion.
 * Template values are only interpolated when the entry sets resolveTemplates.
 *
 * @param {InstanceDockerEnv[]} env - The environment entries to resolve.
 * @returns {Promise<InstanceDockerEnv[]>} The resolved environment entries.
 */
async function resolveContainerEnvVars(env: InstanceDockerEnv[]): Promise<InstanceDockerEnv[]> {
  return await Promise.all(
    env.map(async (entry) => {
      const templateResolvedValue =
        typeof entry.value === "string" && entry.resolveTemplates
          ? await resolveTemplateStringValue(entry.value)
          : entry.value;

      if (typeof templateResolvedValue === "string" && templateResolvedValue !== entry.value) {
        return {
          ...entry,
          value: templateResolvedValue,
        };
      }

      if (!entry.isVariable) {
        return entry;
      }

      const providedValue =
        entry.value === null || entry.value === undefined ? undefined : String(entry.value);
      const processEnvValue =
        process.env[entry.name] ?? process.env[entry.name.toUpperCase()];
      const resolvedRaw =
        processEnvValue !== undefined
          ? processEnvValue
          : (await getEnvVariable<unknown>(entry.name)) ?? providedValue;
      const resolvedValue =
        resolvedRaw === null || resolvedRaw === undefined ? undefined : String(resolvedRaw);

      if (entry.isSecret && resolvedValue === undefined) {
        throw new Error(`Missing required secret environment variable: ${entry.name}`);
      }

      return {
        ...entry,
        value: resolvedValue ?? entry.value ?? "",
      };
    })
  );
}

function buildContainerConfig({
  attrs,
  deploymentName,
  envVars,
  image,
  mappedPorts,
  networkMode,
}: {
  attrs: DockerAttribute[];
  deploymentName: string;
  envVars: string[];
  image: string;
  mappedPorts: { [key: string]: { HostPort: string }[] };
  networkMode?: string | null;
}) {
  const {
    binds,
    hostname,
    labels,
    networkModeOverride,
    restartPolicy,
  } = mapAttrsToDockerConfig(attrs);
  const effectiveNetworkMode = networkModeOverride ?? networkMode;
  const effectiveHostname = hostname ?? deploymentName;

  return {
    _debugAttrs: {
      binds,
      hostname,
      labels,
      networkModeOverride,
      restartPolicy,
    },
    Env: [...envVars],
    Image: image,
    name: deploymentName,
    ...(effectiveHostname ? { Hostname: effectiveHostname } : {}),
    ...(Object.keys(labels).length > 0 ? { Labels: labels } : {}),
    HostConfig: {
      Binds: [...binds],
      ...(effectiveNetworkMode ? { NetworkMode: effectiveNetworkMode } : {}),
      ...(restartPolicy ? { RestartPolicy: { Name: restartPolicy } } : {}),
      ...(Object.keys(mappedPorts).length > 0 ? { PortBindings: mappedPorts } : {}),
    },
  };
}

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
  attrs,
  componentId,
  env,
  image,
  name,
  ports,
}: Omit<InstanceDocker, "type">): Promise<void> => {
  if ((attrs ?? []).length > 0) {
    console.log("createContainer incoming attrs:", {
      name,
      attrs,
    });
  }

  const { dockerApiUrl, networkMode, deploymentIdentifier } = await getDockerConnectionConfig();
  const docker = createDockerClient(dockerApiUrl);
  const deploymentName = await resolveDeploymentName(name, deploymentIdentifier, componentId);
  await ensureImageAvailable(docker, image);
  await removeStoppedExistingContainer(docker, deploymentName);
  const defaultProtocol = Protocol.Tcp;
  const mappedPorts = mapPorts(ports ?? [], defaultProtocol);
  const resolvedEnv = await resolveContainerEnvVars(env ?? []);
  const envVars = mapEnvVars(resolvedEnv);
  const containerConfig = buildContainerConfig({
    attrs: attrs ?? [],
    deploymentName,
    envVars,
    image,
    mappedPorts,
    networkMode,
  });

  const debugAttrs = (containerConfig as { _debugAttrs?: unknown })._debugAttrs;
  if ((attrs ?? []).length > 0) {
    console.log("Docker attrs resolution summary:", {
      deploymentName,
      requestedCount: (attrs ?? []).length,
      debugAttrs,
    });
  }

  const dockerCreateConfig = { ...(containerConfig as Record<string, unknown>) };
  delete dockerCreateConfig._debugAttrs;

  if ((env ?? []).length > 0 && envVars.length === 0) {
    throw new Error("Docker env resolution failed: no environment variables were generated");
  }
  if ((env ?? []).length > 0) {
    const envResolutionSummary = resolvedEnv.map((entry) => ({
      name: entry.name,
      hasValue: (entry.value ?? "") !== "",
      isSecret: entry.isSecret === true,
      isVariable: entry.isVariable === true,
    }));
    console.log("Docker env resolution summary:", {
      deploymentName,
      requestedCount: (env ?? []).length,
      resolvedCount: resolvedEnv.length,
      dockerEnvPayloadCount: envVars.length,
      envResolutionSummary,
    });
  }
  let container: Awaited<ReturnType<Docker["createContainer"]>>;
  try {
    container = await docker.createContainer(dockerCreateConfig as Docker.ContainerCreateOptions);
  } catch (error) {
    if (!isContainerNameConflictError(error)) {
      throw error;
    }

    await removeExistingContainer(docker, name, deploymentIdentifier);
    container = await docker.createContainer(dockerCreateConfig as Docker.ContainerCreateOptions);
  }

  await container.start();
};

/**
 * Stops a running Docker container.
 *
 * @param {string} containerId - The ID of the container to stop.
 * @returns {Promise<void>} - A promise that resolves when the container is stopped.
 */
const stopContainer = async (containerId: string): Promise<void> => {
  const { dockerApiUrl, deploymentIdentifier } = await getDockerConnectionConfig();
  const docker = createDockerClient(dockerApiUrl);
  const deploymentName = await resolveDeploymentName(containerId, deploymentIdentifier);
  const container = docker.getContainer(deploymentName);
  await container.stop();
};

/**
 * Removes a Docker container. If the container is running, it will be stopped first.
 *
 * @param {string} containerId - The ID of the container to remove.
 * @returns {Promise<void>} - A promise that resolves when the container is removed.
 */
const removeContainer = async (containerId: string): Promise<void> => {
  const { dockerApiUrl, deploymentIdentifier } = await getDockerConnectionConfig();
  const docker = createDockerClient(dockerApiUrl);
  const status = await getContainerStatus(containerId);
  const deploymentName = await resolveDeploymentName(containerId, deploymentIdentifier);
  const container = docker.getContainer(deploymentName);

  if (status === InstanceState.Running) {
    await container.stop();
  }
  await container.remove();
};

const mapPorts = (ports: DockerPortMapping[], defaultProtocol: Protocol) =>
  ports?.reduce(
    (
      acc: { [key: string]: { HostPort: string }[] },
      { containerPort, hostPort, protocol }
    ) => {
      acc[`${containerPort}/${protocol ?? defaultProtocol}`] = [
        { HostPort: hostPort?.toString() ?? "" },
      ];
      return acc;
    },
    {}
  );

const mapEnvVars = (env: InstanceDockerEnv[]) =>
  env.map(({ name, value = "" }) => `${name}=${value}`);

const resolveAttrValueTemplates = (value: string): string =>
  value.replace(/\$\{process\.env\[(?:"([^"]+)"|'([^']+)')\]\}/g, (_match, dqKey?: string, sqKey?: string) => {
    const envKey = dqKey ?? sqKey;
    if (!envKey) {
      return "";
    }
    return process.env[envKey] ?? "";
  });

const mapAttrsToDockerConfig = (attrs: DockerAttribute[]) => {
  const binds: string[] = [];
  const labels: Record<string, string> = {};
  let hostname: string | undefined;
  let networkModeOverride: string | undefined;
  let restartPolicy: string | undefined;

  attrs.forEach(({ name, value }, index) => {
    const normalizedName = name.trim().toLowerCase();
    const resolvedValue = resolveAttrValueTemplates(value);

    if (normalizedName === "volume") {
      binds.push(resolvedValue);
      return;
    }

    if (normalizedName === "hostname") {
      hostname = resolvedValue;
      return;
    }

    if (normalizedName === "network") {
      networkModeOverride = resolvedValue;
      return;
    }

    if (normalizedName === "restart") {
      restartPolicy = resolvedValue;
      return;
    }

    if (normalizedName === "label") {
      const separatorIndex = resolvedValue.indexOf("=");
      if (separatorIndex > 0) {
        const labelKey = resolvedValue.slice(0, separatorIndex);
        const labelValue = resolvedValue.slice(separatorIndex + 1);
        labels[labelKey] = labelValue;
      }
      return;
    }

    labels[`lab-framework.attr.${index}.${normalizedName}`] = resolvedValue;
  });

  return {
    binds,
    hostname,
    labels,
    networkModeOverride,
    restartPolicy,
  };
};

/**
 * Gets the current status of a Docker container.
 *
 * @param {string} containerId - The ID of the container to inspect.
 * @returns {Promise<ContainerState>} - A promise that resolves with the container's status.
 */
const getContainerStatus = async (containerId: string): Promise<InstanceState> => {
  const { dockerApiUrl, deploymentIdentifier } = await getDockerConnectionConfig();
  const docker = createDockerClient(dockerApiUrl);
  const deploymentName = await resolveDeploymentName(containerId, deploymentIdentifier);
  const container = docker.getContainer(deploymentName);
  try {
    const data = await container.inspect();
    const retVal = data.State.Status as InstanceState || InstanceState.Unknown;
    return retVal;
  } catch (error) {
    if (isContainerDoesNotExistError(error)) return InstanceState.Unknown;
    throw error;
  }
};

export async function getDockerInstanceSnapshot(containerId: string): Promise<InstanceDocker | null> {
  const { dockerApiUrl, deploymentIdentifier } = await getDockerConnectionConfig();
  const docker = createDockerClient(dockerApiUrl);
  const deploymentName = await resolveDeploymentName(containerId, deploymentIdentifier);
  const container = docker.getContainer(deploymentName);

  try {
    const data = await container.inspect();
    const status = (data.State?.Status as InstanceState | undefined) ?? InstanceState.Unknown;
    if (status !== InstanceState.Running) {
      return null;
    }

    return {
      type: DockerInstanceType.Docker,
      name: containerId,
      componentId: deploymentName,
      image: data.Config?.Image ?? "",
      status,
      ports: await getContainerPorts(containerId, deploymentName),
    };
  } catch (error) {
    if (isContainerDoesNotExistError(error)) {
      return null;
    }

    throw error;
  }
}

const isContainerPresent = async (containerId: string): Promise<boolean> => {
  const { dockerApiUrl, deploymentIdentifier } = await getDockerConnectionConfig();
  const docker = createDockerClient(dockerApiUrl);
  const deploymentName = await resolveDeploymentName(containerId, deploymentIdentifier);
  const container = docker.getContainer(deploymentName);

  try {
    await container.inspect();
    return true;
  } catch (error) {
    if (isContainerDoesNotExistError(error)) {
      return false;
    }
    throw error;
  }
};

const getContainerLogs = async (containerId: string): Promise<string> => {
  const { dockerApiUrl, deploymentIdentifier } = await getDockerConnectionConfig();
  const docker = createDockerClient(dockerApiUrl);
  const deploymentName = await resolveDeploymentName(containerId, deploymentIdentifier);
  const container = docker.getContainer(deploymentName);
  const logs = await container.logs({
    follow: false,
    stderr: true,
    stdout: true,
    tail: 500,
  });

  return Buffer.isBuffer(logs) ? logs.toString("utf-8") : String(logs);
};

const getContainerPorts = async (
  containerId: string,
  componentId?: string | null
): Promise<DockerPortMapping[]> => {
  const { dockerApiUrl, deploymentIdentifier } = await getDockerConnectionConfig();
  const docker = createDockerClient(dockerApiUrl);
  const deploymentName = await resolveDeploymentName(
    containerId,
    deploymentIdentifier,
    componentId
  );
  const container = docker.getContainer(deploymentName);

  try {
    const data = await container.inspect();
    const portBindings = data.NetworkSettings?.Ports ?? {};

    const resolvedPorts: DockerPortMapping[] = [];
    const seenPortMappings = new Set<string>();

    const pushUniquePortMapping = (portMapping: DockerPortMapping) => {
      const key = `${portMapping.containerPort}-${portMapping.protocol ?? Protocol.Tcp}-${portMapping.hostPort ?? ""}`;
      if (seenPortMappings.has(key)) {
        return;
      }
      seenPortMappings.add(key);
      resolvedPorts.push(portMapping);
    };

    for (const [containerPortWithProto, bindings] of Object.entries(portBindings)) {
      const [containerPortRaw, protoRaw] = containerPortWithProto.split("/");
      const containerPort = Number(containerPortRaw);
      const protocol = protoRaw?.toLowerCase() === Protocol.Udp ? Protocol.Udp : Protocol.Tcp;

      if (Number.isNaN(containerPort)) {
        continue;
      }

      if (!bindings || bindings.length === 0) {
        pushUniquePortMapping({ containerPort, protocol });
        continue;
      }

      for (const binding of bindings) {
        const hostPort = Number(binding.HostPort);
        pushUniquePortMapping({
          containerPort,
          hostPort: Number.isNaN(hostPort) ? undefined : hostPort,
          protocol,
        });
      }
    }

    return resolvedPorts;
  } catch (error) {
    if (isContainerDoesNotExistError(error)) {
      return [];
    }
    throw error;
  }
};

const execShellCommand = async (containerId: string, command: string): Promise<string> => {
  const { dockerApiUrl, deploymentIdentifier } = await getDockerConnectionConfig();
  const deploymentName = await resolveDeploymentName(containerId, deploymentIdentifier);
  const hostArgs = dockerApiUrl ? `-H ${dockerApiUrl} ` : "";
  const escapedCommand = command.replace(/'/g, `'"'"'`);
  const cliCommand = `docker ${hostArgs}exec ${deploymentName} sh -lc '${escapedCommand}'`;

  try {
    const { stdout, stderr } = await execAsync(cliCommand);
    // Many valid commands (for example nginx -t/-T) write success text to stderr.
    return [stdout, stderr].filter((chunk) => chunk && chunk.trim().length > 0).join("\n").trim();
  } catch (error) {
    const err = error as Error & { stderr?: string; stdout?: string };
    const details = [err.stderr, err.stdout]
      .filter((chunk): chunk is string => typeof chunk === "string" && chunk.trim().length > 0)
      .join("\n")
      .trim();

    throw new Error(details || err.message || "Command failed");
  }
};

/**
 * Checks if the given error indicates that a Docker container does not exist.
 *
 * @param error - The error to check.
 * @returns `true` if the error message includes "no such container", otherwise `false`.
 */
const isContainerDoesNotExistError = (error: unknown) =>
  error instanceof Error && error.message.includes("no such container");

export {
  createContainer,
  execShellCommand,
  getContainerLogs,
  getContainerPorts,
  isContainerPresent,
  removeContainer,
  stopContainer,
  getContainerStatus
};

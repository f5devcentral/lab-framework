/**
 * Generic deployment identifier fragment used in generated resource names.
 */
export type DeploymentIdentifier = string | null;

/**
 * Information about a component.
 * @property {string} host - The host of the component.
 * @property {Object} ports - The ports information.
 * @property {number} ports.host - The host port number.
 */
export type ComponentInfo = {
  host: string;
  ports: {
    host: number;
  };
};

/**
 * Represents a document.
 * @property {string} name - The name of the document.
 * @property {string} location - The location of the document.
 * @property {DocumentData} documentData - The data of the document.
 */
export type Document = {
  name: string;
  location: string;
  documentData: DocumentData;
};

/**
 * Represents the data of a document.
 * @property {string} content - The content of the document.
 * @property {Object} metadata - The metadata of the document.
 * @property {number} [metadata.order] - The order of the document.
 * @property {unknown} [metadata.key] - Additional metadata properties.
 */
export type DocumentData = {
  content: string;
  metadata: {
    order?: number;
    [key: string]: unknown;
  };
}

/**
 * Represents the frontmatter of a document.
 * @property {string} content - The content of the frontmatter.
 * @property {Record<string, unknown>} metadata - The metadata of the frontmatter.
 */
export type Frontmatter = {
  content: string;
  metadata: Record<string, unknown>;
}

/**
 * Typed frontmatter returned from MDX compilation.
 * Additional keys are allowed, but common display fields are typed.
 */
export type MdxFrontmatter = {
  title?: string;
  description?: string;
  order?: number;
  [key: string]: unknown;
}

/**
 * Represents a file on GitHub.
 * @property {string} name - The name of the file.
 * @property {string} url - The URL of the file.
 * @property {string} type - The type of the file.
 */
export type GitHubFile = {
  name: string;
  url: string;
  type: string;
}

/**
 * Enum representing network protocols.
 * @enum {string}
 */
export enum Protocol {
  Tcp = "tcp",
  Udp = "udp"
}

/**
 * Enum representing instance types.
 * @enum {number}
 */
export enum InstanceType {
  Docker,
  Udf,
  K8s
}

/**
 * Represents the state of an instance.
 * @property {string} Creating - The instance is being created.
 * @property {string} Created - The instance has been created.
 * @property {string} Running - The instance is running.
 * @property {string} Paused - The instance is paused.
 * @property {string} Restarting - The instance is restarting.
 * @property {string} Removing - The instance is being removed.
 * @property {string} Exited - The instance has exited.
 * @property {string} Dead - The instance is dead.
 * @property {string} Unknown - The state of the instance is unknown.
 */
export const InstanceState = {
  Creating: "creating",
  Created: "created",
  Running: "running",
  Paused: "paused",
  Restarting: "restarting",
  Removing: "removing",
  Exited: "exited",
  Dead: "dead",
  Unknown: "unknown",
} as const;

/**
 * Type representing the state of an instance.
 */
export type InstanceState = (typeof InstanceState)[keyof typeof InstanceState];

/**
 * Base interface for an instance.
 * @property {string} name - The name of the instance.
 * @property {string} [componentId] - The component ID of the instance.
 * @property {InstanceState} [status] - The status of the instance.
 */
interface InstanceBase {
  name: string;
  componentId?: string;
  status?: InstanceState;
  stoppedByUser?: boolean;
}

/**
 * Interface for Docker environment variables.
 * @property {string} name - The name of the environment variable.
 * @property {string} [value] - The value of the environment variable.
 * @property {boolean} [isVariable] - Whether it is a variable.
 * @property {boolean} [isSecret] - Whether it is a secret.
 */
export interface InstanceDockerEnv {
  name: string;
  value?: string;
  isVariable?: boolean;
  isSecret?: boolean;
}

export interface DockerAttribute {
  name: string;
  value: string;
}

/**
 * Interface for Docker ports.
 * @property {number} containerPort - The port inside the container.
 * @property {number} [hostPort] - The port on the host machine.
 * @property {Protocol} [protocol] - The protocol used (TCP/UDP).
 */
export interface DockerPortMapping {
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
 * @property {DockerPortMapping[]} [ports] - The port mappings used by the instance.
 * @property {InstanceDockerEnv[]} [env] - The environment variables used by the instance.
 */
export interface InstanceDocker extends InstanceBase {
  type: InstanceType.Docker;
  name: string;
  description?: string;
  image: string;
  ports?: DockerPortMapping[];
  env?: InstanceDockerEnv[];
  attrs?: DockerAttribute[];
}

/**
 * Interface for Kubernetes instances.
 * @extends InstanceBase
 * @property {InstanceType.K8s} type - The type of the instance.
 * @property {string} name - The name of the instance.
 * @property {string} url - The URL of the Kubernetes cluster.
 * @property {string} kubeconfig - The kubeconfig file content.
 */
export interface InstanceK8s extends InstanceBase {
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
export interface InstanceUdf extends InstanceBase {
  type: InstanceType.Udf;
  name: string;
}

/**
 * Type representing any instance.
 */
export type Instance = InstanceDocker | InstanceK8s | InstanceUdf;

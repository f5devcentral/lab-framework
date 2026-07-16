import { DockerInstance } from "./docker-instance";
import { DockerAttribute, DockerPortMapping, InstanceDockerEnv, InstanceState } from "@/lib/types";

type DockerProps = {
  name: string;
  description?: string;
  image: string;
  env?: InstanceDockerEnv[] | string;
  port?: { host?: number; container: number } | null;
  ports?: DockerPortMapping[];
  attrs?: DockerAttribute[] | string;
};

function normalizeDockerEnvProp(envProp?: InstanceDockerEnv[] | string): InstanceDockerEnv[] | undefined {
  if (!envProp) {
    return undefined;
  }

  if (Array.isArray(envProp)) {
    return envProp;
  }

  try {
    const parsed = JSON.parse(envProp) as unknown;
    if (!Array.isArray(parsed)) {
      return undefined;
    }

    return parsed
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
      .map((entry) => ({
        name: typeof entry.name === "string" ? entry.name : "",
        ...(typeof entry.value === "string" ? { value: entry.value } : {}),
        ...(typeof entry.isVariable === "boolean" ? { isVariable: entry.isVariable } : {}),
        ...(typeof entry.isSecret === "boolean" ? { isSecret: entry.isSecret } : {}),
      }))
      .filter((entry) => entry.name.length > 0);
  } catch {
    return undefined;
  }
}

function normalizeDockerAttrsProp(attrsProp?: DockerAttribute[] | string): DockerAttribute[] | undefined {
  if (!attrsProp) {
    return undefined;
  }

  if (Array.isArray(attrsProp)) {
    return attrsProp;
  }

  try {
    const parsed = JSON.parse(attrsProp) as unknown;
    if (!Array.isArray(parsed)) {
      return undefined;
    }

    return parsed
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
      .map((entry) => ({
        name: typeof entry.name === "string" ? entry.name : "",
        value: typeof entry.value === "string" ? entry.value : "",
      }))
      .filter((entry) => entry.name.length > 0);
  } catch {
    return undefined;
  }
}

export function Docker(props: DockerProps) {
  const normalizedEnv = normalizeDockerEnvProp(props.env);
  const normalizedAttrs = normalizeDockerAttrsProp(props.attrs);
  return (
    <DockerInstance
      {...props}
      env={normalizedEnv}
      attrs={normalizedAttrs}
      initialState={InstanceState.Unknown}
    />
  );
}

export { DockerInstance };

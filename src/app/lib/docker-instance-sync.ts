import { DockerPortMapping, InstanceState, InstanceType } from "@/lib/types";

export type DockerSyncItem = {
  componentId?: string;
  image?: string;
  isPresent: boolean;
  name: string;
  ports?: DockerPortMapping[];
  status: InstanceState;
  type: InstanceType.Docker;
};

type DockerSyncResponse = {
  instances: DockerSyncItem[];
};

export async function syncDockerInstances(names: string[]): Promise<DockerSyncItem[]> {
  const response = await fetch("/api/docker/instances/sync", {
    body: JSON.stringify({ names }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    return [];
  }

  const bodyText = await response.text();
  if (bodyText.trim().length === 0) {
    return [];
  }

  try {
    const data = JSON.parse(bodyText) as DockerSyncResponse;
    return Array.isArray(data.instances) ? data.instances : [];
  } catch {
    return [];
  }
}
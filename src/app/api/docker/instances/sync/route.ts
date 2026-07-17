import { NextResponse } from "next/server";
import { getComponentName, getVariable } from "@/lib/variables";
import {
  getContainerStatus,
  getDockerInstanceSnapshot,
  isContainerPresent,
} from "@/app/lib/docker-lib";
import { DockerPortMapping, InstanceState, InstanceType } from "@/lib/types";

type DockerSyncRequest = {
  names?: string[];
};

type DockerSyncItem = {
  name: string;
  componentId?: string;
  image?: string;
  isPresent: boolean;
  ports?: DockerPortMapping[];
  status: InstanceState;
  type: InstanceType.Docker;
};

type DockerSyncSnapshotItem = DockerSyncItem & {
  componentId: string;
  image: string;
  isPresent: true;
  ports: DockerPortMapping[];
  status: typeof InstanceState.Running;
};

async function resolveNameCandidates(name: string): Promise<string[]> {
  const mappedName = await getVariable<string>(name).catch(() => null);
  const deploymentName = await getComponentName(name);

  return [mappedName, deploymentName, name].filter(
    (candidate): candidate is string => typeof candidate === "string" && candidate.length > 0
  );
}

async function syncDockerInstance(name: string): Promise<DockerSyncItem> {
  const resolvedNameCandidates = await resolveNameCandidates(name);

  for (const resolvedName of resolvedNameCandidates) {
    try {
      const isPresent = await isContainerPresent(resolvedName);
      if (!isPresent) {
        continue;
      }

      const status = await getContainerStatus(resolvedName);
      if (status === InstanceState.Running) {
        const snapshot = await getDockerInstanceSnapshot(resolvedName);
        if (snapshot !== null) {
          return {
            ...snapshot,
            componentId: snapshot.componentId ?? resolvedName,
            ports: snapshot.ports ?? [],
            name,
            isPresent: true,
            status,
            type: InstanceType.Docker,
          } satisfies DockerSyncSnapshotItem;
        }
      }

      return {
        name,
        componentId: resolvedName,
        isPresent: true,
        status,
        type: InstanceType.Docker,
      };
    } catch {
      // Try the next candidate. The client will preserve the last known stable state.
    }
  }

  return {
    name,
    isPresent: false,
    status: InstanceState.Unknown,
    type: InstanceType.Docker,
  };
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const body = rawBody.trim().length > 0 ? (JSON.parse(rawBody) as DockerSyncRequest) : {};
    const names = Array.isArray(body.names)
      ? [...new Set(body.names.filter((name): name is string => typeof name === "string" && name.length > 0))]
      : [];

    const instances = await Promise.all(names.map((name) => syncDockerInstance(name)));

    return NextResponse.json({ instances });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync docker instances";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
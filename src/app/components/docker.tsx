"use client";
import { Button } from "@/app/components/button";
import { useInstancesContext } from "@/app/contexts/instances";
import { InstanceState, InstanceType } from "@/lib/types";
import { getContainerStatus } from "@/app/lib/docker-lib";
import type {
  InstanceDocker,
  DockerPortMapping
} from "@/lib/types";
import { useEffect, useState } from "react";

/**
 * The default ports for a Docker instance.
 */
const defaultPorts: DockerPortMapping[] = [
  { containerPort: 80, hostPort: 80 },
];

/**
 * A component that represents a Docker instance.
 *
 * @param {InstanceDocker} props - The props for the DockerInstance component.
 * @returns {JSX.Element} - The rendered DockerInstance component.
 */
export function DockerInstance({
  name,
  description = "",
  image,
  ports = defaultPorts as DockerPortMapping[],
}: {
  name: string;
  description?: string;
  image: string;
  ports?: DockerPortMapping[];
}) {
  const { addInstance, removeInstance } = useInstancesContext();

  const [state, setState] = useState<InstanceState>(InstanceState.Unknown);

  useEffect(() => {
    const fetchStatus = async () => {
      const instanceState = await getContainerStatus(name);
      setState(instanceState);
      return instanceState as InstanceState;
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [name]);

  return (
    <>
      <div className="px-6 pt-4">
        <div className="font-bold text-xl mb-2">{name}</div>
        <p className="text-gray-700 text-sm">{description}</p>
      </div>
      <div className="px-6 pb-5">
        <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-xs text-gray-700 mr-2 mb-2 text-nowrap">
          <span className="font-semibold">image:</span>
          {image}
        </span>
        <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-xs text-gray-700 mr-2 mb-2">
          <span className="font-semibold">port:</span>
          {ports[0].hostPort}
        </span>
      </div>
      <div className="px-6 pt-4">
        <div className="font-bold text-xl mb-2 capitalize">Status: {state}</div>
      </div>
      <div className="px-6 pb-5">
        <Button
          onClick={async () => {
            setState(InstanceState.Creating);
            await addInstance({
              image,
              name,
              ports,
              type: InstanceType.Docker,
            } as InstanceDocker);
          }}
          disabled={
            state === InstanceState.Creating || state === InstanceState.Running || state === InstanceState.Removing
          }
          className="bg-blue-500"
        >
          Create
        </Button>
        <span className="px-1" />
        <Button
          onClick={async () => {
            setState(InstanceState.Removing);
            await removeInstance({
              name,
              type: InstanceType.Docker,
            } as InstanceDocker);
          }}
          disabled={state !== InstanceState.Running}
          className="bg-red-500"
        >
          Stop
        </Button>
      </div>
    </>
  );
}

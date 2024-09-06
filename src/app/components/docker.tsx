"use client";
import { Button } from '@/app/components/button';
import { useInstancesContext, InstanceType } from '@/app/contexts/instances';
import type { InstanceDocker, InstanceDockerPorts } from '@/app/contexts/instances';

/**
 * The default ports for a Docker instance.
 */
const defaultPorts: InstanceDockerPorts[] = [{ containerPort: 80, hostPort: 80 }];

/**
 * A component that represents a Docker instance.
 * 
 * @param {DockerInstanceProps} props - The props for the DockerInstance component.
 * @returns {JSX.Element} - The rendered DockerInstance component.
 */
const DockerInstance: React.FC<InstanceDocker> = ({ name, description='', image, ports=defaultPorts, type=InstanceType.Docker }) => {
  const { addInstance, removeInstance } = useInstancesContext();
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
      <div className="px-6 pb-5">
        <Button
          onClick={async () => {
            await addInstance({ type, image, name, port: '8080' } as InstanceDocker);
          }}
          className="bg-blue-500"
        >Create</Button>
        <span className="px-1" />
        <Button
          onClick={async () => {
            await removeInstance({ type, name } as InstanceDocker);
          }}
          className="bg-red-500"
        >Stop</Button>
      </div>
    </>
  );

}

export { DockerInstance };

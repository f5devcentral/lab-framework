import React from "react";
import { Docker, DockerInstance } from "@/app/components/docker";

type DockerContainerProps = {
  children?: React.ReactNode;
};

export function DockerContainer({ children }: DockerContainerProps) {
  const dockerComponents = React.Children.toArray(children).filter((child) => {
    if (!React.isValidElement(child)) {
      return false;
    }

    const childType = child.type as React.ElementType;
    return childType === Docker || childType === DockerInstance;
  });

  return (
    <div id="docker-outer-container" className="flex flex-col border border-gray-300 p-4 rounded">
      <span className="font-bold text-xl">Docker Containers</span>
      <div id="docker-inner-container" className="mt-3 flex flex-wrap gap-4">
        {dockerComponents.map((component, index) => (
          <div key={index} className="docker-item">
            {component}
          </div>
        ))}
      </div>
    </div>
  );
}

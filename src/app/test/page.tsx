import React from "react";
import { InstancesContextProvider } from "@/app/contexts/instances";
import { DockerInstance } from "@/app/components/docker";
import { Card } from "@/app/components/card";

export const dynamic = "force-dynamic";

const RoutePage: React.FC = () => {
  return (
    <InstancesContextProvider>
      <div>
        <h1>Welcome to the Test Page</h1>
      </div>
      <Card>
        <DockerInstance
          name="NGINX Plus R32"
          description="NGINX Plus R32 with NGINX Agent"
          image="private-registry.nginx.com/nginx-plus/agent:debian"
          ports={[{ containerPort: 80, hostPort: 8089 }]}
        />
      </Card>
    </InstancesContextProvider>
  );
};

export default RoutePage;

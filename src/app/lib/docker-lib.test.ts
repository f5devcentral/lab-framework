import { act } from "@testing-library/react";
import {
  createContainer,
  getContainerPorts,
  getContainerLogs,
  removeContainer,
  stopContainer,
  getContainerStatus
} from "@/app/lib/docker-lib";
import { getInstanceDeploymentName } from "@/app/lib/utils";
import { getEnvVariable } from "@/lib/variables";
import { DockerPortMapping } from "@/lib/types";
import { Protocol } from "@/lib/types";

jest.mock("@/app/lib/utils");
jest.mock("@/lib/variables", () => {
  const actual = jest.requireActual("@/lib/variables");
  return {
    ...actual,
    getEnvVariable: jest.fn(),
  };
});

const mockContainer = {
  inspect: jest.fn().mockResolvedValue({ State: { Status: "running" } }),
  logs: jest.fn().mockResolvedValue(Buffer.from("log-line\n")),
  start: jest.fn(),
  stop: jest.fn(),
  remove: jest.fn(),
};

const mockImage = {
  inspect: jest.fn().mockResolvedValue({ Id: "image-id" }),
};

const mockDockerode = {
  createContainer: jest.fn().mockReturnValue(mockContainer),
  getContainer: jest.fn().mockReturnValue(mockContainer),
  getImage: jest.fn().mockReturnValue(mockImage),
  modem: {
    followProgress: jest.fn((stream, cb) => cb(null)),
  },
  pull: jest.fn((image, cb) => cb(null, { on: jest.fn() })),
};

jest.mock('dockerode', () => {
  return jest.fn().mockImplementation(() => mockDockerode);
});

(getInstanceDeploymentName as jest.Mock).mockImplementation(
  ({ name }) => `mock-${name}`
);

describe("Docker Library", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getEnvVariable as jest.Mock).mockImplementation(async (key: string) => {
      if (key === "DEPLOYMENT_IDENTIFIER") {
        return "testpet";
      }
      if (key === "test-name") {
        return "mapped-test-name";
      }
      if (key === "test-container-id") {
        return "mapped-test-container-id";
      }
      return null;
    });
    mockImage.inspect.mockResolvedValue({ Id: "image-id" });
    mockDockerode.pull.mockImplementation((image, cb) => cb(null, { on: jest.fn() }));
    mockDockerode.modem.followProgress.mockImplementation((stream, cb) => cb(null));
  });

  describe("createContainer", () => {
    it("should create and start a Docker container with default port settings", async () => {

      await act(async () => {
        await createContainer({
          attrs: [{ name: "volume", value: "/host:/container" }],
          env: [{ name: "TOKEN", value: "secret" }],
          image: "test-image",
          name: "test-name",
          ports: [{ containerPort: 80, hostPort: 8080 }],
        });
      });

      expect(mockDockerode.createContainer).toHaveBeenCalledWith({
        Env: ["TOKEN=secret"],
        Hostname: "mapped-test-name",
        Image: "test-image",
        name: "mapped-test-name",
        HostConfig: {
          Binds: ["/host:/container"],
          NetworkMode: "lab-framework",
          PortBindings: {
            "80/tcp": [{ HostPort: "8080" }],
          },
        },
      });
      expect(mockDockerode.getImage).toHaveBeenCalledWith("test-image");
      expect(mockDockerode.pull).not.toHaveBeenCalled();
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it("should pull the image if it is not available locally", async () => {
      mockImage.inspect.mockRejectedValueOnce(new Error("No such image: test-image"));

      await createContainer({
        attrs: [],
        env: [],
        image: "test-image",
        name: "test-name",
        ports: [{ containerPort: 80, hostPort: 8080 }],
      });

      expect(mockDockerode.pull).toHaveBeenCalledWith("test-image", expect.any(Function));
      expect(mockDockerode.modem.followProgress).toHaveBeenCalled();
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it("should delete an existing stopped container before creating a new one", async () => {
      mockContainer.inspect.mockResolvedValueOnce({ State: { Status: "exited" } });

      await createContainer({
        attrs: [],
        env: [],
        image: "test-image",
        name: "test-name",
        ports: [{ containerPort: 80, hostPort: 8080 }],
      });

      expect(mockDockerode.getContainer).toHaveBeenCalledWith("mapped-test-name");
      expect(mockContainer.remove).toHaveBeenCalledTimes(1);
      expect(mockDockerode.createContainer).toHaveBeenCalledTimes(1);
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it("should raise a clear auth error if image pull is unauthorized", async () => {
      mockImage.inspect.mockRejectedValueOnce(new Error("No such image: test-image"));
      mockDockerode.pull.mockImplementationOnce((image, cb) =>
        cb(new Error("unauthorized: authentication required"), undefined)
      );

      await expect(
        createContainer({
          attrs: [],
          env: [],
          image: "test-image",
          name: "test-name",
          ports: [{ containerPort: 80, hostPort: 8080 }],
        })
      ).rejects.toThrow(
        "Unable to pull image test-image. Docker registry authentication is required for this image."
      );
    });

    it("should recreate existing container when name conflict occurs and existing container is running", async () => {
      const conflictError = Object.assign(
        new Error("Conflict. The container name is already in use"),
        { statusCode: 409 }
      );
      mockDockerode.createContainer.mockRejectedValueOnce(conflictError);
      mockContainer.inspect.mockResolvedValueOnce({ State: { Status: "running" } });

      await expect(
        createContainer({
          attrs: [],
          env: [],
          image: "test-image",
          name: "test-name",
          ports: [{ containerPort: 80, hostPort: 8080 }],
        })
      ).resolves.toBeUndefined();

      expect(mockDockerode.getContainer).toHaveBeenCalledWith("mapped-test-name");
      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
      expect(mockDockerode.createContainer).toHaveBeenCalledTimes(2);
      expect(mockDockerode.createContainer).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          Env: [],
        })
      );
      expect(mockDockerode.createContainer).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          Env: [],
        })
      );
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it("should recreate existing container when name conflict occurs and container is exited", async () => {
      const conflictError = Object.assign(
        new Error("Conflict. The container name is already in use"),
        { statusCode: 409 }
      );
      mockDockerode.createContainer.mockRejectedValueOnce(conflictError);
      mockContainer.inspect.mockResolvedValueOnce({ State: { Status: "exited" } });

      await expect(
        createContainer({
          attrs: [],
          env: [],
          image: "test-image",
          name: "test-name",
          ports: [{ containerPort: 80, hostPort: 8080 }],
        })
      ).resolves.toBeUndefined();

      expect(mockDockerode.getContainer).toHaveBeenCalledWith("mapped-test-name");
      expect(mockContainer.remove).toHaveBeenCalled();
      expect(mockDockerode.createContainer).toHaveBeenCalledTimes(2);
      expect(mockContainer.start).toHaveBeenCalled();
    });
  });

  describe("createContainer", () => {
    it("should create and start a Docker container with custom port settings", async () => {
      await createContainer({
        attrs: [],
        env: [],
        image: "test-image",
        name: "test-name",
        ports: [
          { containerPort: 81, hostPort: 8081 },
          { containerPort: 82, hostPort: 8082, protocol: Protocol.Udp },
        ] as DockerPortMapping[],
      });

      expect(mockDockerode.createContainer).toHaveBeenCalledWith({
        Env: [],
        Hostname: "mapped-test-name",
        Image: "test-image",
        name: "mapped-test-name",
        HostConfig: {
          Binds: [],
          NetworkMode: "lab-framework",
          PortBindings: {
            "81/tcp": [{ HostPort: "8081" }],
            "82/udp": [{ HostPort: "8082" }],
          },
        },
      });
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it("should request a random host port when hostPort is omitted", async () => {
      await createContainer({
        attrs: [],
        env: [],
        image: "test-image",
        name: "test-name",
        ports: [{ containerPort: 80 }],
      });

      expect(mockDockerode.createContainer).toHaveBeenCalledWith({
        Env: [],
        Hostname: "mapped-test-name",
        Image: "test-image",
        name: "mapped-test-name",
        HostConfig: {
          Binds: [],
          NetworkMode: "lab-framework",
          PortBindings: {
            "80/tcp": [{ HostPort: "" }],
          },
        },
      });
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it("should resolve process.env placeholders in attrs volume values", async () => {
      process.env.CONTAINER_MOUNT_BASE_DIR = "/tmp/lab";

      await createContainer({
        attrs: [
          {
            name: "volume",
            value: "${process.env[\"CONTAINER_MOUNT_BASE_DIR\"]}/ssl:/etc/nginx/ssl",
          },
        ],
        env: [],
        image: "test-image",
        name: "test-name",
        ports: [{ containerPort: 80 }],
      });

      expect(mockDockerode.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            Binds: ["/tmp/lab/ssl:/etc/nginx/ssl"],
          }),
        })
      );
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it("should map supported attrs into docker create config", async () => {
      await createContainer({
        attrs: [
          { name: "hostname", value: "nginx-plus-local" },
          { name: "network", value: "custom-bridge" },
          { name: "restart", value: "unless-stopped" },
          { name: "label", value: "lab.role=nginx" },
        ],
        env: [],
        image: "test-image",
        name: "test-name",
        ports: [{ containerPort: 80 }],
      });

      expect(mockDockerode.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Hostname: "nginx-plus-local",
          Labels: {
            "lab.role": "nginx",
          },
          HostConfig: expect.objectContaining({
            NetworkMode: "custom-bridge",
            RestartPolicy: { Name: "unless-stopped" },
          }),
        })
      );
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it("should preserve unknown attrs as labels", async () => {
      await createContainer({
        attrs: [{ name: "ipc", value: "host" }],
        env: [],
        image: "test-image",
        name: "test-name",
        ports: [{ containerPort: 80 }],
      });

      expect(mockDockerode.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Labels: {
            "lab-framework.attr.0.ipc": "host",
          },
        })
      );
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it("should not resolve string templates unless explicitly enabled", async () => {
      process.env.PETNAME = "demo-123";

      await createContainer({
        attrs: [],
        env: [{ name: "NGINX_AGENT_LABELS", value: "config-sync-group=${PETNAME}" }],
        image: "test-image",
        name: "test-name",
        ports: [{ containerPort: 80, hostPort: 8080 }],
      });

      expect(mockDockerode.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Env: ["NGINX_AGENT_LABELS=config-sync-group=${PETNAME}"],
        })
      );
    });

    it("should resolve string template env values before creating a container when enabled", async () => {
      process.env.PETNAME = "demo-123";

      await createContainer({
        attrs: [],
        env: [{ name: "NGINX_AGENT_LABELS", value: "config-sync-group=${PETNAME}", resolveTemplates: true }],
        image: "test-image",
        name: "test-name",
        ports: [{ containerPort: 80, hostPort: 8080 }],
      });

      expect(mockDockerode.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Env: ["NGINX_AGENT_LABELS=config-sync-group=demo-123"],
        })
      );
    });

    it("should resolve secret env vars server-side before creating a container", async () => {
      (getEnvVariable as jest.Mock).mockImplementation(async (key: string) => {
        if (key === "DEPLOYMENT_IDENTIFIER") {
          return "testpet";
        }
        if (key === "NGINX_LICENSE_JWT") {
          return "jwt-from-server";
        }
        return null;
      });

      await createContainer({
        attrs: [],
        env: [{ name: "NGINX_LICENSE_JWT", isVariable: true, isSecret: true }],
        image: "test-image",
        name: "test-name",
        ports: [{ containerPort: 80, hostPort: 8080 }],
      });

      expect(mockDockerode.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Env: ["NGINX_LICENSE_JWT=jwt-from-server"],
        })
      );
    });

    it("should fail container creation when a required secret env var is missing", async () => {
      (getEnvVariable as jest.Mock).mockImplementation(async (key: string) => {
        if (key === "DEPLOYMENT_IDENTIFIER") {
          return "testpet";
        }
        return null;
      });

      await expect(
        createContainer({
          attrs: [],
          env: [{ name: "NGINX_LICENSE_JWT", isVariable: true, isSecret: true }],
          image: "test-image",
          name: "test-name",
          ports: [{ containerPort: 80, hostPort: 8080 }],
        })
      ).rejects.toThrow("Missing required secret environment variable: NGINX_LICENSE_JWT");
    });

    it("should use provided env value for a secret variable when server env is missing", async () => {
      (getEnvVariable as jest.Mock).mockImplementation(async (key: string) => {
        if (key === "DEPLOYMENT_IDENTIFIER") {
          return "testpet";
        }
        return null;
      });

      await expect(
        createContainer({
          attrs: [],
          env: [
            {
              name: "NGINX_AGENT_COMMAND_AUTH_TOKEN",
              isVariable: true,
              isSecret: true,
              value: "token-from-browser",
            },
          ],
          image: "test-image",
          name: "test-name",
          ports: [{ containerPort: 80, hostPort: 8080 }],
        })
      ).resolves.toBeUndefined();

      expect(mockDockerode.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Env: ["NGINX_AGENT_COMMAND_AUTH_TOKEN=token-from-browser"],
        })
      );
    });
  });

  describe("stopContainer", () => {
    it("should stop a running Docker container", async () => {
      await stopContainer("test-container-id");

      expect(mockDockerode.getContainer).toHaveBeenCalledWith(
        "mapped-test-container-id"
      );
      expect(mockContainer.stop).toHaveBeenCalled();
    });
  });

  describe("removeContainer", () => {
    it("should stop and remove a Docker container", async () => {
      await removeContainer("test-container-id");

      expect(mockDockerode.getContainer).toHaveBeenCalledWith(
        "mapped-test-container-id"
      );
      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
    });
  });

  describe("getContainerStatus", () => {
    it("should return the status of a running Docker container", async () => {
      const status = await getContainerStatus("test-container-id");

      expect(mockDockerode.getContainer).toHaveBeenCalledWith(
        "mapped-test-container-id"
      );
      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(status).toBe("running");
    });

    it("should return the status of a stopped Docker container", async () => {
      mockContainer.inspect.mockResolvedValueOnce({ State: { Status: "exited" } });

      const status = await getContainerStatus("test-container-id");

      expect(mockDockerode.getContainer).toHaveBeenCalledWith(
        "mapped-test-container-id"
      );
      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(status).toBe("exited");
    });

    it("should return the status of a running Docker container", async () => {
      const status = await getContainerStatus("test-container-id");

      expect(mockDockerode.getContainer).toHaveBeenCalledWith(
        "mapped-test-container-id"
      );
      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(status).toBe("running");
    });

    it("should return the status of a stopped Docker container", async () => {
      mockContainer.inspect.mockResolvedValueOnce({ State: { Status: "exited" } });

      const status = await getContainerStatus("test-container-id");

      expect(mockDockerode.getContainer).toHaveBeenCalledWith(
        "mapped-test-container-id"
      );
      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(status).toBe("exited");
    });

    it("should return 'unknown' if the container does not exist", async () => {
      mockContainer.inspect.mockRejectedValueOnce(new Error("no such container"));

      const status = await getContainerStatus("test-container-id");

      expect(mockDockerode.getContainer).toHaveBeenCalledWith(
        "mapped-test-container-id"
      );
      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(status).toBe("unknown");
    });

    it("should throw an error for other inspection errors", async () => {
      const error = new Error("some other error");
      mockContainer.inspect.mockRejectedValueOnce(error);

      await expect(getContainerStatus("test-container-id")).rejects.toThrow(error);

      expect(mockDockerode.getContainer).toHaveBeenCalledWith(
        "mapped-test-container-id"
      );
      expect(mockContainer.inspect).toHaveBeenCalled();
    });

    it("should resolve nginx-plus-1 to the normalized deployment name used by the lab", async () => {
      (getInstanceDeploymentName as jest.Mock).mockImplementationOnce(
        ({ name, deploymentIdentifier }) =>
          name === "nginx-plus-1"
            ? `${deploymentIdentifier}-nginxplus1`
            : `mock-${name}`
      );

      const status = await getContainerStatus("nginx-plus-1");

      expect(mockDockerode.getContainer).toHaveBeenCalledWith(
        "testpet-nginxplus1"
      );
      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(status).toBe("running");
    });
  });

  describe("getContainerLogs", () => {
    it("should return container logs as text", async () => {
      const logs = await getContainerLogs("test-container-id");

      expect(mockDockerode.getContainer).toHaveBeenCalledWith("mapped-test-container-id");
      expect(mockContainer.logs).toHaveBeenCalledWith({
        follow: false,
        stderr: true,
        stdout: true,
        tail: 500,
      });
      expect(logs).toContain("log-line");
    });
  });

  describe("getContainerPorts", () => {
    it("should deduplicate duplicate host port bindings for the same container port", async () => {
      mockContainer.inspect.mockResolvedValueOnce({
        NetworkSettings: {
          Ports: {
            "80/tcp": [
              { HostIp: "0.0.0.0", HostPort: "51697" },
              { HostIp: "::", HostPort: "51697" },
            ],
          },
        },
      });

      const ports = await getContainerPorts("test-container-id");

      expect(ports).toEqual([
        { containerPort: 80, hostPort: 51697, protocol: Protocol.Tcp },
      ]);
    });
  });

  describe("getDockerInstanceSnapshot", () => {
    it("should return a running instance snapshot with ports", async () => {
      mockContainer.inspect.mockResolvedValue({
        State: { Status: "running" },
        Config: { Image: "nginx:latest" },
        NetworkSettings: {
          Ports: {
            "80/tcp": [{ HostIp: "0.0.0.0", HostPort: "62226" }],
          },
        },
      });

      const { getDockerInstanceSnapshot } = await import("./docker-lib");
      const snapshot = await getDockerInstanceSnapshot("test-container-id");

      expect(snapshot).toEqual(
        expect.objectContaining({
          name: "test-container-id",
          componentId: "mapped-test-container-id",
          image: "nginx:latest",
          status: "running",
        })
      );
      expect(snapshot?.ports).toEqual([
        { containerPort: 80, hostPort: 62226, protocol: Protocol.Tcp },
      ]);
    });

    it("should return null for a non-running container", async () => {
      mockContainer.inspect.mockResolvedValueOnce({
        State: { Status: "exited" },
        Config: { Image: "nginx:latest" },
      });

      const { getDockerInstanceSnapshot } = await import("./docker-lib");
      const snapshot = await getDockerInstanceSnapshot("test-container-id");

      expect(snapshot).toBeNull();
    });
  });
});

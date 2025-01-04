import Docker from "dockerode";
import {
  createContainer,
  removeContainer,
  stopContainer,
} from "@/app/lib/docker-lib";
import { getInstanceDeploymentName } from "@/app/lib/utils";
import { InstanceDockerPorts, Protocol } from "../contexts/instances";

jest.mock("dockerode");
jest.mock("@/app/lib/utils");

describe("Docker Library", () => {
  const mockDocker = new Docker() as jest.Mocked<Docker>;
  const mockContainer = {
    start: jest.fn(),
    stop: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Docker as unknown as jest.Mock).mockImplementation(() => mockDocker);
    mockDocker.createContainer.mockResolvedValue(
      mockContainer as unknown as jest.Mocked<Docker.Container>
    );
    mockDocker.getContainer.mockReturnValue(
      mockContainer as unknown as jest.Mocked<Docker.Container>
    );
    (getInstanceDeploymentName as jest.Mock).mockImplementation(
      ({ name }) => `mock-${name}`
    );
  });

  describe("createContainer", () => {
    it("should create and start a Docker container with default port settings", async () => {
      await createContainer({
        image: "test-image",
        name: "test-name",
        ports: [{ containerPort: 80, hostPort: 8080 }],
      });

      expect(mockDocker.createContainer).toHaveBeenCalledWith({
        Image: "test-image",
        name: "mock-test-name",
        HostConfig: {
          PortBindings: {
            "80/tcp": [{ HostPort: "8080" }],
          },
        },
      });
      expect(mockContainer.start).toHaveBeenCalled();
    });
  });

  describe("createContainer", () => {
    it("should create and start a Docker container with custom port settings", async () => {
      await createContainer({
        image: "test-image",
        name: "test-name",
        ports: [
          { containerPort: 81, hostPort: 8081 },
          { containerPort: 82, hostPort: 8082, protocol: Protocol.Udp },
        ] as InstanceDockerPorts[],
      });

      expect(mockDocker.createContainer).toHaveBeenCalledWith({
        Image: "test-image",
        name: "mock-test-name",
        HostConfig: {
          PortBindings: {
            "81/tcp": [{ HostPort: "8081" }],
            "82/udp": [{ HostPort: "8082" }],
          },
        },
      });
      expect(mockContainer.start).toHaveBeenCalled();
    });
  });

  describe("stopContainer", () => {
    it("should stop a running Docker container", async () => {
      await stopContainer("test-container-id");

      expect(mockDocker.getContainer).toHaveBeenCalledWith(
        "mock-test-container-id"
      );
      expect(mockContainer.stop).toHaveBeenCalled();
    });
  });

  describe("removeContainer", () => {
    it("should stop and remove a Docker container", async () => {
      await removeContainer("test-container-id");

      expect(mockDocker.getContainer).toHaveBeenCalledWith(
        "mock-test-container-id"
      );
      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
    });
  });
});

import { act } from "@testing-library/react";
// import Docker from "dockerode";
import {
  createContainer,
  removeContainer,
  stopContainer,
  getContainerStatus
} from "@/app/lib/docker-lib";
import { getInstanceDeploymentName } from "@/app/lib/utils";
import { InstanceDockerPorts } from "../contexts/instances";
import { Protocol } from "@/lib/types";

jest.mock("@/app/lib/utils");

const mockContainer = {
  inspect: jest.fn().mockResolvedValue({ State: { Status: "running" } }),
  start: jest.fn(),
  stop: jest.fn(),
  remove: jest.fn(),
};

const mockDockerode = {
  createContainer: jest.fn().mockReturnValue(mockContainer),
  getContainer: jest.fn().mockReturnValue(mockContainer),
};

jest.mock('dockerode', () => {
  return jest.fn().mockImplementation(() => mockDockerode);
});

(getInstanceDeploymentName as jest.Mock).mockImplementation(
  ({ name }) => `mock-${name}`
);

describe("Docker Library", () => {

  describe("createContainer", () => {
    it("should create and start a Docker container with default port settings", async () => {

      await act(async () => {
        await createContainer({
          image: "test-image",
          name: "test-name",
          ports: [{ containerPort: 80, hostPort: 8080 }],
        });
      });

      expect(mockDockerode.createContainer).toHaveBeenCalledWith({
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

      expect(mockDockerode.createContainer).toHaveBeenCalledWith({
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

      expect(mockDockerode.getContainer).toHaveBeenCalledWith(
        "mock-test-container-id"
      );
      expect(mockContainer.stop).toHaveBeenCalled();
    });
  });

  describe("removeContainer", () => {
    it("should stop and remove a Docker container", async () => {
      await removeContainer("test-container-id");

      expect(mockDockerode.getContainer).toHaveBeenCalledWith(
        "mock-test-container-id"
      );
      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
    });
  });

  describe("getContainerStatus", () => {
    it("should return the status of a running Docker container", async () => {
      const status = await getContainerStatus("test-container-id");

      expect(mockDockerode.getContainer).toHaveBeenCalledWith(
        "mock-test-container-id"
      );
      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(status).toBe("running");
    });

    it("should return the status of a stopped Docker container", async () => {
      mockContainer.inspect.mockResolvedValueOnce({ State: { Status: "exited" } });

      const status = await getContainerStatus("test-container-id");

      expect(mockDockerode.getContainer).toHaveBeenCalledWith(
        "mock-test-container-id"
      );
      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(status).toBe("exited");
    });

    it("should return the status of a running Docker container", async () => {
      const status = await getContainerStatus("test-container-id");

      expect(mockDockerode.getContainer).toHaveBeenCalledWith(
        "mock-test-container-id"
      );
      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(status).toBe("running");
    });

    it("should return the status of a stopped Docker container", async () => {
      mockContainer.inspect.mockResolvedValueOnce({ State: { Status: "exited" } });

      const status = await getContainerStatus("test-container-id");

      expect(mockDockerode.getContainer).toHaveBeenCalledWith(
        "mock-test-container-id"
      );
      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(status).toBe("exited");
    });

    it("should return 'unknown' if the container does not exist", async () => {
      mockContainer.inspect.mockRejectedValueOnce(new Error("no such container"));

      const status = await getContainerStatus("test-container-id");

      expect(mockDockerode.getContainer).toHaveBeenCalledWith(
        "mock-test-container-id"
      );
      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(status).toBe("unknown");
    });

    it("should throw an error for other inspection errors", async () => {
      const error = new Error("some other error");
      mockContainer.inspect.mockRejectedValueOnce(error);

      await expect(getContainerStatus("test-container-id")).rejects.toThrow(error);

      expect(mockDockerode.getContainer).toHaveBeenCalledWith(
        "mock-test-container-id"
      );
      expect(mockContainer.inspect).toHaveBeenCalled();
    });
  });
});

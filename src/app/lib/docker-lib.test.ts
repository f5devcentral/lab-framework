import { act } from "@testing-library/react";
// import Docker from "dockerode";
import {
  createContainer,
  removeContainer,
  stopContainer,
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
});

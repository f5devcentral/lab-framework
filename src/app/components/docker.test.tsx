import { render, fireEvent, screen, act, waitFor } from "@testing-library/react";
import { InstancesContextType } from "../contexts/instances";

import { getContainerLogs } from "@/app/lib/docker-lib";
import { getContainerPorts } from "@/app/lib/docker-lib";
import { syncDockerInstances } from "@/app/lib/docker-instance-sync";
import { checkAPI } from "@/lib/check-api";
import { getComponentName } from "@/lib/variables";
import { useInstancesContext } from "@/app/contexts/instances";
import { InstanceState, InstanceType } from "@/lib/types";

jest.mock("@/app/lib/docker-lib", () => ({
  createContainer: jest.fn(),
  execShellCommand: jest.fn().mockResolvedValue("ok"),
  getContainerLogs: jest.fn().mockResolvedValue("log-line"),
  getContainerPorts: jest.fn().mockResolvedValue([]),
  getDockerInstanceSnapshot: jest.fn().mockResolvedValue(null),
  removeContainer: jest.fn(),
  isContainerDoesNotExistError: jest.fn(),
  getContainerStatus: jest.fn().mockResolvedValue("unknown"),
}));

jest.mock("@/lib/check-api", () => ({
  checkAPI: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/app/lib/docker-instance-sync", () => ({
  syncDockerInstances: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/lib/variables", () => ({
  getComponentName: jest.fn().mockResolvedValue("testing-test-docker"),
  getVariable: jest.fn().mockResolvedValue(null),
  setClientVariable: jest.fn(),
}));

const mockAddInstance = jest.fn();
const mockRemoveInstance = jest.fn();
const mockSetDockerStoppedByUser = jest.fn();
const mockUpsertDockerInstance = jest.fn();

const providerProps: InstancesContextType = {
  instances: [],
  addInstance: mockAddInstance,
  removeInstance: mockRemoveInstance,
  setDockerStoppedByUser: mockSetDockerStoppedByUser,
  upsertDockerInstance: mockUpsertDockerInstance,
};

jest.mock("@/app/contexts/instances", () => ({
  useInstancesContext: jest.fn(),
}));

import { DockerInstance } from "./docker";
import React from "react";

describe("DockerInstance Component", () => {
  const createDeferred = <T,>() => {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (getComponentName as jest.Mock).mockResolvedValue("testing-test-docker");
    (checkAPI as jest.Mock).mockResolvedValue(true);
    (syncDockerInstances as jest.Mock).mockResolvedValue([]);
    mockUpsertDockerInstance.mockImplementation(() => undefined);
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Unknown,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });
  });

  const flushStatusUpdate = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  const expectStatusText = (statusText: string) => {
    expect(screen.getByTestId("docker-status")).toHaveTextContent(
      new RegExp(`Status:\\s*${statusText}`, "i")
    );
  };

  it("should render DockerInstance with default props", async () => {
    const { getByText } = render(
      <DockerInstance name="Test Docker" image="test-image" />
    );

    await flushStatusUpdate();

    await act(async () => {
      fireEvent.click(getByText("Details"));
    });

    expect(getByText("Test Docker")).toBeInTheDocument();
    expect(getByText("test-image")).toBeInTheDocument();
    expect(screen.getByText(/host\s*n\/a,\s*container\s*80/i)).toBeInTheDocument();
  });

  it("should call addInstance when Create button is clicked", async () => {
    const { getByText } = render(
      <DockerInstance
        attrs={[{ name: "volume", value: "/host:/container" }]}
        description="Demo Description"
        env={[{ name: "TOKEN", isVariable: true }]}
        name="Test Docker"
        image="test-image"
        port={{ container: 8089, host: 9000 }}
      />
    );

    await flushStatusUpdate();

    const createButton = getByText("Run");
    await act(async () => {
      fireEvent.click(createButton);
    });

    expect(mockAddInstance).toHaveBeenCalledWith({
      attrs: [{ name: "volume", value: "/host:/container" }],
      env: [{ name: "TOKEN", isVariable: true }],
      image: "test-image",
      name: "Test Docker",
      ports: [{ containerPort: 8089, hostPort: 9000 }],
      type: 0,
    });
  });

  it("should show pending indicator while Run is in progress", async () => {
    const deferred = createDeferred<Error | null>();
    mockAddInstance.mockReturnValueOnce(deferred.promise);

    render(<DockerInstance name="Test Docker" image="test-image" />);

    await act(async () => {
      fireEvent.click(screen.getByText("Run"));
    });

    expectStatusText("Starting container\\.\\.\\.");

    await act(async () => {
      deferred.resolve(null);
      await deferred.promise;
    });

    expect(screen.getByTestId("docker-status")).not.toHaveTextContent(/Starting container\.\.\./i);
  });

  it("should not switch to not started while run is reconciling", async () => {
    const deferred = createDeferred<Error | null>();
    mockAddInstance.mockReturnValueOnce(deferred.promise);

    const { rerender } = render(<DockerInstance name="Test Docker" image="test-image" />);

    await act(async () => {
      fireEvent.click(screen.getByText("Run"));
    });

    expectStatusText("Starting container\\.\\.\\.");

    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Unknown,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });

    rerender(<DockerInstance name="Test Docker" image="test-image" />);

    expectStatusText("Starting container\\.\\.\\.");
    expect(screen.getByTestId("docker-status")).not.toHaveTextContent(/Status:\s*Not Started/i);

    await act(async () => {
      deferred.resolve(null);
      await deferred.promise;
    });
  });

  it("should removeInstance when Stop button is clicked", async () => {
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Running,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });

    await act(async () => {
      render(<DockerInstance name="Test Docker" image="test-image" />);
    });

    await act(async () => {
      const stopButton = screen.getByText("Stop");
      expect(stopButton).not.toBeDisabled();
      fireEvent.click(stopButton);
    });

    expect(mockRemoveInstance).toHaveBeenCalledWith({
      name: "Test Docker",
      type: 0,
    });
  });

  it("should disable Run button when container is running", async () => {
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Running,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });

    render(<DockerInstance name="Test Docker" image="test-image" />);

    await flushStatusUpdate();

    expect(screen.getByText("Run")).toBeDisabled();
  });

  it("should render running status immediately when the context already has a running instance", async () => {
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Running,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });

    render(<DockerInstance name="Test Docker" image="test-image" />);

    expectStatusText("Running");
    expect(screen.getByTestId("docker-status")).not.toHaveTextContent(/Not Started/i);
  });

  it("should show pending indicator while Stop is in progress", async () => {
    const deferred = createDeferred<void>();
    mockRemoveInstance.mockReturnValueOnce(deferred.promise);
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Running,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });

    const { rerender } = render(<DockerInstance name="Test Docker" image="test-image" />);

    await act(async () => {
      fireEvent.click(screen.getByText("Stop"));
    });

    expectStatusText("Stopping container\\.\\.\\.");

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [],
    });
    rerender(<DockerInstance name="Test Docker" image="test-image" />);

    await waitFor(() => {
      expect(screen.getByTestId("docker-status")).not.toHaveTextContent(/Stopping container\.\.\./i);
    });
  });

  it("should not flash running status after Stop while removal is still reconciling", async () => {
    const deferred = createDeferred<void>();
    mockRemoveInstance.mockReturnValueOnce(deferred.promise);
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Running,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });

    const { rerender } = render(<DockerInstance name="Test Docker" image="test-image" />);

    await act(async () => {
      fireEvent.click(screen.getByText("Stop"));
    });

    expectStatusText("Stopping container\\.\\.\\.");

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    // Context still reports running until reconciliation completes.
    rerender(<DockerInstance name="Test Docker" image="test-image" />);
    expectStatusText("Stopping container\\.\\.\\.");
    expect(screen.getByTestId("docker-status")).not.toHaveTextContent(/Status:\s*Running/i);

    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [],
    });
    rerender(<DockerInstance name="Test Docker" image="test-image" />);

    await waitFor(() => {
      expectStatusText("Not Started");
    });
  });

  it("should not switch to not started while stop is reconciling", async () => {
    const deferred = createDeferred<void>();
    mockRemoveInstance.mockReturnValueOnce(deferred.promise);
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Running,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });

    const { rerender } = render(<DockerInstance name="Test Docker" image="test-image" />);

    await act(async () => {
      fireEvent.click(screen.getByText("Stop"));
    });

    expectStatusText("Stopping container\\.\\.\\.");

    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Unknown,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });

    rerender(<DockerInstance name="Test Docker" image="test-image" />);

    expectStatusText("Stopping container\\.\\.\\.");
    expect(screen.getByTestId("docker-status")).not.toHaveTextContent(/Status:\s*Not Started/i);

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [],
    });
    rerender(<DockerInstance name="Test Docker" image="test-image" />);

    await waitFor(() => {
      expectStatusText("Not Started");
    });
  });

  it("should only show Delete button when container terminated unexpectedly", async () => {
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Running,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });

    render(<DockerInstance name="Test Docker" image="test-image" />);

    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("should call removeInstance when Delete button is clicked for unexpected termination", async () => {
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Exited,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });

    await act(async () => {
      render(<DockerInstance name="Test Docker" image="test-image" />);
    });

    await act(async () => {
      const deleteButton = screen.getByText("Delete");
      expect(deleteButton).not.toBeDisabled();
      fireEvent.click(deleteButton);
    });

    expect(mockRemoveInstance).toHaveBeenCalledWith({
      name: "Test Docker",
      type: 0,
    });
  });

  it("should show non-running status in red when container stopped unexpectedly", async () => {
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Exited,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });

    render(<DockerInstance name="Test Docker" image="test-image" />);

    await flushStatusUpdate();

    const statusElement = screen.getByTestId("docker-status");
    expectStatusText("Exited");
    expect(statusElement).toHaveClass("text-red-600");
  });

  it("should reset status to not started when container is removed from context", async () => {
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Exited,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });

    const { rerender } = render(<DockerInstance name="Test Docker" image="test-image" />);

    await flushStatusUpdate();
    expectStatusText("Exited");

    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [],
    });

    rerender(<DockerInstance name="Test Docker" image="test-image" />);

    await waitFor(() => {
      expectStatusText("Not Started");
    });
  });

  it("should display not started when docker instance status is missing", async () => {
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          stoppedByUser: false,
          type: 0,
        },
      ],
    });

    render(<DockerInstance name="Test Docker" image="test-image" />);

    await waitFor(() => {
      expectStatusText("Not Started");
    });
  });

  it("should update status when the docker instance appears in context after the initial render", async () => {
    (useInstancesContext as jest.Mock).mockReturnValueOnce({
      ...providerProps,
      instances: [],
    });

    const { rerender } = render(<DockerInstance name="Test Docker" image="test-image" />);

    await flushStatusUpdate();
    expectStatusText("Not Started");

    (useInstancesContext as jest.Mock).mockReturnValueOnce({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Running,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });

    rerender(<DockerInstance name="Test Docker" image="test-image" />);

    await waitFor(() => {
      expectStatusText("Running");
      expect(screen.getByTestId("docker-status")).not.toHaveTextContent(/Not Started/i);
    });
  });

  it("should keep the rendered state aligned with the current context status", async () => {
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Running,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });

    const { rerender } = render(<DockerInstance name="Test Docker" image="test-image" />);

    expectStatusText("Running");

    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [],
    });

    rerender(<DockerInstance name="Test Docker" image="test-image" />);

    await waitFor(() => {
      expectStatusText("Not Started");
    });
  });

  it("should bootstrap a live docker instance into context when the local state is empty", async () => {
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [],
    });
    (syncDockerInstances as jest.Mock).mockResolvedValueOnce([
      {
        componentId: "testing-test-docker",
        image: "test-image",
        isPresent: true,
        name: "Test Docker",
        ports: [],
        status: InstanceState.Running,
        type: InstanceType.Docker,
      },
    ]);

    render(<DockerInstance name="Test Docker" image="test-image" />);

    await waitFor(() => {
      expect(mockUpsertDockerInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          componentId: "testing-test-docker",
          name: "Test Docker",
          status: InstanceState.Running,
          type: InstanceType.Docker,
        })
      );
      expect(syncDockerInstances).toHaveBeenCalledWith(["Test Docker"]);
    });
  });

  it("should keep non-running status non-red when user explicitly stops container", async () => {
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Exited,
          stoppedByUser: true,
          type: 0,
        },
      ],
    });

    const { rerender } = render(<DockerInstance name="Test Docker" image="test-image" />);

    rerender(<DockerInstance name="Test Docker" image="test-image" />);

    const statusElement = screen.getByTestId("docker-status");
    expectStatusText("Exited");
    expect(statusElement).toHaveClass("text-gray-700");
    expect(statusElement).not.toHaveClass("text-red-600");
  });

  it("should show recent log summary when container stops unexpectedly", async () => {
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Exited,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });
    (getContainerLogs as jest.Mock).mockResolvedValue(
      "line1\ncritical: disk pressure\nline2\nERROR: upstream timeout\nline3\nfatal: process crashed\nline4\n"
    );

    render(<DockerInstance name="Test Docker" image="test-image" />);

    await flushStatusUpdate();

    await waitFor(() => {
      expect(screen.getByText("Recent Logs")).toBeInTheDocument();
    });

    expect(screen.queryByText(/line1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/line2/)).not.toBeInTheDocument();
    expect(screen.getByText(/critical: disk pressure/i)).toBeInTheDocument();
    expect(screen.getByText(/error: upstream timeout/i)).toBeInTheDocument();
    expect(screen.getByText(/fatal: process crashed/i)).toBeInTheDocument();
  });

  it("should hide recent logs summary when container no longer exists", async () => {
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          status: InstanceState.Exited,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });
    (getContainerLogs as jest.Mock).mockRejectedValue(new Error("no such container"));

    render(<DockerInstance name="Test Docker" image="test-image" />);

    await flushStatusUpdate();

    await waitFor(() => {
      expect(getContainerLogs).toHaveBeenCalledWith("Test Docker");
    });
    expect(screen.queryByText("Recent Logs")).not.toBeInTheDocument();
    expect(screen.queryByText("Unable to retrieve recent logs.")).not.toBeInTheDocument();
  });

  it("should render description if provided", async () => {
    const { getByText } = render(
      <DockerInstance
        name="Test Docker"
        image="test-image"
        description="Test Description"
      />
    );

    await flushStatusUpdate();

    await act(async () => {
      fireEvent.click(getByText("Details"));
    });

    expect(getByText("Test Description")).toBeInTheDocument();
  });

  it("should render custom ports if provided", async () => {
    const customPorts = [{ containerPort: 8080, hostPort: 8080 }];
    const { getByText } = render(
      <DockerInstance
        name="Test Docker"
        image="test-image"
        ports={[customPorts[0]]}
      />
    );

    await flushStatusUpdate();

    await act(async () => {
      fireEvent.click(getByText("Details"));
    });

    expect(screen.getByText(/host\s*8080,\s*container\s*8080/i)).toBeInTheDocument();
  });

  it("should show docker-assigned host port for running container", async () => {
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      instances: [
        {
          image: "test-image",
          name: "Test Docker",
          ports: [{ containerPort: 80, hostPort: 49153 }],
          status: InstanceState.Running,
          stoppedByUser: false,
          type: 0,
        },
      ],
    });

    render(<DockerInstance name="Test Docker" image="test-image" />);

    await act(async () => {
      fireEvent.click(screen.getByText("Details"));
    });

    await waitFor(() => {
      expect(screen.getByText(/host\s*49153,\s*container\s*80/i)).toBeInTheDocument();
    });
  });

  it("should render create errors returned from addInstance", async () => {
    (useInstancesContext as jest.Mock).mockReturnValue({
      ...providerProps,
      addInstance: jest.fn().mockResolvedValue(new Error("Docker registry authentication is required")),
    });

    render(<DockerInstance name="Test Docker" image="test-image" />);

    await flushStatusUpdate();

    await act(async () => {
      fireEvent.click(screen.getByText("Run"));
    });

    expect(screen.getByText("Error: Docker registry authentication is required")).toBeInTheDocument();
  });
});

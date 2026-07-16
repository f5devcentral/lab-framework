import { render, screen, act, waitFor } from "@testing-library/react";
import { useState } from "react";
import { InstancesContextProvider, useInstancesContext } from "./instances";
import { getComponentName, getVariable } from "@/lib/variables";
import {
  InstanceDocker,
  InstanceK8s,
  InstanceState,
  InstanceType,
  InstanceUdf,
} from "@/lib/types";

import {
  createContainer,
  getContainerPorts,
  removeContainer,
} from "@/app/lib/docker-lib";
import { syncDockerInstances } from "@/app/lib/docker-instance-sync";

jest.mock("@/lib/variables", () => ({
  getComponentName: jest.fn(),
  getVariable: jest.fn(),
  setClientVariable: jest.fn(),
  setVariable: jest.fn(),
  useInstances: jest.fn(),
}));

(getComponentName as jest.Mock).mockImplementation((type: InstanceType) => {
  switch (type) {
    case InstanceType.Docker:
      return "test-docker";
    case InstanceType.K8s:
      return "test-k8s";
    case InstanceType.Udf:
      return "test-udf";
    default:
      return "unknown";
  }
});
jest.mock("@/lib/client-variables");

import { useInstances as mockUseInstances } from "@/lib/client-variables";

jest.mock("@/app/lib/docker-lib", () => ({
  createContainer: jest.fn(),
  getContainerPorts: jest.fn().mockResolvedValue([]),
  getContainerStatus: jest.fn().mockResolvedValue("unknown"),
  getDockerInstanceSnapshot: jest.fn().mockResolvedValue(null),
  isContainerPresent: jest.fn().mockResolvedValue(true),
  removeContainer: jest.fn(),
}));

jest.mock("@/app/lib/docker-instance-sync", () => ({
  syncDockerInstances: jest.fn().mockResolvedValue([]),
}));

const mockUseInstancesState = (
  initial: (InstanceDocker | InstanceK8s | InstanceUdf)[]
) => {
  (mockUseInstances as jest.Mock).mockImplementation(() => {
    // Use React state in the mock so provider updates trigger rerenders in tests.
    return useState(initial);
  });
};

describe("InstanceType Enum", () => {
  it("should have a Docker type", () => {
    expect(InstanceType.Docker).toBeDefined();
    expect(InstanceType.Docker).toBe(0);
  });

  it("should have a Udf type", () => {
    expect(InstanceType.Udf).toBeDefined();
    expect(InstanceType.Udf).toBe(1);
  });

  it("should have a K8s type", () => {
    expect(InstanceType.K8s).toBeDefined();
    expect(InstanceType.K8s).toBe(2);
  });

  it("should match the correct values", () => {
    expect(InstanceType[0]).toBe("Docker");
    expect(InstanceType[1]).toBe("Udf");
    expect(InstanceType[2]).toBe("K8s");
  });
});

describe("InstancesContextProvider", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  const TestComponent = () => {
    const { instances, addInstance, removeInstance } = useInstancesContext();
    return (
      <div>
        <button
          onClick={() =>
            addInstance({
              type: InstanceType.Docker,
              name: "test-docker",
              image: "test-image",
            })
          }
        >
          Add Docker Instance
        </button>
        <button
          onClick={() =>
            addInstance({
              type: InstanceType.K8s,
              name: "test-k8s",
              url: "http://test-url.f5demos.com",
              kubeconfig: "test-kubeconfig",
            })
          }
        >
          Add K8s Instance
        </button>
        <button
          onClick={() =>
            addInstance({
              type: InstanceType.Udf,
              name: "test-udf",
            })
          }
        >
          Add Udf Instance
        </button>
        <button
          onClick={() =>
            removeInstance({
              type: InstanceType.Docker,
              name: "test-docker",
              image: "test-image",
            })
          }
        >
          Remove Docker Instance
        </button>
        <button
          onClick={() =>
            removeInstance({
              type: InstanceType.K8s,
              name: "test-k8s",
              url: "http://test-url.f5demos.com",
              kubeconfig: "test-kubeconfig",
            })
          }
        >
          Remove K8s Instance
        </button>
        <button
          onClick={() =>
            removeInstance({
              type: InstanceType.Udf,
              name: "test-udf",
            })
          }
        >
          Remove Udf Instance
        </button>
        <div data-testid="instances">{JSON.stringify(instances)}</div>
      </div>
    );
  };

  test.each(["Docker", "K8s", "Udf"])(
    "should add a %s instance",
    async (instanceType) => {
      mockUseInstancesState([]);

      const consoleLogMock = jest.spyOn(console, "log").mockImplementation();
      (getComponentName as jest.Mock).mockResolvedValue(
        `test-${instanceType.toLowerCase()}`
      );

      render(
        <InstancesContextProvider>
          <TestComponent />
        </InstancesContextProvider>
      );

      const addButton = screen.getByText(`Add ${instanceType} Instance`);
      const removeButton = screen.getByText(`Remove ${instanceType} Instance`);

      await act(async () => {
        addButton.click();
      });

      await waitFor(() => {
        screen.debug();
        expect(screen.getByTestId("instances").textContent).toContain(
          `test-${instanceType.toLowerCase()}`
        );
      });
      expect(consoleLogMock).toHaveBeenCalledWith(
        `Creating ${instanceType.toLowerCase()} instance`
      );

      await act(async () => {
        removeButton.click();
      });

      consoleLogMock.mockRestore();
    }
  );

  it("should no-op if an instance with a specific name already exists", async () => {
    mockUseInstancesState([
      { name: "test-docker", status: InstanceState.Running, type: 0 } as InstanceDocker,
      { name: "test-udf", type: 1 } as InstanceUdf,
      { name: "test-k8s", type: 2 } as InstanceK8s,
    ]);

    render(
      <InstancesContextProvider>
        <TestComponent />
      </InstancesContextProvider>
    );

    const addButton = screen.getByText("Add Docker Instance");
    const removeButton = screen.getByText("Remove Docker Instance");

    await act(async () => {
      addButton.click();
    });

    const instances = await waitFor(() => screen.getByTestId("instances"));
    expect(instances.textContent).toContain("test-docker");
    expect(createContainer).not.toHaveBeenCalled();

    await act(async () => {
      removeButton.click();
    });
  });

  it("should recreate a stale docker instance if it only exists in local state", async () => {
    mockUseInstancesState([
      { name: "test-docker", status: InstanceState.Unknown, type: 0 } as InstanceDocker,
    ]);

    render(
      <InstancesContextProvider>
        <TestComponent />
      </InstancesContextProvider>
    );

    await act(async () => {
      screen.getByText("Add Docker Instance").click();
    });

    expect(createContainer).toHaveBeenCalled();
  });

  it("should recreate an exited docker instance instead of treating it as duplicate", async () => {
    mockUseInstancesState([
      { name: "test-docker", status: InstanceState.Exited, type: 0 } as InstanceDocker,
    ]);

    render(
      <InstancesContextProvider>
        <TestComponent />
      </InstancesContextProvider>
    );

    await act(async () => {
      screen.getByText("Add Docker Instance").click();
    });

    expect(createContainer).toHaveBeenCalled();
  });

  it("should poll docker api and update docker status in local model", async () => {
    mockUseInstancesState([
      { name: "test-docker", status: InstanceState.Running, type: 0 } as InstanceDocker,
    ]);

    (syncDockerInstances as jest.Mock).mockResolvedValueOnce([
      {
        componentId: "mapped-test-docker",
        isPresent: true,
        name: "test-docker",
        status: InstanceState.Exited,
        type: InstanceType.Docker,
      },
    ]);

    render(
      <InstancesContextProvider>
        <TestComponent />
      </InstancesContextProvider>
    );

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("instances").textContent).toContain("\"status\":\"exited\"");
    });
  });

  it("should preserve the last known running status when polling returns unknown", async () => {
    mockUseInstancesState([
      { name: "test-docker", status: InstanceState.Running, type: 0 } as InstanceDocker,
    ]);

    (syncDockerInstances as jest.Mock).mockResolvedValueOnce([
      {
        componentId: "mapped-test-docker",
        isPresent: true,
        name: "test-docker",
        status: InstanceState.Unknown,
        type: InstanceType.Docker,
      },
    ]);

    render(
      <InstancesContextProvider>
        <TestComponent />
      </InstancesContextProvider>
    );

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("instances").textContent).toContain("\"status\":\"running\"");
    });
  });

  it("should not rewrite instances when docker polling returns the same snapshot", async () => {
    mockUseInstancesState([
      {
        componentId: "mapped-test-docker",
        image: "test-image",
        name: "test-docker",
        ports: [],
        status: InstanceState.Running,
        stoppedByUser: false,
        type: 0,
      } as InstanceDocker,
    ]);

    (syncDockerInstances as jest.Mock).mockResolvedValueOnce([
      {
        componentId: "mapped-test-docker",
        image: "test-image",
        isPresent: true,
        name: "test-docker",
        ports: [],
        status: InstanceState.Running,
        type: InstanceType.Docker,
      },
    ]);

    const renderCounter = { current: 0 };

    const RenderCounter = () => {
      renderCounter.current += 1;
      return <div data-testid="render-count">{renderCounter.current}</div>;
    };

    render(
      <InstancesContextProvider>
        <RenderCounter />
      </InstancesContextProvider>
    );

    expect(screen.getByTestId("render-count").textContent).toBe("1");

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(screen.getByTestId("render-count").textContent).toBe("1");
  });

  it("should resolve docker component names before polling and backfill componentId", async () => {
    mockUseInstancesState([
      { name: "Test Docker", status: InstanceState.Unknown, type: 0 } as InstanceDocker,
    ]);

    (syncDockerInstances as jest.Mock).mockResolvedValueOnce([
      {
        componentId: "mapped-test-docker",
        image: "test-image",
        isPresent: true,
        name: "Test Docker",
        ports: [],
        status: InstanceState.Running,
        type: InstanceType.Docker,
      },
    ]);

    render(
      <InstancesContextProvider>
        <TestComponent />
      </InstancesContextProvider>
    );

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    await waitFor(() => {
      const instances = screen.getByTestId("instances").textContent ?? "";
      expect(instances).toContain("\"componentId\":\"mapped-test-docker\"");
      expect(instances).toContain("\"status\":\"running\"");
    });

    expect(syncDockerInstances).toHaveBeenCalledWith(["Test Docker"]);
  });

  it("should remove docker instances missing from docker api", async () => {
    mockUseInstancesState([
      { name: "test-docker", status: InstanceState.Running, type: 0 } as InstanceDocker,
    ]);

    (syncDockerInstances as jest.Mock).mockResolvedValueOnce([
      {
        isPresent: false,
        name: "test-docker",
        status: InstanceState.Unknown,
        type: InstanceType.Docker,
      },
    ]);

    render(
      <InstancesContextProvider>
        <TestComponent />
      </InstancesContextProvider>
    );

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("instances").textContent).not.toContain("test-docker");
    });

    expect(syncDockerInstances).toHaveBeenCalledWith(["test-docker"]);
  });

  it("should log an error if an error is thrown when adding an instance", async () => {
    const consoleErrorMock = jest.spyOn(console, "error").mockImplementation();

    mockUseInstancesState([]);

    (createContainer as jest.Mock).mockRejectedValueOnce(
      new Error("Test Error")
    );
    render(
      <InstancesContextProvider>
        <TestComponent />
      </InstancesContextProvider>
    );

    const addButton = screen.getByText("Add Docker Instance");

    await act(async () => {
      addButton.click();
    });

    const instances = screen.getByTestId("instances");
    expect(instances.textContent).not.toContain("test-docker");
    expect(consoleErrorMock).toHaveBeenCalledWith(
      "Create Container Error: ",
      expect.any(Error)
    );
    consoleErrorMock.mockRestore();
  });

  it("should pass variable-backed docker env to createContainer for server-side resolution", async () => {
    mockUseInstancesState([]);
    (getComponentName as jest.Mock).mockResolvedValue("test-docker");
    (getVariable as jest.Mock).mockResolvedValue("token-from-lab-variables");

    const TestDockerEnvComponent = () => {
      const { addInstance } = useInstancesContext();
      return (
        <button
          onClick={() =>
            addInstance({
              env: [{ name: "TOKEN", isVariable: true }],
              image: "test-image",
              name: "test-docker",
              type: InstanceType.Docker,
            } as InstanceDocker)
          }
        >
          Add Docker With Env
        </button>
      );
    };

    render(
      <InstancesContextProvider>
        <TestDockerEnvComponent />
      </InstancesContextProvider>
    );

    await act(async () => {
      screen.getByText("Add Docker With Env").click();
    });

    expect(createContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        env: [{ name: "TOKEN", isVariable: true, value: "token-from-lab-variables" }],
      })
    );
    expect(getVariable).toHaveBeenCalledWith("TOKEN");
  });

  it("should persist resolved host and container ports to docker instance state after creation", async () => {
    mockUseInstancesState([]);
    (getComponentName as jest.Mock).mockResolvedValue("test-docker");
    (getContainerPorts as jest.Mock).mockResolvedValue([
      { containerPort: 80, hostPort: 49153 },
    ]);

    const TestDockerPortComponent = () => {
      const { addInstance, instances } = useInstancesContext();
      return (
        <>
          <button
            onClick={() =>
              addInstance({
                image: "test-image",
                name: "test-docker",
                ports: [{ containerPort: 80 }],
                type: InstanceType.Docker,
              } as InstanceDocker)
            }
          >
            Add Docker With Ports
          </button>
          <div data-testid="instances-with-ports">{JSON.stringify(instances)}</div>
        </>
      );
    };

    render(
      <InstancesContextProvider>
        <TestDockerPortComponent />
      </InstancesContextProvider>
    );

    await act(async () => {
      screen.getByText("Add Docker With Ports").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("instances-with-ports").textContent).toContain("\"hostPort\":49153");
      expect(screen.getByTestId("instances-with-ports").textContent).toContain("\"containerPort\":80");
    });

    expect(getContainerPorts).toHaveBeenCalledWith("test-docker", "test-docker");
  });

  test.each(["Docker", "K8s", "Udf"])(
    "should remove a %s instance",
    async (instanceType) => {
      const consoleLogMock = jest.spyOn(console, "log").mockImplementation();

      mockUseInstancesState([
        { name: "test-docker", type: 0 } as InstanceDocker,
        { name: "test-udf", type: 1 } as InstanceUdf,
        { name: "test-k8s", type: 2 } as InstanceK8s,
      ]);

      render(
        <InstancesContextProvider>
          <TestComponent />
        </InstancesContextProvider>
      );

      const addButton = screen.getByText(`Add ${instanceType} Instance`);
      const removeButton = screen.getByText(`Remove ${instanceType} Instance`);

      await act(async () => {
        addButton.click();
      });

      await act(async () => {
        removeButton.click();
      });

      const instances = screen.getByTestId("instances");
      expect(instances.textContent).not.toContain(
        `test-${instanceType.toLowerCase()}`
      );
      expect(consoleLogMock).toHaveBeenCalledWith(
        `Removing ${instanceType.toLowerCase()} instance`
      );
    }
  );

  it("should log an error if an error is thrown when removing an instance", async () => {
    mockUseInstancesState([
      { name: "test-docker", type: 0 } as InstanceDocker,
      { name: "test-udf", type: 1 } as InstanceUdf,
      { name: "test-k8s", type: 2 } as InstanceK8s,
    ]);

    const consoleErrorMock = jest.spyOn(console, "error").mockImplementation();
    const consoleLogMock = jest.spyOn(console, "log").mockImplementation();
    (removeContainer as jest.Mock).mockRejectedValueOnce(
      new Error("no such container")
    );
    render(
      <InstancesContextProvider>
        <TestComponent />
      </InstancesContextProvider>
    );

    const addButton = screen.getByText("Remove Docker Instance");

    await act(async () => {
      addButton.click();
    });

    const instances = screen.getByTestId("instances");
    expect(instances.textContent).not.toContain("test-docker");
    expect(consoleErrorMock).toHaveBeenCalledWith(
      "Remove Container Error: ",
      expect.any(Error)
    );
    expect(consoleLogMock).toHaveBeenCalledTimes(2);
    expect(consoleLogMock).toHaveBeenNthCalledWith(
      1,
      "Removing docker instance"
    );
    expect(consoleLogMock).toHaveBeenNthCalledWith(
      2,
      "Removing stale container instance: test-docker"
    );
    consoleErrorMock.mockRestore();
    consoleLogMock.mockRestore();
  });

  it("should throw an error when using the provider without a context", async () => {
    expect(() => render(<TestComponent />)).toThrow(
      "useInstancesContext must be used within a InstancesContextProvider"
    );
  });
});

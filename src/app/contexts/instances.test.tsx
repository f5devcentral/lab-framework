import { render, screen, act } from "@testing-library/react";
import {
  InstancesContextProvider,
  useInstancesContext,
} from "./instances";
import { InstanceType } from "@/lib/types";

import { createContainer, removeContainer } from "@/app/lib/docker-lib";

jest.mock("@/app/lib/docker-lib", () => ({
  createContainer: jest.fn(),
  removeContainer: jest.fn(),
}));

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
  afterEach(() => {
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
      const consoleLogMock = jest.spyOn(console, "log").mockImplementation();

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

      const instances = screen.getByTestId("instances");
      expect(instances.textContent).toContain(
        `test-${instanceType.toLowerCase()}`
      );
      expect(consoleLogMock).toHaveBeenCalledWith(
        `Creating ${instanceType.toLowerCase()} instance`
      );

      await act(async () => {
        removeButton.click();
      });

      consoleLogMock.mockRestore();
    }
  );

  it("should log an error if an instance with a specific name already exists", async () => {
    const consoleErrorMock = jest.spyOn(console, "error").mockImplementation();

    render(
      <InstancesContextProvider>
        <TestComponent />
      </InstancesContextProvider>
    );

    const addButton = screen.getByText("Add Docker Instance");
    const removeButton = screen.getByText("Remove Docker Instance");

    // create an initial container to produce the scenario where the instance already exists
    await act(async () => {
      addButton.click();
    });

    await act(async () => {
      addButton.click();
    });

    const instances = screen.getByTestId("instances");
    expect(instances.textContent).toContain("test-docker");
    expect(consoleErrorMock).toHaveBeenCalledWith("Instance already exists");

    await act(async () => {
      removeButton.click();
    });

    consoleErrorMock.mockRestore();
  });

  it("should log an error if an error is thrown when adding an instance", async () => {
    const consoleErrorMock = jest.spyOn(console, "error").mockImplementation();
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
    expect(instances.textContent).toContain("test-docker");
    expect(consoleErrorMock).toHaveBeenCalledWith(
      "Create Container Error: ",
      expect.any(Error)
    );
    consoleErrorMock.mockRestore();
  });

  test.each(["Docker", "K8s", "Udf"])(
    "should remove a %s instance",
    async (instanceType) => {
      const consoleLogMock = jest.spyOn(console, "log").mockImplementation();

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

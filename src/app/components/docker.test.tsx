import { render, fireEvent, act } from "@testing-library/react";
import { InstancesContextType } from "../contexts/instances";

const mockUseInstancesContext = jest.fn();
const mockAddInstance = jest.fn();
const mockRemoveInstance = jest.fn();

const providerProps: InstancesContextType = {
  instances: [],
  addInstance: mockAddInstance,
  removeInstance: mockRemoveInstance,
};

jest.mock("@/app/contexts/instances", () => ({
  useInstancesContext: jest.fn().mockReturnValue(providerProps),
}));

mockUseInstancesContext.mockReturnValue({
  addInstance: mockAddInstance,
  removeInstance: mockRemoveInstance,
  instances: [],
});

import { DockerInstance } from "./docker";

describe("DockerInstance Component", () => {
  it("should render DockerInstance with default props", () => {
    const { getByText } = render(
      <DockerInstance name="Test Docker" image="test-image" />
    );

    expect(getByText("Test Docker")).toBeInTheDocument();
    expect(getByText("test-image")).toBeInTheDocument();
    expect(getByText("80")).toBeInTheDocument();
  });

  it("should call addInstance when Create button is clicked", async () => {
    const { getByText } = render(
      <DockerInstance
        name="Test Docker"
        image="test-image"
        ports={[{ containerPort: 8089, hostPort: 9000 }]}
      />
    );

    const createButton = getByText("Create");
    await act(async () => {
      fireEvent.click(createButton);
    });

    expect(mockAddInstance).toHaveBeenCalledWith({
      image: "test-image",
      name: "Test Docker",
      ports: [{ containerPort: 8089, hostPort: 9000 }],
      type: 0,
    });
  });

  it("should call removeInstance when Stop button is clicked", async () => {
    const { getByText } = render(
      <DockerInstance name="Test Docker" image="test-image" />
    );

    const stopButton = getByText("Stop");
    await act(async () => {
      fireEvent.click(stopButton);
    });

    expect(mockRemoveInstance).toHaveBeenCalledWith({
      name: "Test Docker",
      type: 0,
    });
  });

  it("should render description if provided", () => {
    const { getByText } = render(
      <DockerInstance
        name="Test Docker"
        image="test-image"
        description="Test Description"
      />
    );

    expect(getByText("Test Description")).toBeInTheDocument();
  });

  it("should render custom ports if provided", () => {
    const customPorts = [{ containerPort: 8080, hostPort: 8080 }];
    const { getByText } = render(
      <DockerInstance
        name="Test Docker"
        image="test-image"
        ports={[customPorts[0]]}
      />
    );

    expect(getByText("8080")).toBeInTheDocument();
  });
});

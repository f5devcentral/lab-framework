import { render, fireEvent } from "@testing-library/react";
import { DockerInstance } from "./docker";
import { useInstancesContext } from "@/app/contexts/instances";

jest.mock("@/app/contexts/instances");

describe("DockerInstance Component", () => {
  const mockAddInstance = jest.fn();
  const mockRemoveInstance = jest.fn();

  beforeEach(() => {
    (useInstancesContext as jest.Mock).mockReturnValue({
      addInstance: mockAddInstance,
      removeInstance: mockRemoveInstance,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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
    fireEvent.click(createButton);

    expect(mockAddInstance).toHaveBeenCalledWith({
      image: "test-image",
      name: "Test Docker",
      ports: [{ containerPort: 8089, hostPort: 9000 }],
    });
  });

  it("should call removeInstance when Stop button is clicked", async () => {
    const { getByText } = render(
      <DockerInstance name="Test Docker" image="test-image" />
    );

    const stopButton = getByText("Stop");
    fireEvent.click(stopButton);

    expect(mockRemoveInstance).toHaveBeenCalledWith({
      name: "Test Docker",
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

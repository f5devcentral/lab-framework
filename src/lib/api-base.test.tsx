import { render, fireEvent, waitFor, act } from "@testing-library/react";
import { APIBase } from "./api-base";
import { checkAPI } from "@/lib/check-api";
import { getVariable } from "./variables";
import { getDockerInstanceSnapshot } from "@/app/lib/docker-lib";

jest.mock("@/lib/check-api", () => ({
  checkAPI: jest.fn(),
}));

jest.mock("./variables", () => ({
  getVariable: jest.fn(),
}));

jest.mock("@/app/lib/docker-lib", () => ({
  getDockerInstanceSnapshot: jest.fn(),
}));

describe("APIBase Component", () => {
  beforeEach(() => {
    (getVariable as jest.Mock).mockResolvedValue(null);
    (getDockerInstanceSnapshot as jest.Mock).mockResolvedValue(null);
  });

  it("should render the button and initial state correctly", () => {
    const { getByText, container } = render(<APIBase />);
    expect(getByText("Check")).toBeInTheDocument();
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("should call checkAPI and update state on successful check", async () => {
    (checkAPI as jest.Mock).mockResolvedValueOnce(true);
    const { getByText } = render(<APIBase />);

    await act(async () => {
      fireEvent.click(getByText("Check"));
    });

    await waitFor(() => {
      expect(getByText("Status: 200")).toBeInTheDocument();
    });
  });

  it("should call checkAPI and update state on failed check", async () => {
    (checkAPI as jest.Mock).mockRejectedValueOnce(new Error("HTTP error 500"));
    const { getByText } = render(<APIBase />);

    await act(async () => {
      fireEvent.click(getByText("Check"));
    });

    await waitFor(() => {
      expect(
        getByText("Error: The API check failed", { exact: false })
      ).toBeInTheDocument();
    });
  });

  it("should apply correct classes based on state", async () => {
    (checkAPI as jest.Mock).mockResolvedValueOnce(true);
    const { getByText, container } = render(<APIBase />);

    await act(async () => {
      fireEvent.click(getByText("Check"));
    });

    await waitFor(() => {
      expect(container.querySelector(".bg-green-50")).toBeInTheDocument();
    });

    (checkAPI as jest.Mock).mockRejectedValueOnce(
      new Error("API check failed")
    );

    await act(async () => {
      fireEvent.click(getByText("Check"));
    });

    await waitFor(() => {
      expect(container.querySelector(".bg-red-50")).toBeInTheDocument();
    });
  });

  it("should forward tlsComponent to checkAPI", async () => {
    (checkAPI as jest.Mock).mockResolvedValueOnce(true);
    const { getByText } = render(<APIBase url="http://localhost" tlsComponent={true} />);

    await act(async () => {
      fireEvent.click(getByText("Check"));
    });

    await waitFor(() => {
      expect(checkAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          tlsComponent: true,
          url: "http://localhost",
        })
      );
    });
  });

  it("should fall back to resolved componentId when local instance is missing", async () => {
    (checkAPI as jest.Mock).mockResolvedValueOnce(true);
    (getDockerInstanceSnapshot as jest.Mock).mockResolvedValueOnce({
      type: 0,
      name: "nginx-plus-1",
      componentId: "happy-sloth-nginxplus1",
      image: "nginx:latest",
      status: "running",
      ports: [{ containerPort: 80, hostPort: 62226, protocol: "tcp" }],
    });

    const { getByText } = render(<APIBase componentName="nginx-plus-1" path="/nginx_status" />);

    await act(async () => {
      fireEvent.click(getByText("Check"));
    });

    await waitFor(() => {
      expect(checkAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          component: expect.objectContaining({
            name: "nginx-plus-1",
            componentId: "happy-sloth-nginxplus1",
          }),
          path: "/nginx_status",
          url: null,
        })
      );
    });
  });
});

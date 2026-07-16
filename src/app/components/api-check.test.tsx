import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { APICheck } from "./api-check";
import { checkAPI } from "@/lib/check-api";

jest.mock("@/lib/check-api", () => ({
  checkAPI: jest.fn(),
}));

describe("APICheck Component", () => {
  it("should render with default props", () => {
    const { getByText } = render(<APICheck />);

    expect(getByText("API Check")).toBeInTheDocument();
    expect(getByText("Path:")).toBeInTheDocument();
    expect(getByText("/")).toBeInTheDocument();
    expect(getByText("Target Response Status Code:")).toBeInTheDocument();
    expect(getByText("200")).toBeInTheDocument();
  });

  it("should render with provided URL", () => {
    const { getByText } = render(<APICheck url="https://api.example.com" />);

    expect(getByText("URL:")).toBeInTheDocument();
    expect(getByText("https://api.example.com")).toBeInTheDocument();
  });

  it("should render with provided component name", () => {
    const { getByText } = render(<APICheck componentName="ExampleComponent" />);

    expect(getByText("Component Name:")).toBeInTheDocument();
    expect(getByText("ExampleComponent")).toBeInTheDocument();
  });

  it("should render with provided path", () => {
    const { getByText } = render(<APICheck path="/example-path" />);

    expect(getByText("/example-path")).toBeInTheDocument();
  });

  it("should render with provided target status code", () => {
    const { getByText } = render(<APICheck targetStatusCode={404} />);

    expect(getByText("404")).toBeInTheDocument();
  });

  it("should render APIBase component", () => {
    render(
      <APICheck
        componentName="ExampleComponent"
        path="/example-path"
        targetStatusCode={200}
        url="https://api.example.com"
        tlsComponent={true}
      />
    );

    expect(screen.getByRole("button")).toHaveTextContent("Check");
  });

  it("should treat serialized '{true}' tlsComponent value as TLS enabled", async () => {
    (checkAPI as jest.Mock).mockResolvedValueOnce(true);

    render(
      <APICheck
        componentName="ExampleComponent"
        url="http://localhost"
        tlsComponent={"{true}"}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Check" }));

    await waitFor(() => {
      expect(checkAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          tlsComponent: true,
        })
      );
    });
  });
});

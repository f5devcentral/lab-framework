import { render } from "@testing-library/react";
import { APIHeaderCheck } from "./api-header-check";

describe("APIHeaderCheck Component", () => {
  it("should render the component with the correct structure", () => {
    const { getByText, container } = render(
      <APIHeaderCheck 
        componentName="ExampleComponent" 
        headerName="Server" 
        headerValue="nginx/1.25.5" 
        path="/example-path" 
        targetStatusCode={200} 
        url="https://api.example.com" 
      />
    );

    expect(getByText("API Header Check")).toBeInTheDocument();
    expect(getByText("URL:")).toBeInTheDocument();
    expect(getByText("https://api.example.com")).toBeInTheDocument();
    expect(getByText("Component Name:")).toBeInTheDocument();
    expect(getByText("ExampleComponent")).toBeInTheDocument();
    expect(getByText("Header Name:")).toBeInTheDocument();
    expect(getByText("Server")).toBeInTheDocument();
    expect(getByText("Header Value:")).toBeInTheDocument();
    expect(getByText("nginx/1.25.5")).toBeInTheDocument();
    expect(getByText("Target Response Status Code:")).toBeInTheDocument();
    expect(getByText("200")).toBeInTheDocument();
    expect(container.querySelector(".flex.flex-col.border.border-gray-300.p-4.rounded.max-w-md")).toBeInTheDocument();
  });

  it("should render the component without URL and component name", () => {
    const { getByText, queryByText } = render(
      <APIHeaderCheck 
        headerName="Server" 
        headerValue="nginx/1.25.5" 
        targetStatusCode={200} 
      />
    );

    expect(getByText("API Header Check")).toBeInTheDocument();
    expect(queryByText("URL:")).not.toBeInTheDocument();
    expect(queryByText("Component Name:")).not.toBeInTheDocument();
    expect(getByText("Header Name:")).toBeInTheDocument();
    expect(getByText("Server")).toBeInTheDocument();
    expect(getByText("Header Value:")).toBeInTheDocument();
    expect(getByText("nginx/1.25.5")).toBeInTheDocument();
    expect(getByText("Target Response Status Code:")).toBeInTheDocument();
    expect(getByText("200")).toBeInTheDocument();
  });
});

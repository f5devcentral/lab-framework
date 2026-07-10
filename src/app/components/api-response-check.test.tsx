import { render, screen } from "@testing-library/react";
import { APIResponseCheck } from "./api-response-check";

jest.mock("@/lib/check-api", () => ({
  checkAPI: jest.fn(),
}));

describe("APIResponseCheck Component", () => {
  it("should render the component with the correct structure", () => {
    const { getByText, container } = render(
      <APIResponseCheck
        componentName="ExampleComponent"
        path="/example-path"
        searchString="exampleSearchString"
        targetStatusCode={200}
        url="https://api.example.com"
      />
    );

    expect(getByText("API Response Check")).toBeInTheDocument();
    expect(getByText("URL:")).toBeInTheDocument();
    expect(getByText("https://api.example.com")).toBeInTheDocument();
    expect(getByText("Component Name:")).toBeInTheDocument();
    expect(getByText("ExampleComponent")).toBeInTheDocument();
    expect(getByText("Path:")).toBeInTheDocument();
    expect(getByText("/example-path")).toBeInTheDocument();
    expect(getByText("Search String:")).toBeInTheDocument();
    expect(getByText("exampleSearchString")).toBeInTheDocument();
    expect(getByText("Target Response Status Code:")).toBeInTheDocument();
    expect(getByText("200")).toBeInTheDocument();
    expect(container.querySelector(".flex.flex-col.border.border-gray-300.p-4.rounded.max-w-md")).toBeInTheDocument();
  });

  it("should render APIBase component", () => {
    render(
      <APIResponseCheck
        componentName="ExampleComponent"
        path="/example-path"
        targetStatusCode={200}
        url="https://api.example.com"
        tlsComponent={true}
      />
    );

    expect(screen.getByRole("button")).toHaveTextContent("Check");
  });

  it("should render without URL and componentName", () => {
    const { getByText, queryByText } = render(
      <APIResponseCheck path="/example-path" searchString="exampleSearchString" targetStatusCode={200} />
    );

    expect(getByText("API Response Check")).toBeInTheDocument();
    expect(queryByText("URL:")).not.toBeInTheDocument();
    expect(queryByText("Component Name:")).not.toBeInTheDocument();
    expect(getByText("Path:")).toBeInTheDocument();
    expect(getByText("/example-path")).toBeInTheDocument();
    expect(getByText("Search String:")).toBeInTheDocument();
    expect(getByText("exampleSearchString")).toBeInTheDocument();
    expect(getByText("Target Response Status Code:")).toBeInTheDocument();
    expect(getByText("200")).toBeInTheDocument();
  });
});
import { render } from "@testing-library/react";
import { APICheckContainer } from "./api-check-container";

describe("APICheckContainer Component", () => {
  it("should render the container with the correct structure", () => {
    const { getByText, container } = render(
      <APICheckContainer>
        <div>Test Component</div>
      </APICheckContainer>
    );

    expect(getByText("Checks")).toBeInTheDocument();
    expect(container.querySelector("#api-check-outer-container")).toBeInTheDocument();
    expect(container.querySelector("#api-check-inner-container")).toBeInTheDocument();
  });

  it("should render child components inside the inner container", () => {
    const { getByText } = render(
      <APICheckContainer>
        <div>Test Component 1</div>
        <div>Test Component 2</div>
      </APICheckContainer>
    );

    expect(getByText("Test Component 1")).toBeInTheDocument();
    expect(getByText("Test Component 2")).toBeInTheDocument();
  });

  it("should apply the correct class to each child component", () => {
    const { container } = render(
      <APICheckContainer>
        <div>Test Component 1</div>
        <div>Test Component 2</div>
      </APICheckContainer>
    );

    const apiCheckItems = container.querySelectorAll(".api-check-item");
    expect(apiCheckItems.length).toBe(2);
  });
});
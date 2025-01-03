import { render } from "@testing-library/react";
import { Card } from "./card";

describe("Card Component", () => {
  it("should render children correctly", () => {
    const { getByText } = render(<Card>Test Content</Card>);
    expect(getByText("Test Content")).toBeInTheDocument();
  });

  it("should apply default styles", () => {
    const { container } = render(<Card>Test Content</Card>);
    expect(container.firstChild).toHaveClass("max-w-sm rounded overflow-hidden shadow-lg");
  });

  it("should merge additional class names", () => {
    const { container } = render(<Card className="bg-red-500">Test Content</Card>);
    expect(container.firstChild).toHaveClass("max-w-sm rounded overflow-hidden shadow-lg bg-red-500");
  });

  it("should not apply additional class names if className is not provided", () => {
    const { container } = render(<Card>Test Content</Card>);
    expect(container.firstChild).not.toHaveClass("bg-red-500");
  });
});

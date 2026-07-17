import { fireEvent, render, screen } from "@testing-library/react";
import ImageModalClient from "./image-modal-client";

describe("ImageModalClient", () => {
  it("opens the modal when the image is clicked", () => {
    render(<ImageModalClient src="/example.png" alt="Example" />);

    fireEvent.click(screen.getByAltText("Example (thumbnail)"));

    expect(screen.getByAltText("Example (full size)")).toBeInTheDocument();
  });

  it("closes the modal on escape", () => {
    render(<ImageModalClient src="/example.png" alt="Example" />);

    fireEvent.click(screen.getByAltText("Example (thumbnail)"));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByAltText("Example (full size)")).not.toBeInTheDocument();
  });
});

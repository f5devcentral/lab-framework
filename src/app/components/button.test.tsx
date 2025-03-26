import { render, fireEvent, screen, act } from "@testing-library/react";
import { Button } from "./button";
import { delay } from "@/lib/utils";

describe("Button Component", () => {
  it("should render the button with children", () => {
    render(<Button onClick={jest.fn()}>Click Me</Button>);
    expect(screen.getByText("Click Me")).toBeInTheDocument();
  });

  it("should call onClick when button is clicked", async () => {
    const onClickMock = jest
      .fn()
      .mockImplementation(async () => await delay(1000));
    render(<Button onClick={onClickMock}>Click Me</Button>);

    const button = screen.getByText("Click Me");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(onClickMock).toHaveBeenCalled();
  });

  it("should enable the button after onClick is resolved", async () => {
    const onClickMock = jest
      .fn()
      .mockImplementation(async () => await delay(1000));
    render(<Button onClick={onClickMock}>Click Me</Button>);

    const button = screen.getByText("Click Me");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(button).toBeDisabled();
    await act(async () => {
      await onClickMock();
    });
    expect(button).not.toBeDisabled();
  });

  it("should apply additional class names", () => {
    render(
      <Button onClick={jest.fn()} className="extra-class">
        Click Me
      </Button>
    );
    const button = screen.getByText("Click Me");
    expect(button).toHaveClass("extra-class");
  });

  it("should handle onClick errors gracefully", async () => {
    const consoleErrorMock = jest.spyOn(console, "error").mockImplementation();
    const onClickMock = jest
      .fn()
      .mockRejectedValueOnce(new Error("Test Error"));
    render(<Button onClick={onClickMock}>Click Me</Button>);

    const button = screen.getByText("Click Me");
    await act(async () => {
      fireEvent.click(button);
    });

    await act(async () => {
      try {
        await onClickMock();
      } catch {
        // swallow error
      }
    });

    expect(consoleErrorMock).toHaveBeenCalledWith(
      "Button onClick Error: ",
      expect.any(Error)
    );
    consoleErrorMock.mockRestore();
  });
});

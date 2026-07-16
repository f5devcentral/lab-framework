import { fireEvent, render, screen } from "@testing-library/react";
import UDFComponentButton from "./udf-component-button";

describe("UDFComponentButton", () => {
  it("opens web shell URL in a new tab", () => {
    const windowOpenSpy = jest.spyOn(window, "open").mockImplementation(() => null);

    render(<UDFComponentButton webShellUrl="https://example-shell.local" />);

    fireEvent.click(screen.getByRole("button", { name: "Open Web Shell" }));

    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://example-shell.local",
      "_blank",
      "noopener,noreferrer"
    );

    windowOpenSpy.mockRestore();
  });

  it("is disabled when web shell URL is unavailable", () => {
    render(<UDFComponentButton webShellUrl={null} />);

    expect(screen.getByRole("button", { name: "Open Web Shell" })).toBeDisabled();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InputVariable } from "./input-var";
import { setVariable } from "@/lib/variables";

jest.mock("@/lib/variables", () => ({
  setVariable: jest.fn(),
}));

describe("InputVariable component", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders with provided name and value", () => {
    render(<InputVariable name="deployment_identifier" value="alpha" />);

    expect(screen.getByText("Set Variable")).toBeInTheDocument();
    expect(screen.getByText("deployment_identifier:")).toBeInTheDocument();
    expect(screen.getByDisplayValue("alpha")).toBeInTheDocument();
  });

  it("calls setVariable and shows success message", async () => {
    (setVariable as jest.Mock).mockResolvedValue(undefined);
    render(<InputVariable name="deployment_identifier" value="" />);

    fireEvent.change(screen.getByPlaceholderText("Enter a value..."), {
      target: { value: "new-value" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(setVariable).toHaveBeenCalledWith("deployment_identifier", "new-value");
    });
    expect(screen.getByText("Variable set successfully!")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter a value...")).toHaveValue("");
  });

  it("shows error message when setVariable fails", async () => {
    (setVariable as jest.Mock).mockRejectedValue(new Error("save failed"));
    render(<InputVariable name="deployment_identifier" value="broken" />);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("Error: save failed")).toBeInTheDocument();
    });
    expect(console.error).toHaveBeenCalled();
  });
});

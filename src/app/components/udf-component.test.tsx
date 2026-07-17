import { render, screen } from "@testing-library/react";
import UDFComponent from "./udf-component";
import { fetchUdfComponentWebShell } from "@/lib/udf";

jest.mock("@/lib/udf", () => ({
  fetchUdfComponentWebShell: jest.fn(),
}));

jest.mock("@/app/components/udf-component-button", () => ({
  __esModule: true,
  default: ({ webShellUrl }: { webShellUrl: string | null }) => (
    <div data-testid="mock-udf-button">{webShellUrl ?? "null"}</div>
  ),
}));

describe("UDFComponent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders component name and passes fetched URL to button", async () => {
    (fetchUdfComponentWebShell as jest.Mock).mockResolvedValue("https://runner-shell.local");

    const ui = await UDFComponent({ name: "Runner" });
    render(ui);

    expect(fetchUdfComponentWebShell).toHaveBeenCalledWith("Runner");
    expect(screen.getByText("Runner")).toBeInTheDocument();
    expect(screen.getByTestId("mock-udf-button")).toHaveTextContent("https://runner-shell.local");
  });

  it("passes null URL when shell endpoint is unavailable", async () => {
    (fetchUdfComponentWebShell as jest.Mock).mockResolvedValue(null);

    const ui = await UDFComponent({ name: "Runner" });
    render(ui);

    expect(fetchUdfComponentWebShell).toHaveBeenCalledWith("Runner");
    expect(screen.getByTestId("mock-udf-button")).toHaveTextContent("null");
  });
});

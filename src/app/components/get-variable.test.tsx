import { render, screen, waitFor } from "@testing-library/react";
import { GetVariable } from "./get-variable";
import { resolveClientVariable } from "@/app/lib/client-variable-resolver";

jest.mock("@/app/lib/client-variable-resolver", () => ({
  resolveClientVariable: jest.fn(),
}));

describe("GetVariable component", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders string variable values", async () => {
    (resolveClientVariable as jest.Mock).mockResolvedValue("dep-id-value");

    render(<GetVariable name="deployment_identifier" />);

    await waitFor(() => expect(resolveClientVariable).toHaveBeenCalledWith("deployment_identifier"));
    expect(await screen.findByText("dep-id-value")).toBeInTheDocument();
  });

  it("renders numeric variable values", async () => {
    (resolveClientVariable as jest.Mock).mockResolvedValue(42);

    render(<GetVariable name="number-var" />);

    expect(await screen.findByText("42")).toBeInTheDocument();
  });

  it("renders fallback for null values", async () => {
    (resolveClientVariable as jest.Mock).mockResolvedValue(null);

    render(<GetVariable name="missing-var" fallback="n/a" />);

    expect(await screen.findByText("n/a")).toBeInTheDocument();
  });

  it("renders fallback for non-primitive values", async () => {
    (resolveClientVariable as jest.Mock).mockResolvedValue({ nested: "value" });

    render(<GetVariable name="obj-var" fallback="unsupported" />);

    expect(await screen.findByText("unsupported")).toBeInTheDocument();
  });

  it("renders empty-name message when name is missing", () => {
    render(<GetVariable name="" />);

    expect(resolveClientVariable).not.toHaveBeenCalled();
    expect(screen.getByText("Variable name empty")).toBeInTheDocument();
  });

  it("renders error text when variable retrieval throws", async () => {
    (resolveClientVariable as jest.Mock).mockRejectedValue(new Error("boom"));

    render(<GetVariable name="broken-var" />);

    expect(await screen.findByText("Error retrieving variable")).toBeInTheDocument();
  });

  it("refreshes when local-storage-change event is fired for the same key", async () => {
    (resolveClientVariable as jest.Mock)
      .mockResolvedValueOnce("initial")
      .mockResolvedValueOnce("updated");

    render(<GetVariable name="deployment_identifier" />);
    expect(await screen.findByText("initial")).toBeInTheDocument();

    window.dispatchEvent(
      new CustomEvent("local-storage-change", { detail: { key: "deployment_identifier" } })
    );

    expect(await screen.findByText("updated")).toBeInTheDocument();
  });

  it("refreshes when local-storage-change key casing differs", async () => {
    (resolveClientVariable as jest.Mock)
      .mockResolvedValueOnce("initial")
      .mockResolvedValueOnce("updated-upper");

    render(<GetVariable name="deployment_identifier" />);
    expect(await screen.findByText("initial")).toBeInTheDocument();

    window.dispatchEvent(
      new CustomEvent("local-storage-change", { detail: { key: "DEPLOYMENT_IDENTIFIER" } })
    );

    expect(await screen.findByText("updated-upper")).toBeInTheDocument();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CodeBlock } from "./codeblock";
import { getVariable } from "@/lib/variables";

jest.mock("@/lib/variables", () => ({
  getVariable: jest.fn(),
}));

jest.mock("react-syntax-highlighter", () => ({
  Prism: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("react-syntax-highlighter/dist/esm/styles/prism", () => ({
  solarizedlight: {},
}));

Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

describe("CodeBlock", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders inline code styling by default", async () => {
    const ui = await CodeBlock({ children: "npm run dev" });
    render(ui);

    const code = screen.getByText("npm run dev");
    expect(code.tagName).toBe("CODE");
  });

  it("renders block code with copy button", async () => {
    const ui = await CodeBlock({ children: "const value = 1;", isBlock: true });
    render(ui);

    expect(screen.getByText("Copy")).toBeInTheDocument();
    expect(screen.getByText("const value = 1;")).toBeInTheDocument();
  });

  it("copies block code to clipboard", async () => {
    const ui = await CodeBlock({ children: "const value = 1;", isBlock: true });
    render(ui);

    fireEvent.click(screen.getByText("Copy"));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("const value = 1;");
    });
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });

  it("replaces variable placeholders in block code", async () => {
    (getVariable as jest.Mock).mockResolvedValue("dep-value");

    const ui = await CodeBlock({ children: "echo {{deployment_identifier}}", isBlock: true, className: "language-bash" });
    render(ui);

    expect(getVariable).toHaveBeenCalledWith("deployment_identifier");
    expect(screen.getByText("echo dep-value")).toBeInTheDocument();
  });
});

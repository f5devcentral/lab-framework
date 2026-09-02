import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { KubernetesShell } from "./kubernetes-shell";
import { runKubernetesCliCommand } from "@/lib/kubernetes-cli-action";

jest.mock("@/lib/kubernetes-cli-action", () => ({
  runKubernetesCliCommand: jest.fn(),
}));

const runCommand = (value: string) => {
  fireEvent.change(screen.getByLabelText("Kubernetes shell command"), {
    target: { value },
  });
  fireEvent.click(screen.getByRole("button"));
};

describe("KubernetesShell component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the allowed commands and empty state", () => {
    render(<KubernetesShell />);

    expect(screen.getByText("Allowed commands: oc, kubectl")).toBeInTheDocument();
    expect(
      screen.getByText("Run oc, kubectl commands against the lab cluster.")
    ).toBeInTheDocument();
  });

  it("renders a custom title", () => {
    render(<KubernetesShell title="Cluster Console" />);

    expect(screen.getByText("Cluster Console")).toBeInTheDocument();
  });

  it("clears the input placeholder after a command has been executed", async () => {
    (runKubernetesCliCommand as jest.Mock).mockResolvedValue({
      command: "kubectl get pods",
      output: "pod/nginx Running",
      exitCode: 0,
      isError: false,
    });

    render(<KubernetesShell placeholder="kubectl get pods" />);
    const input = screen.getByLabelText("Kubernetes shell command") as HTMLInputElement;

    expect(input.placeholder).toBe("kubectl get pods");

    runCommand("kubectl get pods");
    await waitFor(() => expect(input.placeholder).toBe(""));
  });

  it("shows command output on success", async () => {
    (runKubernetesCliCommand as jest.Mock).mockResolvedValue({
      command: "kubectl get pods",
      output: "pod/nginx Running",
      exitCode: 0,
      isError: false,
    });

    render(<KubernetesShell />);
    runCommand("kubectl get pods");

    expect(await screen.findByText("pod/nginx Running")).toBeInTheDocument();
    expect(screen.getByText("$ kubectl get pods")).toBeInTheDocument();
    expect(runKubernetesCliCommand).toHaveBeenCalledWith("kubectl get pods", {
      context: undefined,
      namespace: undefined,
    });
  });

  it("passes the configured context and namespace to the action", async () => {
    (runKubernetesCliCommand as jest.Mock).mockResolvedValue({
      command: "kubectl --context=lab --namespace=demo get pods",
      output: "no resources",
      exitCode: 0,
      isError: false,
    });

    render(<KubernetesShell context="lab" namespace="demo" />);
    runCommand("kubectl get pods");

    await waitFor(() =>
      expect(runKubernetesCliCommand).toHaveBeenCalledWith("kubectl get pods", {
        context: "lab",
        namespace: "demo",
      })
    );
  });

  it("shows the pinned target in the header", () => {
    render(<KubernetesShell context="lab" namespace="demo" />);

    expect(
      screen.getByText("context: lab, namespace: demo | Allowed commands: oc, kubectl")
    ).toBeInTheDocument();
  });

  it("disables the run button while a command is running", async () => {
    let resolveCommand: (value: unknown) => void = () => {};
    (runKubernetesCliCommand as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveCommand = resolve;
      })
    );

    render(<KubernetesShell />);
    runCommand("kubectl version");

    const button = screen.getByRole("button");
    await waitFor(() => expect(button).toBeDisabled());
    expect(screen.getByText("Running...")).toBeInTheDocument();
    expect(
      screen.queryByText("Run oc, kubectl commands against the lab cluster.")
    ).not.toBeInTheDocument();

    resolveCommand({
      command: "kubectl version",
      output: "Client Version: 4.22.11",
      exitCode: 0,
      isError: false,
    });

    expect(await screen.findByText("Client Version: 4.22.11")).toBeInTheDocument();
    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.queryByText("Running...")).not.toBeInTheDocument();
  });

  it("shows the rejection message for a disallowed command", async () => {
    (runKubernetesCliCommand as jest.Mock).mockResolvedValue({
      command: "rm -rf /",
      output: "Only oc and kubectl commands are allowed.",
      exitCode: 1,
      isError: true,
    });

    render(<KubernetesShell />);
    runCommand("rm -rf /");

    expect(
      await screen.findByText("Only oc and kubectl commands are allowed.")
    ).toBeInTheDocument();
  });

  it("shows an error when the action rejects", async () => {
    (runKubernetesCliCommand as jest.Mock).mockRejectedValue(new Error("network down"));

    render(<KubernetesShell />);
    runCommand("kubectl get pods");

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });

  it("clears the input and keeps prior output for repeated commands", async () => {
    (runKubernetesCliCommand as jest.Mock)
      .mockResolvedValueOnce({
        command: "kubectl get pods",
        output: "first output",
        exitCode: 0,
        isError: false,
      })
      .mockResolvedValueOnce({
        command: "oc whoami",
        output: "second output",
        exitCode: 0,
        isError: false,
      });

    render(<KubernetesShell />);
    const input = screen.getByLabelText("Kubernetes shell command") as HTMLInputElement;

    runCommand("kubectl get pods");
    expect(await screen.findByText("first output")).toBeInTheDocument();
    expect(input.value).toBe("");

    runCommand("oc whoami");
    expect(await screen.findByText("second output")).toBeInTheDocument();
    expect(screen.getByText("first output")).toBeInTheDocument();
  });

  it("navigates executed commands with the up and down arrows", async () => {
    (runKubernetesCliCommand as jest.Mock)
      .mockResolvedValueOnce({
        command: "kubectl get pods",
        output: "pods",
        exitCode: 0,
        isError: false,
      })
      .mockResolvedValueOnce({
        command: "oc whoami",
        output: "admin",
        exitCode: 0,
        isError: false,
      });

    render(<KubernetesShell />);
    const input = screen.getByLabelText("Kubernetes shell command") as HTMLInputElement;

    runCommand("kubectl get pods");
    expect(await screen.findByText("pods")).toBeInTheDocument();
    runCommand("oc whoami");
    expect(await screen.findByText("admin")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input.value).toBe("oc whoami");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input.value).toBe("kubectl get pods");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.value).toBe("oc whoami");
  });

  it("keeps history navigation within its bounds and restores the draft", async () => {
    (runKubernetesCliCommand as jest.Mock).mockResolvedValue({
      command: "kubectl get pods",
      output: "pods",
      exitCode: 0,
      isError: false,
    });

    render(<KubernetesShell />);
    const input = screen.getByLabelText("Kubernetes shell command") as HTMLInputElement;

    runCommand("kubectl get pods");
    expect(await screen.findByText("pods")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "kubectl get services" } });

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input.value).toBe("kubectl get pods");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input.value).toBe("kubectl get pods");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.value).toBe("kubectl get services");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.value).toBe("kubectl get services");
  });

  it("does not run an empty command", () => {
    render(<KubernetesShell />);
    runCommand("   ");

    expect(runKubernetesCliCommand).not.toHaveBeenCalled();
  });
});

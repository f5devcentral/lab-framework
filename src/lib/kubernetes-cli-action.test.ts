import { access } from "fs/promises";
import { runKubernetesCliCommand } from "./kubernetes-cli-action";
import { CLUSTER_UNAVAILABLE_HINT } from "./kubernetes-cli";

const mockExecFile = jest.fn();

jest.mock("child_process", () => {
  const { promisify: actualPromisify } = jest.requireActual<typeof import("util")>("util");
  const execFile = jest.fn();
  Object.defineProperty(execFile, actualPromisify.custom, {
    value: (...args: unknown[]) => mockExecFile(...args),
  });
  return { execFile };
});

jest.mock("fs/promises", () => ({
  access: jest.fn(),
}));

const accessMock = access as jest.MockedFunction<typeof access>;
const originalKubeconfig = process.env.KUBECONFIG;

describe("runKubernetesCliCommand", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.KUBECONFIG = "/app/.kube/k3s.yaml";
    accessMock.mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env.KUBECONFIG = originalKubeconfig;
  });

  it("runs an allowed command without a shell", async () => {
    mockExecFile.mockResolvedValue({ stdout: "pod/nginx", stderr: "" });

    const result = await runKubernetesCliCommand("kubectl get pods");

    expect(mockExecFile).toHaveBeenCalledWith(
      "kubectl",
      ["get", "pods"],
      expect.objectContaining({ timeout: expect.any(Number) })
    );
    expect(result).toMatchObject({ output: "pod/nginx", exitCode: 0, isError: false });
  });

  it("places target flags before user arguments", async () => {
    mockExecFile.mockResolvedValue({ stdout: "ok", stderr: "" });

    const result = await runKubernetesCliCommand("kubectl exec pod -- ls", {
      context: "lab",
      namespace: "demo",
    });

    expect(mockExecFile).toHaveBeenCalledWith(
      "kubectl",
      ["--context=lab", "--namespace=demo", "exec", "pod", "--", "ls"],
      expect.anything()
    );
    expect(result.command).toBe("kubectl --context=lab --namespace=demo exec pod -- ls");
  });

  it("rejects a disallowed command without executing it", async () => {
    const result = await runKubernetesCliCommand("rm -rf /");

    expect(mockExecFile).not.toHaveBeenCalled();
    expect(result).toMatchObject({ exitCode: 1, isError: true });
    expect(result.output).toBe("Only oc and kubectl commands are allowed.");
  });

  it("rejects an invalid target without executing the command", async () => {
    const result = await runKubernetesCliCommand("kubectl get pods", {
      namespace: "--all-namespaces",
    });

    expect(mockExecFile).not.toHaveBeenCalled();
    expect(result.output).toContain("Invalid --namespace value");
  });

  it("reports a missing kubeconfig before running the command", async () => {
    accessMock.mockRejectedValue(new Error("ENOENT"));

    const result = await runKubernetesCliCommand("kubectl get pods");

    expect(mockExecFile).not.toHaveBeenCalled();
    expect(result.output).toContain(CLUSTER_UNAVAILABLE_HINT);
    expect(result.output).toContain("Kubeconfig not found at /app/.kube/k3s.yaml.");
  });

  it("accepts a KUBECONFIG list when one path exists", async () => {
    process.env.KUBECONFIG = "/missing/one.yaml:/app/.kube/k3s.yaml";
    accessMock.mockImplementation((target) =>
      target === "/app/.kube/k3s.yaml" ? Promise.resolve(undefined) : Promise.reject(new Error("ENOENT"))
    );
    mockExecFile.mockResolvedValue({ stdout: "ok", stderr: "" });

    const result = await runKubernetesCliCommand("kubectl get pods");

    expect(result.isError).toBe(false);
  });

  it("skips the kubeconfig check when KUBECONFIG is unset", async () => {
    delete process.env.KUBECONFIG;
    mockExecFile.mockResolvedValue({ stdout: "ok", stderr: "" });

    await runKubernetesCliCommand("kubectl get pods");

    expect(accessMock).not.toHaveBeenCalled();
    expect(mockExecFile).toHaveBeenCalled();
  });

  it("adds guidance when the cluster is unreachable", async () => {
    mockExecFile.mockRejectedValue(
      Object.assign(new Error("failed"), {
        stderr: "dial tcp: lookup k3s-single-node on 127.0.0.11:53: no such host",
        code: 1,
      })
    );

    const result = await runKubernetesCliCommand("kubectl get nodes");

    expect(result.output).toContain(CLUSTER_UNAVAILABLE_HINT);
    expect(result.output).toContain("no such host");
    expect(result.isError).toBe(true);
  });

  it("leaves normal command errors unchanged", async () => {
    mockExecFile.mockRejectedValue(
      Object.assign(new Error("failed"), {
        stderr: 'Error from server (NotFound): pods "missing" not found',
        code: 1,
      })
    );

    const result = await runKubernetesCliCommand("kubectl get pod missing");

    expect(result.output).toBe('Error from server (NotFound): pods "missing" not found');
    expect(result.output).not.toContain(CLUSTER_UNAVAILABLE_HINT);
  });

  it("reports when a command produced no output", async () => {
    mockExecFile.mockResolvedValue({ stdout: "", stderr: "" });

    const result = await runKubernetesCliCommand("kubectl delete pod nginx");

    expect(result.output).toBe("Command completed with no output.");
  });
});

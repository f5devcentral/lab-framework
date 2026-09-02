import {
  CLUSTER_UNAVAILABLE_HINT,
  KUBERNETES_CLI_ALLOWED_COMMANDS,
  buildClusterUnavailableMessage,
  buildKubernetesCliTargetArgs,
  buildMissingKubeconfigMessage,
  isClusterUnavailableOutput,
  parseKubernetesCliCommand,
} from "./kubernetes-cli";

describe("parseKubernetesCliCommand", () => {
  it("allows oc and kubectl only", () => {
    expect(KUBERNETES_CLI_ALLOWED_COMMANDS).toEqual(["oc", "kubectl"]);
  });

  it("parses a kubectl command with arguments", () => {
    expect(parseKubernetesCliCommand("kubectl get pods -n default")).toEqual({
      command: "kubectl",
      args: ["get", "pods", "-n", "default"],
    });
  });

  it("parses an oc command with quoted arguments", () => {
    expect(
      parseKubernetesCliCommand(`oc get pods -o jsonpath='{.items[0].metadata.name}'`)
    ).toEqual({
      command: "oc",
      args: ["get", "pods", "-o", "jsonpath={.items[0].metadata.name}"],
    });
  });

  it("preserves quoted values that contain spaces", () => {
    expect(parseKubernetesCliCommand('kubectl label pod app "my app"')).toEqual({
      command: "kubectl",
      args: ["label", "pod", "app", "my app"],
    });
  });

  it("ignores surrounding whitespace", () => {
    expect(parseKubernetesCliCommand("   kubectl   version   ")).toEqual({
      command: "kubectl",
      args: ["version"],
    });
  });

  it("rejects an empty command", () => {
    expect(() => parseKubernetesCliCommand("   ")).toThrow("Enter a command to run.");
  });

  it.each(["ls -la", "docker ps", "sh", "kubectl.exe get pods"])(
    "rejects disallowed command %s",
    (input) => {
      expect(() => parseKubernetesCliCommand(input)).toThrow(
        "Only oc and kubectl commands are allowed."
      );
    }
  );

  it.each([
    "kubectl get pods; rm -rf /",
    "kubectl get pods | sh",
    "kubectl get pods && whoami",
    "kubectl get pods > /tmp/out",
    "kubectl get pods `whoami`",
    "kubectl get pods $(whoami)",
  ])("rejects shell composition in %s", (input) => {
    expect(() => parseKubernetesCliCommand(input)).toThrow(
      /Shell operators are not supported/
    );
  });

  it("rejects an unterminated quote", () => {
    expect(() => parseKubernetesCliCommand(`kubectl get pod "name`)).toThrow(
      "Unterminated quote in command."
    );
  });
});

describe("buildKubernetesCliTargetArgs", () => {
  it("returns no flags when no target is supplied", () => {
    expect(buildKubernetesCliTargetArgs()).toEqual([]);
    expect(buildKubernetesCliTargetArgs({})).toEqual([]);
  });

  it("builds context and namespace flags", () => {
    expect(
      buildKubernetesCliTargetArgs({ context: "lab-cluster", namespace: "demo" })
    ).toEqual(["--context=lab-cluster", "--namespace=demo"]);
  });

  it("builds only the supplied flag", () => {
    expect(buildKubernetesCliTargetArgs({ namespace: "demo" })).toEqual(["--namespace=demo"]);
  });

  it("ignores blank values", () => {
    expect(buildKubernetesCliTargetArgs({ context: "   ", namespace: "" })).toEqual([]);
  });

  it("allows OpenShift style context names", () => {
    expect(
      buildKubernetesCliTargetArgs({ context: "default/api-openshift-example:6443/admin" })
    ).toEqual(["--context=default/api-openshift-example:6443/admin"]);
  });

  it.each(["--all-namespaces", "-n", "demo namespace", "demo;rm", "$demo"])(
    "rejects unsafe target value %s",
    (value) => {
      expect(() => buildKubernetesCliTargetArgs({ namespace: value })).toThrow(
        /Invalid --namespace value/
      );
    }
  );
});

describe("cluster availability messages", () => {
  it.each([
    'dial tcp: lookup k3s-single-node on 127.0.0.11:53: no such host',
    "The connection to the server localhost:8080 was refused",
    "Unable to connect to the server: i/o timeout",
    "error: no configuration has been provided, try setting KUBERNETES_MASTER",
  ])("detects unreachable cluster output: %s", (output) => {
    expect(isClusterUnavailableOutput(output)).toBe(true);
  });

  it.each([
    'Error from server (NotFound): pods "missing" not found',
    "error: the server doesn't have a resource type \"widgets\"",
  ])("does not treat normal errors as unreachable: %s", (output) => {
    expect(isClusterUnavailableOutput(output)).toBe(false);
  });

  it("prefixes the hint to the original output", () => {
    const message = buildClusterUnavailableMessage("dial tcp: no such host");

    expect(message).toContain(CLUSTER_UNAVAILABLE_HINT);
    expect(message).toContain("dial tcp: no such host");
  });

  it("returns only the hint when there is no detail", () => {
    expect(buildClusterUnavailableMessage("   ")).toBe(CLUSTER_UNAVAILABLE_HINT);
  });

  it("names the missing kubeconfig path", () => {
    const message = buildMissingKubeconfigMessage("/app/.kube/k3s.yaml");

    expect(message).toContain(CLUSTER_UNAVAILABLE_HINT);
    expect(message).toContain("Kubeconfig not found at /app/.kube/k3s.yaml.");
  });
});

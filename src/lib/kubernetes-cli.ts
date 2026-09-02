/**
 * Command line interfaces the lab shell is allowed to run.
 */
export const KUBERNETES_CLI_ALLOWED_COMMANDS = ["oc", "kubectl"] as const;

/**
 * Maximum time a single CLI invocation may run before it is terminated.
 */
export const KUBERNETES_CLI_TIMEOUT_MS = 30_000;

/**
 * Maximum number of output bytes captured from a single CLI invocation.
 */
export const KUBERNETES_CLI_MAX_OUTPUT_BYTES = 1_000_000;

/**
 * Characters that are rejected because they imply shell composition rather than a single CLI call.
 */
const DISALLOWED_SHELL_CHARACTERS = [";", "|", "&", "`", "$", ">", "<", "\n", "\r"];

export type KubernetesCliName = (typeof KUBERNETES_CLI_ALLOWED_COMMANDS)[number];

export type KubernetesCliTarget = {
  context?: string;
  namespace?: string;
};

export type ParsedKubernetesCliCommand = {
  command: KubernetesCliName;
  args: string[];
};

export type KubernetesCliResult = {
  command: string;
  output: string;
  exitCode: number;
  isError: boolean;
};

/**
 * Splits a command string into tokens, honoring single and double quoted segments.
 *
 * @param {string} input - The raw command string.
 * @returns {string[]} The parsed tokens.
 * @throws {Error} When a quote is left unterminated or a shell control character is used.
 */
function tokenizeCommand(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let hasCurrent = false;
  let quoteCharacter: '"' | "'" | null = null;

  for (const character of input) {
    if (quoteCharacter !== null) {
      if (character === quoteCharacter) {
        quoteCharacter = null;
        continue;
      }
      current += character;
      continue;
    }

    if (character === '"' || character === "'") {
      quoteCharacter = character;
      hasCurrent = true;
      continue;
    }

    if (DISALLOWED_SHELL_CHARACTERS.includes(character)) {
      throw new Error(
        `Shell operators are not supported. Remove "${character}" and run a single command.`
      );
    }

    if (character === " " || character === "\t") {
      if (hasCurrent) {
        tokens.push(current);
        current = "";
        hasCurrent = false;
      }
      continue;
    }

    current += character;
    hasCurrent = true;
  }

  if (quoteCharacter !== null) {
    throw new Error("Unterminated quote in command.");
  }

  if (hasCurrent) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Validates that a command string invokes an allowed Kubernetes CLI and parses its arguments.
 *
 * @param {string} input - The raw command string entered by the lab user.
 * @returns {ParsedKubernetesCliCommand} The allowed command name and its arguments.
 * @throws {Error} When the command is empty or is not an allowed CLI.
 */
export function parseKubernetesCliCommand(input: string): ParsedKubernetesCliCommand {
  const tokens = tokenizeCommand(input.trim());

  if (tokens.length === 0) {
    throw new Error("Enter a command to run.");
  }

  const [command, ...args] = tokens;
  const allowedCommand = KUBERNETES_CLI_ALLOWED_COMMANDS.find(
    (candidate) => candidate === command
  );

  if (allowedCommand === undefined) {
    throw new Error(
      `Only ${KUBERNETES_CLI_ALLOWED_COMMANDS.join(" and ")} commands are allowed.`
    );
  }

  return { command: allowedCommand, args };
}

// Rejects values that could be read as additional flags rather than a target name.
const TARGET_VALUE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/@-]*$/;

/**
 * Builds the global flags that pin a command to a specific cluster context and namespace.
 *
 * @param {KubernetesCliTarget} target - The context and namespace supplied by the lab author.
 * @returns {string[]} The flags to place directly after the CLI name.
 * @throws {Error} When a supplied value is not a valid context or namespace name.
 */
export function buildKubernetesCliTargetArgs(target: KubernetesCliTarget = {}): string[] {
  const flagValues: ReadonlyArray<readonly [string, string | undefined]> = [
    ["--context", target.context],
    ["--namespace", target.namespace],
  ];

  const args: string[] = [];

  for (const [flag, value] of flagValues) {
    const trimmed = value?.trim() ?? "";
    if (trimmed.length === 0) {
      continue;
    }

    if (!TARGET_VALUE_PATTERN.test(trimmed)) {
      throw new Error(`Invalid ${flag} value: "${trimmed}".`);
    }

    args.push(`${flag}=${trimmed}`);
  }

  return args;
}

/**
 * Guidance shown when the configured cluster cannot be reached.
 */
export const CLUSTER_UNAVAILABLE_HINT =
  "Kubernetes cluster unavailable. Start the peer K3s cluster with the k3s Compose profile, or point KUBECONFIG at a reachable cluster.";

const CLUSTER_UNAVAILABLE_PATTERNS = [
  /no such host/i,
  /dial tcp/i,
  /connection refused/i,
  /i\/o timeout/i,
  /unable to connect to the server/i,
  /no configuration has been provided/i,
  /the connection to the server .* was refused/i,
];

/**
 * Reports whether CLI output indicates the cluster could not be reached.
 *
 * @param {string} output - The combined CLI output.
 * @returns {boolean} True when the failure looks like a connectivity problem.
 */
export function isClusterUnavailableOutput(output: string): boolean {
  return CLUSTER_UNAVAILABLE_PATTERNS.some((pattern) => pattern.test(output));
}

/**
 * Prefixes connectivity failures with actionable guidance.
 *
 * @param {string} detail - The original CLI output.
 * @returns {string} The guidance followed by the original output.
 */
export function buildClusterUnavailableMessage(detail: string): string {
  const trimmed = detail.trim();
  return trimmed.length > 0 ? `${CLUSTER_UNAVAILABLE_HINT}\n\n${trimmed}` : CLUSTER_UNAVAILABLE_HINT;
}

/**
 * Builds the message shown when the configured kubeconfig file does not exist.
 *
 * @param {string} kubeconfigPath - The configured KUBECONFIG value.
 * @returns {string} The guidance including the missing path.
 */
export function buildMissingKubeconfigMessage(kubeconfigPath: string): string {
  return `${CLUSTER_UNAVAILABLE_HINT}\n\nKubeconfig not found at ${kubeconfigPath}.`;
}

"use server";

import { execFile } from "child_process";
import { access } from "fs/promises";
import path from "path";
import { promisify } from "util";
import {
  KUBERNETES_CLI_MAX_OUTPUT_BYTES,
  KUBERNETES_CLI_TIMEOUT_MS,
  KubernetesCliResult,
  KubernetesCliTarget,
  buildClusterUnavailableMessage,
  buildKubernetesCliTargetArgs,
  buildMissingKubeconfigMessage,
  isClusterUnavailableOutput,
  parseKubernetesCliCommand,
} from "./kubernetes-cli";

const execFileAsync = promisify(execFile);

/**
 * Returns the configured KUBECONFIG value when none of its paths exist.
 *
 * @returns {Promise<string | null>} The unusable KUBECONFIG value, or null when it is usable or unset.
 */
async function findMissingKubeconfig(): Promise<string | null> {
  const kubeconfig = process.env.KUBECONFIG?.trim();
  if (!kubeconfig) {
    return null;
  }

  const paths = kubeconfig
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const found = await Promise.all(
    paths.map((entry) => access(entry).then(() => true).catch(() => false))
  );

  return found.some(Boolean) ? null : kubeconfig;
}

/**
 * Joins process output streams into a single displayable string.
 *
 * @param {string | undefined} stdout - The standard output content.
 * @param {string | undefined} stderr - The standard error content.
 * @returns {string} The combined, trimmed output.
 */
function combineOutput(stdout?: string, stderr?: string): string {
  return [stdout, stderr]
    .filter((chunk): chunk is string => typeof chunk === "string" && chunk.trim().length > 0)
    .join("\n")
    .trim();
}

/**
 * Runs an allowed Kubernetes CLI command and returns its combined output.
 *
 * Commands are executed without a shell, so only `oc` and `kubectl` can be invoked.
 *
 * @param {string} input - The raw command string entered by the lab user.
 * @param {KubernetesCliTarget} target - The context and namespace to pin the command to.
 * @returns {Promise<KubernetesCliResult>} The command result, including output and exit code.
 */
export async function runKubernetesCliCommand(
  input: string,
  target: KubernetesCliTarget = {}
): Promise<KubernetesCliResult> {
  let command: string;
  let args: string[];

  try {
    const parsed = parseKubernetesCliCommand(input);
    // Target flags lead the arguments so a trailing `--` passthrough stays intact.
    args = [...buildKubernetesCliTargetArgs(target), ...parsed.args];
    command = parsed.command;
  } catch (error) {
    return {
      command: input.trim(),
      output: error instanceof Error ? error.message : "Invalid command.",
      exitCode: 1,
      isError: true,
    };
  }

  const displayCommand = [command, ...args].join(" ");

  const missingKubeconfig = await findMissingKubeconfig();
  if (missingKubeconfig !== null) {
    return {
      command: displayCommand,
      output: buildMissingKubeconfigMessage(missingKubeconfig),
      exitCode: 1,
      isError: true,
    };
  }

  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: KUBERNETES_CLI_TIMEOUT_MS,
      maxBuffer: KUBERNETES_CLI_MAX_OUTPUT_BYTES,
    });

    return {
      command: displayCommand,
      output: combineOutput(stdout, stderr) || "Command completed with no output.",
      exitCode: 0,
      isError: false,
    };
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string; code?: number | string };
    const output = combineOutput(failure.stdout, failure.stderr) || failure.message || "Command failed.";

    return {
      command: displayCommand,
      output: isClusterUnavailableOutput(output) ? buildClusterUnavailableMessage(output) : output,
      exitCode: typeof failure.code === "number" ? failure.code : 1,
      isError: true,
    };
  }
}

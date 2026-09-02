"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { runKubernetesCliCommand } from "@/lib/kubernetes-cli-action";
import { KUBERNETES_CLI_ALLOWED_COMMANDS, KubernetesCliResult } from "@/lib/kubernetes-cli";

type KubernetesShellProps = {
  title?: string;
  placeholder?: string;
  context?: string;
  namespace?: string;
};

const ALLOWED_COMMAND_LABEL = KUBERNETES_CLI_ALLOWED_COMMANDS.join(", ");

export function KubernetesShell({
  title = "Kubernetes Shell",
  placeholder = "kubectl get pods",
  context,
  namespace,
}: KubernetesShellProps) {
  const [command, setCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [hasExecutedCommand, setHasExecutedCommand] = useState(false);
  const [entries, setEntries] = useState<KubernetesCliResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const historyDraftRef = useRef("");

  const targetLabel = [
    context ? `context: ${context}` : null,
    namespace ? `namespace: ${namespace}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(", ");

  useEffect(() => {
    if (!outputRef.current) {
      return;
    }

    outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [entries, isRunning]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = command.trim();
    if (!trimmed || isRunning) {
      return;
    }

    setCommandHistory((previous) => [...previous, trimmed]);
    setHistoryIndex(null);
  setHasExecutedCommand(true);
    setCommand("");
    setIsRunning(true);

    try {
      const result = await runKubernetesCliCommand(trimmed, { context, namespace });
      setEntries((previous) => [...previous, result]);
    } catch (error) {
      setEntries((previous) => [
        ...previous,
        {
          command: trimmed,
          output: error instanceof Error ? error.message : "Command failed.",
          exitCode: 1,
          isError: true,
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCommandKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp") {
      if (commandHistory.length === 0) {
        return;
      }

      event.preventDefault();
      if (historyIndex === null) {
        historyDraftRef.current = command;
      }

      const nextIndex = historyIndex === null
        ? commandHistory.length - 1
        : Math.max(historyIndex - 1, 0);
      setHistoryIndex(nextIndex);
      setCommand(commandHistory[nextIndex]);
      return;
    }

    if (event.key !== "ArrowDown" || historyIndex === null) {
      return;
    }

    event.preventDefault();
    const nextIndex = historyIndex + 1;
    if (nextIndex >= commandHistory.length) {
      setHistoryIndex(null);
      setCommand(historyDraftRef.current);
      return;
    }

    setHistoryIndex(nextIndex);
    setCommand(commandHistory[nextIndex]);
  };

  return (
    <div className="mt-4 rounded border border-gray-300 bg-gray-50 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-700">{title}</span>
        <span className="text-xs text-gray-500">
          {targetLabel ? `${targetLabel} | ` : ""}Allowed commands: {ALLOWED_COMMAND_LABEL}
        </span>
      </div>
      <div
        aria-label="Kubernetes shell output"
        className="mb-3 max-h-64 overflow-auto rounded bg-black p-2 text-xs text-white"
        ref={outputRef}
        role="log"
      >
        {!hasExecutedCommand && !isRunning ? (
          <pre className="whitespace-pre-wrap">
            <code>Run {ALLOWED_COMMAND_LABEL} commands against the lab cluster.</code>
          </pre>
        ) : (
          entries.map((entry, index) => (
            <pre className="whitespace-pre-wrap" key={`${entry.command}-${index}`}>
              <code className="text-green-400">$ {entry.command}</code>
              {"\n"}
              <code className={entry.isError ? "text-red-400" : undefined}>{entry.output}</code>
            </pre>
          ))
        )}
        {isRunning ? (
          <pre className="whitespace-pre-wrap">
            <code>Running...</code>
          </pre>
        ) : null}
      </div>
      <form className="flex flex-wrap items-center gap-2" onSubmit={handleSubmit}>
        <input
          aria-label="Kubernetes shell command"
          className="min-w-0 flex-1 rounded border border-gray-300 bg-white p-2 text-sm"
          onChange={(event) => {
            setCommand(event.target.value);
            setHistoryIndex(null);
          }}
          onKeyDown={handleCommandKeyDown}
          placeholder={hasExecutedCommand ? "" : placeholder}
          type="text"
          value={command}
        />
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition-colors hover:bg-blue-700 cursor-pointer disabled:cursor-not-allowed disabled:bg-blue-300"
          disabled={isRunning}
          type="submit"
        >
          {isRunning ? "Running" : "Run"}
        </button>
      </form>
    </div>
  );
}

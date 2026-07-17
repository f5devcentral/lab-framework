"use client";

import { execShellCommand } from "@/app/lib/docker-lib";
import { FormEvent, useEffect, useRef, useState } from "react";

type DockerShellTerminalProps = {
  containerName: string;
};

export function DockerShellTerminal({ containerName }: DockerShellTerminalProps) {
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState("");
  const outputRef = useRef<HTMLPreElement | null>(null);

  const appendOutput = (line: string) => {
    setOutput((prev) => `${prev}\n${line}`.trim());
  };

  useEffect(() => {
    if (!outputRef.current) {
      return;
    }

    outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = command.trim();
    if (!trimmed) {
      return;
    }

    appendOutput(`$ ${trimmed}`);
    setCommand("");

    try {
      const result = await execShellCommand(containerName, trimmed);
      appendOutput(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Command failed";
      appendOutput(`Error: ${message}`);
    }
  };

  return (
    <div className="mt-4 rounded border border-gray-300 bg-gray-50 p-3">
      <div className="mb-2 text-xs font-semibold text-gray-700">Container Shell</div>
      <pre ref={outputRef} className="mb-3 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-black p-2 text-xs text-white">
        <code>{output || "Run commands against this container."}</code>
      </pre>
      <form className="flex flex-wrap items-center gap-2" onSubmit={handleSubmit}>
        <input
          aria-label="Docker shell command"
          className="min-w-0 flex-1 rounded border border-gray-300 bg-white p-2 text-sm"
          onChange={(event) => setCommand(event.target.value)}
          placeholder="Enter command, for example: ls /etc/nginx"
          type="text"
          value={command}
        />
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition-colors hover:bg-blue-700 cursor-pointer"
          type="submit"
        >
          Run
        </button>
      </form>
    </div>
  );
}

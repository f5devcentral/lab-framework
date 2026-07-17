"use client";

import { Button } from "@/app/components/button";
import { useInstancesContext } from "@/app/contexts/instances";
import { getContainerLogs, getContainerPorts } from "@/app/lib/docker-lib";
import { syncDockerInstances } from "@/app/lib/docker-instance-sync";
import { DockerShellTerminal } from "@/app/components/docker-shell-terminal";
import { checkAPI } from "@/lib/check-api";
import {
  DockerAttribute,
  DockerPortMapping,
  InstanceDocker,
  InstanceDockerEnv,
  InstanceState,
  InstanceType,
} from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

const defaultPorts: DockerPortMapping[] = [{ containerPort: 80 }];

const isContainerDoesNotExistError = (error: unknown) =>
  error instanceof Error && error.message.toLowerCase().includes("no such container");

const formatStatusLabel = (label: string) => {
  if (label === InstanceState.Unknown) {
    return "Not Started";
  }

  return label.length > 0 ? label.charAt(0).toUpperCase() + label.slice(1) : label;
};

function summarizeLogs(rawLogs: string, maxLines = 8, scanWindow = 200): string {
  const lines = rawLogs
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  const recentLines = lines.slice(-scanWindow);
  const severityLines = recentLines.filter((line) =>
    /(error|critical|fatal)/i.test(line)
  );

  if (severityLines.length === 0) {
    return "No recent error/critical/fatal log lines found.";
  }

  return severityLines.slice(-maxLines).join("\n");
}

type DockerInstanceProps = {
  name: string;
  description?: string;
  image: string;
  env?: InstanceDockerEnv[];
  port?: { host?: number; container: number } | null;
  ports?: DockerPortMapping[];
  attrs?: DockerAttribute[];
  initialState?: InstanceState;
};

export function DockerInstance({
  name,
  description = "",
  image,
  env = [],
  port,
  ports = defaultPorts,
  attrs = [],
  initialState = InstanceState.Unknown,
}: DockerInstanceProps) {
  const { addInstance, instances, removeInstance, setDockerStoppedByUser, upsertDockerInstance } = useInstancesContext();

  const resolvedDescription = description;
  const resolvedPorts = useMemo(
    () => (port ? [{ containerPort: port.container, hostPort: port.host }] : ports),
    [port, ports]
  );

  const [state, setState] = useState<InstanceState>(initialState);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastLogSummary, setLastLogSummary] = useState<string | null>(null);
  const [runtimePorts, setRuntimePorts] = useState<DockerPortMapping[] | null>(null);
  const [pendingActionLabel, setPendingActionLabel] = useState<string | null>(null);
  const [awaitingStart, setAwaitingStart] = useState(false);
  const [awaitingRemoval, setAwaitingRemoval] = useState(false);

  const dockerInstance = useMemo(
    () =>
      (instances ?? []).find(
        (entry): entry is InstanceDocker =>
          entry.type === InstanceType.Docker && entry.name === name
      ),
    [instances, name]
  );

  const stoppedByUser = dockerInstance?.stoppedByUser === true;
  const externalState = dockerInstance?.status ?? InstanceState.Unknown;
  const effectiveState = awaitingStart || awaitingRemoval ? state : externalState;
  const displayPorts =
    effectiveState === InstanceState.Running
      ? dockerInstance?.ports ?? runtimePorts ?? resolvedPorts
      : resolvedPorts;
  const componentName = dockerInstance?.componentId ?? "unknown";

  useEffect(() => {
    if (awaitingRemoval && !dockerInstance) {
      const resetId = window.setTimeout(() => {
        setState(InstanceState.Unknown);
        setPendingActionLabel(null);
        setAwaitingRemoval(false);
      }, 0);

      return () => {
        window.clearTimeout(resetId);
      };
    }
  }, [awaitingRemoval, awaitingStart, dockerInstance]);

  useEffect(() => {
    if (dockerInstance?.status === InstanceState.Running) {
      return;
    }

    let cancelled = false;

    const bootstrapDockerInstance = async () => {
      try {
        const [syncEntry] = await syncDockerInstances([name]);
        if (
          !cancelled &&
          syncEntry?.isPresent === true &&
          syncEntry.status === InstanceState.Running &&
          typeof syncEntry.image === "string" &&
          syncEntry.image.length > 0 &&
          typeof syncEntry.componentId === "string" &&
          syncEntry.componentId.length > 0
        ) {
          upsertDockerInstance({
            componentId: syncEntry.componentId,
            image: syncEntry.image,
            name: syncEntry.name,
            ports: syncEntry.ports,
            status: syncEntry.status,
            stoppedByUser: false,
            type: InstanceType.Docker,
          });
        }
      } catch {
        // Leave state unchanged if bootstrap fails; the user can still run the check manually.
      }
    };

    bootstrapDockerInstance();

    return () => {
      cancelled = true;
    };
  }, [dockerInstance?.status, name, upsertDockerInstance]);

  const canCreate =
    effectiveState !== InstanceState.Creating &&
    effectiveState !== InstanceState.Running &&
    effectiveState !== InstanceState.Removing;

  const canStop = effectiveState === InstanceState.Running;
  const isExistingNonRunningState =
    effectiveState === InstanceState.Created ||
    effectiveState === InstanceState.Paused ||
    effectiveState === InstanceState.Restarting ||
    effectiveState === InstanceState.Exited ||
    effectiveState === InstanceState.Dead;
  const isUnexpectedNonRunningState = isExistingNonRunningState && !stoppedByUser;
  const showDelete = isUnexpectedNonRunningState;
  const visibleLastLogSummary = isUnexpectedNonRunningState ? lastLogSummary : null;

  const finishCreateSuccess = () => {
    setState(InstanceState.Running);
    setPendingActionLabel(null);
    setAwaitingStart(false);
  };

  const finishCreateFailure = (message: string) => {
    setError(message);
    setState(InstanceState.Unknown);
    setPendingActionLabel(null);
    setAwaitingStart(false);
  };

  const finishRemovalFailure = (message: string) => {
    setError(message);
    setAwaitingRemoval(false);
    setPendingActionLabel(null);
    setState(InstanceState.Running);
  };

  useEffect(() => {
    if (!isUnexpectedNonRunningState) {
      return;
    }

    let cancelled = false;
    const fetchRecentLogs = async () => {
      try {
        const recentLogs = await getContainerLogs(name);
        if (!cancelled) {
          setLastLogSummary(summarizeLogs(recentLogs));
        }
      } catch (error) {
        if (!cancelled) {
          if (isContainerDoesNotExistError(error)) {
            setLastLogSummary(null);
            return;
          }
          setLastLogSummary("Unable to retrieve recent logs.");
        }
      }
    };

    fetchRecentLogs();

    return () => {
      cancelled = true;
    };
  }, [isUnexpectedNonRunningState, name]);

  const handleCreate = async () => {
    setState(InstanceState.Creating);
    setPendingActionLabel("Starting container...");
    setAwaitingStart(true);
    setError(null);
    setMessage(null);
    setDockerStoppedByUser(name, false);

    try {
      const createError = await addInstance({
        attrs,
        env,
        image,
        name,
        ports: resolvedPorts,
        type: InstanceType.Docker,
      } as InstanceDocker);

      if (createError) {
        finishCreateFailure(createError.message || "Unable to create container");
        return;
      }

      finishCreateSuccess();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unable to create container";
      finishCreateFailure(errorMessage);
    }
  };

  const handleStop = async () => {
    setState(InstanceState.Removing);
    setPendingActionLabel("Stopping container...");
    setAwaitingRemoval(true);
    setError(null);
    setMessage(null);

    try {
      await removeInstance({
        name,
        type: InstanceType.Docker,
      } as InstanceDocker);
      setShowLogs(false);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unable to stop container";
      finishRemovalFailure(errorMessage);
    }
  };

  const handleDelete = async () => {
    setState(InstanceState.Removing);
    setPendingActionLabel("Deleting container...");
    setAwaitingRemoval(true);
    setError(null);
    setMessage(null);

    try {
      await removeInstance({
        name,
        type: InstanceType.Docker,
      } as InstanceDocker);
      setShowLogs(false);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unable to delete container";
      finishRemovalFailure(errorMessage);
    }
  };

  const handleTest = async () => {
    if (!canStop) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const latestPorts = await getContainerPorts(name).catch(() => displayPorts);
      const portsForCheck = latestPorts.length > 0 ? latestPorts : displayPorts;
      if (latestPorts.length > 0) {
        setRuntimePorts(latestPorts);
      }

      const componentIdForCheck = dockerInstance?.componentId ?? undefined;

      await checkAPI({
        component: {
          ...(componentIdForCheck ? { componentId: componentIdForCheck } : {}),
          image,
          name,
          ports: portsForCheck,
          type: InstanceType.Docker,
        },
      });
      setMessage("works");
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "API test failed";
      setError(errorMessage);
    }
  };

  const handleToggleLogs = async () => {
    if (showLogs) {
      setShowLogs(false);
      return;
    }

    setError(null);

    try {
      const nextLogs = await getContainerLogs(name);
      setLogs(nextLogs);
      setShowLogs(true);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unable to fetch logs";
      setError(errorMessage);
    }
  };

  return (
    <div className="w-full max-w-md rounded overflow-hidden border border-gray-300 bg-white shadow-lg">
      {showLogs && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4">
          <div className="w-full max-w-5xl rounded border border-gray-300 bg-white p-4 shadow-xl">
            <div className="mb-3 flex justify-end">
              <Button className="bg-red-500" onClick={() => setShowLogs(false)}>
                Close
              </Button>
            </div>
            <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded bg-black p-3 text-xs text-white">
              <code>{logs || "No logs available"}</code>
            </pre>
          </div>
        </div>
      )}

      <div className="px-6 py-4">
        <div className="font-bold text-xl mb-2">{name}</div>

        {effectiveState === InstanceState.Running && isExpanded && (
          <div className="mb-2 text-xs text-gray-700">
            <span className="font-semibold">container name:</span> {componentName}
          </div>
        )}

        {isExpanded && <p className="text-gray-700 text-sm">{resolvedDescription}</p>}

        {isExpanded && (
          <>
            <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-gray-700 md:grid-cols-2">
              <div className="md:col-span-2 break-all">
                <span className="font-semibold">image:</span> {image}
              </div>
              {displayPorts.map((mappedPort, index) => (
                <div key={`${mappedPort.containerPort}-${mappedPort.hostPort}-${index}`}>
                  <span className="font-semibold">ports:</span> host {mappedPort.hostPort ?? "n/a"}, container {mappedPort.containerPort}
                </div>
              ))}
            </div>

            {attrs.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-700 md:grid-cols-2">
                {attrs.map((entry, index) => (
                  <div key={`${entry.name}-${index}`} className="break-all">
                    <span className="font-semibold">{entry.name}:</span> {entry.value}
                  </div>
                ))}
              </div>
            )}

            {env.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-700 md:grid-cols-2">
                {env.map((entry, index) => (
                  <div key={`${entry.name}-${index}`} className="break-all">
                    <span className="font-semibold">{entry.name}:</span> {entry.isSecret ? "********" : (entry.value ?? "")}
                  </div>
                ))}
              </div>
            )}

            {effectiveState === InstanceState.Running && (
              <DockerShellTerminal containerName={name} />
            )}
          </>
        )}
      </div>

      <div className="px-6 pb-6">
        <div data-testid="docker-status" className={`mb-3 text-sm font-semibold ${isUnexpectedNonRunningState ? "text-red-600" : "text-gray-700"}`}>
          <span className="font-bold">Status:</span> {formatStatusLabel(pendingActionLabel ?? effectiveState)}
        </div>

        {visibleLastLogSummary && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 p-2">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-700">
              Recent Logs
            </div>
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-xs text-red-900">
              <code>{visibleLastLogSummary}</code>
            </pre>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-green-500"
            disabled={!canCreate}
            onClick={handleCreate}
          >
            Run
          </Button>

          <Button
            className="bg-red-500"
            disabled={!canStop}
            onClick={handleStop}
          >
            Stop
          </Button>

          {showDelete && (
            <Button
              className="bg-gray-700"
              onClick={handleDelete}
            >
              Delete
            </Button>
          )}

          {canStop && (
            <Button className="bg-gray-500" onClick={handleToggleLogs}>
              Logs
            </Button>
          )}

          {canStop && (
            <Button className="bg-sky-500" onClick={handleTest}>
              Test
            </Button>
          )}

          <Button className="bg-gray-500" onClick={() => setIsExpanded((prev) => !prev)}>
            {isExpanded ? "Hide Details" : "Details"}
          </Button>
        </div>

        {error && <div className="mt-3 text-sm text-red-600">Error: {error}</div>}
        {message && <div className="mt-3 text-sm text-green-600">{message}</div>}
      </div>
    </div>
  );
}

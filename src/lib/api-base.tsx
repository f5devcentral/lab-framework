"use client";
import { checkAPI } from "@/lib/check-api";
import { useState } from "react";
import { ensureError, isTruthyBooleanLike } from "./utils";
import { useInstances } from "./client-variables";
import { Instance, InstanceState, InstanceType } from "./types";
import { resolveClientVariable } from "@/app/lib/client-variable-resolver";

/**
 * APIBase component
 *
 * This component provides a button to perform an API check and displays the result.
 * It uses the checkAPI function to perform the check and updates the component state based on the result.
 *
 * @param {object} props - The properties object.
 * @param {string} [props.componentName=null] - The name of the component to check.
 * @param {string} [props.headerName=null] - The name of the header to check.
 * @param {string} [props.headerValue=null] - The value of the header to check.
 * @param {string} [props.searchString=null] - The search string to use in the API check.
 * @param {string} [props.path="/"] - The path to append to the URL for the API check.
 * @param {number} [props.targetStatusCode=200] - The expected HTTP status code from the API check.
 * @param {string} [props.url=null] - The URL to check.
 * @param {boolean} [props.tlsComponent=false] - If a component name is specified, use TLS (https) to connect to the component. Default is no TLS (http).
 *
 * @returns {JSX.Element} The rendered component.
 */
export function APIBase({
  componentName = null,
  headerName = null,
  headerValue = null,
  searchString = null,
  path = "/",
  targetStatusCode = 200,
  url = null,
  tlsComponent = false,
}: {
  componentName?: string | null;
  headerName?: string | null;
  headerValue?: string | null;
  searchString?: string | null;
  path?: string;
  targetStatusCode?: number;
  url?: string | null;
  tlsComponent?: boolean | string;
}) {
  const [state, setState] = useState<{
    status: boolean | null;
    error: string | null;
  }>({ status: null, error: null });

  const [instances, setInstances] = useInstances();

  const resolvedTlsComponent = isTruthyBooleanLike(tlsComponent);

  function getComponentData<T>(name: string): Promise<T | null> {
    const instance = instances.find((i) => i.name === name);
    return Promise.resolve(instance ? (instance as unknown as T) : null);
  }

  function upsertInstance(nextInstance: Instance): void {
    setInstances((prevInstances) => {
      const existingIndex = prevInstances.findIndex((instance) => instance.name === nextInstance.name);
      if (existingIndex === -1) {
        return [...prevInstances, nextInstance];
      }

      const updatedInstances = [...prevInstances];
      updatedInstances[existingIndex] = nextInstance;
      return updatedInstances;
    });
  }

  /**
   * Handles the API check and updates the state accordingly
   *
   * This function calls the checkAPI function with the input value (URL or component name),
   * and updates the component state based on the result of the API check.
   */
  const handleCheck = async () => {
    try {
      const resolvedComponent = componentName
        ? await getComponentData<Instance>(componentName)
        : null;

      const dockerSnapshot =
        resolvedComponent === null && componentName && url === null
          ? await import("@/app/lib/docker-lib").then(({ getDockerInstanceSnapshot }) => getDockerInstanceSnapshot(componentName))
          : null;

      if (dockerSnapshot !== null) {
        upsertInstance(dockerSnapshot);
      }

      const fallbackComponentId =
        resolvedComponent === null && dockerSnapshot === null && componentName && url === null
          ? await resolveClientVariable<string>(componentName)
          : null;

      const componentForCheck =
        resolvedComponent ??
        dockerSnapshot ??
        (typeof fallbackComponentId === "string" && fallbackComponentId.length > 0
          ? ({
              name: componentName,
              componentId: fallbackComponentId,
              image: "",
              status: InstanceState.Unknown,
              type: InstanceType.Docker,
            } as Instance)
          : null);

      if (componentForCheck !== null && componentName) {
        upsertInstance(componentForCheck);
      }

      await checkAPI({
        component: componentForCheck,
        headerName,
        headerValue,
        searchString,
        path,
        targetStatusCode,
        url,
        tlsComponent: resolvedTlsComponent,
      });
      setState({ status: true, error: null });
    } catch (error) {
      ensureError(error);
      const errorMessage = "The API check failed";
      setState({ status: false, error: errorMessage });
    }
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={handleCheck}
        className="size-min rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition-colors hover:bg-blue-700 cursor-pointer focus:outline-none"
      >
        Check
      </button>
      <div
        className={`${
          state.error ? "bg-red-50" : state.status ? "bg-green-50" : ""
        }${state.status || state.error ? " mt-4 min-h-14 p-4" : ""}`}
      >
        {state.status && (
          <span className="inline-block align-middle font-bold text-green-600 wrap-break-word">
            Status: 200
          </span>
        )}
        {state.error && (
          <span className="inline-block align-middle font-bold text-red-600 wrap-break-word whitespace-normal">
            Error: {state.error}
          </span>
        )}
      </div>
    </div>
  );
}

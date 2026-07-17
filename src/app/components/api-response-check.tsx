import { APIBase } from "@/lib/api-base";
import { isTruthyBooleanLike } from "@/lib/utils";

/**
 * APIResponseCheck component
 *
 * This component renders information about an API response check, including the search string.
 * It also includes the APIBase component to perform the actual API check.
 *
 * @param {Object} props - The properties object.
 * @param {string} [props.componentName=null] - The name of the component to check.
 * @param {string} [props.path="/"] - The path to append to the URL for the API check.
 * @param {string} [props.searchString=null] - The string to search for in the API response.
 * @param {number} [props.targetStatusCode=200] - The expected HTTP status code from the API check.
 * @param {string} [props.url=null] - The URL to check.
 * @param {boolean} [props.tlsComponent=false] - If a component name is specified, use TLS (https) to connect to the component. Default is no TLS (http).
 *
 * @returns {JSX.Element} The rendered component.
 *
 * @example
 * // Example usage of the APIResponseCheck component
 * <APIResponseCheck
 *   componentName="ExampleComponent"
 *   path="/example-path"
 *   searchString="exampleSearchString"
 *   targetStatusCode={200}
 *   url="https://api.example.com"
 * />
 */
export function APIResponseCheck({
  componentName = null,
  path = "/",
  searchString = null,
  targetStatusCode = 200,
  url = null,
  tlsComponent = false,
  ...restProps
}: {
  componentName?: string | null;
  headerName?: string;
  headerValue?: string;
  path?: string;
  searchString?: string | null;
  targetStatusCode?: number;
  url?: string | null;
  tlsComponent?: boolean | string;
  [key: string]: unknown;
}) {
  const resolvedTlsComponent = isTruthyBooleanLike(tlsComponent);

  return (
    <div className="flex flex-col border border-gray-300 p-4 rounded max-w-md">
      <span className="font-bold text-xl">API Response Check</span>
      <div className="mt-2 ml-4">
        {url && (
          <div className="mb-1">
            <span className="font-bold">URL:</span>{" "}
            <span className="font-normal">{url}</span>
          </div>
        )}
        {componentName && (
          <div className="mb-1">
            <span className="font-bold">Component Name:</span>{" "}
            <span className="font-normal">{componentName}</span>
          </div>
        )}
        <div className="mb-1">
          <span className="font-bold">Path:</span>{" "}
          <span className="font-normal">{path}</span>
        </div>
        <div className="mb-1">
          <span className="font-bold">Search String:</span>{" "}
          <span className="font-normal">{searchString}</span>
        </div>
        <div className="mb-1">
          <span className="font-bold">Target Response Status Code:</span>{" "}
          <span className="font-normal">{targetStatusCode}</span>
        </div>
      </div>
      <div className="block m-4">
        <APIBase
          {...restProps}
          componentName={componentName}
          path={path}
          searchString={searchString}
          targetStatusCode={targetStatusCode}
          url={url}
          tlsComponent={resolvedTlsComponent}
        />
      </div>
    </div>
  );
}

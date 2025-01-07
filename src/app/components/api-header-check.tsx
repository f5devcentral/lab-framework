import { APIBase } from "@/lib/api-base"

/**
 * APIHeaderCheck component
 * 
 * This component renders information about an API header check, including the header name and value.
 * It also includes the APIBase component to perform the actual API check.
 * 
 * @param {Object} props - The properties object.
 * @param {string} [props.componentName=null] - The name of the component to check.
 * @param {string} [props.headerName=null] - The name of the header to check.
 * @param {string} [props.headerValue=null] - The value of the header to check.
 * @param {string} [props.path="/"] - The path to append to the URL for the API check.
 * @param {number} [props.targetStatusCode=200] - The expected HTTP status code from the API check.
 * @param {string} [props.url=null] - The URL to check.
 * @param {boolean} [props.tlsComponent=false] - If a component name is specified, use TLS (https) to connect to the component. Default is no TLS (http).
 * 
 * @returns {JSX.Element} The rendered component.
 * 
 * @example
 * <APIHeaderCheck 
 *   componentName="ExampleComponent" 
 *   headerName="Server" 
 *   headerValue="nginx/1.25.5" 
 *   path="/example-path" 
 *   targetStatusCode={200} 
 *   url="https://api.example.com" 
 * />
 */
export function APIHeaderCheck({ 
  componentName = null, 
  headerName = null, 
  headerValue = null, 
  path = "/", 
  targetStatusCode = 200, 
  url = null, 
  tlsComponent = false
}: {
  componentName?: string | null;
  headerName?: string | null;
  headerValue?: string | null;
  path?: string;
  targetStatusCode?: number;
  url?: string | null;
  tlsComponent?: boolean;
}) {
  return (
    <div className="flex flex-col border border-gray-300 p-4 rounded max-w-md">
      <span className="font-bold text-xl">API Header Check</span>
      <div className="mt-2 ml-4">
      {url && (
          <div className="mb-1">
            <span className="font-bold">URL:</span> <span className="font-normal">{url}</span>
          </div>
        )}
        {componentName && (
          <div className="mb-1">
            <span className="font-bold">Component Name:</span> <span className="font-normal">{componentName}</span>
          </div>
        )}
        <div className="mb-1">
          <span className="font-bold">Header Name:</span> <span className="font-normal">{headerName}</span>
        </div>
        <div className="mb-1">
          <span className="font-bold">Header Value:</span> <span className="font-normal">{headerValue}</span>
        </div>
        <div className="mb-1">
          <span className="font-bold">Target Response Status Code:</span> <span className="font-normal">{targetStatusCode}</span>
        </div>
      </div>
      <div className="block m-4">
        <APIBase 
          componentName={componentName} 
          headerName={headerName} 
          headerValue={headerValue} 
          path={path} 
          targetStatusCode={targetStatusCode} 
          url={url} 
          tlsComponent={tlsComponent}
        />
      </div>
    </div>
  );
}

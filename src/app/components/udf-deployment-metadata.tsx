import { fetchUDFInfo } from "@/lib/udf";

const UDF_DEPLOYMENT_PATH = "deployment";

export async function UdfDeploymentMetadata() {
  const data = await fetchUDFInfo(UDF_DEPLOYMENT_PATH);
  if (!data) {
    return "Loading...";
  }

  return (
    <div className="container mx-auto">
      <div className="max-w-fit overflow-scroll rounded shadow-2xl">
        <div className="mb-2 text-xl font-bold">UDF Deployment Info</div>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
}

import { fetchUdfComponentWebShell } from "@/lib/udf";
import UDFComponentButton from "@/app/components/udf-component-button";

type UDFComponentProps = {
  name: string;
};

async function getWebShellUrl(componentName: string): Promise<string | null> {
  try {
    if (!componentName) {
      console.error("componentName must be defined");
      return null;
    }

    const webShellUrl = await fetchUdfComponentWebShell(componentName);
    return webShellUrl || null;
  } catch (error) {
    console.error("Error fetching UDF component web shell URL:", error);
    return null;
  }
}

export default async function UDFComponent({ name }: UDFComponentProps) {
  const webShellUrl = await getWebShellUrl(name);

  return (
    <div className="h-55 max-w-sm overflow-hidden rounded border border-gray-300 shadow-lg">
      <div className="px-4 py-4">
        <div className="mb-2 text-xl font-bold">{name}</div>
        <UDFComponentButton webShellUrl={webShellUrl} />
      </div>
    </div>
  );
}

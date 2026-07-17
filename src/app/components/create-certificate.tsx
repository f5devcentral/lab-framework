import { Suspense } from "react";
import { createCertificate } from "@/lib/certificates";
import { getDeploymentIdentifier } from "@/lib/variables";
import { DownloadItem } from "@/app/components/download-item";
import { CodeBlockCopy } from "@/app/components/codeblock-copy";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { solarizedlight } from "react-syntax-highlighter/dist/esm/styles/prism";

type CreateCertificateProps = {
  commonName?: string;
  name?: string;
};

/**
 * Creates and displays a certificate/key pair for a provided common name.
 */
export async function CreateCertificate({ commonName = "", name = "" }: CreateCertificateProps) {
  let normalizedName = (commonName || name).trim();

  if (!normalizedName) {
    const deploymentIdentifier = await getDeploymentIdentifier();
    if (deploymentIdentifier) {
      normalizedName = `${deploymentIdentifier}.f5demos.com`;
    }
  }

  if (!normalizedName) {
    return "commonName empty";
  }

  let value: Awaited<ReturnType<typeof createCertificate>>;

  try {
    value = await createCertificate(normalizedName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`unable to retrieve certificate ${normalizedName}: ${message}`);
    return "Error retrieving certificate";
  }

  return (
    <span>
      <Suspense fallback={"loading..."}>
        <span className="pr-4">
          Certificate for <span className="font-bold italic">{normalizedName}</span>
        </span>
        <DownloadItem item={value.cert} fileName={`${normalizedName}.crt.pem`} />
        <div className="relative rounded-lg bg-gray-800">
          <CodeBlockCopy>{value.cert}</CodeBlockCopy>
          <SyntaxHighlighter style={solarizedlight} PreTag="div" language="pem">
            {value.cert}
          </SyntaxHighlighter>
        </div>

        <span className="pr-4">
          Key for <span className="font-bold italic">{normalizedName}</span>
        </span>
        <DownloadItem item={value.key} fileName={`${normalizedName}.key.pem`} />
        <div className="relative rounded-lg bg-gray-800">
          <CodeBlockCopy>{value.key}</CodeBlockCopy>
          <SyntaxHighlighter style={solarizedlight} PreTag="div" language="pem">
            {value.key}
          </SyntaxHighlighter>
        </div>
      </Suspense>
    </span>
  );
}

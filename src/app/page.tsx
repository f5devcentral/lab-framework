import Link from "next/link";
import Image from "next/image";
import { getIndexDocs } from "@/lib/mdxUtils";
import { getDeploymentIdentifier } from "@/lib/variables";

function getMetaString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export default async function Home() {
  const deploymentIdentifier = await getDeploymentIdentifier();
  const docs = await getIndexDocs();

  return (
    <main className="flex flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold text-center">
        Welcome to Lab Framework
      </h1>
      <Image
        className="h-auto w-auto"
        src="/lab-framework-logo.png"
        alt="Lab Framework"
        width={200}
        height={200}
        loading="eager"
        style={{ width: "auto", height: "auto" }}
      />
      <p>The following are a list of pages in this lab.</p>
      <ul>
        {docs.map((doc) => {
          const title = getMetaString(doc.documentData.metadata?.title, doc.name);
          const description = getMetaString(doc.documentData.metadata?.description);

          return (
            <li key={doc.location}>
              <Link href={`/${doc.name}`}>{title}</Link>
              {description ? ` - ${description}` : ""}
            </li>
          );
        })}
      </ul>
      <div className="text-white">{deploymentIdentifier ?? ""}</div>
    </main>
  );
}

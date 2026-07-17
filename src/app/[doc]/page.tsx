import { getMdxContent } from "@/lib/mdxUtils"
import { delay } from "@/lib/utils"
import { getEnvVariable } from "@/lib/variables"

interface PageParams {
  doc: string;
}

export default async function Page(props: { params: Promise<PageParams> }) {
  const params = await props.params;
  if (await getEnvVariable("SIMULATE_LOAD_DELAY")) await delay(5000);
  const { content, frontmatter } = await getMdxContent(params.doc)

  return (
    <>
      <div className="mb-10">
        <h1 className="text-3xl font-bold" style={{ margin: 0 }}>
          {frontmatter.title ?? params.doc}
        </h1>
        {frontmatter.description && (
          <p className="mt-2 text-sm text-gray-400" style={{ marginLeft: 0, marginRight: 0, marginBottom: 0 }}>
            {frontmatter.description}
          </p>
        )}
      </div>
      {content}
    </>)
}

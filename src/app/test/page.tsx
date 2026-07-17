export const dynamic = "force-dynamic";

import { getMdxContent } from "@/lib/mdxUtils";

const DOCUMENT_NAME = "author-docs.mdx";

const RoutePage = async () => {
  const { content, frontmatter } = await getMdxContent(DOCUMENT_NAME);

  return (
    <>
      <div className="mb-10">
        <h1 className="text-3xl font-bold" style={{ margin: 0 }}>
          {frontmatter.title ?? DOCUMENT_NAME}
        </h1>
        {frontmatter.description && (
          <p className="mt-2 text-sm text-gray-400" style={{ marginLeft: 0, marginRight: 0, marginBottom: 0 }}>
            {frontmatter.description}
          </p>
        )}
      </div>
      {content}
    </>
  );
};

export default RoutePage;

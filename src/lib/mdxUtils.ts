import { promises as fs } from "fs";
import path from "path";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import imgLinks from "@pondorasti/remark-img-links";
import emoji from "remark-emoji";
import { getVariable, getEnvVariable } from "./variables"
import MDXComponents from "@/lib/mdxComponents"
import matter from "gray-matter";
import { delay } from "@/lib/utils"
import { Document, DocumentData, Frontmatter, GitHubFile, MdxFrontmatter } from "./types";
import { PluggableList } from "unified";

type RemoteDocumentCacheStore = typeof globalThis & {
  __remoteDocumentCache?: Map<string, string>;
  __remoteDocumentInflight?: Map<string, Promise<string>>;
  __remoteDocsIndexCache?: Map<string, Document[]>;
  __remoteDocsIndexInflight?: Map<string, Promise<Document[]>>;
};

function getRemoteDocumentCacheStore(): Required<Pick<RemoteDocumentCacheStore, "__remoteDocumentCache" | "__remoteDocumentInflight">> {
  const store = globalThis as RemoteDocumentCacheStore;
  store.__remoteDocumentCache ??= new Map<string, string>();
  store.__remoteDocumentInflight ??= new Map<string, Promise<string>>();
  return {
    __remoteDocumentCache: store.__remoteDocumentCache,
    __remoteDocumentInflight: store.__remoteDocumentInflight,
  };
}

function getRemoteDocsIndexCacheStore(): Required<Pick<RemoteDocumentCacheStore, "__remoteDocsIndexCache" | "__remoteDocsIndexInflight">> {
  const store = globalThis as RemoteDocumentCacheStore;
  store.__remoteDocsIndexCache ??= new Map<string, Document[]>();
  store.__remoteDocsIndexInflight ??= new Map<string, Promise<Document[]>>();
  return {
    __remoteDocsIndexCache: store.__remoteDocsIndexCache,
    __remoteDocsIndexInflight: store.__remoteDocsIndexInflight,
  };
}

function parseDockerArrayExpression(
  expression: string,
  keyParsers: Record<string, RegExp>,
  booleanKeys: Set<string> = new Set()
): Array<Record<string, string | boolean>> | null {
  // Support one level of nested braces for template literal expressions like ${process.env["PETNAME"]}.
  const objectMatches = expression.match(/\{(?:[^{}]|\{[^{}]*\})*\}/g);
  if (!objectMatches || objectMatches.length === 0) {
    return null;
  }

  const parsed = objectMatches.map((entry) => {
    const parsedEntry: Record<string, string | boolean> = {};

    for (const [key, matcher] of Object.entries(keyParsers)) {
      const match = entry.match(matcher);
      if (!match) {
        continue;
      }

      const capturedValue = match.slice(1).find((group) => group !== undefined);
      if (capturedValue === undefined) {
        continue;
      }

      if (
        booleanKeys.has(key) &&
        (capturedValue === "true" || capturedValue === "false")
      ) {
        parsedEntry[key] = capturedValue === "true";
      } else {
        parsedEntry[key] = capturedValue;
      }
    }

    if (typeof parsedEntry.name !== "string" || parsedEntry.name.length === 0) {
      return null;
    }

    return parsedEntry;
  });

  if (parsed.some((entry) => entry === null)) {
    return null;
  }

  return parsed as Array<Record<string, string | boolean>>;
}

function parseDockerAttrsArrayExpression(expression: string): Array<Record<string, string>> | null {
  const attrPattern = /\{\s*name\s*:\s*"([^"]+)"\s*,\s*value\s*:\s*(?:"([^"]*)"|`([^`]*)`)\s*\}/g;
  const parsed: Array<Record<string, string>> = [];
  let match: RegExpExecArray | null = null;

  while ((match = attrPattern.exec(expression)) !== null) {
    const name = match[1];
    const value = match[2] ?? match[3] ?? "";
    if (!name) {
      continue;
    }
    parsed.push({ name, value });
  }

  return parsed.length > 0 ? parsed : null;
}

function normalizeDockerMdxProps(source: string): string {
  // Match env/attrs array props only when the closing ]} is followed by another prop or tag close.
  const dockerArrayPropPattern = (propName: string) => new RegExp(
    `${propName}=\\{\\[([\\s\\S]*?)\\]\\}(?=\\s+[a-zA-Z_][\\w-]*=|\\s*\\/?>)`,
    "g"
  );

  let normalizedSource = source.replace(dockerArrayPropPattern("env"), (fullMatch, envBody: string) => {
    const parsed = parseDockerArrayExpression(envBody, {
      name: /name\s*:\s*"([^"]+)"/,
      value: /value\s*:\s*(?:"([^"]*)"|`([^`]*)`)/,
      isVariable: /isVariable\s*:\s*(true|false)/,
      isSecret: /isSecret\s*:\s*(true|false)/,
    }, new Set(["isVariable", "isSecret"]));
    if (!parsed) {
      return fullMatch;
    }

    const encoded = JSON.stringify(parsed).replace(/"/g, "&quot;");
    return `env=\"${encoded}\"`;
  });

  normalizedSource = normalizedSource.replace(dockerArrayPropPattern("attrs"), (fullMatch, attrsBody: string) => {
    const parsed = parseDockerAttrsArrayExpression(attrsBody);
    if (!parsed) {
      return fullMatch;
    }

    const encoded = JSON.stringify(parsed).replace(/"/g, "&quot;");
    return `attrs=\"${encoded}\"`;
  });

  return normalizedSource;
}

function normalizeApiCheckTlsProps(source: string): string {
  const apiCheckTagPattern = /<(APICheck|APIHeaderCheck|APIResponseCheck)([\s\S]*?)\/>/g;

  return source.replace(apiCheckTagPattern, (fullMatch, componentName: string, rawProps: string) => {
    const normalizedProps = rawProps
      .replace(/\stlsComponent\s*=\s*\{\s*true\s*\}/gi, " tlsComponent=\"true\"")
      .replace(/\stlsComponent\s*=\s*\"true\"/gi, " tlsComponent=\"true\"");

    return `<${componentName}${normalizedProps}/>`;
  });
}

export const LOCAL_DOCS_PATH = path.join(process.cwd(), "src/app/docs");

function normalizeMdxFrontmatter(frontmatter: unknown): MdxFrontmatter {
  const raw = frontmatter && typeof frontmatter === "object" && !Array.isArray(frontmatter)
    ? frontmatter as Record<string, unknown>
    : {};

  return {
    ...raw,
    title: typeof raw.title === "string" ? raw.title : undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
    order: typeof raw.order === "number" ? raw.order : undefined,
  };
}

/**
 * Returns all document-loading related settings.
 * @returns {Promise<{
 *   remoteDocsRepoServer: string | null;
 *   remoteDocsRepoApiServer: string | null;
 *   remoteDocsRepoOwner: string | null;
 *   remoteDocsRepoName: string | null;
 *   remoteDocsRepoBranch: string | null;
 *   remoteDocsRepoMediaPath: string;
 *   remoteDocsRepoPath: string | null;
 *   remoteDocsRepoCacheSeconds: number;
 * }>} Object containing named constants.
 */
async function getDocsSettings() {
  // these values need to be pulled from ENV, to avoid remote code execution
  const remoteDocsRepoServer = await getEnvVariable("REMOTE_DOCS_REPO_SERVER");
  const remoteDocsRepoApiServer = await getVariable("REMOTE_DOCS_REPO_API_SERVER")
  const remoteDocsRepoOwner = await getEnvVariable("REMOTE_DOCS_REPO_OWNER");
  const remoteDocsRepoName = await getEnvVariable("REMOTE_DOCS_REPO_NAME");
  const remoteDocsRepoBranch = await getEnvVariable("REMOTE_DOCS_REPO_BRANCH");
  const remoteDocsRepoPath = await getEnvVariable("REMOTE_DOCS_REPO_PATH");
  const remoteDocsRepoMediaPath = await getEnvVariable("REMOTE_DOCS_REPO_MEDIA_PATH") || "media";
  const remoteDocsRepoCacheSeconds = await getEnvVariable<number>("REMOTE_DOCS_REPO_CACHE_SECONDS") || 300;
  return { remoteDocsRepoServer, remoteDocsRepoApiServer, remoteDocsRepoOwner, remoteDocsRepoName, remoteDocsRepoBranch, remoteDocsRepoMediaPath, remoteDocsRepoPath, remoteDocsRepoCacheSeconds };
}

/**
 * Compiles MD(X) document content.
 * @param {string} documentName - The file name of the document to compile.
 * 
 * @returns {Promise<CompileMDXResult<MdxFrontmatter>>} the compiled MDX.
 * @throws {Error} If the the document cannot be compiled.
 */
export async function getMdxContent(documentName: string) {

  const docsSettings = await getDocsSettings();

  const remarkPlugins: PluggableList = [
    remarkGfm,
    emoji,
  ]
  if (docsSettings.remoteDocsRepoServer) remarkPlugins.push([imgLinks, { absolutePath: `${docsSettings.remoteDocsRepoServer}/${docsSettings.remoteDocsRepoOwner}/${docsSettings.remoteDocsRepoName}/${docsSettings.remoteDocsRepoBranch}/${docsSettings.remoteDocsRepoMediaPath}` }])

  const documentUrl = `${docsSettings.remoteDocsRepoServer}/${docsSettings.remoteDocsRepoOwner}/${docsSettings.remoteDocsRepoName}/${docsSettings.remoteDocsRepoBranch}/${docsSettings.remoteDocsRepoPath}/${documentName}`
  const sourceDocument = docsSettings.remoteDocsRepoServer ? await getRemoteDocument(documentUrl, docsSettings.remoteDocsRepoCacheSeconds) : await getLocalDocument(documentName)
  const normalizedSourceDocument = normalizeApiCheckTlsProps(normalizeDockerMdxProps(sourceDocument))
  const compiled = await compileMDX<MdxFrontmatter>({
    source: normalizedSourceDocument,
    components: MDXComponents,
    options: {
      mdxOptions: {
        remarkPlugins: remarkPlugins,
      },
      parseFrontmatter: true,
      scope: {
        vars: await getVariable("vars")
      },
    },
  })

  return {
    ...compiled,
    frontmatter: normalizeMdxFrontmatter(compiled.frontmatter),
  };
}


/**
 * Fetches MD(X) content from the local file system.
 * @param {string} documentName - The file name of the document to fetch.
 * 
 * @returns {Promise<string>} the text content of the loaded document.
 * @throws {Error} If the document cannot be loaded.
 */
async function getLocalDocument(documentName: string) {
  return await fs.readFile(path.join(LOCAL_DOCS_PATH, documentName), "utf8");
}


/**
 * Fetches mdx content from a remote GitHub repo, and caches in nextjs.
 * @param {string} documentName - The file name of the document to fetch.
 * @param {string} cacheSeconds - The number of seconds to cache the fetched content in nextjs.
 * 
 * @returns {Promise<string>} the text content of the fetched document.
 * @throws {Error} If the document cannot be fetched.
 */
async function getRemoteDocument(url: string, cacheSeconds: number) {
  const { __remoteDocumentCache: remoteDocumentCache, __remoteDocumentInflight: remoteDocumentInflight } = getRemoteDocumentCacheStore();

  const inflightDocument = remoteDocumentInflight.get(url);
  if (inflightDocument) {
    return inflightDocument;
  }

  const options = {
    method: "GET",
    supportHeaderParams: true,
    headers: {
      "Accept": "text/plain;encoding=utf-8",
      "Content-Type": "text/plain;encoding=utf-8"
    },
    next: {
      revalidate: cacheSeconds
    }
  }
  const remoteDocumentPromise = (async () => {
    const res = await fetch(url, options)

    if (!res.ok) {
      const cachedDocument = remoteDocumentCache.get(url);
      if (cachedDocument !== undefined) {
        return cachedDocument;
      }
      return `# Remote Document Unavailable\n\nUnable to fetch ${url}.`;
    }

    const documentText = await res.text()
    remoteDocumentCache.set(url, documentText);
    return documentText
  })().catch((error) => {
    const cachedDocument = remoteDocumentCache.get(url);
    if (cachedDocument !== undefined) {
      return cachedDocument;
    }
    return `# Remote Document Unavailable\n\n${error instanceof Error ? error.message : "Unable to fetch remote document."}`;
  }).finally(() => {
    remoteDocumentInflight.delete(url);
  });

  remoteDocumentInflight.set(url, remoteDocumentPromise);
  return remoteDocumentPromise;
}


/**
 * Gets a list of MD(X) documents from a local or remote source depending on whether a repo is specified in the env vars.
 * @returns {Promise<Document[]>} Array of document data sorted by order metadata in frontmatter.
 */
export async function getIndexDocs() {
  if (await getEnvVariable("SIMULATE_LOAD_DELAY")) await delay(5000);
  const docsSettings = await getDocsSettings();
  return docsSettings.remoteDocsRepoServer ? await getGitHubDocs(docsSettings.remoteDocsRepoCacheSeconds) : await getLocalDocs(LOCAL_DOCS_PATH)
}

/**
 * Gets a list of MD(X) documents from a remote source, GitHub.
 * @param {number} cacheSeconds - The number of seconds to cache the fetched content in nextjs.
 * @returns {Promise<Document[]>} Array of document data sorted by order metadata in frontmatter.
 */
async function getGitHubDocs(cacheSeconds: number) {
  const { __remoteDocsIndexCache: remoteDocsIndexCache, __remoteDocsIndexInflight: remoteDocsIndexInflight } = getRemoteDocsIndexCacheStore();

  const docsSettings = await getDocsSettings();

  const url = `${docsSettings.remoteDocsRepoApiServer}/repos/${docsSettings.remoteDocsRepoOwner}/${docsSettings.remoteDocsRepoName}/contents/${docsSettings.remoteDocsRepoPath}?ref=${docsSettings.remoteDocsRepoBranch}`

  const fetchOptions = {
    method: "GET",
    supportHeaderParams: true,
    headers: {
      "Accept": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    next: {
      revalidate: cacheSeconds
    }
  }
  const inflightDocs = remoteDocsIndexInflight.get(url);
  if (inflightDocs) {
    return inflightDocs;
  }

  const remoteDocsPromise = (async () => {
    const res = await fetch(url, fetchOptions)

    if (!res.ok) {
      const cachedDocs = remoteDocsIndexCache.get(url);
      if (cachedDocs !== undefined) {
        return cachedDocs;
      }
      return [];
    }

    const body = await res.json()

    const files: GitHubFile[] = body
      .filter((file: GitHubFile) => /\.mdx?$/.test(file.name) && file.type === "file")
      .map((file: GitHubFile) => ({ name: file.name, url: file.url }));

    const docs = await Promise.all(files.map(async (file: GitHubFile) => ({ name: file.name, location: file.url, documentData: await getGitHubFileContent(file.url, fetchOptions) })
    )
    );
    const sortedDocs = sortDocumentsByOrder(docs)
    remoteDocsIndexCache.set(url, sortedDocs);
    return sortedDocs
  })().catch(() => {
    const cachedDocs = remoteDocsIndexCache.get(url);
    if (cachedDocs !== undefined) {
      return cachedDocs;
    }
    return [];
  }).finally(() => {
    remoteDocsIndexInflight.delete(url);
  });

  remoteDocsIndexInflight.set(url, remoteDocsPromise);
  return remoteDocsPromise;
}

/**
 * Fetches document from GitHub using API to return its frontmatter.
 * @param {string} url to fetch the document from.
 * @param {RequestInit} options to be used by the fetch operation.
 * @returns {Promise<DocumentData>} The document content and frontmatter.
 */
async function getGitHubFileContent(url: string, options: RequestInit): Promise<DocumentData> {
  const response = await fetch(url, options)
  const fileData = await response.json()
  const decodedDocument = Buffer.from(fileData.content, "base64").toString("utf8")
  return decodeFrontmatter(decodedDocument)
}

/**
 * Gets a list of MD(X) documents from the local file system.
 * @param {string} docsPath the file system path to scan for MD(X) documents.
 * @returns {Promise<Document[]>} Array of document data sorted by order metadata in frontmatter.
 */
async function getLocalDocs(docsPath: string) {

  // Only include md(x) files
  const docFilePaths = (await fs.readdir(docsPath)).filter((path: string) => /\.mdx?$/.test(path));

  const docs = await Promise.all(docFilePaths.map(async (location: string) => {
    const filePath = path.join(docsPath, location)
    const source = await fs.readFile(filePath, "utf8");

    return {
      name: path.basename(location),
      location,
      documentData: decodeFrontmatter(source)
    };
  }));
  return sortDocumentsByOrder(docs)
}

/**
 * Parses frontmatter from MD(X) document.
 * @param {string} document in string form
 * @returns {Frontmatter} an object containing discrete content and metadata (frontmatter)
 */
function decodeFrontmatter(document: string): Frontmatter {
  const { content, data } = matter(document);
  return { content, metadata: data };
}

/**
 * Description
 * @param {Document} docs array of documents
 * @returns {Document} array of documents sorted in ascending order.
 */
function sortDocumentsByOrder(docs: Document[]): Document[] {
  return docs.sort((a, b) => (a.documentData.metadata?.order ?? 0) - (b.documentData.metadata?.order ?? 0));
}

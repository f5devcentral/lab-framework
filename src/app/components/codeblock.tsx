import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { solarizedlight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CodeBlockCopy } from "@/app/components/codeblock-copy";
import { getVariable } from "@/lib/variables";

type CodeBlockProps = {
  children?: React.ReactNode;
  className?: string;
  isBlock?: boolean;
};

function getCodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getCodeText).join("");
  }

  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: React.ReactNode } }).props;
    return getCodeText(props?.children);
  }

  return "";
}

async function processChildren(children: string): Promise<string> {
  if (!children) {
    return children;
  }

  const regex = /{{(.*?)}}/g;
  const variables: string[] = [];
  const promises: Promise<unknown>[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(children)) !== null) {
    const variable = match[1]?.trim();
    if (!variable) {
      continue;
    }
    variables.push(variable);
    promises.push(getVariable(variable));
  }

  if (variables.length === 0) {
    return children;
  }

  const results = await Promise.all(promises);
  let nextChildren = children;

  variables.forEach((variable, index) => {
    nextChildren = nextChildren.replace(`{{${variable}}}`, String(results[index] ?? ""));
  });

  return nextChildren;
}

export async function CodeBlock({ children, className = "", isBlock = false, ...props }: CodeBlockProps) {
  const codeText = getCodeText(children);
  const processedCodeText = await processChildren(codeText);

  if (!isBlock) {
    return (
      <span className="rounded-lg bg-stone-200 px-2 py-1 text-slate-700">
        <code className={className} {...props}>
          {codeText}
        </code>
      </span>
    );
  }

  const language = /language-(\w+)/.exec(className || "");

  return (
    <div className="relative my-4 ml-4 overflow-x-auto rounded-xl bg-slate-800 shadow-sm">
      <CodeBlockCopy>{processedCodeText}</CodeBlockCopy>
      <SyntaxHighlighter
        {...props}
        customStyle={{
          background: "transparent",
          margin: 0,
          padding: "1rem 1rem 1rem 1.25rem",
        }}
        language={language ? language[1] : undefined}
        PreTag="div"
        style={solarizedlight}
      >
        {processedCodeText}
      </SyntaxHighlighter>
    </div>
  );
}

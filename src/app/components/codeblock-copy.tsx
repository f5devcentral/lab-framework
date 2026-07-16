"use client";

import { useState } from "react";

type CodeBlockCopyProps = {
  children: string;
};

export function CodeBlockCopy({ children }: CodeBlockCopyProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children.trim());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute right-3 top-3 rounded-lg bg-blue-600 px-2 py-1 text-xs font-bold text-white transition-colors hover:bg-blue-700 cursor-pointer"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

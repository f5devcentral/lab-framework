"use client";

type DownloadItemProps = {
  item: string;
  fileName: string;
};

export function DownloadItem({ item, fileName }: DownloadItemProps) {
  const dataHref = `data:text/plain;charset=utf-8,${encodeURIComponent(item)}`;

  return (
    <a
      download={fileName}
      target="_blank"
      rel="noreferrer"
      href={dataHref}
      style={{
        textDecoration: "inherit",
        color: "inherit",
      }}
    >
      <button
        type="button"
        className="px-3 right-2 top-2 bg-gray-700 text-white p-1 rounded-md hover:bg-gray-600 focus:outline-none cursor-pointer"
      >
        Download
      </button>
    </a>
  );
}

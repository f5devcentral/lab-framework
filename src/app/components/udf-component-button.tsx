"use client";

type UDFComponentButtonProps = {
  webShellUrl: string | null;
};

export default function UDFComponentButton({ webShellUrl }: UDFComponentButtonProps) {
  const handleButtonClick = () => {
    if (webShellUrl) {
      window.open(webShellUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <button
      type="button"
      onClick={handleButtonClick}
      disabled={!webShellUrl}
      className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition-colors hover:bg-blue-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
    >
      Open Web Shell
    </button>
  );
}

/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ImageModalClientProps = {
  src?: string;
  alt?: string;
};

export default function ImageModalClient({ src = "", alt = "Image" }: ImageModalClientProps) {
  const [isOpen, setIsOpen] = useState(false);

  const closeModal = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <>
      <img
        src={src}
        alt={`${alt} (thumbnail)`}
        className="cursor-pointer transition-transform hover:scale-[1.01]"
        onClick={() => setIsOpen(true)}
      />
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closeModal}
        >
          <div className="relative max-h-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-2 top-2 z-10 rounded-lg bg-black/70 px-2 py-1 text-xl leading-none text-white transition-colors hover:bg-black cursor-pointer"
              aria-label="Close image modal"
            >
              &times;
            </button>
            <img
              src={src}
              alt={`${alt} (full size)`}
              className="max-h-[90vh] max-w-full rounded shadow-2xl"
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

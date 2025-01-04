"use client";
import { mergeClasses } from "@/app/lib/utils";
import { useState } from "react";

const buttonStyles =
  "px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * A reusable button component.
 *
 * @param {ButtonProps} props - The props for the button component.
 * @returns {JSX.Element} - The rendered button component.
 */
interface ButtonProps {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function Button({
  onClick,
  className,
  children,
  disabled = false,
}: ButtonProps) {
  const [isDisabled, setIsDisabled] = useState<boolean>(disabled);

  return (
    <button
      className={
        className ? mergeClasses(buttonStyles, className) : buttonStyles
      }
      onClick={async () => {
        setIsDisabled(!disabled);
        try {
          await onClick();
        } catch (error) {
          console.error("Button onClick Error: ", error);
        }
        setIsDisabled(disabled);
      }}
      disabled={isDisabled}
    >
      {children}
    </button>
  );
}

"use client";
import { mergeClasses } from "@/app/lib/utils";
import { useState } from "react";

const buttonStyles =
  "px-4 py-2 text-white rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * A reusable button component.
 *
 * This component renders a button with customizable styles and behavior.
 * It supports disabling the button and handles asynchronous click events.
 *
 * @param {ButtonProps} props - The props for the button component.
 * @param {() => void} props.onClick - The function to call when the button is clicked.
 * @param {string} [props.className] - Additional CSS classes to apply to the button.
 * @param {React.ReactNode} props.children - The content to display inside the button.
 * @param {boolean} [props.disabled=false] - Whether the button is disabled.
 *
 * @returns {JSX.Element} - The rendered button component.
 */
interface ButtonProps {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}


/**
 * A customizable button component that handles internal and external disabling states.
 *
 * @param {Object} props - The properties object.
 * @param {Function} props.onClick - The function to call when the button is clicked.
 * @param {string} [props.className] - Additional class names to apply to the button.
 * @param {React.ReactNode} props.children - The content to display inside the button.
 * @param {boolean} [props.disabled=false] - The initial disabled state of the button.
 *
 * @returns {JSX.Element} The rendered button component.
 */
export function Button({
  onClick,
  className,
  children,
  disabled = false,
}: ButtonProps) {
  const [internalDisabled, setInternalDisabled] = useState<boolean>(disabled);
  const [allowExternalDisabling, setAllowExternalDisabling] = useState<boolean>(true);

  return (
    <button
      className={
        className ? mergeClasses(buttonStyles, className) : buttonStyles
      }
      onClick={async () => {
        setAllowExternalDisabling(false);
        setInternalDisabled(true);
        try {
          await onClick();
        } catch (error) {
          console.error("Button onClick Error: ", error);
        }
        setInternalDisabled(false);
        setAllowExternalDisabling(true);
      }}
      disabled={allowExternalDisabling ? disabled : internalDisabled}
    >
      {children}
    </button>
  );
}

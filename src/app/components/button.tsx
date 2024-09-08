"use client";
import { mergeClasses } from "@/app/lib/utils";
import { useState } from "react";

const buttonStyles = "px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * Props for the Button component.
 * @typedef {Object} ButtonProps
 * @property {() => Promise<void>} onClick - The function to call when the button is clicked.
 * @property {string} [className] - Additional CSS classes to apply to the button.
 * @property {React.ReactNode} children - The content to display inside the button.
 * @property {boolean} [disabled=false] - Whether the button is disabled.
 */
type ButtonProps = {
  onClick: () => Promise<void>
  className?: string | undefined
  children: React.ReactNode
  disabled?: boolean
};

/**
 * A reusable button component.
 * 
 * @param {ButtonProps} props - The props for the button component.
 * @returns {JSX.Element} - The rendered button component.
 */
const Button: React.FC<ButtonProps> = ({ onClick, className, children, disabled = false }) => {
  const [isDisabled, setIsDisabled] = useState<boolean>(disabled);

  return (
    <button
      className={className ? mergeClasses(buttonStyles, className) : buttonStyles}
      onClick={async () => {
        setIsDisabled(true);
        try {
          await onClick();
        }
        catch (error) {
          console.error('Button onClick Error: ', error);
        }
        setIsDisabled(false);
      }}
      disabled={isDisabled}
    >
      {children}
    </button>
  )
}

export { Button }

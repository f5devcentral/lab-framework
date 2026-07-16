"use client";

import { Button } from "@/app/components/button";
import { useState } from "react";
import { setVariable } from "@/lib/variables";

type InputVariableProps = {
  name?: string;
  value?: string;
};

export function InputVariable({ name = "", value = "" }: InputVariableProps) {
  const [state, setState] = useState<{ status: boolean | null; error: string | null }>({
    status: null,
    error: null,
  });
  const [isDisabled, setIsDisabled] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  const handleButtonClick = async () => {
    setIsDisabled(true);

    try {
      await setVariable(name, inputValue);
      setState({ status: true, error: null });
    } catch (error) {
      const err = error as Error;
      console.error("Error setting variable:", error);
      setState({ status: false, error: err.message });
    } finally {
      setIsDisabled(false);
      setInputValue("");
    }
  };

  return (
    <div className="flex flex-col border border-gray-300 p-4 rounded w-full max-w-3xl">
      <span className="font-bold text-xl">Set Variable</span>
      <div className="mt-2 ml-4">
        <div className="flex items-center mb-1 gap-2">
          <span className="font-bold mr-2">{name}:</span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter a value..."
            className="w-full min-w-0 p-2 bg-white rounded shadow-md"
            disabled={isDisabled}
          />
        </div>
      </div>
      <div className="block m-4">
        <Button
          onClick={handleButtonClick}
          className="bg-blue-500 size-min font-bold"
          disabled={isDisabled}
        >
          Save
        </Button>
        {state.status !== null && (
          <p className={state.status ? "text-green-500" : "text-red-500"}>
            {state.status ? "Variable set successfully!" : `Error: ${state.error}`}
          </p>
        )}
      </div>
    </div>
  );
}

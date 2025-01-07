import React from "react";

/**
 * APICheckContainer component
 * 
 * This component renders APICheck, APIHeaderCheck or APIResponseCheck components.
 * It wraps each APICheck component in a div with a specific class for styling.
 * 
 * @param {Object} props - The properties object.
 * @param {React.ReactNode} props.children - The child components to be filtered and rendered.
 * 
 * @returns {JSX.Element} The rendered APICheck component.
 * 
 * @example
 * <APICheckContainer>
 *   <APICheck id="apicheck1" />
 *   <APIHeaderCheck id="apicheck2" />
 *   <APIResponseCheck id="apicheck3" />
 *   <div>Not an APICheck component</div>
 * </APICheckContainer>
 */
export function APICheckContainer({ children }: { children: React.ReactNode }) {
  const apiCheckComponents = React.Children.toArray(children);

  return (
    <div id="api-check-outer-container" className="flex flex-col border border-gray-300 p-4 rounded">
      <span className="font-bold text-xl">Checks</span>
      <div id="api-check-inner-container" className="flex flex-wrap gap-4 mt-3">
        {apiCheckComponents.map((component, index) => (
          <div key={index} className="api-check-item">
            {component}
          </div>
        ))}
      </div>
    </div>
  );
}

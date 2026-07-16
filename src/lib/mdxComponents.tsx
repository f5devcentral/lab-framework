import React from "react";
import { APICheck } from "@/app/components/api-check";
import { APIHeaderCheck } from "@/app/components/api-header-check";
import { APIResponseCheck } from "@/app/components/api-response-check";
import { CodeBlock } from "@/app/components/codeblock";
import { Docker, DockerInstance } from "@/app/components/docker";
import { DockerContainer } from "@/app/components/docker-container";
import { GetVariable } from "@/app/components/get-variable";
import ImageModalClient from "@/app/components/image-modal-client";
import { InputVariable } from "@/app/components/input-var";
import { SetVariable } from "@/app/components/set-variable";
import { CreateCertificate } from "@/app/components/create-certificate";
import UDFComponent from "@/app/components/udf-component";
import { UdfDeploymentMetadata } from "@/app/components/udf-deployment-metadata";
// import { Collapsible } from "@/app/components/collapsible";

// import DockerContainer from "@/app/components/docker-container";
import { APICheckContainer } from "@/app/components/api-check-container";

// type MDXComponentProps = {
//   children?: React.ReactNode;
//   [key: string]: React.ReactNode;
// };

type MDXComponentProps = React.JSX.IntrinsicAttributes & React.ClassAttributes<HTMLHeadingElement> & React.HTMLAttributes<HTMLHeadingElement>
const MDXComponents = {
  APICheck,
  APICheckContainer,
  APIHeaderCheck,
  APIResponseCheck,
  CodeBlock,
  CreateCertificate,
  Docker,
  DockerInstance,
  DockerContainer,
  GetVariable,
  InputVariable,
  SetVariable,
  UDFComponent,
  UdfDeploymentMetadata,
  // Collapsible,
  h1: (props: MDXComponentProps) => (
    <h1 id={formatId(props.children as string)} {...props} />
  ),
  h2: (props: MDXComponentProps) => (
    <h2 id={formatId(props.children as string)} {...props} />
  ),
  h3: (props: MDXComponentProps) => (
    <h3 id={formatId(props.children as string)} {...props} />
  ),
  h4: (props: MDXComponentProps) => (
    <h4 id={formatId(props.children as string)} {...props} />
  ),
  pre: ({ children }: { children: React.ReactNode }) => (
    <>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<{ isBlock?: boolean }>,
            { isBlock: true }
          );
        }
        return child;
      })}
    </>
  ),
  code: CodeBlock,
  img: ImageModalClient,
};

export default MDXComponents;
/**
 * Returns an id without spaces, and is lower case.
 * @param {string} the existing id.
 * @returns {string} the formatted id.
 */
function formatId(existingId: string): string {
  return existingId.toLowerCase().replace(/\s/g, "-");
}

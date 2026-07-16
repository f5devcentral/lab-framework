import { twMerge } from "tailwind-merge";

/**
 * Merges multiple Tailwind CSS classes into a single string.
 * 
 * @param {...string[]} classes - The classes to merge.
 * @returns {string} - The merged class string.
 */
export function mergeClasses(...classes: string[]): string {
    return twMerge(...classes);
}

type InstanceDeploymentNameType = {
    name: string;
    deploymentIdentifier: string;
};

/**
 * Generates a deployment name for an instance, suitable for Docker and Kubernetes.
 * 
 * @param {InstanceDeploymentNameType} param0 - The instance deployment name parameters.
 * @param {string} param0.name - The base name of the instance.
 * @param {string} param0.deploymentIdentifier - The identifier prefix for the deployment name.
 * @returns {string} - The normalized deployment name.
 */
export function getInstanceDeploymentName(
    params: InstanceDeploymentNameType
): string {

    const { name } = params;
    const { deploymentIdentifier } = params;

    /**
     * Replaces all non-alphanumeric characters in the name with hyphens and converts the string to lowercase.
     * This ensures the deployment name is suitable for Docker and Kubernetes, which require lowercase
     * alphanumeric characters and hyphens.
     */
    const deploymentName = name.replace(/[^a-z0-9]/gi, "").toLowerCase();

    return `${deploymentIdentifier}-${deploymentName}`;
}

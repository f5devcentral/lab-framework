import { twMerge } from "tailwind-merge";

/**
 * Merges multiple Tailwind CSS classes into a single string.
 * 
 * @param {...string[]} classes - The classes to merge.
 * @returns {string} - The merged class string.
 */
function mergeClasses(...classes: string[]): string {
    return twMerge(...classes);
}

type InstanceDeploymentNameType = {
    name: string;
    petname?: string;
};

/**
 * Generates a deployment name for an instance, suitable for Docker and Kubernetes.
 * 
 * @param {InstanceDeploymentNameType} param0 - The instance deployment name parameters.
 * @param {string} param0.name - The base name of the instance.
 * @param {string} [param0.petname='testing'] - An optional pet name to prefix the deployment name.
 * @returns {string} - The normalized deployment name.
 */
function getInstanceDeploymentName({ name, petname = 'testing' }: InstanceDeploymentNameType): string {

    /**
     * Replaces all non-alphanumeric characters in the name with hyphens and converts the string to lowercase.
     * This ensures the deployment name is suitable for Docker and Kubernetes, which require lowercase
     * alphanumeric characters and hyphens.
     */
    const deploymentName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    return `${petname}-${deploymentName}`;
}

export { mergeClasses, getInstanceDeploymentName };
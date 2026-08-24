/**
 * Returns the UDF deployment API URL from environment or default.
 */
export function getUdfDeploymentApiUrl(): string {
  return process.env.UDF_DEPLOYMENT_API_URL || "http://metadata.udf/deployment";
}

/**
 * Returns the deployment identifier API URL from environment or default.
 */
export function getDeploymentIdentifierApiUrl(): string {
  return process.env.DEPLOYMENT_IDENTIFIER_API_URL || "http://host.docker.internal:5123/petname";
}

/**
 * Returns the LabInfo API URL from environment or default.
 */
export function getLabInfoApiUrl(): string {
  return process.env.LABINFO_API_URL || "http://host.docker.internal:5123/metadata";
}

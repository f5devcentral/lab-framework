"use server";

import { DEPLOYMENT_IDENTIFIER_API_URL } from "./constants";
import { DeploymentIdentifier } from "./types";

function getDeploymentIdentifierResponseField(): string {
  return process.env.DEPLOYMENT_IDENTIFIER_RESPONSE_FIELD?.trim() || "petname";
}

export async function fetchDeploymentIdentifierServer(): Promise<DeploymentIdentifier> {
  try {
    const response = await fetch(DEPLOYMENT_IDENTIFIER_API_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(
        `Failed to retrieve deployment identifier from ${DEPLOYMENT_IDENTIFIER_API_URL}`
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
  const value = payload[getDeploymentIdentifierResponseField()];

    return typeof value === "string" ? value : null;
  } catch (error) {
    console.error("Error fetching deployment identifier:", error);
    return null;
  }
}

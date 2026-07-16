export const DEPLOYMENT_IDENTIFIER_KEY = "DEPLOYMENT_IDENTIFIER";

export function getCandidateKeys(name: string): string[] {
  const raw = name.trim();
  if (!raw) {
    return [];
  }

  if (raw.toLowerCase() === "petname") {
    return ["petname", "PETNAME", DEPLOYMENT_IDENTIFIER_KEY];
  }

  const upper = raw.toUpperCase();
  return upper === raw ? [raw] : [raw, upper];
}

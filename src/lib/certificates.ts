import createCert from "create-cert";

type CertificatePair = {
  cert: string;
  key: string;
};

function normalizeCommonName(commonName: string): string {
  const value = commonName.trim();
  if (!value) {
    throw new Error("commonName must not be empty");
  }
  if (value.length > 255) {
    throw new Error("commonName exceeds 255 characters");
  }
  return value;
}

export async function createCertificate(commonName: string, days = 7): Promise<CertificatePair> {
  const normalizedCommonName = normalizeCommonName(commonName);
  return await createCert({ commonName: normalizedCommonName, days });
}

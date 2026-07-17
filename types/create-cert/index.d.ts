declare module "create-cert" {
  export type CreateCertOptions = {
    commonName: string;
    days?: number;
  };

  export type CreateCertResult = {
    cert: string;
    key: string;
  };

  export default function createCert(options: CreateCertOptions): Promise<CreateCertResult>;
}

export type Petname = string | null;

export type ComponentInfo = {
  host: string;
  ports: {
    host: number;
  };
};

export type Document = {
  name: string;
  location: string;
  documentData: DocumentData;
};


export type DocumentData = {
  content: string;
  metadata: {
    order?: number;
    [key: string]: unknown;
  };
}

export type Frontmatter = {
  content: string;
  metadata: Record<string, unknown>;
}

export type GitHubFile = {
  name: string;
  url: string;
  type: string;
}

export enum Protocol {
  Tcp = "tcp",
  Udp = "udp"
}
export enum InstanceType {
  Docker,
  Udf,
  K8s
}

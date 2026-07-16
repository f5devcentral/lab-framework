import { fetchDeploymentIdentifierServer } from "./deployment-identifier-action";

const originalEnv = { ...process.env };

describe("fetchDeploymentIdentifierServer", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns petname from the service payload by default", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ petname: "dep-123" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchDeploymentIdentifierServer()).resolves.toBe("dep-123");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://host.docker.internal:5123/petname",
      { cache: "no-store" }
    );
  });

  it("honors an explicit response field override", async () => {
    process.env.DEPLOYMENT_IDENTIFIER_RESPONSE_FIELD = "petname";

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ petname: "dep-456" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchDeploymentIdentifierServer()).resolves.toBe("dep-456");
  });

  it("returns null when the expected field is missing", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ otherField: "dep-789" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchDeploymentIdentifierServer()).resolves.toBeNull();
  });
});

import {
  findValueByKey,
  fetchLabInfo,
  fetchUDFInfo,
  fetchUdfComponentWebShell,
} from "@/lib/udf";

import fetchMock from "jest-fetch-mock";

beforeEach(() => {
  fetchMock.resetMocks();
});

describe("fetchLabInfo", () => {
  it("should fetch and return the lab info", async () => {
    const mockResponse = { key: "value" };
    fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

    const result = await fetchLabInfo("key");
    expect(result).toBe("value");
  });

  it("should return null on bad http fetch response", async () => {
    fetchMock.mockRejectOnce(new Error("HTTP error message"));

    const result = await fetchLabInfo("key");
    expect(result).toBeNull();
  });
});

describe("fetchUDFInfo", () => {

  it("should fetch and return the UDF info", async () => {
    const mockResponse = { key: "value" };
    fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

    const result = await fetchUDFInfo("key");
    expect(result).toBe("value");
  });

  it("should return null on bad http fetch response", async () => {
    fetchMock.mockResponseOnce("{}", {
      status: 500,
      headers: { "content-type": "application/json" },
    });

    const result = await fetchUDFInfo("key");
    expect(result).toBeNull();
  });
});

describe("fetchUdfComponentWebShell", () => {
  it("should fetch and return the Web Shell URL", async () => {
    const mockResponse = {
      deployment: {
        components: [
          {
            name: "componentName",
            accessMethods: {
              https: [{ label: "Web Shell", host: "example.com" }],
            },
          },
        ],
      },
    };
    fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

    const result = await fetchUdfComponentWebShell("componentName");
    expect(result).toBe("https://example.com");
  });

  it("should return null if the component name is null", async () => {
    const result = await fetchUdfComponentWebShell(null);
    expect(result).toBeNull();
  });

  it("should return null if the Web Shell host is not found", async () => {
    const mockResponse = {
      deployment: {
        components: [
          {
            name: "componentName",
            accessMethods: {
              https: [{ label: "Other", host: "example.com" }],
            },
          },
        ],
      },
    };
    fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

    const result = await fetchUdfComponentWebShell("componentName");
    expect(result).toBeNull();
  });

  it("should return null on bad http fetch response", async () => {
    fetchMock.mockResponseOnce("{}", {
      status: 500,
      headers: { "content-type": "application/json" },
    });

    expect(async () => {
      await fetchUdfComponentWebShell("key");
    }).rejects.toThrow(new Error("HTTP error! status: 500"));
  });
});

describe("findValueByKey", () => {
  it("should return the value associated with the specified key", () => {
    const data = {
      a: 1,
      b: {
        c: 2,
        d: {
          e: "3",
        },
      },
    };
    const value = findValueByKey(data, "e");
    expect(value).toBe("3");
  });

  it("should return null if the key is not found", () => {
    const data = {
      a: 1,
      b: {
        c: 2,
        d: {
          e: "3",
        },
      },
    };
    const value = findValueByKey(data, "f");
    expect(value).toBeNull();
  });

  it("should return null if the value associated with the key is not a string", () => {
    const data = {
      a: 1,
      b: {
        c: 2,
        d: {
          e: 3,
        },
      },
    };
    const value = findValueByKey(data, "e");
    expect(value).toBeNull();
  });

  // it("should return null if the input object is null", () => {
  //   const value = findValueByKey(null, "e");
  //   expect(value).toBeNull();
  // });

  it("should return null if the input object is not an object", () => {
    const value = findValueByKey(
      "not an object" as unknown as Record<string, unknown>,
      "e"
    );
    expect(value).toBeNull();
  });
});

import {
  findValueByKey,
  fetchLabInfo,
  fetchUDFInfo,
  fetchUdfComponentWebShell,
} from "@/lib/udf";

import {
  fetchLabInfoServer,
  fetchUDFInfoServer,
  fetchUdfComponentWebShellServer,
} from "@/lib/udf-action";

jest.mock("@/lib/udf-action", () => ({
  fetchLabInfoServer: jest.fn(),
  fetchUDFInfoServer: jest.fn(),
  fetchUdfComponentWebShellServer: jest.fn(),
}));

describe("udf", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchLabInfo", () => {
    it("should fetch and return the lab info", async () => {
      (fetchLabInfoServer as jest.Mock).mockResolvedValue("value");

      const result = await fetchLabInfo("key");
      expect(result).toBe("value");
    });

    it("should return null on bad http fetch response", async () => {
      (fetchLabInfoServer as jest.Mock).mockResolvedValue(null);

      const result = await fetchLabInfo("key");
      expect(result).toBeNull();
    });
  });

  describe("fetchUDFInfo", () => {

    it("should fetch and return the UDF info", async () => {
      (fetchUDFInfoServer as jest.Mock).mockResolvedValue("value");

      const result = await fetchUDFInfo("key");
      expect(result).toBe("value");
    });

    it("should return null on bad http fetch response", async () => {
      (fetchUDFInfoServer as jest.Mock).mockResolvedValue(null);

      const result = await fetchUDFInfo("key");
      expect(result).toBeNull();
    });
  });

  describe("fetchUdfComponentWebShell", () => {
    it("should fetch and return the Web Shell URL", async () => {
      (fetchUdfComponentWebShellServer as jest.Mock).mockResolvedValue("https://example.com");

      const result = await fetchUdfComponentWebShell("componentName");
      expect(result).toBe("https://example.com");
    });

    it("should return null if the component name is null", async () => {
      (fetchUdfComponentWebShellServer as jest.Mock).mockResolvedValue(null);
      const result = await fetchUdfComponentWebShell(null);
      expect(result).toBeNull();
    });

    it("should return null if the Web Shell host is not found", async () => {
      (fetchUdfComponentWebShellServer as jest.Mock).mockResolvedValue(null);

      const result = await fetchUdfComponentWebShell("componentName");
      expect(result).toBeNull();
    });

    it("should return null on bad http fetch response", async () => {
      (fetchUdfComponentWebShellServer as jest.Mock).mockRejectedValue(new Error("HTTP error! status: 500"));

      await expect(fetchUdfComponentWebShell("key")).rejects.toThrow(new Error("HTTP error! status: 500"));
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

    it("should return the value if the key is at the top level", () => {
      const data = {
        a: "1",
        b: {
          c: 2,
        },
      };
      const value = findValueByKey(data, "a");
      expect(value).toBe("1");
    });

    it("should return the value if the key is deeply nested", () => {
      const data = {
        a: {
          b: {
            c: {
              d: {
                e: "value",
              },
            },
          },
        },
      };
      const value = findValueByKey(data, "e");
      expect(value).toBe("value");
    });

    it("should return null if the key is an empty string", () => {
      const data = {
        a: {
          b: {
            c: {
              d: {
                e: "value",
              },
            },
          },
        },
      };
      const value = findValueByKey(data, "");
      expect(value).toBeNull();
    });
  });
});

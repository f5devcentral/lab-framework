import {
  getComponentName,
  getEnvVariable,
  setEnvVariable,
  getPetname,
  getVariable,
  setVariable,
} from "@/lib/variables";
import { fetchLabInfo, fetchUDFInfo } from "@/lib/udf";
import fetchMock from "jest-fetch-mock";

const originalEnv = { ...process.env };

jest.mock("@/lib/udf", () => ({
  fetchLabInfo: jest.fn(),
  fetchUDFInfo: jest.fn(),
}));

jest.mock("@/lib/variables", () => ({
  ...jest.requireActual("@/lib/variables"),
  getPetName: jest.fn().mockImplementation(() => Promise.resolve("testpet")),
}));

describe("variables", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...originalEnv,
      PETNAME: "testpet",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getComponentName", () => {
    it("should return a normalized component name prefixed with petname", async () => {
      const mockResponse = { PETNAME: "testpet" };
      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      const result = await getComponentName("My Component");
      expect(result).toBe("testpet-my-component");
    });

    it("should throw an error if petname is not retrieved", async () => {
      process.env = {
        ...originalEnv,
      };

      jest.mock("@/lib/variables", () => ({
        ...jest.requireActual("@/lib/variables"),
        getPetName: jest.fn().mockImplementation(() => Promise.resolve(null)),
      }));

      fetchMock.mockResponseOnce("{}", {
        status: 500,
        headers: { "content-type": "application/json" },
      });

      await expect(getComponentName("My Component")).rejects.toThrow(
        "Error getting component name: My Component"
      );
    });
  });

  describe("getEnvVariable", () => {
    it("should return the value of an existing environment variable", async () => {
      process.env.TEST_VAR = "test_value";
      const result = await getEnvVariable("TEST_VAR");
      expect(result).toBe("test_value");
    });

    it("should return null if the environment variable does not exist", async () => {
      const result = await getEnvVariable("NON_EXISTENT_VAR");
      expect(result).toBeNull();
    });
  });

  describe("setEnvVariable", () => {
    it("should set the value of an environment variable", async () => {
      await setEnvVariable("TEST_VAR", "new_value");
      expect(process.env.TEST_VAR).toBe("new_value");
    });
  });

  describe("getPetname", () => {
    beforeEach(() => {
      fetchMock.resetMocks();
    });

    it("should return a petname from the environment variable if it exists", async () => {
      process.env.PETNAME = "envpet";
      const result = await getPetname();
      expect(result).toBe("envpet");
    });

    it("should fetch a petname from the external service if not in environment", async () => {
      delete process.env.PETNAME;

      const mockResponse = { PETNAME: "fetchedpet" };
      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      const result = await getPetname();
      expect(result).toBe("fetchedpet");
      expect(process.env.PETNAME).toBe("fetchedpet");
    });

    it("should return null if fetching petname fails", async () => {
      delete process.env.PETNAME;

      fetchMock.mockResponseOnce("{}", {
        status: 500,
        headers: { "content-type": "application/json" },
      });

      const result = await getPetname();
      expect(result).toBeNull();
    });
  });

  describe("getVariable", () => {
    it("should return the value from the first source that has it", async () => {
      (fetchLabInfo as jest.Mock).mockResolvedValueOnce(null);
      (fetchUDFInfo as jest.Mock).mockResolvedValueOnce("udf_value");
      const result = await getVariable("TEST_VAR");
      expect(result).toBe("udf_value");
    });

    it("should return null if no source has the value", async () => {
      (fetchLabInfo as jest.Mock).mockResolvedValueOnce(null);
      (fetchUDFInfo as jest.Mock).mockResolvedValueOnce(null);
      const result = await getVariable("NON_EXISTENT_VAR");
      expect(result).toBeNull();
    });
  });

  describe("setVariable", () => {
    it("should set the value of a variable in the env storage", async () => {
      await setVariable("TEST_VAR", "new_value");
      expect(process.env.TEST_VAR).toBe("new_value");
    });
  });
});

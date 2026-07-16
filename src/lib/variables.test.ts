import {
  getComponentName,
  getEnvVariable,
  getDeploymentIdentifier,
  setEnvVariable,
  getVariable,
  setVariable,
} from "@/lib/variables";
import {
  getEnvVariableServer,
  getDeploymentIdentifierServer,
  getVariableServer,
  setEnvVariableServer,
} from "@/lib/variables-action";

const originalEnv = { ...process.env };
jest.mock("@/lib/variables-action", () => ({
  getEnvVariableServer: jest.fn(),
  getDeploymentIdentifierServer: jest.fn(),
  getVariableServer: jest.fn(),
  setEnvVariableServer: jest.fn(),
}));

describe("variables", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
    process.env = {
      ...originalEnv,
      DEPLOYMENT_IDENTIFIER: "testenv",
    };
    (getEnvVariableServer as jest.Mock).mockImplementation(async (name: string) => {
      const value = process.env[name];
      return value === undefined ? null : value;
    });
    (setEnvVariableServer as jest.Mock).mockImplementation(async (key: string, value: string) => {
      process.env[key] = value;
    });
    (getDeploymentIdentifierServer as jest.Mock).mockImplementation(
      async () => process.env.DEPLOYMENT_IDENTIFIER ?? null
    );
    (getVariableServer as jest.Mock).mockImplementation(async (name: string) => {
      const upper = name.toUpperCase();
      return process.env[name] ?? process.env[upper] ?? null;
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getComponentName", () => {
    it("should return a normalized component name prefixed with deployment identifier", async () => {
      (getDeploymentIdentifierServer as jest.Mock).mockResolvedValue("testenv");

      const result = await getComponentName("My Component");
      expect(result).toBe("testenv-my-component");
    });

    it("should use a fallback deployment identifier when retrieval fails in browser", async () => {
      process.env = {
        ...originalEnv,
      };

      (getDeploymentIdentifierServer as jest.Mock).mockResolvedValue(null);

      const result = await getComponentName("My Component");
      expect(result).toMatch(/^lab-[a-z0-9]{6}-my-component$/);
    });

    it("should not warn when no deployment identifier is available", async () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      process.env = {
        ...originalEnv,
      };

      (getDeploymentIdentifierServer as jest.Mock).mockResolvedValue(null);

      const result = await getComponentName("My Component");

      expect(result).toMatch(/^lab-[a-z0-9]{6}-my-component$/);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
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

  describe("getDeploymentIdentifier", () => {
    it("should return deployment identifier from LAB_VARIABLES when top-level key is missing", async () => {
      delete process.env.DEPLOYMENT_IDENTIFIER;
      localStorage.setItem("LAB_VARIABLES", JSON.stringify({ DEPLOYMENT_IDENTIFIER: "map-id" }));

      const result = await getDeploymentIdentifier();

      expect(result).toBe("map-id");
      expect(localStorage.getItem("DEPLOYMENT_IDENTIFIER")).toBe(JSON.stringify("map-id"));
      expect(getDeploymentIdentifierServer).not.toHaveBeenCalled();
    });

    it("should return a deployment identifier from the environment variable if it exists", async () => {
      process.env.DEPLOYMENT_IDENTIFIER = "env-id";
        const result = await getDeploymentIdentifier();
      expect(result).toBe("env-id");
    });

    it("should fetch a deployment identifier from the external service if not in environment", async () => {
      delete process.env.DEPLOYMENT_IDENTIFIER;

      (getDeploymentIdentifierServer as jest.Mock).mockImplementation(async () => {
        process.env.DEPLOYMENT_IDENTIFIER = "fetched-id";
        return "fetched-id";
      });

      const result = await getDeploymentIdentifier();
      expect(result).toBe("fetched-id");
      expect(process.env.DEPLOYMENT_IDENTIFIER).toBe("fetched-id");
    });

    it("should return a local fallback deployment identifier when fetch fails in browser", async () => {
      delete process.env.DEPLOYMENT_IDENTIFIER;

      (getDeploymentIdentifierServer as jest.Mock).mockResolvedValue(null);

      const result = await getDeploymentIdentifier();
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^lab-/);
      expect(localStorage.getItem("DEPLOYMENT_IDENTIFIER")).toBe(JSON.stringify(result));
    });
  });

  describe("getVariable", () => {
    it("should resolve localStorage keys case-insensitively", async () => {
      localStorage.setItem("DEPLOYMENT_IDENTIFIER", JSON.stringify("upper_value"));

      const result = await getVariable<string>("deployment_identifier");
      expect(result).toBe("upper_value");
    });

    it("should resolve petname alias to deployment identifier", async () => {
      process.env.DEPLOYMENT_IDENTIFIER = "alias_value";

      const result = await getVariable<string>("petname");
      expect(result).toBe("alias_value");
    });

    it("should return value from LAB_VARIABLES before other sources", async () => {
      localStorage.setItem(
        "LAB_VARIABLES",
        JSON.stringify({ TEST_VAR: "local_value" })
      );
      process.env.TEST_VAR = "env_value";

      const result = await getVariable<string>("TEST_VAR");
      expect(result).toBe("local_value");
      expect(getVariableServer).not.toHaveBeenCalled();
    });

    it("should ignore top-level localStorage variable keys", async () => {
      localStorage.setItem("TEST_VAR", JSON.stringify("stale_value"));
      process.env.TEST_VAR = "env_value";

      const result = await getVariable<string>("TEST_VAR");
      expect(result).toBe("env_value");
    });

    it("should return the value from the first source that has it", async () => {
      (getVariableServer as jest.Mock).mockResolvedValueOnce("udf_value");
      const result = await getVariable<string>("TEST_VAR");
      expect(result).toBe("udf_value");
    });

    it("should return null if no source has the value", async () => {
      (getVariableServer as jest.Mock).mockResolvedValueOnce(null);
      const result = await getVariable("NON_EXISTENT_VAR");
      expect(result).toBeNull();
    });
  });

  describe("setVariable", () => {
    it("should set the value of a variable in localStorage", async () => {
      await setVariable("TEST_VAR", "new_value");
      expect(localStorage.getItem("TEST_VAR")).toBeNull();
      expect(localStorage.getItem("LAB_VARIABLES")).toBe(
        JSON.stringify({ TEST_VAR: "new_value" })
      );
    });
  });
});

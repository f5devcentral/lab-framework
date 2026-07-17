import { SetVariable } from "./set-variable";
import { getComponentName, setVariable } from "@/lib/variables";

jest.mock("@/lib/variables", () => ({
  getComponentName: jest.fn(),
  setVariable: jest.fn(),
}));

describe("SetVariable component", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("sets a provided variable value", async () => {
    (setVariable as jest.Mock).mockResolvedValue(undefined);

    await expect(SetVariable({ name: "deployment_identifier", value: "demo" })).resolves.toBeNull();

    expect(setVariable).toHaveBeenCalledWith("deployment_identifier", "demo");
  });

  it("derives value from getComponentName when isComponent is true", async () => {
    (getComponentName as jest.Mock).mockResolvedValue("dep-nginx");
    (setVariable as jest.Mock).mockResolvedValue(undefined);

    await expect(SetVariable({ name: "nginx", isComponent: true })).resolves.toBeNull();

    expect(getComponentName).toHaveBeenCalledWith("nginx");
    expect(setVariable).toHaveBeenCalledWith("nginx", "dep-nginx");
  });

  it("supports string isComponent prop from MDX", async () => {
    (getComponentName as jest.Mock).mockResolvedValue("dep-nginx");
    (setVariable as jest.Mock).mockResolvedValue(undefined);

    await expect(SetVariable({ name: "nginx", isComponent: "true" })).resolves.toBeNull();

    expect(getComponentName).toHaveBeenCalledWith("nginx");
    expect(setVariable).toHaveBeenCalledWith("nginx", "dep-nginx");
  });

  it("returns null when name is missing", async () => {
    await expect(SetVariable({ value: "demo" })).resolves.toBeNull();
    expect(setVariable).not.toHaveBeenCalled();
  });

  it("returns null when value missing and isComponent is false", async () => {
    await expect(SetVariable({ name: "deployment_identifier" })).resolves.toBeNull();
    expect(setVariable).not.toHaveBeenCalled();
  });

  it("handles setVariable errors without throwing", async () => {
    (setVariable as jest.Mock).mockRejectedValue(new Error("set failed"));

    await expect(SetVariable({ name: "deployment_identifier", value: "demo" })).resolves.toBeNull();
    expect(console.error).toHaveBeenCalledWith("unable to set variable:", "deployment_identifier");
  });

  it("handles getComponentName errors without throwing", async () => {
    (getComponentName as jest.Mock).mockRejectedValue(new Error("name failed"));

    await expect(SetVariable({ name: "nginx", isComponent: true })).resolves.toBeNull();

    expect(setVariable).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("unable to set variable:", "nginx");
  });
});

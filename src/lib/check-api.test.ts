import { checkAPI } from "./check-api";
import { getComponentName, getVariable } from "./variables";
import fetchMock from "jest-fetch-mock";

jest.mock("./variables", () => ({
  getComponentName: jest.fn(),
  getVariable: jest.fn(),
}));

describe("checkAPI", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    fetchMock.resetMocks();
  });

  it("should return false if both componentName and url are null", async () => {
    const result = await checkAPI({});
    expect(result).toBe(false);
  });

  it("should construct the URL from componentName and call the API", async () => {
    (getComponentName as jest.Mock).mockResolvedValue("test-component");
    (getVariable as jest.Mock).mockResolvedValue({ host: "localhost", ports: { host: 3000 } });
    fetchMock.mockResponseOnce("", { status: 200 });

    const result = await checkAPI({ componentName: "test-component" });
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("http://host.docker.internal:3000/", { mode: "cors", cache: "no-store" });
  });

  it("should throw an error if the url is null and component name is invalid", async () => {
    await expect(checkAPI({ url: null, componentName: "" })).rejects.toThrow("URL is null or undefined");
  });

  it("should throw an error if the API request fails", async () => {
    fetchMock.mockRejectOnce(new Error("Network error"));

    await expect(checkAPI({ url: "http://localhost" })).rejects.toThrow("Failed API request: Network error");
  });

  it("should throw an error if the status code does not match", async () => {
    fetchMock.mockResponseOnce("", { status: 404 });

    await expect(checkAPI({ url: "http://localhost", targetStatusCode: 200 })).rejects.toThrow("HTTP error 404: Not Found");
  });

  it("should throw an error if the searchString is not found in the response body", async () => {
    fetchMock.mockResponseOnce("response body");

    await expect(checkAPI({ url: "http://localhost", searchString: "not found" })).rejects.toThrow('String "not found" not found in response');
  });

  it("should throw an error if the header does not match the expected value", async () => {
    fetchMock.mockResponseOnce("", { headers: { "x-test-header": "wrong value" } });

    await expect(checkAPI({ url: "http://localhost", headerName: "x-test-header", headerValue: "expected value" })).rejects.toThrow('Header "x-test-header" does not match expected value "expected value"');
  });

  it("should return true if the API request is successful and all conditions are met", async () => {
    fetchMock.mockResponseOnce("response body", { headers: { "x-test-header": "expected value" } });

    const result = await checkAPI({
      url: "http://localhost",
      searchString: "response body",
      headerName: "x-test-header",
      headerValue: "expected value",
    });
    expect(result).toBe(true);
  });
});

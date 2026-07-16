import { Instance } from "./types";
import { checkAPI } from "./check-api";
import { getComponentName, getVariable } from "./variables";
import fetchMock from "jest-fetch-mock";

jest.mock("./variables", () => ({
  getComponentName: jest.fn(),
  getVariable: jest.fn(),
}));

describe("checkAPI", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it("should return false if both componentName and url are null", async () => {
    await expect(checkAPI({ url: undefined, component: null })).rejects.toThrow("You must specify a URL or component to check");
  });

  it("should construct the URL from componentName and call the API", async () => {
    (getComponentName as jest.Mock).mockResolvedValue("test-component");
    (getVariable as jest.Mock).mockResolvedValue({ host: "localhost", ports: { host: 3000 } });
    fetchMock.mockResponseOnce("", { status: 200 });

    const result = await checkAPI(
      {
        component:
          {
            name: "test-component",
            ports: [
              { containerPort: 3030, hostPort: 3000, protocol: "tcp" }]
          } as Instance
      });
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("http://host.docker.internal:3000/", { mode: "cors", cache: "no-store" });
  });

  it("should throw an error if the url and component are null", async () => {
    await expect(checkAPI({ url: null, component: null })).rejects.toThrow("You must specify a URL or component to check");
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

  it("should use TLS if tlsComponent is true", async () => {
    fetchMock.mockResponseOnce("", { status: 200 });

    const result = await checkAPI({
      component: {
        name: "test-component",
        ports: [{ containerPort: 443, hostPort: 3443, protocol: "tcp" }]
      } as Instance,
      tlsComponent: true
    });
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("https://host.docker.internal:3443/", { mode: "cors", cache: "no-store" });
  });

  it("should append the path to the URL", async () => {
    (getComponentName as jest.Mock).mockResolvedValue("test-component");
    (getVariable as jest.Mock).mockResolvedValue({ host: "localhost", ports: { host: 3000 } });
    fetchMock.mockResponseOnce("", { status: 200 });

    const result = await checkAPI({
      component: {
        name: "test-component",
        ports: [{ containerPort: 3030, hostPort: 3000, protocol: "tcp" }]
      } as Instance,
      path: "/api/test"
    });
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("http://host.docker.internal:3000/api/test", { mode: "cors", cache: "no-store" });
  });

  it("should prefer container port 443 host mapping when tlsComponent is true", async () => {
    fetchMock.mockResponseOnce("", { status: 200 });

    const result = await checkAPI({
      component: {
        name: "test-component",
        ports: [
          { containerPort: 80, hostPort: 8080, protocol: "tcp" },
          { containerPort: 443, hostPort: 8443, protocol: "tcp" },
        ]
      } as Instance,
      tlsComponent: true,
    });

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("https://host.docker.internal:8443/", { mode: "cors", cache: "no-store" });
  });

  it("should fail when tlsComponent is true and no container port 443 mapping exists", async () => {
    await expect(
      checkAPI({
        component: {
          name: "test-component",
          ports: [{ containerPort: 80, hostPort: 8080, protocol: "tcp" }],
        } as Instance,
        tlsComponent: true,
      })
    ).rejects.toThrow("TLS requires container port 443 to be host-mapped or a valid component id for container-network access");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should use container network endpoint on 443 when tlsComponent is true and 443 is not host-mapped", async () => {
    fetchMock.mockResponseOnce("", { status: 200 });

    const result = await checkAPI({
      component: {
        componentId: "testing-test-component",
        image: "nginx:latest",
        name: "test-component",
        ports: [{ containerPort: 80, hostPort: 8080, protocol: "tcp" }],
        type: 0,
      } as Instance,
      tlsComponent: true,
    });

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("https://testing-test-component:443/", { mode: "cors", cache: "no-store" });
  });

  it("should throw actionable TLS message when fallback endpoint is unreachable", async () => {
    fetchMock.mockRejectOnce(new Error("fetch failed"));

    await expect(
      checkAPI({
        component: {
          componentId: "testing-test-component",
          image: "nginx:latest",
          name: "test-component",
          ports: [{ containerPort: 80, hostPort: 8080, protocol: "tcp" }],
          type: 0,
        } as Instance,
        tlsComponent: true,
      })
    ).rejects.toThrow(
      "Failed API request: TLS endpoint is not reachable. Map container port 443 to a host port, or ensure the component id is reachable from the app container network"
    );
  });

  it("should prefer container port 80 host mapping when tlsComponent is false", async () => {
    fetchMock.mockResponseOnce("", { status: 200 });

    const result = await checkAPI({
      component: {
        name: "test-component",
        ports: [
          { containerPort: 443, hostPort: 8443, protocol: "tcp" },
          { containerPort: 80, hostPort: 8080, protocol: "tcp" },
        ]
      } as Instance,
      tlsComponent: false,
    });

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("http://host.docker.internal:8080/", { mode: "cors", cache: "no-store" });
  });

  it("should fail immediately when host-mapped endpoint returns 403", async () => {
    fetchMock.mockResponseOnce("forbidden", { status: 403 });

    await expect(
      checkAPI({
        component: {
          componentId: "testing-test-component",
          image: "nginx:latest",
          name: "test-component",
          ports: [{ containerPort: 80, hostPort: 8080, protocol: "tcp" }],
          type: 0,
        } as Instance,
        path: "/nginx_status",
        tlsComponent: false,
      })
    ).rejects.toThrow("Failed API request: HTTP error 403: ");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("http://host.docker.internal:8080/nginx_status", { mode: "cors", cache: "no-store" });
  });

  it("should prefer host-mapped endpoint when componentId exists and tlsComponent is false", async () => {
    fetchMock.mockResponseOnce("ok", { status: 200 });

    const result = await checkAPI({
      component: {
        componentId: "testing-test-component",
        image: "nginx:latest",
        name: "test-component",
        ports: [{ containerPort: 80, hostPort: 8080, protocol: "tcp" }],
        type: 0,
      } as Instance,
      path: "/nginx_status",
      tlsComponent: false,
    });

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("http://host.docker.internal:8080/nginx_status", { mode: "cors", cache: "no-store" });
  });
});
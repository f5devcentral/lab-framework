import { renderHook, act } from "@testing-library/react";
import useLocalStorage from "./use-local-storage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return default value if localStorage is empty", () => {
    const { result } = renderHook(() => useLocalStorage("testKey", "defaultValue"));

    expect(result.current[0]).toBe("defaultValue");
  });

  it("should return stored value from localStorage", () => {
    localStorage.setItem("testKey", JSON.stringify("storedValue"));
    const { result } = renderHook(() => useLocalStorage("testKey", "defaultValue"));

    expect(result.current[0]).toBe("storedValue");
  });

  it("should update localStorage and state when setLocalStorageStateValue is called with a value", () => {
    const { result } = renderHook(() => useLocalStorage("testKey", "defaultValue"));

    act(() => {
      result.current[1]("newValue");
    });

    expect(result.current[0]).toBe("newValue");
    expect(localStorage.getItem("testKey")).toBe(JSON.stringify("newValue"));
  });

  it("should update localStorage and state when setLocalStorageStateValue is called with a function", () => {
    const { result } = renderHook(() => useLocalStorage("testKey", 0));

    act(() => {
      result.current[1]((prev: number) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
    expect(localStorage.getItem("testKey")).toBe(JSON.stringify(1));
  });

  it("should handle JSON parse error and return default value", () => {
    localStorage.setItem("testKey", "invalidJSON");
    const { result } = renderHook(() => useLocalStorage("testKey", "defaultValue"));

    expect(result.current[0]).toBe("defaultValue");
  });

  it("should initialize with default value if localStorage key does not exist", () => {
    const { result } = renderHook(() => useLocalStorage("nonExistentKey", "defaultValue"));

    expect(result.current[0]).toBe("defaultValue");
    expect(localStorage.getItem("nonExistentKey")).toBe(JSON.stringify("defaultValue"));
  });

  it("should update state and localStorage when setLocalStorageStateValue is called with a function that depends on previous state", () => {
    const { result } = renderHook(() => useLocalStorage("counter", 0));

    act(() => {
      result.current[1]((prev: number) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
    expect(localStorage.getItem("counter")).toBe(JSON.stringify(1));
  });

  it("should handle non-JSON values in localStorage gracefully", () => {
    localStorage.setItem("testKey", "nonJSONValue");
    const { result } = renderHook(() => useLocalStorage("testKey", "defaultValue"));

    expect(result.current[0]).toBe("defaultValue");
    expect(localStorage.getItem("testKey")).toBe(JSON.stringify("defaultValue"));
  });

  it("should update localStorage and state when setLocalStorageStateValue is called with a new value", () => {
    const { result } = renderHook(() => useLocalStorage("testKey", "defaultValue"));

    act(() => {
      result.current[1]("newValue");
    });

    expect(result.current[0]).toBe("newValue");
    expect(localStorage.getItem("testKey")).toBe(JSON.stringify("newValue"));
  });

  it("should return the updated value after calling setLocalStorageStateValue with a function", () => {
    const { result } = renderHook(() => useLocalStorage("testKey", 0));

    act(() => {
      result.current[1]((prev: number) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
    expect(localStorage.getItem("testKey")).toBe(JSON.stringify(1));
  });
});

import { findValueByKey } from "./object-utils";

describe("object-utils", () => {
  describe("findValueByKey", () => {
    it("returns a top-level value", () => {
      expect(findValueByKey({ a: "x" }, "a")).toBe("x");
    });

    it("returns a nested value", () => {
      const data = { a: { b: { c: 3 } } };
      expect(findValueByKey(data, "c")).toBe(3);
    });

    it("returns null for missing key", () => {
      expect(findValueByKey({ a: 1 }, "z")).toBeNull();
    });

    it("returns null for non-object input", () => {
      expect(findValueByKey("bad" as unknown as Record<string, unknown>, "a")).toBeNull();
    });
  });
});

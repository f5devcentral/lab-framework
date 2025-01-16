import { mergeClasses, getInstanceDeploymentName } from "./utils";

describe("Utils Library", () => {
    describe("mergeClasses", () => {
        it("should merge multiple Tailwind CSS classes into a single string", () => {
            const result = mergeClasses("bg-red-500", "text-white", "p-4");
            expect(result).toBe("bg-red-500 text-white p-4");
        });

        it("should handle no arguments", () => {
            const result = mergeClasses();
            expect(result).toBe("");
        });
    });

    describe("getInstanceDeploymentName", () => {
        it("should generate a deployment name with default petname", () => {
            const result = getInstanceDeploymentName({ name: "MyInstance" });
            expect(result).toBe("testing-myinstance");
        });

        it("should generate a deployment name with provided petname", () => {
            const result = getInstanceDeploymentName({
                name: "MyInstance",
                petname: "custom",
            });
            expect(result).toBe("custom-myinstance");
        });

        it("should replace non-alphanumeric characters with hyphens", () => {
            const result = getInstanceDeploymentName({ name: "My@Instance!" });
            expect(result).toBe("testing-my-instance-");
        });

        it("should convert the name to lowercase", () => {
            const result = getInstanceDeploymentName({ name: "MyInstance" });
            expect(result).toBe("testing-myinstance");
        });
    });
});

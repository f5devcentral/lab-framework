import { createRequire } from "module";
import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

// eslint-plugin-react's "detect" mode uses context.getFilename(), removed in ESLint 10.
const REACT_VERSION = createRequire(import.meta.url)("react/package.json").version;

export default defineConfig([
    ...nextCoreWebVitals,
    ...nextTypeScript,
    {
        settings: {
            react: {
                version: REACT_VERSION,
            },
        },
    },
    globalIgnores([
        ".next/**",
        "out/**",
        "build/**",
        "coverage/**",
        "next-env.d.ts",
    ]),
]);

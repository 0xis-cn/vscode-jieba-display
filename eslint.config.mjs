import { defineConfig, globalIgnores } from "eslint/config";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([globalIgnores(["**/out", "**/dist", "**/*.d.ts"]), {
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 6,
        sourceType: "module",
    },

    rules: {
        "indent": ["warn", 2],
        "@typescript-eslint/naming-convention": "warn",
        "quotes": "warn",
        "semi": "warn",
        curly: "warn",
        eqeqeq: "warn",
        indent: "off",
        "max-len": ["warn", 120],
        "no-throw-literal": "warn",
        "no-trailing-spaces": "warn",
        "prefer-const": "warn",
        quotes: "off",
        semi: ["warn", "always"],
    },
}]);
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Shared ESLint flat config for every TypeScript package. */
export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/.next/**", "**/out/**", "**/coverage/**", "**/target/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      // NestJS modules and controllers are decorated classes that may have no members.
      "@typescript-eslint/no-extraneous-class": ["error", { allowWithDecorator: true }],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
);

import nextPlugin from "@next/eslint-plugin-next";
import config from "@parlivo/config/eslint/react";

// The Next.js plugin is used directly rather than eslint-config-next: that preset swaps in
// its own parser (breaking typescript-eslint) and bundles plugins that do not support ESLint 10.
export default [
  ...config,
  {
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  { ignores: ["next-env.d.ts", ".next/**"] },
];

# @parlivo/config

Shared tooling configuration for the whole monorepo: the ESLint flat configs (`eslint/base.js` for TypeScript, `eslint/react.js` for React), the Prettier config, the TypeScript `tsconfig` bases (library, React library, NestJS, Next.js), and the Python template (`python/pyproject.template.toml` and `python/ruff.toml`) that every service under `services/` copies. Change a rule here, not in individual packages.

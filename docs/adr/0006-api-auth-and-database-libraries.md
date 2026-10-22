# 0006. API dependencies for phase 0: jose for access tokens, Prisma's pg driver adapter

- Status: Accepted
- Date: 2026-10-22
- Source: prompt 2 (B2); ARCHITECTURE.md sections 3 and 9

## Context

The phase 0 API needs to sign and verify its own access tokens (JWT, 15 minutes, ARCHITECTURE.md section 9) and to reach PostgreSQL through Prisma. Prisma 7 has no built-in database driver in the generated client; it connects through a driver adapter. Request validation uses Zod, which is already in the stack (`packages/schemas`).

## Decision

- `jose` 6.2.13 signs and verifies HS256 access tokens (`apps/api/src/auth/access-token.ts`). It has no dependencies and runs on Node and in browsers. `@nestjs/jwt` and Passport were not chosen because a guard of a few lines covers the need with less indirection.
- `@prisma/adapter-pg` 7.10.1, with `pg` as its transitive dependency, is the Prisma driver adapter for PostgreSQL. The generated client goes to `apps/api/src/generated/` (gitignored) and is compiled with the app.
- Validation uses a small `ZodValidationPipe` with the shared schemas from `packages/schemas`, not a Nest validation library. The same schemas validate responses in the web client.
- All Nest constructor injections use explicit `@Inject(...)` tokens, so tests run under Vitest's default transformer without decorator-metadata support. The SWC plugin tried during development was removed.

## Consequences

- Positive: three small, well-maintained dependencies; one schema per contract shared by API and web.
- Negative: HS256 means every verifier holds the signing secret. That is fine while only the API verifies tokens. Move to an asymmetric algorithm (EdDSA) if other services ever verify user tokens.
- Negative: `prisma generate` must run before `build`, `typecheck` and `test`; the package scripts do this.

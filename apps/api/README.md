# @parlivo/api

The NestJS core API: authentication (JWT access + rotating refresh tokens, OAuth, magic links, SSO later), workspaces, members and guests, meetings, LiveKit token minting with room-level grants, usage metering and Whop billing, with Prisma on PostgreSQL (ARCHITECTURE.md sections 2, 3, 9 and 10). Audio never touches this service.

## Phase 0 endpoints

| Method and path           | Auth                                          | Body (Zod, `packages/schemas`)             | Returns                                                                                                                                                                         |
| ------------------------- | --------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/dev-login`    | none; **development only**, 404 in production | `{ email? }` (defaults to the seeded user) | `{ accessToken, user }`; access token lives 15 minutes                                                                                                                          |
| `POST /meetings`          | Bearer                                        | `{ workspaceId?, scheduledAt? }`           | The meeting, pinned to the workspace region, with a random 12-character `roomId`                                                                                                |
| `POST /meetings/:id/join` | Bearer                                        | `{ speakingLanguage, listeningLanguage }`  | `{ participantId, identity, roomName, serverUrl, token, expiresInSeconds }`: a LiveKit token with room-level `roomJoin`, `canPublish` and `canSubscribe` only, valid for 1 hour |

The LiveKit identity is the Participant ID, so one user can join from two devices. Participant metadata in the token carries both languages for the translation agent.

## Data model

`prisma/schema.prisma` holds User, Workspace, Member, Guest, Meeting and Participant from section 10. A CHECK constraint makes every Participant exactly one of a member or a guest. The Prisma client is generated into `src/generated/` (gitignored) by `build`, `typecheck` and `test`.

## Commands

```bash
pnpm dev:infra                                   # from the repo root: Postgres, LiveKit, ...
pnpm --filter @parlivo/api build                 # prisma generate + tsc
pnpm --filter @parlivo/api db:migrate            # apply migrations (db:migrate:dev to create one)
pnpm --filter @parlivo/api db:seed               # one workspace + dev@parlivo.local (idempotent)
pnpm --filter @parlivo/api start                 # http://localhost:3001
pnpm --filter @parlivo/api test                  # unit tests, no database
pnpm --filter @parlivo/api test:integration      # endpoint tests against the dev database
```

Configuration is read from the environment; see `.env.example`. Outside production the defaults match `infra/dev`.

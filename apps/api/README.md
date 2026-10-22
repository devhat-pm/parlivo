# @parlivo/api

The NestJS core API: authentication (JWT access + rotating refresh tokens, OAuth, magic links, SSO later), workspaces, members and guests, meetings, LiveKit token minting with room-level grants, usage metering and Stripe billing, with Prisma on PostgreSQL (ARCHITECTURE.md sections 2, 3, 9 and 10). Audio never touches this service.

Placeholder only: an empty `AppModule` and a tested config helper. `pnpm --filter @parlivo/api build | lint | typecheck | test`.

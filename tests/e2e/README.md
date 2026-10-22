# @parlivo/e2e

Playwright end-to-end tests, one per user story (ARCHITECTURE.md section 8).

`specs/two-browsers-join.spec.ts` is the **phase 0 gate**: two headless Chromium contexts with fake camera and microphone join the same meeting through the API and the web app, and each must have the other's audio and video tracks subscribed.

```bash
pnpm dev:infra                                        # from the repo root
pnpm turbo run build --filter=@parlivo/api --filter=@parlivo/web
pnpm --filter @parlivo/api db:migrate && pnpm --filter @parlivo/api db:seed
pnpm --filter @parlivo/e2e exec playwright install chromium   # once
pnpm --filter @parlivo/e2e test:e2e
```

Playwright starts the API on 3001 and the web app on **3100** (so it never collides with another dev server on 3000). It reuses servers that are already running, except in CI. The script is `test:e2e`, not `test`, so `pnpm test` stays runnable without infrastructure. CI runs it in the `e2e` job against the compose stack.

On macOS, LiveKit needs Docker Desktop's host networking (see infra/dev/README.md).

# @parlivo/e2e

Playwright end-to-end tests, one per user story (ARCHITECTURE.md section 8).

- `specs/agent-echo-captions.spec.ts` is the **phase 1 skeleton gate** (prompt 3): one browser speaks `en-with-pause.wav`, the other must receive that speaker's `translated-{id}-echo` track and final captions containing "weather" and "Berlin". Then the agent worker is `kill -9`ed and a new echo track must appear within 10 s (measured about 5.8 s on an M5), with the status passing through "reconnecting".
- `specs/connect-timeout.spec.ts` checks the 10 s connect timeout and Retry.
- `specs/two-browsers-join.spec.ts` is the **phase 0 gate**: two headless Chromium contexts with fake camera and microphone join the same meeting through the API and the web app, and each must have the other's audio and video tracks subscribed.

```bash
pnpm dev:infra                                        # from the repo root
pnpm turbo run build --filter=@parlivo/api --filter=@parlivo/web
pnpm --filter @parlivo/api db:migrate && pnpm --filter @parlivo/api db:seed
pnpm --filter @parlivo/e2e exec playwright install chromium   # once
pnpm --filter @parlivo/e2e test:e2e
```

Playwright starts the STT service (`STT_MODE`, default `cpu`; use `STT_MODE=mac` on Apple Silicon), the supervised agent (`scripts/run-agent.sh`), the API on 3001 and the web app on **3100** (so it never collides with another dev server on 3000). It reuses servers that are already running, except in CI. The script is `test:e2e`, not `test`, so `pnpm test` stays runnable without infrastructure. CI runs it in the `e2e` job against the compose stack.

On macOS, LiveKit needs Docker Desktop's host networking (see infra/dev/README.md).

# CLAUDE.md

Rules for Claude Code (and humans) working in the Parlivo monorepo. `ARCHITECTURE.md` is the approved design and the source of truth; read the section you are touching before changing code. Where this file and `ARCHITECTURE.md` disagree, `ARCHITECTURE.md` wins and this file gets fixed.

## Standing rules (every change)

1. **Every change ships with tests.** Unit tests for all business logic, integration tests per service, one e2e per user story. CI blocks merge under 80% coverage on `apps/api` and `services/*` once coverage gates are switched on.
2. **Update `ARCHITECTURE.md` when behaviour changes.** If code and document disagree, fix one of them in the same PR.
3. **Write an ADR in `docs/adr/` for any new dependency or architectural change.** Format: `NNNN-kebab-title.md` with Context, Decision, Consequences. Number sequentially.

Also: never commit secrets (`.env.example` only) or model weights; never put audio on NATS, disk or the API; no `any` in TypeScript; mypy `--strict` in Python; Conventional Commits, one PR per feature with "how I tested this".

## Stack (ARCHITECTURE.md section 3)

| Layer             | Technology                                                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web               | Next.js (App Router) + React 19 + TypeScript; Ant Design 6, Framer Motion, Tailwind; Zustand, TanStack Query                                                |
| Desktop           | Tauri 2 (Rust) wrapping the static export of `apps/web`                                                                                                     |
| Media             | Self-hosted LiveKit SFU (2 nodes) + coturn; `livekit-client` in the browser                                                                                 |
| Translation agent | Python, LiveKit Agents: one job per room, VAD, owns all per-speaker buffers, publishes `translated-{speakerId}-{lang}` tracks, captions on the data channel |
| Core API          | NestJS + Prisma on PostgreSQL (pgvector); Valkey/Redis; mints LiveKit tokens                                                                                |
| Events            | NATS JetStream, durable transcript and meeting events only, never audio                                                                                     |
| GPU pool A        | Stateless Ray Serve: faster-whisper (Whisper large-v3-turbo int8) + Silero VAD; TTS (VoxCPM2 primary, Chatterbox Multilingual fallback, Kokoro for English) |
| GPU pool B        | Translation LLM on vLLM: Qwen3 4B int8 default; MADLAD-400 3B for long-tail languages                                                                       |
| GPU pool C        | Batch AI LLM on vLLM (Gemma 4 26B A4B primary, Qwen3 32B alternate, int4): summaries, RAG, extraction, in-call assistant                                    |
| AI service        | Python FastAPI; bge-m3 embeddings in pgvector                                                                                                               |
| Platform          | Kubernetes (k3s dev, managed prod), Helm, Terraform, Cloudflare (web + API only), OpenTelemetry, Prometheus, Grafana, Loki, GitHub Actions                  |

Model licences, sizes and languages are verified in `docs/models.md`.

## Folder map

```
apps/web            Next.js app (web + static export for Tauri)
apps/desktop        Tauri 2 shell (Rust in src-tauri/)
apps/api            NestJS core API
services/agent      LiveKit Agents translation agent (Python)
services/stt        Ray Serve: faster-whisper + Silero VAD (Python)
services/translate  vLLM / Ray Serve: translation LLM + MADLAD fallback (Python)
services/tts        Ray Serve: VoxCPM2 / Chatterbox / Kokoro (Python)
services/ai         FastAPI: summaries, RAG, extraction, analytics (Python)
packages/ui         Ant Design theme, shared components, Framer presets
packages/audio      AudioWorklet processors, devices, VU meter
packages/realtime   LiveKit client wrapper, subscription rules, data-channel types
packages/types      TypeScript types generated from the API's OpenAPI
packages/i18n       UI translations (the app itself)
packages/schemas    Data-channel and NATS message schemas (Zod + Pydantic from one JSON Schema)
packages/config     Shared ESLint, TypeScript, Prettier configs and the Python template
infra/{docker,helm,dev,terraform}   Containers, charts, CPU-only compose stack, cloud resources
tests/e2e           Playwright
tests/load          k6
tests/bench         Streams-per-GPU and glass-to-ear benchmarks (Python, phase 1 gate)
docs/adr            Architecture decision records
docs/versions.md    Pinned versions with date and source
docs/models.md      Model licence and spec verification
```

## Commands

Prerequisites: Node 24.22.1 (`.nvmrc`), pnpm 12.14.0 (`corepack enable`, or prefix commands with `npx pnpm@12.14.0`), uv 0.13.5, Python 3.12.15 (uv installs it), Rust 1.99.1 for the desktop app (pinned in `apps/desktop/rust-toolchain.toml`).

```bash
pnpm install                      # all TypeScript packages (lockfile: pnpm-lock.yaml)
pnpm py sync                      # all Python projects (one uv.lock each)

# Everything at once (Turborepo for TypeScript, scripts/py.sh for Python)
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm py lint && pnpm py typecheck && pnpm py test && pnpm py build
pnpm format:check
pnpm docs:diagrams                        # docs/assets/*.mmd -> SVG (Mermaid in Playwright's Chromium)

# Local infrastructure (LiveKit, coturn, Postgres+pgvector, Valkey, NATS); see infra/dev/README.md
pnpm dev:infra                            # up + wait for health checks
pnpm dev:infra:down                       # stop (dev:infra:reset also deletes volumes)
pnpm --filter @parlivo/api db:migrate && pnpm --filter @parlivo/api db:seed

# One TypeScript package
pnpm --filter @parlivo/web dev            # http://localhost:3000
pnpm --filter @parlivo/api build && pnpm --filter @parlivo/api start   # PORT, default 3001
pnpm --filter <name> lint | typecheck | test | build

# Desktop (Rust)
pnpm --filter @parlivo/desktop rust:fmt | rust:lint | rust:test | rust:build
pnpm --filter @parlivo/desktop tauri dev

# One Python project
cd services/stt
uv sync --locked
uv run ruff check . && uv run ruff format --check .
uv run mypy
uv run pytest
uv build

# Integration, e2e (phase 0 gate) and load; all need pnpm dev:infra plus migrate and seed
pnpm --filter @parlivo/api test:integration
pnpm --filter @parlivo/e2e test:e2e       # web on 3100, API on 3001
node tests/e2e/scripts/join-bot.mjs <meetingId>   # headless participant for manual checks
k6 run tests/load/scripts/placeholder.js
```

GPU stacks (`services/*/requirements-gpu*.txt`) are Linux + CUDA only and are installed in GPU images or on the remote GPU dev box, never on macOS or in CI. Never download model weights into the repo.

## Diagnostics reporter (benchmark and spike evidence)

`apps/web/src/lib/diagnostics.ts` reports lobby and join steps, console errors and warnings, and a room snapshot every 2 s (published tracks, subscriptions per remote, mic level, screen-share errors). It is **opt-in at build time** and is how phase 1 benchmark evidence is collected from real clients (browser or Tauri):

```bash
node scripts/diagnostics-receiver.mjs evidence.jsonl            # receiver on :8765
NEXT_PUBLIC_DIAGNOSTICS_URL=http://localhost:8765/report pnpm --filter @parlivo/web build
pnpm --filter @parlivo/web exec next start -p 3100              # or run the desktop app against it
```

Normal and production builds never set the variable. `next.config.ts` inlines it as an empty string, and every call site is guarded inline with `if (process.env.NEXT_PUBLIC_DIAGNOSTICS_URL)`, so the minifier drops the code. CI proves it with `pnpm --filter @parlivo/web test:no-diagnostics`. When adding a call site, keep the inline guard: an imported constant is not folded across modules.

## Latency budget (ARCHITECTURE.md section 4)

**Glass-to-ear latency** is the time from the last voiced audio frame of a source clause (before the silence window that closes it) to the first translated audio sample played at the listener. The 300 ms silence window is inside the measurement; time spent speaking the clause is not. Targets, SLOs and the phase 1 gate all use this definition.

Targets: in-region p50 under 1.3 s, p95 under 2.0 s; cross-continent p50 under 1.5 s, p95 under 2.5 s.

| Stage                                                       | Budget       |
| ----------------------------------------------------------- | ------------ |
| Mic to SFU to agent (WebRTC, one hop)                       | 80 ms        |
| VAD endpoint (silence window)                               | 300 ms       |
| STT final pass on the clause                                | 150 ms       |
| Translation, full clause (4B int8, ~65 tok/s ceiling on L4) | 350 ms       |
| TTS first audio chunk                                       | 150 ms       |
| Agent to SFU to listener (second hop, incl. playout)        | 100 ms       |
| Batching and scheduling waits (20 ms cap x 3 GPU stages)    | 60 ms        |
| **Total**                                                   | **1,190 ms** |

Any change on the audio path must keep per-stage Prometheus histograms and must not regress this budget. If phase 1 overruns, the pre-made decision is: move in-region p50 to 1.5 s first; only then consider L40S-class GPUs for pool B.

## Versions policy

- Every dependency is pinned to an exact version: TypeScript in the `catalog:` of `pnpm-workspace.yaml` (packages reference `catalog:`), Python in each `pyproject.toml` and `requirements-gpu*.txt` (`==`), Rust in `Cargo.toml` (`=`), runtimes in `.nvmrc`, `.python-version` and `rust-toolchain.toml`, CI actions in `.github/workflows/`.
- `docs/versions.md` records every pin with the date it was pinned and the source URL. Change the manifest and `docs/versions.md` in the same commit.
- Pins were set to the current stable release on 2026-10-22, except where a recorded constraint forces an older one (see the notes in `docs/versions.md`). Never guess a version: look it up from the registry or release page.
- Adding a dependency needs an ADR (standing rule 3). Upgrades go through Dependabot PRs, one ecosystem at a time, with CI green.

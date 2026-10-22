# Pinned versions

All versions were looked up on **2026-10-22** from the source linked in each row and pinned exactly. "Released" is the upstream release date. Where a row is not the newest release, the note says why. Change a manifest and this file in the same commit (see CLAUDE.md, Versions policy).

Where pins live: TypeScript in the `catalog:` block of `pnpm-workspace.yaml`; Python in each `pyproject.toml` (CPU-safe code and dev tools) and `requirements-gpu*.txt` (Linux/CUDA stack, never installed in CI); Rust in `Cargo.toml` and `rust-toolchain.toml`; runtimes in `.nvmrc` and `.python-version`; transitive dependencies in `pnpm-lock.yaml`, each project's `uv.lock` and `Cargo.lock`.

## Runtimes and package managers

| Dependency | Version | Released   | Source                                               | Used in                                    | Note                                                                                                                                                                                           |
| ---------- | ------- | ---------- | ---------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js    | 24.22.1 | 2026-10-20 | [link](https://nodejs.org/dist/index.json)           | .nvmrc, package.json engines, CI           | LTS line (24 'Krypton'). Decision A5: stay on Node 24 until Node 26 (LTS from 2026-10-28) has been LTS for 30 days, i.e. from 2026-11-27; then a Dependabot PR bumps .nvmrc, engines and CI.   |
| pnpm       | 12.14.0 | 2026-10-15 | [link](https://www.npmjs.com/package/pnpm/v/12.14.0) | package.json packageManager, CI            |                                                                                                                                                                                                |
| Python     | 3.12.15 | 2026-10-01 | [link](https://endoflife.date/python)                | .python-version, pyproject requires-python | Not the newest (3.15.1 is). Decision A5: Python stays on 3.12 because kokoro 0.9.4 requires <3.13 (ARCHITECTURE.md section 8 also mandates 3.12); vllm and livekit-agents exclude 3.15 anyway. |
| uv         | 0.13.5  | 2026-10-22 | [link](https://pypi.org/project/uv/0.13.5/)          | CI (astral-sh/setup-uv), CLAUDE.md         |                                                                                                                                                                                                |
| uv_build   | 0.13.5  | 2026-10-22 | [link](https://pypi.org/project/uv-build/0.13.5/)    | pyproject [build-system]                   |                                                                                                                                                                                                |
| Rust       | 1.99.1  | 2026-10-01 | [link](https://endoflife.date/rust)                  | apps/desktop/src-tauri/rust-toolchain.toml |                                                                                                                                                                                                |

## Frontend (pnpm catalog)

| Dependency            | Version | Released   | Source                                                                | Used in                      | Note                                                                       |
| --------------------- | ------- | ---------- | --------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| next                  | 16.4.2  | 2026-10-15 | [link](https://www.npmjs.com/package/next/v/16.4.2)                   | apps/web                     |                                                                            |
| react                 | 19.3.1  | 2026-10-14 | [link](https://www.npmjs.com/package/react/v/19.3.1)                  | apps/web, packages/ui (peer) |                                                                            |
| react-dom             | 19.3.1  | 2026-10-14 | [link](https://www.npmjs.com/package/react-dom/v/19.3.1)              | apps/web, packages/ui (peer) |                                                                            |
| antd                  | 6.6.7   | 2026-10-20 | [link](https://www.npmjs.com/package/antd/v/6.6.7)                    | apps/web, packages/ui        | Ant Design 6 as specified                                                  |
| framer-motion         | 14.6.0  | 2026-10-22 | [link](https://www.npmjs.com/package/framer-motion/v/14.6.0)          | apps/web, packages/ui        | Same release is also published as `motion`, the library's new package name |
| tailwindcss           | 4.3.3   | 2026-07-16 | [link](https://www.npmjs.com/package/tailwindcss/v/4.3.3)             | apps/web                     |                                                                            |
| @tailwindcss/postcss  | 4.3.3   | 2026-07-16 | [link](https://www.npmjs.com/package/@tailwindcss/postcss/v/4.3.3)    | apps/web                     |                                                                            |
| zustand               | 5.0.16  | 2026-10-22 | [link](https://www.npmjs.com/package/zustand/v/5.0.16)                | apps/web                     |                                                                            |
| @tanstack/react-query | 5.104.5 | 2026-10-19 | [link](https://www.npmjs.com/package/@tanstack/react-query/v/5.104.5) | apps/web                     |                                                                            |

## Desktop

| Dependency          | Version | Released   | Source                                                         | Used in                           | Note |
| ------------------- | ------- | ---------- | -------------------------------------------------------------- | --------------------------------- | ---- |
| @tauri-apps/cli     | 2.12.4  | 2026-10-21 | [link](https://www.npmjs.com/package/@tauri-apps/cli/v/2.12.4) | apps/desktop                      |      |
| @tauri-apps/api     | 2.12.4  | 2026-10-14 | [link](https://www.npmjs.com/package/@tauri-apps/api/v/2.12.4) | apps/desktop                      |      |
| tauri (crate)       | 2.12.5  | 2026-10-21 | [link](https://crates.io/crates/tauri/2.12.5)                  | apps/desktop/src-tauri/Cargo.toml |      |
| tauri-build (crate) | 2.7.4   | 2026-10-21 | [link](https://crates.io/crates/tauri-build/2.7.4)             | apps/desktop/src-tauri/Cargo.toml |      |

## Realtime media

| Dependency         | Version | Released   | Source                                                            | Used in                                      | Note                                   |
| ------------------ | ------- | ---------- | ----------------------------------------------------------------- | -------------------------------------------- | -------------------------------------- |
| LiveKit server     | 1.13.10 | 2026-10-14 | [link](https://github.com/livekit/livekit/releases/tag/v1.13.10)  | infra/dev/docker-compose.yml, Helm           | Image: livekit/livekit-server:v1.13.10 |
| livekit-client     | 2.23.0  | 2026-10-16 | [link](https://www.npmjs.com/package/livekit-client/v/2.23.0)     | packages/realtime                            |                                        |
| livekit-server-sdk | 2.19.2  | 2026-10-22 | [link](https://www.npmjs.com/package/livekit-server-sdk/v/2.19.2) | apps/api                                     |                                        |
| livekit-agents     | 1.8.8   | 2026-10-15 | [link](https://pypi.org/project/livekit-agents/1.8.8/)            | services/agent                               |                                        |
| livekit            | 1.1.21  | 2026-10-16 | [link](https://pypi.org/project/livekit/1.1.21/)                  | services/agent (resolved via livekit-agents) | Python RTC SDK                         |

## Core API

| Dependency               | Version | Released   | Source                                                                  | Used in          | Note                                                                                                                         |
| ------------------------ | ------- | ---------- | ----------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| @nestjs/core             | 12.2.0  | 2026-10-19 | [link](https://www.npmjs.com/package/@nestjs/core/v/12.2.0)             | apps/api         |                                                                                                                              |
| @nestjs/common           | 12.2.0  | 2026-10-19 | [link](https://www.npmjs.com/package/@nestjs/common/v/12.2.0)           | apps/api         |                                                                                                                              |
| @nestjs/platform-express | 12.2.0  | 2026-10-19 | [link](https://www.npmjs.com/package/@nestjs/platform-express/v/12.2.0) | apps/api         |                                                                                                                              |
| @nestjs/testing          | 12.2.0  | 2026-10-19 | [link](https://www.npmjs.com/package/@nestjs/testing/v/12.2.0)          | apps/api         |                                                                                                                              |
| reflect-metadata         | 0.2.2   | 2024-03-29 | [link](https://www.npmjs.com/package/reflect-metadata/v/0.2.2)          | apps/api         |                                                                                                                              |
| rxjs                     | 7.8.2   | 2025-02-22 | [link](https://www.npmjs.com/package/rxjs/v/7.8.2)                      | apps/api         |                                                                                                                              |
| prisma                   | 7.10.1  | 2026-10-15 | [link](https://www.npmjs.com/package/prisma/v/7.10.1)                   | apps/api         | The npm `latest` tag points at 8.0.0-rc.25 (a release candidate). Pinned the newest stable, 7.10.1, matching @prisma/client. |
| @prisma/client           | 7.10.1  | 2026-10-15 | [link](https://www.npmjs.com/package/@prisma/client/v/7.10.1)           | apps/api         |                                                                                                                              |
| zod                      | 4.6.7   | 2026-10-12 | [link](https://www.npmjs.com/package/zod/v/4.6.7)                       | packages/schemas |                                                                                                                              |

## Python services

| Dependency     | Version | Released   | Source                                                 | Used in                                      | Note                                                                                              |
| -------------- | ------- | ---------- | ------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| pydantic       | 2.14.1  | 2026-10-11 | [link](https://pypi.org/project/pydantic/2.14.1/)      | all Python projects                          |                                                                                                   |
| fastapi        | 0.159.1 | 2026-10-21 | [link](https://pypi.org/project/fastapi/0.159.1/)      | services/ai                                  | vllm 0.32.0 requires fastapi<0.137; irrelevant because ai and translate are separate environments |
| uvicorn        | 0.54.0  | 2026-09-25 | [link](https://pypi.org/project/uvicorn/0.54.0/)       | services/ai                                  |                                                                                                   |
| nats-py        | 2.16.0  | 2026-09-16 | [link](https://pypi.org/project/nats-py/2.16.0/)       | services/agent, services/ai                  |                                                                                                   |
| ray            | 2.59.0  | 2026-10-02 | [link](https://pypi.org/project/ray/2.59.0/)           | requirements-gpu.txt (stt, translate, tts)   | Installed as ray[serve]                                                                           |
| vllm           | 0.32.0  | 2026-10-18 | [link](https://pypi.org/project/vllm/0.32.0/)          | services/translate/requirements-gpu.txt      |                                                                                                   |
| torch          | 2.14.1  | 2026-09-30 | [link](https://pypi.org/project/torch/2.14.1/)         | stt and tts requirements-gpu.txt             |                                                                                                   |
| torch          | 2.13.0  | 2026-07-08 | [link](https://pypi.org/project/torch/2.13.0/)         | services/translate/requirements-gpu.txt      | Forced: vllm 0.32.0 pins torch==2.13.0                                                            |
| torch          | 2.6.0   | 2025-01-29 | [link](https://pypi.org/project/torch/2.6.0/)          | services/tts/requirements-gpu-chatterbox.txt | Forced: chatterbox-tts 0.1.7 pins torch==2.6.0                                                    |
| faster-whisper | 1.2.1   | 2025-10-31 | [link](https://pypi.org/project/faster-whisper/1.2.1/) | services/stt/requirements-gpu.txt            | Latest release; the project has not released in a year                                            |
| ctranslate2    | 4.8.3   | 2026-10-13 | [link](https://pypi.org/project/ctranslate2/4.8.3/)    | services/stt/requirements-gpu.txt            |                                                                                                   |
| silero-vad     | 6.2.3   | 2026-09-23 | [link](https://pypi.org/project/silero-vad/6.2.3/)     | services/stt/requirements-gpu.txt            |                                                                                                   |
| voxcpm         | 2.0.3   | 2026-05-11 | [link](https://pypi.org/project/voxcpm/2.0.3/)         | services/tts/requirements-gpu.txt            |                                                                                                   |
| kokoro         | 0.9.4   | 2025-04-05 | [link](https://pypi.org/project/kokoro/0.9.4/)         | services/tts/requirements-gpu.txt            | Requires Python <3.13                                                                             |
| chatterbox-tts | 0.1.7   | 2026-03-26 | [link](https://pypi.org/project/chatterbox-tts/0.1.7/) | services/tts/requirements-gpu-chatterbox.txt | Pins torch 2.6.0 and gradio 6.8.0; conflicts with ray[serve] 2.59.0, so it needs its own image    |

## Data and messaging

| Dependency          | Version | Released   | Source                                                              | Used in                                  | Note                                                                       |
| ------------------- | ------- | ---------- | ------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| PostgreSQL          | 18.6    | 2026-08-11 | [link](https://www.postgresql.org/versions.json)                    | infra/dev/docker-compose.yml, managed DB | ARCHITECTURE.md does not name a major; 18 is current                       |
| pgvector            | 0.8.7   | 2026-10-01 | [link](https://github.com/pgvector/pgvector/tags)                   | infra/dev/docker-compose.yml             | Image: pgvector/pgvector:0.8.7-pg18 (PostgreSQL 18.x inside)               |
| Valkey              | 9.1.2   | 2026-09-01 | [link](https://github.com/valkey-io/valkey/releases/tag/9.1.2)      | infra/dev/docker-compose.yml             | Chosen over Redis for the BSD licence, as ARCHITECTURE.md section 3 allows |
| Redis (alternative) | 8.10.2  | 2026-09-17 | [link](https://github.com/redis/redis/releases/tag/8.10.2)          | not used                                 | Recorded for reference only                                                |
| NATS server         | 2.15.1  | 2026-10-09 | [link](https://github.com/nats-io/nats-server/releases/tag/v2.15.1) | infra/dev/docker-compose.yml             |                                                                            |
| coturn              | 4.18.0  | 2026-09-08 | [link](https://hub.docker.com/r/coturn/coturn/tags?name=4.18.0)     | infra/dev/docker-compose.yml             | Image: coturn/coturn:4.18.0                                                |

## Tooling and tests

| Dependency                | Version | Released   | Source                                                                  | Used in                           | Note                                                                                                                                                                     |
| ------------------------- | ------- | ---------- | ----------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| turbo                     | 2.11.10 | 2026-10-20 | [link](https://www.npmjs.com/package/turbo/v/2.11.10)                   | root                              |                                                                                                                                                                          |
| typescript                | 6.0.3   | 2026-04-16 | [link](https://www.npmjs.com/package/typescript/v/6.0.3)                | all TypeScript packages           | Not the newest: TypeScript 7.0.2 is out, but typescript-eslint 8.72.0 supports only <6.1.0 and @nestjs/cli 12 depends on ~6.0.2. 6.0.3 is the newest compatible release. |
| eslint                    | 10.13.0 | 2026-10-16 | [link](https://www.npmjs.com/package/eslint/v/10.13.0)                  | all TypeScript packages           |                                                                                                                                                                          |
| @eslint/js                | 10.0.1  | 2026-02-06 | [link](https://www.npmjs.com/package/@eslint/js/v/10.0.1)               | packages/config                   |                                                                                                                                                                          |
| typescript-eslint         | 8.72.0  | 2026-10-19 | [link](https://www.npmjs.com/package/typescript-eslint/v/8.72.0)        | packages/config                   |                                                                                                                                                                          |
| @next/eslint-plugin-next  | 16.4.2  | 2026-10-15 | [link](https://www.npmjs.com/package/@next/eslint-plugin-next/v/16.4.2) | apps/web                          | Used instead of eslint-config-next, which replaces the parser and bundles plugins without ESLint 10 support                                                              |
| eslint-plugin-react-hooks | 7.1.1   | 2026-04-17 | [link](https://www.npmjs.com/package/eslint-plugin-react-hooks/v/7.1.1) | packages/config                   |                                                                                                                                                                          |
| globals                   | 17.13.0 | 2026-10-01 | [link](https://www.npmjs.com/package/globals/v/17.13.0)                 | packages/config                   |                                                                                                                                                                          |
| prettier                  | 3.9.10  | 2026-10-10 | [link](https://www.npmjs.com/package/prettier/v/3.9.10)                 | root                              |                                                                                                                                                                          |
| vitest                    | 5.0.5   | 2026-10-15 | [link](https://www.npmjs.com/package/vitest/v/5.0.5)                    | TypeScript packages               |                                                                                                                                                                          |
| @playwright/test          | 1.64.1  | 2026-10-14 | [link](https://www.npmjs.com/package/@playwright/test/v/1.64.1)         | tests/e2e                         |                                                                                                                                                                          |
| @types/node               | 24.19.2 | 2026-10-09 | [link](https://www.npmjs.com/package/@types/node/v/24.19.2)             | apps/api, apps/web, tests/e2e     | Matches the Node 24 runtime, not the newest @types/node                                                                                                                  |
| @types/react              | 19.3.0  | 2026-09-09 | [link](https://www.npmjs.com/package/@types/react/v/19.3.0)             | apps/web, packages/ui             |                                                                                                                                                                          |
| @types/react-dom          | 19.3.0  | 2026-09-09 | [link](https://www.npmjs.com/package/@types/react-dom/v/19.3.0)         | apps/web, packages/ui             |                                                                                                                                                                          |
| ruff                      | 0.17.1  | 2026-10-15 | [link](https://pypi.org/project/ruff/0.17.1/)                           | Python dev group                  |                                                                                                                                                                          |
| mypy                      | 2.4.0   | 2026-10-01 | [link](https://pypi.org/project/mypy/2.4.0/)                            | Python dev group                  |                                                                                                                                                                          |
| pytest                    | 9.1.1   | 2026-06-19 | [link](https://pypi.org/project/pytest/9.1.1/)                          | Python dev group                  |                                                                                                                                                                          |
| k6                        | 2.3.0   | 2026-09-21 | [link](https://github.com/grafana/k6/releases/tag/v2.3.0)               | tests/load (installed separately) |                                                                                                                                                                          |

## CI (GitHub Actions)

| Dependency          | Version | Released   | Source                                                             | Used in                  | Note |
| ------------------- | ------- | ---------- | ------------------------------------------------------------------ | ------------------------ | ---- |
| actions/checkout    | v7.0.1  | 2026-07-20 | [link](https://github.com/actions/checkout/releases/tag/v7.0.1)    | .github/workflows/ci.yml |      |
| actions/setup-node  | v7.1.0  | 2026-10-08 | [link](https://github.com/actions/setup-node/releases/tag/v7.1.0)  | .github/workflows/ci.yml |      |
| pnpm/action-setup   | v6.1.0  | 2026-09-05 | [link](https://github.com/pnpm/action-setup/releases/tag/v6.1.0)   | .github/workflows/ci.yml |      |
| astral-sh/setup-uv  | v10.3.1 | 2026-10-21 | [link](https://github.com/astral-sh/setup-uv/releases/tag/v10.3.1) | .github/workflows/ci.yml |      |
| Swatinem/rust-cache | v2.9.3  | 2026-10-20 | [link](https://github.com/Swatinem/rust-cache/releases/tag/v2.9.3) | .github/workflows/ci.yml |      |

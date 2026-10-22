# Architecture decision records

One file per decision, numbered sequentially: `NNNN-kebab-title.md`. Write one for any new dependency or architectural change (CLAUDE.md, standing rule 3). Never edit an accepted ADR's decision; supersede it with a new ADR and set the old one's status to "Superseded by NNNN".

Template:

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD
- Source: ARCHITECTURE.md section(s) or prompt

## Context

## Decision

## Consequences
```

| ADR                                                       | Title                                                                               |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [0001](0001-livekit-agents-over-custom-media-services.md) | LiveKit Agents instead of custom media services and a message bus on the audio path |
| [0002](0002-translation-model-size-bandwidth-bound.md)    | Translation model size is set by L4 memory bandwidth: Qwen3 4B int8 by default      |
| [0003](0003-whop-billing.md)                              | Whop is the billing provider                                                        |
| [0004](0004-pool-c-gemma-4-26b-a4b.md)                    | Pool C batch LLM: Gemma 4 26B A4B primary, Qwen3 32B alternate                      |
| [0005](0005-chatterbox-separate-image.md)                 | Chatterbox runs in its own image behind an internal HTTP streaming endpoint         |
| [0006](0006-api-auth-and-database-libraries.md)           | API dependencies for phase 0: jose for access tokens, Prisma's pg driver adapter    |
| [0007](0007-stt-modes-mlx-whisper-for-mac.md)             | Three STT modes behind one contract; mlx-whisper for Mac development                |
| [0008](0008-agent-explicit-dispatch-and-reconciler.md)    | Agent recovery by heartbeat and explicit dispatch; agent dependencies               |
| [0009](0009-runpod-l4-benchmark-box.md)                   | Benchmark-only L4 box on RunPod, run as processes on the pod                        |

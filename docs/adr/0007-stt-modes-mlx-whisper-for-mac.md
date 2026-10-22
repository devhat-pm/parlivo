# 0007. Three STT modes behind one contract; mlx-whisper for Mac development

- Status: Accepted
- Date: 2026-10-22
- Source: prompt 3 (C1); ARCHITECTURE.md sections 3 and 4; CLAUDE.md development principle

## Context

Phase 1 must run end to end on the founder's Mac (Apple Silicon, Metal) every day. The remote NVIDIA L4 box exists only for benchmarks, because the latency and capacity figures in ARCHITECTURE.md are L4 numbers. CI has neither a GPU nor Metal.

Production STT is faster-whisper (CTranslate2) running Whisper large-v3-turbo at int8 on CUDA. CTranslate2 has no Metal backend: on a Mac it runs on the CPU only, which is far too slow for large-v3-turbo in a live call. Two Apple-Silicon options were considered:

- **mlx-whisper** 0.4.3 (MIT, Apple's MLX framework). Runs the same Whisper weights converted to MLX (`mlx-community/whisper-large-v3-turbo`) on the GPU through Metal. Returns word timestamps and per-word probabilities like the openai-whisper API. It is a Python library, so it runs inside the same Ray Serve deployment as the other modes. Its last release was 2025-08; MLX itself is current (0.32.4, 2026-10).
- **whisper.cpp** via pywhispercpp 1.5.1 (MIT). Also Metal-accelerated, with a C++ core and GGML model files. Word-level timestamps need token-timestamp options with different semantics, and the Python binding adds a compiled extension to maintain.

## Decision

- `services/stt` exposes one HTTP contract (`parlivo_schemas.stt`: raw 16 kHz s16le PCM in, `TranscriptionResult` out, `/v1/transcribe` and `/v1/partial`) in all three modes, chosen by `STT_MODE`:
  - `cpu`: faster-whisper `tiny`, int8 on CPU. For CI.
  - `mac`: **mlx-whisper** with `mlx-community/whisper-large-v3-turbo` on Metal. For local development.
  - `gpu`: faster-whisper `large-v3-turbo`, int8_float16 on CUDA. For the L4 benchmark box and production.
- Silero VAD trimming uses the ONNX VAD model bundled with faster-whisper in every mode, so speech bounds do not depend on the engine.
- mlx-whisper is an optional extra (`.[mac]`) with a platform marker, so CI and Linux never install it. CUDA runtime libraries are the `.[gpu]` extra.

## Consequences

- Positive: the same large-v3-turbo model runs on the Mac and the L4, so transcripts in development match production closely. Only the runtime differs.
- Positive: one contract and one service. The agent cannot tell which mode is running.
- Negative: Mac-mode latency is not evidence for the latency budget. Only gpu-mode numbers from the L4 count; the benchmark report states both.
- Negative: mlx-whisper releases are infrequent, and it pulls in torch (for its decoding utilities) on the Mac. If it stalls, whisper.cpp is the fallback behind the same `Engine` protocol, and switching needs a new ADR.
- Negative: `cpu` mode with `tiny` is much less accurate, especially for Arabic, Hindi, Mandarin and Japanese. CI tests assert what tiny can reliably do; the per-language keyword assertions run in mac and gpu mode.

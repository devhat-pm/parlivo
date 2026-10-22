# 0002. Translation model size is set by L4 memory bandwidth: Qwen3 4B int8 by default

- Status: Accepted
- Date: 2026-10-22
- Source: ARCHITECTURE.md sections 2 (Key design decisions: Translation model), 3 (Technology stack: Translation) and 4 (Latency budget)

## Context

Translation runs once per finalised clause per target language. Its budget is **350 ms** of the 1,190 ms in-region total: about 50 ms of prefill plus 15–20 output tokens, or more for Arabic, Hindi and Japanese.

At batch size 1, LLM decoding is limited by memory bandwidth: every output token reads all the weights once. Per-stream decode speed is therefore capped at roughly bandwidth ÷ model size in bytes, and batching across rooms raises total throughput but not per-stream speed. Pool B runs on NVIDIA L4 GPUs at about 300 GB/s:

| Model at int8 | Weights | Per-stream ceiling on L4 | 20 tokens + prefill           |
| ------------- | ------- | ------------------------ | ----------------------------- |
| 12B           | ~12 GB  | ~25 tok/s                | ~850 ms, over budget          |
| 8B            | ~8 GB   | ~37 tok/s                | ~590 ms, over budget          |
| 4B            | ~4.5 GB | ~65 tok/s                | ~360 ms, at the 350 ms budget |

An earlier draft assumed a 12B model at 80 tok/s. That is physically impossible on an L4 and would have put p50 around 1.6 s.

The model also needs a commercial licence. NLLB-200 and Tower are non-commercial and excluded. It has to accept prompts carrying two clauses of context, the workspace glossary and the listener's formality, which rules out seq2seq models for the main path.

## Decision

- Default translation model: **Qwen3 4B at int8 on vLLM** (Apache-2.0, verified in `docs/models.md`), on its own L4s in pool B so decoding bandwidth is not shared with STT or TTS.
- Upgrade path, only if the phase 1 tok/s benchmark allows: Qwen3 8B or Gemma 4 (12B, Apache-2.0) at int4 with speculative decoding.
- Long-tail languages: MADLAD-400 3B (Apache-2.0). It is seq2seq and takes no glossary, context or formality prompt.
- Measured per-stream tok/s per language is a **phase 1 gate**. If real decode speed lands at the usual 70–80% of the ceiling and the budget overruns, the decision is already made: first move the in-region p50 target to 1.5 s; only if the product needs 1.3 s, move pool B to L40S-class GPUs (about 860 GB/s) at roughly double the per-GPU cost.
- Final model choice per language pair is made by the nightly COMET benchmark.

## Consequences

- Positive: the latency budget rests on a physical limit rather than a vendor throughput figure, and the fallback is decided before phase 1.
- Positive: a 4B int8 model leaves plenty of VRAM on a 24 GB L4 for KV cache and continuous batching (planning figure: 40 concurrent active streams per L4).
- Negative: a 4B model will translate less well than 8–12B models, especially for distant pairs such as Japanese to German. The COMET benchmark must show it is good enough per pair. Quality upgrades either cost latency or need faster GPUs.
- Negative: there is only about 100 ms of headroom against the 1.3 s p50. Any extra hop or batching wait on the path has to be justified against this ADR.
- Follow-ups: the `tests/bench` streams-per-GPU and tok/s-per-language benchmarks (phase 1). `docs/models.md` notes newer candidates (Qwen3.5-4B, and Gemma 4 26B A4B, whose 3.8B active parameters may decode at close to 4B speed but need about 13 GB at int4) for the architect to consider for that benchmark.

# 0004. Pool C batch LLM: Gemma 4 26B A4B primary, Qwen3 32B alternate

- Status: Accepted
- Date: 2026-10-22
- Source: architect decision A1 (prompt 2); ARCHITECTURE.md sections 3, 5 and 7; docs/models.md

## Context

Pool C runs the batch AI LLM on one L4 (spot at launch, plus a non-spot replica for the in-call assistant from phase 3): summaries, summary translation, RAG answers and extraction. The architecture originally named "Gemma 4 27B", a size that does not exist. Gemma 4 ships as E2B, E4B, 12B, 26B A4B and 31B (docs/models.md). The real choice was between Gemma 4 31B (dense), Gemma 4 26B A4B (mixture-of-experts, 25.2B total and 3.8B active parameters) and Qwen3 32B (dense). All three are Apache 2.0.

An L4 has about 300 GB/s of memory bandwidth. Decode speed per stream is bounded by the bytes read per token, so a mixture-of-experts model that reads about 3.8B active parameters per token decodes far faster than a 31–32B dense model at similar memory footprint (about 13 GB at int4). The in-call assistant ("catch me up") is interactive, and the summary target is p95 under 5 minutes after call end, so decode speed matters more than the last points of dense-model quality.

## Decision

- Gemma 4 26B A4B at int4 on vLLM is the primary pool C model for summaries, RAG and the in-call assistant.
- Qwen3 32B at int4 is the alternate, used if 26B A4B fails the quality evaluation for a language or task.
- Section 5's pool C planning figure now reads "26B A4B int4".

## Consequences

- Positive: much faster decode per stream than a dense 31–32B model on the same L4, which helps the interactive assistant and the pool C burst target.
- Positive: about 13 GB at int4 leaves room on a 24 GB L4 for KV cache and batching.
- Negative: mixture-of-experts serving in vLLM is more sensitive to batch composition, and quality per language must be measured, not assumed. The pool C burst test and summary quality evaluation decide whether the alternate is needed.
- Negative: the input-token throughput planning figure (2,000–3,000 tok/s) was estimated for a dense ~27B model. Prefill on a mixture-of-experts model does not get the same active-parameter discount as decode, so restate the figure after the pool C benchmark.
- Note: the architecture diagram is now generated from `docs/assets/architecture.mmd` (prompt 3) and shows 26B A4B.

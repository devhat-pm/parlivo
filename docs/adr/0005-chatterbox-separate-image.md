# 0005. Chatterbox runs in its own image behind an internal HTTP streaming endpoint

- Status: Accepted
- Date: 2026-10-22
- Source: architect decision A3 (prompt 2); ARCHITECTURE.md sections 4 (Model serving) and 9 (Privacy); docs/models.md

## Context

Chatterbox Multilingual (MIT, 500M, 23 languages) is the confirmed TTS fallback that covers every launch language. Its PyPI package `chatterbox-tts` 0.1.7 pins `torch==2.6.0` and `gradio==6.8.0`. Gradio requires `starlette<1.0`, while `ray[serve]==2.59.0` requires `starlette>=1.0.1`, so Chatterbox cannot be installed in the same Python environment as the Ray Serve TTS deployment (VoxCPM2 and Kokoro on torch 2.14.1). This was found while pinning versions in prompt 1 and is not a licence problem.

Chatterbox also embeds Resemble AI's Perth watermark, which is inaudible, in every generated clip.

## Decision

- Chatterbox runs in its own container image (`infra/docker`, torch 2.6.0, no Ray) with the pins in `services/tts/requirements-gpu-chatterbox.txt`.
- That image exposes a small internal HTTP streaming endpoint (text and voice settings in, PCM chunks streamed out), reachable only on the cluster network.
- The TTS Ray Serve deployment calls it as a backend for languages where Chatterbox is the selected model (the per-language selection rule is in ARCHITECTURE.md section 5). The agent keeps talking to a single TTS service.
- The watermark is disclosed in the privacy policy (section 9).

## Consequences

- Positive: no dependency conflict, and each image stays on the torch version its model needs. The agent's interface does not change.
- Negative: one extra in-cluster HTTP hop for Chatterbox languages (a few milliseconds in-region), counted against the 150 ms TTS first-audio budget. The phase 1 benchmark measures Chatterbox through this endpoint, not in-process.
- Negative: a second GPU image to build, scan and scale. It scales by replica count behind a Kubernetes Service rather than by the Ray Serve autoscaler, so its queue depth must be exported for the 70% autoscaling rule.
- Negative: the PyPI package drags in gradio. If its pins block security updates, replace it with a loader written against the published weights; that would need a new ADR.
- Follow-up: the privacy policy text, when it is written, must include the watermark disclosure.

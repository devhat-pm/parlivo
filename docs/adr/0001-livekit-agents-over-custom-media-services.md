# 0001. LiveKit Agents instead of custom media services and a message bus on the audio path

- Status: Accepted
- Date: 2026-10-22
- Source: ARCHITECTURE.md sections 2 (System architecture, Key design decisions) and 4 (Real-time translation pipeline)

## Context

Every spoken clause has to leave the SFU, pass through VAD, STT, translation and TTS, and come back into the same room as a translated track, within a glass-to-ear budget of 1.3 s p50 and 2.0 s p95 in-region. Earlier drafts did this with custom Go services: an ingress service subscribed to LiveKit tracks and published 16 kHz PCM frames to NATS, the GPU services consumed and produced frames on NATS subjects, and an egress service turned TTS output back into a LiveKit track. A separate Go WebSocket gateway carried captions.

That design had problems:

- Four extra network and serialisation hops on the latency-critical path (SFU to ingress, ingress to NATS, NATS to egress, egress to SFU).
- NATS JetStream persists messages, which conflicts with the privacy rule that audio is never written to disk.
- Three services and a second client WebSocket to build, secure and scale, all reimplementing what LiveKit already provides.
- Hard to get right: speakers hearing their own translations, overlapping speakers and track subscription rules had to be built by hand.

The LiveKit Agents framework (Apache 2.0, Python) dispatches a job per room. The job joins as a hidden participant, subscribes to tracks, receives decoded and resampled PCM in memory, and publishes audio tracks and data-channel messages back into the room.

## Decision

- One translation agent job per room, built on LiveKit Agents (`services/agent`). It subscribes to every human audio track, runs Silero VAD on 20 ms frames, owns every per-speaker audio buffer and translation context, calls the stateless STT, translation and TTS services on GPU pools A and B, and publishes one `translated-{speakerId}-{lang}` track per speaker per target language, lazily.
- Captions and control messages (language switch) go over the LiveKit data channel. There is no separate realtime gateway and no second application WebSocket.
- Audio never touches NATS, the API or disk. NATS JetStream carries only durable transcript and meeting events to the AI service.
- The agent ignores its own published tracks. Per-track subscription permissions, which the agent sets and updates on every language switch, enforce that each participant hears only the translated tracks of their chosen language.
- No Go in the stack.

## Consequences

- Positive: the audio path is SFU → agent → GPU services → agent → SFU, two WebRTC hops in total, which is what the latency budget assumes. Three services and the gateway disappear. Recording, data channels, job dispatch and track publishing come from LiveKit.
- Positive: the GPU services become stateless request/response services, since the agent holds all per-speaker state. They scale on queue depth without session routing.
- Negative: the agent is stateful per room and a single point of failure for that room's translation. Mitigation: LiveKit re-dispatches the job within a few seconds, clients show "translation reconnecting" and keep the original audio, and clauses spoken during the gap are marked missing (section 4).
- Negative: tight coupling to LiveKit's agent framework and its release cadence. Versions are pinned in `docs/versions.md`. Replacing LiveKit would mean rewriting the agent.
- Negative: one Python process per room handles VAD, buffering and Opus work for up to 25 speakers. The phase 3 load test of a 25-person room with 5 languages verifies agent CPU and lazy track publishing (under 20 live translated tracks).
- Follow-ups: the phase 0 room-join prompt and the phase 1 "echo agent" skeleton prompt prove the framework before any model work.

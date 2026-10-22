# 0008. Agent recovery by heartbeat and explicit dispatch; agent dependencies

- Status: Accepted
- Date: 2026-10-22
- Source: prompt 3 (D1, D5, D6); ARCHITECTURE.md sections 4 (agent crash recovery) and 9 (observability)

## Context

ARCHITECTURE.md section 4 assumed that "LiveKit re-dispatches the room's agent job within a few seconds" after a crash. Measured on LiveKit 1.13.10 with LiveKit Agents 1.8.8 (prompt 3), it does not:

- After `kill -9` of the worker, the dead agent participant stays in the room for about 20 s until its connection times out.
- The restarted worker registers within about 3 s but is not given the room. LiveKit's retry, triggered when the dead participant finally leaves, failed ("failed to send job request").

The gate requires echo audio to return within 10 s of the kill.

The agent also needs per-speaker VAD and metrics:

- `livekit-plugins-silero` 1.8.8 (Apache 2.0, ONNX, no torch) gives a VAD stream per speaker from one model.
- OpenTelemetry API/SDK 1.45.1 with `opentelemetry-exporter-prometheus` 0.66b1 (Apache 2.0) cover spans and the Prometheus endpoint that the dev stack's Prometheus 3.15.1 scrapes. Grafana 13.2.4 shows the dashboard.

## Decision

- The worker registers with an agent name, `parlivo-translator`, so rooms are dispatched explicitly, not automatically.
- Every agent job writes a `parlivo.heartbeat` participant attribute once a second.
- Every worker runs a reconciler thread (`services/agent/src/parlivo_agent/reconciler.py`) once a second:
  - it removes agent participants whose heartbeat is older than 4 s;
  - it dispatches `parlivo-translator` (restart policy `JRP_NEVER`) to every room that has humans and no live agent;
  - it does not dispatch to the same room again within 8 s.
- A job that joins a room already holding a live agent leaves at once, which resolves two workers dispatching at the same moment.
- The worker runs jobs in threads (`JobExecutorType.THREAD`), so the Silero model and the Prometheus endpoint (port 9464) are set up once per process.
- A supervisor restarts the worker process: `scripts/run-agent.sh` locally and in CI; a Kubernetes Deployment in production.

## Consequences

- Positive: measured recovery after `kill -9` is about 4.5 s (stale heartbeat 4 s, plus dispatch and join), inside the 10 s gate. The web app shows "translation reconnecting" and keeps original audio meanwhile.
- Positive: the first dispatch to a new room uses the same path, so there is one mechanism.
- Negative: a room waits up to about 1 s (one reconcile interval) for its agent.
- Negative: every worker lists every room each second. That is fine for phase 1. Before the phase 3 load tests, shard the reconciler (for example by room hash or a leader lease in Valkey) or move it into a single dispatcher service.
- Negative: thread-mode jobs share the worker process, so one crash takes all of that worker's rooms. Recovery is the same path, but every affected room loses about 4 s of translation. Reconsider process-mode jobs once the Prometheus endpoint is per process.
- Negative: two dependencies on pre-1.0 or fast-moving packages (`opentelemetry-exporter-prometheus` 0.66b1, `livekit-agents`), pinned in docs/versions.md.

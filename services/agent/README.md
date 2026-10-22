# parlivo-agent

The per-room translation agent on LiveKit Agents (ARCHITECTURE.md sections 2 and 4; ADR 0001, 0008). Phase 1 skeleton: the "translation" is an **echo**. Each speaker's finished clause is played back on `translated-{speakerId}-echo` after the real pipeline has run, so the delay is the real pipeline delay.

Per human speaker:

1. **Silero VAD** (`livekit-plugins-silero`) on 32 ms windows of the speaker's 16 kHz audio.
2. **Clause rules** (`segmenter.py`): finalise after 300 ms of silence, or 150 ms once the latest partial ends in terminal punctuation; force-split at 7 s at the last complete word. The agent owns every buffer; the STT service is stateless.
3. **Captions:** partial transcripts every 500 ms and a final per clause, sent on the data channel (topic `captions`, `parlivo_schemas.CaptionMessage`).
4. **Echo track:** created on the first voiced frame and removed after 30 s of silence. Subscription permissions let each participant receive only other speakers' tracks in their listening language ("echo" counts as every language) and never their own.
5. **Telemetry:** one OpenTelemetry span per clause, from the last voiced frame to the first echo frame published, exported as the Prometheus histogram `parlivo_clause_to_echo_milliseconds` on `:9464` (`PARLIVO_METRICS_PORT`). Set `PARLIVO_TIMINGS_PATH` to also append one JSON line per clause (benchmarks).
6. **Recovery:** a heartbeat attribute plus a reconciler that removes stale agents and dispatches `parlivo-translator` to rooms without one (ADR 0008).

```bash
pnpm dev:infra                                    # LiveKit, Prometheus (:9090), Grafana (:3300)
STT_MODE=mac uv run --project services/stt parlivo-stt   # STT on :8300
scripts/run-agent.sh                              # agent with automatic restart
uv run ruff check . && uv run ruff format --check . && uv run mypy && uv run pytest
```

Environment: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (infra/dev defaults), `STT_URL` (default `http://127.0.0.1:8300`).

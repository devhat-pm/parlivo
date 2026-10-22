# parlivo-agent

The per-room translation agent built on the LiveKit Agents framework. It joins each meeting as a hidden participant, subscribes to every human audio track, runs Silero VAD, owns every per-speaker audio buffer and translation context, calls the stateless STT, translation and TTS services, publishes `translated-{speakerId}-{lang}` tracks lazily, sends captions on the LiveKit data channel and publishes final transcripts to NATS JetStream (ARCHITECTURE.md sections 2 and 4). Audio never leaves this process except to the GPU services.

```bash
uv sync --locked          # install
uv run ruff check . && uv run ruff format --check .
uv run mypy               # strict type check
uv run pytest             # tests
uv build                  # wheel + sdist
```

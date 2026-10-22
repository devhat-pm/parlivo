# parlivo-tts

Streaming text-to-speech on GPU pool A: VoxCPM2 as primary, Chatterbox Multilingual as the confirmed fallback for every launch language, and Kokoro for lowest-latency English. Stateless Ray Serve replicas that stream PCM chunks back to the agent (ARCHITECTURE.md sections 3–4).

The GPU runtime stack is pinned in `requirements-gpu.txt` (VoxCPM2 + Kokoro) and `requirements-gpu-chatterbox.txt` (the Chatterbox fallback, which needs its own image because chatterbox-tts pins torch 2.6.0 and a gradio that conflicts with Ray Serve 2.59) and installed only in the Linux/CUDA image; the uv project holds the CPU-safe code and tests.

```bash
uv sync --locked          # install
uv run ruff check . && uv run ruff format --check .
uv run mypy               # strict type check
uv run pytest             # tests
uv build                  # wheel + sdist
```

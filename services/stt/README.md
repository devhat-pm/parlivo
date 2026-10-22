# parlivo-stt

Stateless speech-to-text on GPU pool A: Ray Serve replicas running faster-whisper with Whisper large-v3-turbo (int8) and Silero VAD. The agent sends whole clauses and growing partial buffers; replicas keep no per-speaker state, so any replica serves any request (ARCHITECTURE.md section 4).

The GPU runtime stack is pinned in `requirements-gpu.txt` and installed only in the Linux/CUDA image; the uv project holds the CPU-safe code and tests.

```bash
uv sync --locked          # install
uv run ruff check . && uv run ruff format --check .
uv run mypy               # strict type check
uv run pytest             # tests
uv build                  # wheel + sdist
```

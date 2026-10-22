# parlivo-translate

Clause translation on GPU pool B: Qwen3 4B int8 on vLLM by default, with MADLAD-400 3B for long-tail languages. Prompts carry two clauses of context, the workspace glossary and the listener's formality on the LLM path only. Stateless; the agent owns context (ARCHITECTURE.md sections 2–4). Note: vLLM 0.32.0 pins torch 2.13.0, so this service uses a different torch than stt and tts.

The GPU runtime stack is pinned in `requirements-gpu.txt` and installed only in the Linux/CUDA image; the uv project holds the CPU-safe code and tests.

```bash
uv sync --locked          # install
uv run ruff check . && uv run ruff format --check .
uv run mypy               # strict type check
uv run pytest             # tests
uv build                  # wheel + sdist
```

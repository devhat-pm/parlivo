# parlivo-bench

Benchmarks that decide the phase 1 gate: streams per GPU for pools A and B, translation tok/s per language, TTS first-audio time and glass-to-ear p50/p95 as defined in ARCHITECTURE.md section 4. Results replace the planning figures in section 5.

```bash
uv sync --locked          # install
uv run ruff check . && uv run ruff format --check .
uv run mypy               # strict type check
uv run pytest             # tests
uv build                  # wheel + sdist
```

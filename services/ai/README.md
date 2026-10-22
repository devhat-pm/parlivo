# parlivo-ai

The post-call and in-call AI layer: consumes final transcript events from NATS JetStream, writes to PostgreSQL with pgvector, and produces summaries, action items, RAG answers, glossary extraction and analytics using the batch LLM on GPU pool C. It never touches the live translation pools A or B (ARCHITECTURE.md section 7).

```bash
uv sync --locked          # install
uv run ruff check . && uv run ruff format --check .
uv run mypy               # strict type check
uv run pytest             # tests
uv build                  # wheel + sdist
```

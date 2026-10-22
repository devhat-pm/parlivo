# parlivo-bench

Phase 1 benchmarks (ARCHITECTURE.md sections 4 and 5). They run anywhere the stack runs: on the Mac in `mac` mode for comparison, and on the L4 box (`infra/gpu-dev`, ADR 0009) for the numbers that count against the latency budget.

```bash
uv run parlivo-bench stt  --stt-url http://127.0.0.1:8300 --out results/stt-gpu.json     # STT latency per launch language
uv run parlivo-bench echo --timings /workspace/timings.jsonl --out results/echo-gpu.json  # clause to echo through the agent
uv run parlivo-bench report results > ../../docs/benchmarks/phase1-stt-echo.md            # markdown tables
```

- `stt`: each fixture clip (`tests/fixtures/speech`) is sent to `/v1/transcribe` 20 times after 2 warm-up requests. Records the service's own processing time and the HTTP round trip.
- `echo`: a headless LiveKit participant per language joins one room with that speaking language and speaks its clip plus 1.5 s of silence, 5 times, at real-time pace. The agent must run with `PARLIVO_TIMINGS_PATH` (the `--timings` file). Clause to echo is measured by the agent from the clause's last voiced frame to the first echo frame published. A clip with an internal pause of 300 ms or more becomes two clauses, so the clause count can exceed 50.

Percentiles are nearest-rank. Raw results land in `results/` (gitignored); the report goes in `docs/benchmarks/`.

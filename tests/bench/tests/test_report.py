import json
from pathlib import Path

from parlivo_bench.main import render


def test_render_includes_both_benchmarks(tmp_path: Path) -> None:
    env = {"date": "2026-10-22 18:00 UTC", "host": "h", "machine": "x86_64", "gpu": "L4"}
    clause = {"language": "en", "clause_to_echo_ms": 500.0, "stt_ms": 120.0}
    (tmp_path / "echo-gpu.json").write_text(
        json.dumps({"kind": "echo", "env": env, "clauses": [clause] * 3})
    )
    sample = {
        "language": "de",
        "audio_ms": 5000,
        "processing_ms": 90.0,
        "round_trip_ms": 95.0,
        "text": "Heute ist das Wetter",
        "mode": "gpu",
        "model": "large-v3-turbo",
    }
    (tmp_path / "stt-gpu.json").write_text(
        json.dumps({"kind": "stt", "env": env, "samples": [sample] * 4})
    )
    markdown = render(tmp_path)
    assert (
        "| Clause to echo (last voiced frame to first echo frame) | 3 | 500 | 500 | 500 |"
        in markdown
    )
    assert "| de | 5.0 | 4 | 90 | 90 | 95 | Heute ist das Wetter |" in markdown

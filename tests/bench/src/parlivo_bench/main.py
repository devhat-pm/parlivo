"""parlivo-bench: phase 1 STT and clause-to-echo benchmarks.

parlivo-bench stt  --stt-url http://127.0.0.1:8300 --out results/stt-gpu.json
parlivo-bench echo --timings /tmp/timings.jsonl --out results/echo-gpu.json
parlivo-bench report results/ > docs/benchmarks/phase1-stt-echo.md
"""

import argparse
import asyncio
import json
import os
import platform
import sys
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from parlivo_bench import clause_echo, stt_latency
from parlivo_bench.fixtures import LANGUAGES
from parlivo_bench.stats import summary, table


def _environment() -> dict[str, str]:
    return {
        "date": datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC"),
        "host": platform.node(),
        "machine": platform.machine(),
        "gpu": os.environ.get("BENCH_GPU", ""),
    }


def _write(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(f"wrote {path}", file=sys.stderr)


def cmd_stt(args: argparse.Namespace) -> None:
    samples = asyncio.run(stt_latency.measure(args.stt_url, args.repeats, args.warmup))
    _write(
        args.out,
        {"kind": "stt", "env": _environment(), "samples": [asdict(s) for s in samples]},
    )


def cmd_echo(args: argparse.Namespace) -> None:
    rows = asyncio.run(
        clause_echo.measure(
            args.livekit_url,
            args.api_key,
            args.api_secret,
            Path(args.timings),
            args.clauses_per_language,
        )
    )
    _write(args.out, {"kind": "echo", "env": _environment(), "clauses": rows})


def _ms(value: float) -> str:
    return f"{value:.0f}"


def render(results: Path) -> str:
    out: list[str] = []
    stt = {p.stem: json.loads(p.read_text()) for p in sorted(results.glob("stt-*.json"))}
    echo = {p.stem: json.loads(p.read_text()) for p in sorted(results.glob("echo-*.json"))}

    for name, data in echo.items():
        values = [c["clause_to_echo_ms"] for c in data["clauses"]]
        stt_values = [c["stt_ms"] for c in data["clauses"] if c["stt_ms"] > 0]
        s = summary(values)
        out.append(f"### Clause to echo: {name} ({data['env']['date']}, {data['env']['gpu']})\n")
        rows = [
            [
                "Clause to echo (last voiced frame to first echo frame)",
                str(len(values)),
                _ms(s["p50"]),
                _ms(s["p95"]),
                _ms(s["max"]),
            ],
        ]
        if stt_values:
            t = summary(stt_values)
            rows.append(
                [
                    "STT final, agent round trip",
                    str(len(stt_values)),
                    _ms(t["p50"]),
                    _ms(t["p95"]),
                    _ms(t["max"]),
                ]
            )
        out.append(table(["Measure", "Clauses", "p50 ms", "p95 ms", "max ms"], rows))
        by_language = []
        for language in LANGUAGES:
            lang_values = [
                c["clause_to_echo_ms"] for c in data["clauses"] if c["language"] == language
            ]
            if lang_values:
                ls = summary(lang_values)
                by_language.append(
                    [language, str(len(lang_values)), _ms(ls["p50"]), _ms(ls["p95"])]
                )
        out.append("\nPer language:\n")
        out.append(table(["Language", "Clauses", "p50 ms", "p95 ms"], by_language))
        out.append("")

    for name, data in stt.items():
        samples = data["samples"]
        mode = samples[0]["mode"] if samples else "?"
        model = samples[0]["model"] if samples else "?"
        out.append(f"### STT latency: {name} (mode {mode}, model {model}, {data['env']['date']})\n")
        rows = []
        for language in LANGUAGES:
            mine = [s for s in samples if s["language"] == language]
            if not mine:
                continue
            p = summary([s["processing_ms"] for s in mine])
            r = summary([s["round_trip_ms"] for s in mine])
            rows.append(
                [
                    language,
                    f"{mine[0]['audio_ms'] / 1000:.1f}",
                    str(len(mine)),
                    _ms(p["p50"]),
                    _ms(p["p95"]),
                    _ms(r["p50"]),
                    mine[0]["text"][:60],
                ]
            )
        out.append(
            table(
                [
                    "Language",
                    "Clip s",
                    "Runs",
                    "Service p50 ms",
                    "Service p95 ms",
                    "Round trip p50 ms",
                    "Transcript (first run)",
                ],
                rows,
            )
        )
        out.append("")
    return "\n".join(out)


def cmd_report(args: argparse.Namespace) -> None:
    print(render(Path(args.results)))


def main() -> None:
    parser = argparse.ArgumentParser(prog="parlivo-bench")
    sub = parser.add_subparsers(required=True)

    stt = sub.add_parser("stt", help="STT latency per launch language")
    stt.add_argument("--stt-url", default="http://127.0.0.1:8300")
    stt.add_argument("--repeats", type=int, default=20)
    stt.add_argument("--warmup", type=int, default=2)
    stt.add_argument("--out", type=Path, required=True)
    stt.set_defaults(func=cmd_stt)

    echo = sub.add_parser("echo", help="clause-to-echo latency through the agent")
    echo.add_argument("--livekit-url", default=os.environ.get("LIVEKIT_URL", "ws://localhost:7880"))
    echo.add_argument("--api-key", default=os.environ.get("LIVEKIT_API_KEY", "devkey"))
    echo.add_argument(
        "--api-secret",
        default=os.environ.get("LIVEKIT_API_SECRET", "parlivo-dev-secret-0123456789abcdef"),
    )
    echo.add_argument("--timings", required=True, help="the agent's PARLIVO_TIMINGS_PATH")
    echo.add_argument("--clauses-per-language", type=int, default=5)
    echo.add_argument("--out", type=Path, required=True)
    echo.set_defaults(func=cmd_echo)

    report = sub.add_parser("report", help="markdown tables from a results folder")
    report.add_argument("results")
    report.set_defaults(func=cmd_report)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()

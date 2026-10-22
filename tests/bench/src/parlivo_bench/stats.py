"""Percentiles and markdown tables for benchmark reports."""

import math
from collections.abc import Sequence


def percentile(values: Sequence[float], p: float) -> float:
    """Nearest-rank percentile (p in 0..100), the definition used throughout the reports."""
    if not values:
        raise ValueError("no values")
    ordered = sorted(values)
    rank = max(1, math.ceil(p / 100 * len(ordered)))
    return ordered[rank - 1]


def summary(values: Sequence[float]) -> dict[str, float]:
    return {
        "n": float(len(values)),
        "p50": percentile(values, 50),
        "p95": percentile(values, 95),
        "max": max(values),
    }


def table(headers: list[str], rows: list[list[str]]) -> str:
    lines = ["| " + " | ".join(headers) + " |", "|" + "---|" * len(headers)]
    lines += ["| " + " | ".join(row) + " |" for row in rows]
    return "\n".join(lines)

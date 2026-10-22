import pytest

from parlivo_bench.stats import percentile, summary, table


def test_nearest_rank_percentiles() -> None:
    values = [float(v) for v in range(1, 101)]
    assert percentile(values, 50) == 50
    assert percentile(values, 95) == 95
    assert percentile([7.0], 95) == 7


def test_summary_and_empty_input() -> None:
    assert summary([3.0, 1.0, 2.0]) == {"n": 3.0, "p50": 2.0, "p95": 3.0, "max": 3.0}
    with pytest.raises(ValueError, match="no values"):
        percentile([], 50)


def test_table() -> None:
    assert table(["a", "b"], [["1", "2"]]) == "| a | b |\n|---|---|\n| 1 | 2 |"

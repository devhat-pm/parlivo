import pytest

from parlivo_agent.segmenter import (
    BYTES_PER_MS,
    Clause,
    ClauseSegmenter,
    ends_with_terminal_punctuation,
    word_boundary_cut_ms,
)

WINDOW_MS = 32  # Silero's window at 16 kHz (512 samples)


def window(value: int = 1000) -> bytes:
    sample = value.to_bytes(2, "little", signed=True)
    return sample * (WINDOW_MS * BYTES_PER_MS // 2)


def feed(segmenter: ClauseSegmenter, pattern: str) -> list[Clause]:
    """Push one window per character: 's' speech, '.' silence. Returns closed clauses."""
    clauses: list[Clause] = []
    for char in pattern:
        clause = segmenter.push(window(), is_speech=char == "s")
        if clause is not None:
            clauses.append(clause)
    return clauses


def test_finalises_after_300_ms_of_silence() -> None:
    segmenter = ClauseSegmenter()
    # 10 speech windows, then 9 silent windows (288 ms): still open.
    assert feed(segmenter, "s" * 10 + "." * 9) == []
    assert segmenter.in_clause
    [clause] = feed(segmenter, ".")  # 10th silent window: 320 ms >= 300 ms
    assert clause.reason == "silence"
    assert clause.index == 1
    assert clause.last_voiced_ms == 10 * WINDOW_MS
    assert not segmenter.in_clause


def test_short_pauses_do_not_split_a_clause() -> None:
    segmenter = ClauseSegmenter()
    clauses = feed(segmenter, "ssss" + "." * 5 + "ssss" + "." * 10)
    assert len(clauses) == 1
    assert clauses[0].end_ms - clauses[0].start_ms == (4 + 5 + 4 + 10) * WINDOW_MS


def test_includes_up_to_200_ms_of_preroll() -> None:
    segmenter = ClauseSegmenter()
    [clause] = feed(segmenter, "." * 20 + "s" * 5 + "." * 10)
    preroll_windows = 200 // WINDOW_MS  # 6 whole windows fit in 200 ms
    assert clause.start_ms == (20 - preroll_windows) * WINDOW_MS
    assert len(clause.pcm) == (preroll_windows + 5 + 10) * WINDOW_MS * BYTES_PER_MS


def test_terminal_punctuation_shortens_the_silence_window() -> None:
    segmenter = ClauseSegmenter()
    feed(segmenter, "s" * 10)
    segmenter.mark_punctuated(ends_with_terminal_punctuation("The weather is sunny."))
    [clause] = feed(segmenter, "." * 5)  # 160 ms >= 150 ms
    assert clause.reason == "punctuation"


def test_force_split_at_a_word_boundary_keeps_the_rest_open() -> None:
    segmenter = ClauseSegmenter(max_clause_ms=7_000)
    feed(segmenter, "s" * 220)  # 7.04 s of continuous speech
    assert segmenter.needs_split()
    cut = word_boundary_cut_ms([1_000, 3_500, 6_400, 7_020], max_ms=7_000)
    assert cut == 6_400
    clause = segmenter.split_at(cut)
    assert clause.reason == "max_length"
    assert clause.end_ms - clause.start_ms == 6_400
    assert segmenter.in_clause
    assert segmenter.clause_elapsed_ms == 220 * WINDOW_MS - 6_400
    [rest] = feed(segmenter, "." * 10)
    assert rest.index == clause.index + 1
    assert rest.start_ms == clause.end_ms


def test_word_boundary_falls_back_to_the_limit() -> None:
    assert word_boundary_cut_ms([], 7_000) == 7_000
    assert word_boundary_cut_ms([8_000, 9_000], 7_000) == 7_000


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Hello.", True),
        ("Wie geht's?", True),
        ("会议十点开始。", True),
        ("आज बैठक है।", True),
        ("هل أنت هنا؟", True),
        ("and then", False),
        ("10,", False),
    ],
)
def test_terminal_punctuation(text: str, expected: bool) -> None:
    assert ends_with_terminal_punctuation(text) is expected

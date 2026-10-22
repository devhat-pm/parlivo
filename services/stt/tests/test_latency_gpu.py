"""Latency budget check for the L4 box: a 3 s clause must finish within 150 ms (section 4)."""

import os
import statistics

import pytest

from parlivo_stt.engines import create_engine
from parlivo_stt.settings import load_settings
from parlivo_stt.transcriber import Job, Transcriber

from .conftest import FIXTURES, read_wav_pcm

pytestmark = [
    pytest.mark.gpu,
    pytest.mark.skipif(
        os.environ.get("STT_MODE") != "gpu", reason="latency budget applies to the L4 (gpu mode)"
    ),
]
BUDGET_MS = 150
THREE_SECONDS = 3 * 16_000 * 2


def test_three_second_clause_within_budget() -> None:
    settings = load_settings()
    transcriber = Transcriber(
        create_engine(settings.mode, settings.model), settings.mode, settings.model
    )
    pcm = read_wav_pcm(FIXTURES / "en.wav")[:THREE_SECONDS]
    for _ in range(3):  # warm-up: CUDA kernels, allocator
        transcriber.run(Job(pcm, "en", True))
    timings = [transcriber.run(Job(pcm, "en", True)).processing_ms for _ in range(10)]
    assert statistics.median(timings) <= BUDGET_MS, timings

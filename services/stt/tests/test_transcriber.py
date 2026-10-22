from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from parlivo_stt.engines import EngineResult, EngineWord
from parlivo_stt.transcriber import Job, Transcriber

from .conftest import FIXTURES, read_wav_pcm


class FakeEngine:
    def __init__(self) -> None:
        self.calls: list[tuple[int, str | None, bool]] = []

    def transcribe(
        self, audio: NDArray[np.float32], language: str | None, word_timestamps: bool
    ) -> EngineResult:
        self.calls.append((audio.size, language, word_timestamps))
        return EngineResult(
            "hello world",
            language or "en",
            [EngineWord(" hello", 0.0, 0.4, 0.9), EngineWord(" world", 0.5, 0.9, 0.7)],
        )


def english_pcm() -> bytes:
    return read_wav_pcm(Path(FIXTURES) / "en.wav")


def test_silence_skips_the_engine() -> None:
    engine = FakeEngine()
    result = Transcriber(engine, "cpu", "fake").run(Job(bytes(32_000), "de", True))
    assert engine.calls == []
    assert (result.text, result.words, result.confidence, result.audio_ms) == ("", [], 0.0, 1000)
    assert result.language == "de"


def test_word_times_are_offset_to_the_original_buffer() -> None:
    engine = FakeEngine()
    lead_in = bytes(16_000 * 2)  # one second of silence before the speech
    result = Transcriber(engine, "cpu", "fake").run(Job(lead_in + english_pcm(), "en", True))
    assert engine.calls
    assert engine.calls[0][1:] == ("en", True)
    assert [w.word for w in result.words] == ["hello", "world"]
    # VAD trims most of the lead-in, so word times start just before the 1 s mark.
    assert 700 <= result.words[0].start_ms <= 1000
    assert result.confidence == 0.8
    assert result.is_final
    assert (result.mode, result.model) == ("cpu", "fake")


def test_partials_skip_word_timestamps() -> None:
    engine = FakeEngine()
    result = Transcriber(engine, "cpu", "fake").run(Job(english_pcm(), None, False))
    assert engine.calls[0][2] is False
    assert result.is_final is False

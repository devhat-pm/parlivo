"""Real-model tests on one fixture clip per launch language (tests/fixtures/speech).

Runs the engine for STT_MODE (default cpu = Whisper tiny, as in CI). Each mode must find its
keywords from manifest.json; tiny has no keywords for Arabic and Hindi, so those only need a
non-empty transcript.
"""

import os
import unicodedata
from typing import Any

import pytest
from parlivo_schemas import TranscriptionResult

from parlivo_stt.engines import create_engine
from parlivo_stt.settings import load_settings
from parlivo_stt.transcriber import Job, Transcriber

from .conftest import FIXTURES, read_wav_pcm

LANGUAGES = ["en", "es", "de", "fr", "pt", "it", "ar", "hi", "zh", "ja"]


@pytest.fixture(scope="module")
def transcriber() -> Transcriber:
    settings = load_settings()
    return Transcriber(create_engine(settings.mode, settings.model), settings.mode, settings.model)


def normalise(text: str) -> str:
    return unicodedata.normalize("NFC", text).casefold()


@pytest.mark.model
@pytest.mark.parametrize("language", LANGUAGES)
def test_fixture_transcript_contains_keywords(
    transcriber: Transcriber, manifest: dict[str, Any], language: str
) -> None:
    pcm = read_wav_pcm(FIXTURES / f"{language}.wav")
    result = transcriber.run(Job(pcm, language, is_final=True))
    TranscriptionResult.model_validate(result.model_dump(by_alias=True))
    assert result.text, f"empty transcript for {language}"
    assert result.language == language
    assert result.words
    assert all(w.end_ms >= w.start_ms for w in result.words)
    mode = os.environ.get("STT_MODE", "cpu")
    for keyword in manifest[language]["keywords"][mode]:
        assert normalise(keyword) in normalise(result.text), (keyword, result.text)


@pytest.mark.model
def test_partial_on_a_growing_buffer(transcriber: Transcriber) -> None:
    pcm = read_wav_pcm(FIXTURES / "en.wav")
    half = pcm[: len(pcm) // 2 - (len(pcm) // 2) % 2]
    result = transcriber.run(Job(half, "en", is_final=False))
    assert result.is_final is False
    assert result.words == []
    assert "weather" in result.text.lower()

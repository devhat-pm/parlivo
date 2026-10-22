"""The per-language speech fixtures in tests/fixtures/speech."""

import json
import wave
from pathlib import Path
from typing import Any

FIXTURES = Path(__file__).resolve().parents[4] / "tests" / "fixtures" / "speech"
LANGUAGES = ["en", "es", "de", "fr", "pt", "it", "ar", "hi", "zh", "ja"]


def pcm(language: str) -> bytes:
    with wave.open(str(FIXTURES / f"{language}.wav"), "rb") as wav:
        return wav.readframes(wav.getnframes())


def manifest() -> dict[str, Any]:
    data: dict[str, Any] = json.loads((FIXTURES / "manifest.json").read_text())
    return data

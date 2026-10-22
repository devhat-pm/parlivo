import json
import wave
from pathlib import Path
from typing import Any

import pytest

FIXTURES = Path(__file__).resolve().parents[3] / "tests" / "fixtures" / "speech"


def read_wav_pcm(path: Path) -> bytes:
    with wave.open(str(path), "rb") as wav:
        assert wav.getframerate() == 16_000, path
        assert wav.getnchannels() == 1, path
        assert wav.getsampwidth() == 2, path
        return wav.readframes(wav.getnframes())


@pytest.fixture(scope="session")
def manifest() -> dict[str, Any]:
    data: dict[str, Any] = json.loads((FIXTURES / "manifest.json").read_text())
    return data

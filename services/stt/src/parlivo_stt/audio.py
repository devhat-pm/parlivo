"""PCM helpers and Silero VAD trimming (the VAD model bundled with faster-whisper, ONNX)."""

import numpy as np
from faster_whisper.vad import VadOptions, get_speech_timestamps
from numpy.typing import NDArray
from parlivo_schemas import PCM_SAMPLE_RATE

# Whisper's input window. Clauses are force-finalised at 7 s, so 30 s is a generous cap.
MAX_AUDIO_SECONDS = 30
_VAD = VadOptions(threshold=0.5, min_silence_duration_ms=300, speech_pad_ms=150)


class AudioError(ValueError):
    """The request body is not usable 16 kHz mono s16le PCM."""


def pcm_to_float(pcm: bytes) -> NDArray[np.float32]:
    if len(pcm) % 2 != 0:
        raise AudioError("PCM body must be 16-bit samples (even byte length)")
    if len(pcm) > MAX_AUDIO_SECONDS * PCM_SAMPLE_RATE * 2:
        raise AudioError(f"clause longer than {MAX_AUDIO_SECONDS} s")
    return np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768.0


def speech_bounds(audio: NDArray[np.float32]) -> tuple[int, int] | None:
    """First and last speech sample according to Silero VAD, or None for silence."""
    if audio.size == 0:
        return None
    segments = get_speech_timestamps(audio, _VAD)
    if not segments:
        return None
    return int(segments[0]["start"]), int(segments[-1]["end"])


def samples_to_ms(samples: int) -> int:
    return round(samples * 1000 / PCM_SAMPLE_RATE)

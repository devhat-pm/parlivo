import numpy as np
import pytest

from parlivo_stt.audio import AudioError, pcm_to_float, samples_to_ms, speech_bounds


def test_pcm_to_float_scales_to_unit_range() -> None:
    pcm = np.array([0, 16384, -32768], dtype="<i2").tobytes()
    assert pcm_to_float(pcm).tolist() == [0.0, 0.5, -1.0]


def test_rejects_odd_length_and_overlong_audio() -> None:
    with pytest.raises(AudioError, match="16-bit"):
        pcm_to_float(b"\x00")
    with pytest.raises(AudioError, match="longer than"):
        pcm_to_float(bytes(31 * 16_000 * 2))


def test_silence_has_no_speech() -> None:
    assert speech_bounds(np.zeros(16_000, dtype=np.float32)) is None
    assert speech_bounds(np.zeros(0, dtype=np.float32)) is None


def test_samples_to_ms() -> None:
    assert samples_to_ms(16_000) == 1000
    assert samples_to_ms(8) == 0

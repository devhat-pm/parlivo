"""Whisper engines. Each returns words with times relative to the audio it was given."""

from dataclasses import dataclass
from typing import Any, Protocol

import numpy as np
from numpy.typing import NDArray


@dataclass(frozen=True)
class EngineWord:
    word: str
    start_s: float
    end_s: float
    probability: float


@dataclass(frozen=True)
class EngineResult:
    text: str
    language: str
    words: list[EngineWord]


class Engine(Protocol):
    def transcribe(
        self, audio: NDArray[np.float32], language: str | None, word_timestamps: bool
    ) -> EngineResult: ...


class FasterWhisperEngine:
    """faster-whisper (CTranslate2): int8 on CPU for CI, int8_float16 on CUDA for the L4."""

    def __init__(self, model: str, device: str, compute_type: str) -> None:
        from faster_whisper import WhisperModel

        self._model = WhisperModel(model, device=device, compute_type=compute_type)

    def transcribe(
        self, audio: NDArray[np.float32], language: str | None, word_timestamps: bool
    ) -> EngineResult:
        segments, info = self._model.transcribe(
            audio,
            language=language,
            beam_size=1,  # greedy: the latency budget has no room for beam search
            word_timestamps=word_timestamps,
            condition_on_previous_text=False,
            vad_filter=False,  # VAD already ran in the transcriber
        )
        texts: list[str] = []
        words: list[EngineWord] = []
        for segment in segments:
            texts.append(segment.text)
            for word in segment.words or []:
                words.append(EngineWord(word.word, word.start, word.end, word.probability))
        return EngineResult("".join(texts).strip(), info.language, words)


class MlxWhisperEngine:
    """mlx-whisper on Apple Silicon (Metal). See ADR 0007."""

    def __init__(self, model: str) -> None:
        import mlx_whisper

        self._mlx_whisper = mlx_whisper
        self._model = model

    def transcribe(
        self, audio: NDArray[np.float32], language: str | None, word_timestamps: bool
    ) -> EngineResult:
        result: dict[str, Any] = self._mlx_whisper.transcribe(
            audio,
            path_or_hf_repo=self._model,
            language=language,
            word_timestamps=word_timestamps,
            condition_on_previous_text=False,
            temperature=0.0,
            verbose=None,
        )
        words = [
            EngineWord(w["word"], float(w["start"]), float(w["end"]), float(w["probability"]))
            for segment in result.get("segments", [])
            for w in segment.get("words", [])
        ]
        return EngineResult(str(result.get("text", "")).strip(), str(result["language"]), words)


def create_engine(mode: str, model: str) -> Engine:
    if mode == "mac":
        return MlxWhisperEngine(model)
    if mode == "gpu":
        return FasterWhisperEngine(model, device="cuda", compute_type="int8_float16")
    return FasterWhisperEngine(model, device="cpu", compute_type="int8")

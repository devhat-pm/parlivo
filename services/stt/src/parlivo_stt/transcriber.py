"""Mode-independent transcription: PCM in, TranscriptionResult out (no per-speaker state)."""

import time
from dataclasses import dataclass

from parlivo_schemas import SttMode, TranscriptionResult, Word

from parlivo_stt.audio import pcm_to_float, samples_to_ms, speech_bounds
from parlivo_stt.engines import Engine


@dataclass(frozen=True)
class Job:
    pcm: bytes
    language: str | None
    is_final: bool


class Transcriber:
    def __init__(self, engine: Engine, mode: SttMode, model: str) -> None:
        self._engine = engine
        self._mode = mode
        self._model = model

    def run(self, job: Job) -> TranscriptionResult:
        started = time.perf_counter()
        audio = pcm_to_float(job.pcm)
        bounds = speech_bounds(audio)
        language = job.language or ""
        if bounds is None:
            return self._result("", language, job, [], audio.size, started)
        first, last = bounds
        offset_ms = samples_to_ms(first)
        engine_result = self._engine.transcribe(
            audio[first:last], job.language, word_timestamps=job.is_final
        )
        words = [
            Word(
                word=w.word.strip(),
                start_ms=offset_ms + round(w.start_s * 1000),
                end_ms=offset_ms + round(w.end_s * 1000),
                probability=min(1.0, max(0.0, w.probability)),
            )
            for w in engine_result.words
            if w.word.strip()
        ]
        return self._result(
            engine_result.text, engine_result.language, job, words, audio.size, started
        )

    def _result(
        self,
        text: str,
        language: str,
        job: Job,
        words: list[Word],
        samples: int,
        started: float,
    ) -> TranscriptionResult:
        confidence = sum(w.probability for w in words) / len(words) if words else 0.0
        return TranscriptionResult(
            text=text,
            language=language,
            is_final=job.is_final,
            words=words,
            confidence=confidence,
            audio_ms=samples_to_ms(samples),
            processing_ms=(time.perf_counter() - started) * 1000,
            mode=self._mode,
            model=self._model,
        )

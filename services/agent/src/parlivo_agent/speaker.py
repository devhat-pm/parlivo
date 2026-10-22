"""One pipeline per human speaker: VAD -> clause rules -> STT -> captions + echo track."""

import asyncio
import contextlib
import logging
import time
from collections.abc import Awaitable, Callable

from livekit import rtc
from livekit.agents.vad import VAD, VADEventType
from parlivo_schemas import CaptionMessage, TranscriptionResult

from parlivo_agent.echo import EchoTracks
from parlivo_agent.metrics import ClauseTiming, Telemetry
from parlivo_agent.segmenter import (
    SAMPLE_RATE,
    Clause,
    ClauseSegmenter,
    ends_with_terminal_punctuation,
    word_boundary_cut_ms,
)
from parlivo_agent.stt_client import SttClient

log = logging.getLogger(__name__)
SPEECH_THRESHOLD = 0.5
PARTIAL_INTERVAL_S = 0.5
MIN_PARTIAL_MS = 300

SendCaption = Callable[[CaptionMessage], Awaitable[None]]


class SpeakerPipeline:
    def __init__(
        self,
        *,
        room_name: str,
        speaker_id: str,
        language: str | None,
        track: rtc.RemoteAudioTrack,
        vad: VAD,
        stt: SttClient,
        echo: EchoTracks,
        send_caption: SendCaption,
        telemetry: Telemetry,
    ) -> None:
        self._room_name = room_name
        self._speaker_id = speaker_id
        self._language = language
        self._track = track
        self._vad = vad
        self._stt = stt
        self._echo = echo
        self._send_caption = send_caption
        self._telemetry = telemetry
        self._segmenter = ClauseSegmenter()
        self._last_voiced_at = 0.0  # monotonic time of the latest voiced window
        self._last_partial_at = 0.0
        self._partial_task: asyncio.Task[None] | None = None
        self._split_task: asyncio.Task[None] | None = None
        self._finals: asyncio.Queue[tuple[Clause, float, TranscriptionResult | None]] = (
            asyncio.Queue()
        )
        self._tasks: list[asyncio.Task[None]] = []

    def start(self) -> None:
        self._tasks = [
            asyncio.create_task(self._run(), name=f"speaker-{self._speaker_id}"),
            asyncio.create_task(self._finalize_loop(), name=f"finals-{self._speaker_id}"),
        ]

    async def aclose(self) -> None:
        for task in [*self._tasks, self._partial_task, self._split_task]:
            if task is not None:
                task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await task

    def _clause_id(self, index: int) -> str:
        return f"{self._speaker_id}:{index}"

    async def _run(self) -> None:
        audio = rtc.AudioStream(self._track, sample_rate=SAMPLE_RATE, num_channels=1)
        vad_stream = self._vad.stream()

        async def feed() -> None:
            async for event in audio:
                vad_stream.push_frame(event.frame)
            vad_stream.end_input()

        feeder = asyncio.create_task(feed())
        try:
            async for event in vad_stream:
                if event.type != VADEventType.INFERENCE_DONE:
                    continue
                is_speech = event.probability >= SPEECH_THRESHOLD
                for frame in event.frames:
                    self._on_window(bytes(frame.data), is_speech)
        finally:
            feeder.cancel()
            await vad_stream.aclose()
            await audio.aclose()

    def _on_window(self, pcm: bytes, is_speech: bool) -> None:
        now = time.monotonic()
        if is_speech:
            self._last_voiced_at = now
            self._echo.ensure(self._speaker_id)  # lazy echo track on the first voiced frame
        clause = self._segmenter.push(pcm, is_speech)
        if clause is not None:
            self._finals.put_nowait((clause, self._last_voiced_at, None))
            return
        if not self._segmenter.in_clause:
            return
        if self._segmenter.needs_split() and self._split_task is None:
            self._split_task = asyncio.create_task(self._force_split())
        elif (
            now - self._last_partial_at >= PARTIAL_INTERVAL_S
            and self._segmenter.clause_elapsed_ms >= MIN_PARTIAL_MS
            and (self._partial_task is None or self._partial_task.done())
        ):
            self._last_partial_at = now
            self._partial_task = asyncio.create_task(self._partial())

    async def _partial(self) -> None:
        index = self._segmenter.next_index
        start_ms = self._segmenter.clause_start_ms
        pcm = self._segmenter.current_pcm()
        try:
            started = time.perf_counter()
            result = await self._stt.partial(pcm, self._language)
            self._telemetry.record_stt((time.perf_counter() - started) * 1000, "partial")
        except Exception:
            log.exception("partial transcript failed for %s", self._speaker_id)
            return
        # Ignore a partial that arrives after its clause was finalised.
        if self._segmenter.next_index != index or not result.text:
            return
        self._segmenter.mark_punctuated(ends_with_terminal_punctuation(result.text))
        await self._send_caption(
            CaptionMessage(
                speaker_id=self._speaker_id,
                clause_id=self._clause_id(index),
                language=result.language or self._language or "",
                text=result.text,
                is_final=False,
                start_ms=start_ms,
                end_ms=start_ms + len(pcm) // 32,
            )
        )

    async def _force_split(self) -> None:
        """7 s of continuous speech: cut at the last complete word before 7 s (section 4)."""
        try:
            pcm = self._segmenter.current_pcm()
            result = await self._stt.transcribe(pcm, self._language)
            cut = word_boundary_cut_ms(
                [w.end_ms for w in result.words], self._segmenter.max_clause_ms
            )
            clause = self._segmenter.split_at(cut)
            words = [w for w in result.words if w.end_ms <= cut]
            text = " ".join(w.word for w in words) if words else result.text
            kept = result.model_copy(update={"text": text, "words": words})
            self._finals.put_nowait((clause, self._last_voiced_at, kept))
        except Exception:
            log.exception("force split failed for %s", self._speaker_id)
        finally:
            self._split_task = None

    async def _finalize_loop(self) -> None:
        """Finalise clauses in order: STT, final caption, echo, metrics."""
        while True:
            clause, last_voiced_at, transcript = await self._finals.get()
            try:
                await self._finalize(clause, last_voiced_at, transcript)
            except Exception:
                log.exception("finalising clause %s failed", self._clause_id(clause.index))

    async def _finalize(
        self, clause: Clause, last_voiced_at: float, transcript: TranscriptionResult | None
    ) -> None:
        clause_id = self._clause_id(clause.index)
        with self._telemetry.tracer.start_as_current_span("clause") as span:
            span.set_attribute("parlivo.clause_id", clause_id)
            span.set_attribute("parlivo.reason", clause.reason)
            stt_ms = 0.0
            if transcript is None:
                started = time.perf_counter()
                transcript = await self._stt.transcribe(clause.pcm, self._language)
                stt_ms = (time.perf_counter() - started) * 1000
                self._telemetry.record_stt(stt_ms, "final")
            language = transcript.language or self._language or ""
            if transcript.text:
                await self._send_caption(
                    CaptionMessage(
                        speaker_id=self._speaker_id,
                        clause_id=clause_id,
                        language=language,
                        text=transcript.text,
                        is_final=True,
                        start_ms=clause.start_ms,
                        end_ms=clause.end_ms,
                    )
                )
            first_frame_at = await self._echo.play(self._speaker_id, clause.pcm)
            clause_to_echo_ms = (first_frame_at - last_voiced_at) * 1000
            span.set_attribute("parlivo.clause_to_echo_ms", clause_to_echo_ms)
            self._telemetry.record_clause(
                ClauseTiming(
                    room=self._room_name,
                    speaker_id=self._speaker_id,
                    clause_id=clause_id,
                    language=language,
                    reason=clause.reason,
                    audio_ms=clause.end_ms - clause.start_ms,
                    stt_ms=stt_ms,
                    clause_to_echo_ms=clause_to_echo_ms,
                    text=transcript.text,
                )
            )
            log.info(
                "clause %s %s %.0f ms (stt %.0f ms): %s",
                clause_id,
                clause.reason,
                clause_to_echo_ms,
                stt_ms,
                transcript.text,
            )

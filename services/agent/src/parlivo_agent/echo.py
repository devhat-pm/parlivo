"""Per-speaker echo tracks: translated-{speakerId}-echo, created lazily, removed when idle.

Phase 1 stand-in for translation: each finalised clause's original audio is played back on
the speaker's echo track after the pipeline (STT) has run, so the delay is the real
pipeline delay.
"""

import asyncio
import logging
import time
from collections.abc import Callable
from dataclasses import dataclass, field

from livekit import rtc

from parlivo_agent.segmenter import BYTES_PER_MS, SAMPLE_RATE
from parlivo_agent.tracks import ECHO_LANGUAGE, translated_track_name

log = logging.getLogger(__name__)
FRAME_MS = 20
IDLE_UNPUBLISH_S = 30.0


@dataclass
class _EchoTrack:
    source: rtc.AudioSource
    track: rtc.LocalAudioTrack
    sid: str
    last_used: float
    queue: asyncio.Queue[tuple[bytes, asyncio.Future[float]]] = field(default_factory=asyncio.Queue)
    player: asyncio.Task[None] | None = None


class EchoTracks:
    def __init__(self, room: rtc.Room, on_change: Callable[[], None]) -> None:
        self._room = room
        self._on_change = on_change
        self._tracks: dict[str, _EchoTrack] = {}
        self._creating: dict[str, asyncio.Task[_EchoTrack]] = {}
        self._reaper = asyncio.create_task(self._reap_idle())

    def published(self) -> dict[str, str]:
        """speaker_id -> track SID for every live echo track."""
        return {speaker: echo.sid for speaker, echo in self._tracks.items()}

    def ensure(self, speaker_id: str) -> None:
        """Start publishing the speaker's echo track (called on the first voiced frame)."""
        if speaker_id in self._tracks:
            self._tracks[speaker_id].last_used = time.monotonic()
        elif speaker_id not in self._creating:
            self._creating[speaker_id] = asyncio.create_task(self._create(speaker_id))

    async def play(self, speaker_id: str, pcm: bytes) -> float:
        """Queue clause audio; resolves to the monotonic time its first frame was captured."""
        self.ensure(speaker_id)
        echo = self._tracks.get(speaker_id) or await self._creating[speaker_id]
        echo.last_used = time.monotonic()
        first_frame: asyncio.Future[float] = asyncio.get_running_loop().create_future()
        await echo.queue.put((pcm, first_frame))
        return await first_frame

    async def _create(self, speaker_id: str) -> _EchoTrack:
        name = translated_track_name(speaker_id, ECHO_LANGUAGE)
        source = rtc.AudioSource(SAMPLE_RATE, 1)
        track = rtc.LocalAudioTrack.create_audio_track(name, source)
        options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
        publication = await self._room.local_participant.publish_track(track, options)
        echo = _EchoTrack(source, track, publication.sid, time.monotonic())
        echo.player = asyncio.create_task(self._play_loop(echo))
        self._tracks[speaker_id] = echo
        self._creating.pop(speaker_id, None)
        log.info("published %s (%s)", name, publication.sid)
        self._on_change()
        return echo

    async def _play_loop(self, echo: _EchoTrack) -> None:
        frame_bytes = FRAME_MS * BYTES_PER_MS
        while True:
            pcm, first_frame = await echo.queue.get()
            for offset in range(0, len(pcm), frame_bytes):
                chunk = pcm[offset : offset + frame_bytes]
                frame = rtc.AudioFrame(chunk, SAMPLE_RATE, 1, len(chunk) // 2)
                await echo.source.capture_frame(frame)
                if not first_frame.done():
                    first_frame.set_result(time.monotonic())
            if not first_frame.done():
                first_frame.set_result(time.monotonic())
            echo.last_used = time.monotonic()

    async def _reap_idle(self) -> None:
        while True:
            await asyncio.sleep(5)
            now = time.monotonic()
            for speaker_id, echo in list(self._tracks.items()):
                if now - echo.last_used >= IDLE_UNPUBLISH_S and echo.queue.empty():
                    await self._remove(speaker_id)

    async def _remove(self, speaker_id: str) -> None:
        echo = self._tracks.pop(speaker_id)
        if echo.player:
            echo.player.cancel()
        await self._room.local_participant.unpublish_track(echo.sid)
        await echo.source.aclose()
        log.info("unpublished echo track for %s after %.0f s idle", speaker_id, IDLE_UNPUBLISH_S)
        self._on_change()

    async def aclose(self) -> None:
        self._reaper.cancel()
        for speaker_id in list(self._tracks):
            await self._remove(speaker_id)

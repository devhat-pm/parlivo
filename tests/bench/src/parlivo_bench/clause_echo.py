"""Clause-to-echo benchmark: a headless participant speaks the fixtures into a LiveKit room.

For each language a participant joins with that speaking language (token metadata, as the API
sets it), publishes the fixture clip followed by 1.5 s of silence, `clauses_per_language`
times, at real-time pace. The agent finalises each clause, runs STT, publishes the echo and
appends one JSON line per clause to PARLIVO_TIMINGS_PATH; this module reads that file.
"""

import asyncio
import json
import time
import uuid
from pathlib import Path
from typing import Any

from livekit import api, rtc

from parlivo_bench.fixtures import LANGUAGES, pcm

SAMPLE_RATE = 16_000
FRAME_MS = 10
SILENCE_S = 1.5


def token(api_key: str, api_secret: str, room: str, identity: str, language: str) -> str:
    metadata = {"participantId": identity, "speakingLanguage": language, "listeningLanguage": "en"}
    grant = api.VideoGrants(room=room, room_join=True, can_publish=True, can_subscribe=True)
    return (
        api.AccessToken(api_key, api_secret)
        .with_identity(identity)
        .with_name(f"bench {language}")
        .with_metadata(json.dumps(metadata))
        .with_grants(grant)
        .to_jwt()
    )


async def speak(source: rtc.AudioSource, audio: bytes) -> None:
    """Push PCM in 10 ms frames at real-time pace (capture_frame blocks when the queue fills)."""
    step = SAMPLE_RATE * FRAME_MS // 1000 * 2
    for offset in range(0, len(audio), step):
        chunk = audio[offset : offset + step]
        if len(chunk) < step:
            chunk += bytes(step - len(chunk))
        await source.capture_frame(rtc.AudioFrame(chunk, SAMPLE_RATE, 1, len(chunk) // 2))


async def run_language(
    url: str, api_key: str, api_secret: str, room_name: str, language: str, clauses: int
) -> None:
    identity = f"bench-{language}-{uuid.uuid4().hex[:6]}"
    room = rtc.Room()
    await room.connect(url, token(api_key, api_secret, room_name, identity, language))
    source = rtc.AudioSource(SAMPLE_RATE, 1, queue_size_ms=200)
    track = rtc.LocalAudioTrack.create_audio_track("microphone", source)
    await room.local_participant.publish_track(
        track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
    )
    silence = bytes(int(SAMPLE_RATE * SILENCE_S) * 2)
    clip = pcm(language)
    try:
        await asyncio.sleep(3.0)  # let the agent subscribe before the first clause
        for _ in range(clauses):
            await speak(source, clip + silence)
        await speak(source, silence + silence)  # flush the last clause through the pipeline
        await asyncio.sleep(2.0)
    finally:
        await room.disconnect()


async def measure(
    url: str,
    api_key: str,
    api_secret: str,
    timings_path: Path,
    clauses_per_language: int = 5,
    wait_for_agent_s: float = 3.0,
) -> list[dict[str, Any]]:
    room_name = f"bench-{uuid.uuid4().hex[:8]}"
    started = time.time()
    for language in LANGUAGES:
        await run_language(url, api_key, api_secret, room_name, language, clauses_per_language)
    await asyncio.sleep(wait_for_agent_s)
    rows = await asyncio.to_thread(_read_rows, timings_path, room_name)
    print(f"{len(rows)} clauses in {time.time() - started:.0f} s")
    return rows


def _read_rows(timings_path: Path, room_name: str) -> list[dict[str, Any]]:
    """The agent's timing lines for this benchmark's room (the file is shared and appended)."""
    if not timings_path.exists():
        return []
    rows = [json.loads(line) for line in timings_path.read_text().splitlines() if line.strip()]
    return [row for row in rows if row["room"] == room_name]

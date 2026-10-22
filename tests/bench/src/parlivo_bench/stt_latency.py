"""STT latency per launch language against a running services/stt (any mode).

Sends each fixture clip to /v1/transcribe `repeats` times after `warmup` requests and records
the service's own processing time (VAD + model) and the HTTP round trip.
"""

import time
from dataclasses import dataclass

import aiohttp
from parlivo_schemas import TranscriptionResult

from parlivo_bench.fixtures import LANGUAGES, pcm


@dataclass(frozen=True)
class SttSample:
    language: str
    audio_ms: int
    processing_ms: float
    round_trip_ms: float
    text: str
    mode: str
    model: str


async def measure(stt_url: str, repeats: int = 20, warmup: int = 2) -> list[SttSample]:
    samples: list[SttSample] = []
    async with aiohttp.ClientSession() as session:
        for language in LANGUAGES:
            body = pcm(language)
            for attempt in range(warmup + repeats):
                started = time.perf_counter()
                async with session.post(
                    f"{stt_url}/v1/transcribe",
                    params={"language": language},
                    data=body,
                    headers={"content-type": "application/octet-stream"},
                ) as response:
                    response.raise_for_status()
                    result = TranscriptionResult.model_validate(await response.json())
                round_trip = (time.perf_counter() - started) * 1000
                if attempt >= warmup:
                    samples.append(
                        SttSample(
                            language,
                            result.audio_ms,
                            result.processing_ms,
                            round_trip,
                            result.text,
                            result.mode,
                            result.model,
                        )
                    )
    return samples

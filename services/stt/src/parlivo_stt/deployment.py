"""Ray Serve deployment: one engine per replica, dynamic batching capped at 20 ms."""

import asyncio
from typing import Any, cast

from parlivo_schemas import TranscriptionResult
from ray import serve

from parlivo_stt.engines import create_engine
from parlivo_stt.http import app, set_handler
from parlivo_stt.settings import load_settings
from parlivo_stt.transcriber import Job, Transcriber


@serve.deployment(max_ongoing_requests=64)
@serve.ingress(app)
class SttDeployment:
    def __init__(self) -> None:
        settings = load_settings()
        self._transcriber = Transcriber(
            create_engine(settings.mode, settings.model), settings.mode, settings.model
        )
        # serve.batch adds these setters at runtime; the type stubs do not declare them.
        batcher = cast(Any, self._run_batch)
        batcher.set_max_batch_size(settings.max_batch_size)
        batcher.set_batch_wait_timeout_s(settings.batch_wait_s)
        set_handler(self.handle)

    async def handle(self, job: Job) -> dict[str, object]:
        result: TranscriptionResult = await self._run_batch(job)
        return result.model_dump(by_alias=True)

    @serve.batch(max_batch_size=8, batch_wait_timeout_s=0.02)
    async def _run_batch(self, jobs: list[Job]) -> list[TranscriptionResult]:
        # The batching window collects concurrent requests; the engine still decodes them
        # one by one. True batched decoding is measured in the phase 1 GPU benchmark.
        return await asyncio.to_thread(lambda: [self._transcriber.run(job) for job in jobs])

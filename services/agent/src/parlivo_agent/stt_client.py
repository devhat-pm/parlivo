"""HTTP client for services/stt (contract: parlivo_schemas.stt)."""

import aiohttp
from parlivo_schemas import TranscriptionResult


class SttClient:
    def __init__(self, base_url: str, timeout_s: float = 10.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = aiohttp.ClientTimeout(total=timeout_s)
        self._session: aiohttp.ClientSession | None = None

    async def _http(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(timeout=self._timeout)
        return self._session

    async def transcribe(self, pcm: bytes, language: str | None) -> TranscriptionResult:
        return await self._post("/v1/transcribe", pcm, language)

    async def partial(self, pcm: bytes, language: str | None) -> TranscriptionResult:
        return await self._post("/v1/partial", pcm, language)

    async def _post(self, path: str, pcm: bytes, language: str | None) -> TranscriptionResult:
        params = {"language": language} if language else {}
        session = await self._http()
        async with session.post(
            f"{self._base_url}{path}",
            data=pcm,
            params=params,
            headers={"content-type": "application/octet-stream"},
        ) as response:
            response.raise_for_status()
            return TranscriptionResult.model_validate(await response.json())

    async def close(self) -> None:
        if self._session is not None:
            await self._session.close()

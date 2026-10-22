"""HTTP contract (same in every mode). Ray Serve mounts this app; tests use it directly."""

from collections.abc import Awaitable, Callable

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from parlivo_schemas import LAUNCH_LANGUAGES

from parlivo_stt.audio import AudioError
from parlivo_stt.transcriber import Job

Handler = Callable[[Job], Awaitable[dict[str, object]]]

app = FastAPI(title="parlivo-stt")
_handler: Handler | None = None


def set_handler(handler: Handler) -> None:
    """Install the function that serves jobs (the Ray deployment, or a test double)."""
    global _handler
    _handler = handler


async def _serve(request: Request, language: str | None, is_final: bool) -> JSONResponse:
    if _handler is None:
        raise HTTPException(503, "transcriber not ready")
    if language is not None and language not in LAUNCH_LANGUAGES:
        raise HTTPException(422, f"unsupported language {language!r}")
    if request.headers.get("content-type", "").split(";")[0] != "application/octet-stream":
        raise HTTPException(415, "body must be application/octet-stream PCM s16le 16 kHz mono")
    try:
        result = await _handler(Job(await request.body(), language, is_final))
    except AudioError as error:
        raise HTTPException(422, str(error)) from error
    return JSONResponse(result)


@app.post("/v1/transcribe")
async def transcribe(request: Request, language: str | None = None) -> JSONResponse:
    """Final transcript of a finished clause, with word timestamps."""
    return await _serve(request, language, is_final=True)


@app.post("/v1/partial")
async def partial(request: Request, language: str | None = None) -> JSONResponse:
    """Partial transcript of a growing clause buffer (captions only; no word timestamps)."""
    return await _serve(request, language, is_final=False)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok" if _handler else "starting"}

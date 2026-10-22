"""STT service contract (services/stt). Identical in cpu, mac and gpu modes.

Request: POST /v1/transcribe (final clause) or /v1/partial (growing buffer) with the raw
clause as the body: 16 kHz mono signed 16-bit little-endian PCM
(content-type application/octet-stream). Query parameter `language` is the speaker's
lobby language and is used as a hint; omit it to let Whisper detect the language.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

PCM_SAMPLE_RATE = 16_000
LAUNCH_LANGUAGES = ("en", "es", "de", "fr", "pt", "ar", "hi", "zh", "ja", "it", "ur")

SttMode = Literal["cpu", "mac", "gpu"]


class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, frozen=True)


class Word(_Camel):
    word: str
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)
    probability: float = Field(ge=0, le=1)


class TranscriptionResult(_Camel):
    text: str
    language: str
    is_final: bool
    words: list[Word]
    # Mean word probability; 0 when nothing was recognised.
    confidence: float = Field(ge=0, le=1)
    audio_ms: int = Field(ge=0)
    # Time spent in the service for this request (VAD + model), excluding queueing.
    processing_ms: float = Field(ge=0)
    mode: SttMode
    model: str

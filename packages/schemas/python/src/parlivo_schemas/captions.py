"""Caption messages the translation agent sends on the LiveKit data channel (topic "captions")."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

CAPTIONS_TOPIC = "captions"


class CaptionMessage(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, frozen=True)

    type: Literal["caption"] = "caption"
    version: Literal[1] = 1
    speaker_id: str
    clause_id: str
    language: str
    text: str
    is_final: bool
    # Milliseconds since the speaker's audio stream started in the agent.
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)

    def to_json(self) -> str:
        return self.model_dump_json(by_alias=True)

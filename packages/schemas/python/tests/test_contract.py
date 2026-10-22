import json
from pathlib import Path

import pytest

from parlivo_schemas import CaptionMessage, TranscriptionResult

CONTRACT = Path(__file__).resolve().parents[2] / "contract"


@pytest.mark.parametrize("name", ["caption-partial.json", "caption-final.json"])
def test_caption_examples_round_trip(name: str) -> None:
    document = json.loads((CONTRACT / name).read_text())
    message = CaptionMessage.model_validate(document)
    assert json.loads(message.to_json()) == document


def test_stt_result_example_round_trips() -> None:
    document = json.loads((CONTRACT / "stt-result.json").read_text())
    result = TranscriptionResult.model_validate(document)
    assert result.words[1].word == "weather"
    assert json.loads(result.model_dump_json(by_alias=True)) == document


def test_caption_rejects_negative_times() -> None:
    document = json.loads((CONTRACT / "caption-final.json").read_text())
    document["startMs"] = -1
    with pytest.raises(ValueError, match="greater than or equal"):
        CaptionMessage.model_validate(document)

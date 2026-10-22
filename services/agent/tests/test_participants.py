from types import SimpleNamespace
from typing import Any

from parlivo_agent.participants import languages, listener


def participant(metadata: str, identity: str = "p1") -> Any:
    return SimpleNamespace(metadata=metadata, identity=identity)


def test_reads_languages_from_api_metadata() -> None:
    metadata = '{"participantId": "p1", "speakingLanguage": "de", "listeningLanguage": "en"}'
    assert languages(participant(metadata)) == ("de", "en")
    assert listener(participant(metadata)).listening_language == "en"


def test_missing_or_broken_metadata_falls_back() -> None:
    assert languages(participant("")) == (None, "en")
    assert languages(participant("{not json")) == (None, "en")
    assert languages(participant('{"speakingLanguage": "fr"}')) == ("fr", "fr")

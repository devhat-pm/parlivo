"""Reading listeners from LiveKit participants (metadata is set by apps/api at join)."""

import json

from livekit import rtc

from parlivo_agent.tracks import Listener


def is_human(participant: rtc.RemoteParticipant) -> bool:
    return participant.kind != rtc.ParticipantKind.PARTICIPANT_KIND_AGENT


def languages(participant: rtc.Participant) -> tuple[str | None, str]:
    """(speaking language, listening language) from the participant's token metadata."""
    try:
        data = json.loads(participant.metadata or "{}")
    except json.JSONDecodeError:
        data = {}
    speaking = data.get("speakingLanguage")
    listening = data.get("listeningLanguage") or speaking or "en"
    return (speaking if isinstance(speaking, str) else None), str(listening)


def listener(participant: rtc.Participant) -> Listener:
    return Listener(identity=participant.identity, listening_language=languages(participant)[1])

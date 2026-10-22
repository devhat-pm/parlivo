"""Translated-track names and subscription permissions (ARCHITECTURE.md sections 2 and 9)."""

from dataclasses import dataclass

ECHO_LANGUAGE = "echo"  # phase 1 placeholder "translation": matches every listening language
TRACK_PREFIX = "translated-"


def translated_track_name(speaker_id: str, language: str) -> str:
    return f"{TRACK_PREFIX}{speaker_id}-{language}"


@dataclass(frozen=True)
class Listener:
    identity: str
    listening_language: str


@dataclass(frozen=True)
class TranslatedTrack:
    sid: str
    speaker_id: str
    language: str


def allowed_track_sids(listener: Listener, tracks: list[TranslatedTrack]) -> list[str]:
    """Translated tracks this listener may subscribe to: never their own speech, and only
    their listening language (echo counts as every language)."""
    return sorted(
        track.sid
        for track in tracks
        if track.speaker_id != listener.identity
        and track.language in (ECHO_LANGUAGE, listener.listening_language)
    )

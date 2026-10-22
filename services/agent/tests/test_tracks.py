from parlivo_agent.tracks import (
    ECHO_LANGUAGE,
    Listener,
    TranslatedTrack,
    allowed_track_sids,
    translated_track_name,
)

ANNA, BEN, CHEN = "anna-id", "ben-id", "chen-id"


def test_track_name() -> None:
    assert translated_track_name(ANNA, "echo") == "translated-anna-id-echo"


def test_echo_counts_as_every_language_except_your_own_speech() -> None:
    tracks = [
        TranslatedTrack("TR_a", ANNA, ECHO_LANGUAGE),
        TranslatedTrack("TR_b", BEN, ECHO_LANGUAGE),
    ]
    assert allowed_track_sids(Listener(ANNA, "de"), tracks) == ["TR_b"]
    assert allowed_track_sids(Listener(BEN, "ja"), tracks) == ["TR_a"]
    assert allowed_track_sids(Listener(CHEN, "en"), tracks) == ["TR_a", "TR_b"]


def test_real_translations_only_in_the_listening_language() -> None:
    tracks = [
        TranslatedTrack("TR_de", ANNA, "de"),
        TranslatedTrack("TR_en", ANNA, "en"),
        TranslatedTrack("TR_me", CHEN, "en"),
    ]
    assert allowed_track_sids(Listener(CHEN, "en"), tracks) == ["TR_en"]
    assert allowed_track_sids(Listener(BEN, "de"), tracks) == ["TR_de"]

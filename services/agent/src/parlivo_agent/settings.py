"""Agent configuration from the environment (defaults match infra/dev and services/stt)."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    livekit_url: str
    livekit_api_key: str
    livekit_api_secret: str
    stt_url: str


def load_settings(env: dict[str, str] | None = None) -> Settings:
    env = dict(os.environ) if env is None else env
    return Settings(
        livekit_url=env.get("LIVEKIT_URL", "ws://localhost:7880"),
        livekit_api_key=env.get("LIVEKIT_API_KEY", "devkey"),
        livekit_api_secret=env.get("LIVEKIT_API_SECRET", "parlivo-dev-secret-0123456789abcdef"),
        stt_url=env.get("STT_URL", "http://127.0.0.1:8300"),
    )

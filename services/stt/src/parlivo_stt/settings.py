"""Configuration from the environment. STT_MODE selects the engine (ARCHITECTURE.md section 4)."""

import os
from dataclasses import dataclass

from parlivo_schemas import SttMode

# Default model per mode. cpu is for CI; mac is day-to-day development on Apple Silicon;
# gpu is the L4 benchmark box (CUDA, int8).
DEFAULT_MODELS: dict[SttMode, str] = {
    "cpu": "tiny",
    "mac": "mlx-community/whisper-large-v3-turbo",
    "gpu": "large-v3-turbo",
}


@dataclass(frozen=True)
class Settings:
    mode: SttMode
    model: str
    host: str
    port: int
    max_batch_size: int
    batch_wait_s: float


def load_settings(env: dict[str, str] | None = None) -> Settings:
    env = dict(os.environ) if env is None else env
    raw_mode = env.get("STT_MODE", "cpu")
    if raw_mode not in DEFAULT_MODELS:
        raise ValueError(f"STT_MODE must be cpu, mac or gpu, not {raw_mode!r}")
    mode: SttMode = raw_mode  # narrowed to the Literal by the membership check
    return Settings(
        mode=mode,
        model=env.get("STT_MODEL", DEFAULT_MODELS[mode]),
        host=env.get("STT_HOST", "127.0.0.1"),
        port=int(env.get("STT_PORT", "8300")),
        max_batch_size=int(env.get("STT_MAX_BATCH_SIZE", "8")),
        # Dynamic batching waits at most 20 ms for more requests (latency budget, section 4).
        batch_wait_s=float(env.get("STT_BATCH_WAIT_S", "0.02")),
    )

"""Run the STT service: `parlivo-stt` (STT_MODE=cpu|mac|gpu, STT_PORT default 8300)."""

import logging
import os
from typing import Any, cast


def main() -> None:
    # Run Ray workers in this environment. Under `uv run`, Ray otherwise re-creates the
    # environment per worker, which breaks the path dependency on packages/schemas/python.
    # Ray reads this flag at import time, so it must be set before `import ray`.
    os.environ.setdefault("RAY_ENABLE_UV_RUN_RUNTIME_ENV", "0")
    import ray
    from ray import serve

    from parlivo_stt.deployment import SttDeployment
    from parlivo_stt.settings import load_settings

    settings = load_settings()
    logging.basicConfig(level=logging.INFO)
    ray.init(include_dashboard=False, logging_level=logging.WARNING)
    serve.start(http_options={"host": settings.host, "port": settings.port})
    # serve.deployment returns a Deployment at runtime; the stubs keep the class type.
    deployment = cast(Any, SttDeployment).options(
        ray_actor_options={"num_gpus": 1} if settings.mode == "gpu" else {}
    )
    logging.getLogger(__name__).info(
        "parlivo-stt mode=%s model=%s on http://%s:%d",
        settings.mode,
        settings.model,
        settings.host,
        settings.port,
    )
    serve.run(deployment.bind(), route_prefix="/", blocking=True)


if __name__ == "__main__":
    main()

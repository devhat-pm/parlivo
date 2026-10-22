# parlivo-stt

Stateless speech-to-text on Ray Serve (ARCHITECTURE.md section 4; ADR 0007). The agent sends a clause as raw 16 kHz mono s16le PCM and gets back text, word timestamps and a confidence. The contract is `parlivo_schemas.stt` and is identical in every mode.

| Mode (`STT_MODE`) | Engine                               | Model                                  | Use                                     |
| ----------------- | ------------------------------------ | -------------------------------------- | --------------------------------------- |
| `cpu` (default)   | faster-whisper, int8 on CPU          | `tiny`                                 | CI                                      |
| `mac`             | mlx-whisper on Metal                 | `mlx-community/whisper-large-v3-turbo` | Day-to-day development on Apple Silicon |
| `gpu`             | faster-whisper, int8_float16 on CUDA | `large-v3-turbo`                       | The L4 benchmark box and production     |

Endpoints (default `http://127.0.0.1:8300`, set with `STT_HOST` and `STT_PORT`):

- `POST /v1/transcribe?language=de`: final transcript of a clause, with word timestamps.
- `POST /v1/partial?language=de`: transcript of a growing buffer for live captions (no word timestamps).
- `GET /healthz`

Silero VAD (the ONNX model bundled with faster-whisper) trims silence before the model runs, and pure silence never reaches the model. Requests are collected by `@serve.batch` with at most a 20 ms wait (`STT_MAX_BATCH_SIZE`, `STT_BATCH_WAIT_S`). The engine still decodes a batch one request at a time; true batched decoding is a benchmark follow-up. Model weights download to the Hugging Face cache on first use, never into the repo.

```bash
uv sync --locked                       # cpu (CI)
uv sync --locked --extra mac           # mlx-whisper on Apple Silicon
uv sync --locked --extra gpu           # CUDA runtime libraries (Linux, L4 box)
STT_MODE=mac uv run parlivo-stt        # serve
uv run ruff check . && uv run ruff format --check .
uv run mypy
uv run pytest                          # STT_MODE selects the engine for the fixture tests
STT_MODE=mac uv run pytest -m model    # fixture keywords per language with large-v3-turbo
```

`tests/test_latency_gpu.py` asserts the 150 ms budget for a 3 s clause and runs only with `STT_MODE=gpu`.

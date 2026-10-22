# infra/docker

One Dockerfile per app and service. GPU images (stt, translate, tts, and a separate tts-chatterbox image) install the pinned `requirements-gpu*.txt` of their service on a CUDA base; model weights are pulled at runtime, never baked into the repo. Empty until the first service is containerised.

# parlivo-schemas (Python)

Pydantic models for messages that cross a service boundary: the STT service contract (agent ↔ stt) and data-channel caption messages (agent → web). The TypeScript side lives in `packages/schemas/src` (Zod). Both sides validate the same example documents in `packages/schemas/contract/*.json`, so a field renamed on one side fails the other side's tests. Services depend on this package by path (`[tool.uv.sources]`).

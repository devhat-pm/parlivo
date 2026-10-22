# Speech fixtures

One short clip per launch language (16 kHz, mono, 16-bit PCM WAV) for the STT tests (`services/stt/tests`) and the phase 1 benchmarks. `manifest.json` holds the sentence each clip speaks and the keywords each STT mode must recognise: `mac` and `gpu` run Whisper large-v3-turbo; `cpu` runs Whisper tiny in CI and is only expected to catch the listed words. An empty list means tiny is not reliable for that language, and the test only checks for a non-empty transcript.

Two helper files are not part of the per-language set:

- `en-with-pause.wav` is `en.wav` followed by 1.5 s of silence. Chromium loops a fake-microphone file, so the pause gives the agent a clean clause boundary on every loop (e2e and manual tests).
- `silence.wav` is 2 s of digital silence, used as the listener's microphone in the e2e test.

## Provenance and licence

- **Generated, not recorded.** The clips were synthesised on 2026-10-22 with Chatterbox Multilingual (`ResembleAI/chatterbox`, MIT licence, `chatterbox-tts` 0.1.7) from the sentences in `manifest.json`, which were written for this project. No real person's voice was used. The output was resampled from 24 kHz to 16 kHz.
- The clips are released under the same licence as this repository. Chatterbox's licence places no restriction on its output.
- **Watermark:** every clip carries Resemble AI's inaudible Perth watermark (ARCHITECTURE.md section 9).
- **Known artefacts:** `de.wav` ends with a short hesitation sound and `fr.wav` with a babbled extra phrase that large-v3-turbo transcribes. They stay in the set because real speech has tails too; keywords avoid them.
- To regenerate, use a throwaway environment with `chatterbox-tts==0.1.7` and `setuptools<81` (its watermarker imports `pkg_resources`), call `ChatterboxMultilingualTTS.generate(text, language_id=lang)` with `torch.manual_seed(7)` for each sentence, and resample to 16 kHz mono s16le.

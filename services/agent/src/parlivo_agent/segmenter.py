"""Clause segmentation per speaker (ARCHITECTURE.md section 4). Pure: no I/O, no clocks.

Feed 16 kHz mono s16le PCM with a per-window speech decision from Silero VAD. A clause:
- starts on the first voiced window (with up to 200 ms of pre-roll so Whisper hears the onset);
- finalises after 300 ms of continuous silence, or after a shorter silence (150 ms) when the
  latest partial transcript already ends in terminal punctuation;
- is force-split at 7 s at a word boundary chosen by the caller (`split_at`).
Times are milliseconds since the speaker's stream started.
"""

from collections import deque
from dataclasses import dataclass
from typing import Literal

SAMPLE_RATE = 16_000
BYTES_PER_MS = SAMPLE_RATE * 2 // 1000  # 32 bytes of s16le mono per millisecond

FinalizeReason = Literal["silence", "punctuation", "max_length"]


@dataclass(frozen=True)
class Clause:
    index: int
    pcm: bytes
    start_ms: int
    end_ms: int
    last_voiced_ms: int
    reason: FinalizeReason


class ClauseSegmenter:
    def __init__(
        self,
        silence_ms: int = 300,
        punctuation_silence_ms: int = 150,
        max_clause_ms: int = 7_000,
        preroll_ms: int = 200,
    ) -> None:
        self.silence_ms = silence_ms
        self.punctuation_silence_ms = punctuation_silence_ms
        self.max_clause_ms = max_clause_ms
        self._preroll_bytes = preroll_ms * BYTES_PER_MS
        self._preroll: deque[bytes] = deque()
        self._buffer = bytearray()
        self._position_ms = 0.0
        self._clause_start_ms = 0.0
        self._last_voiced_ms = 0.0
        self._silence_run_ms = 0.0
        self._in_clause = False
        self._punctuated = False
        self._next_index = 1

    @property
    def in_clause(self) -> bool:
        return self._in_clause

    @property
    def clause_elapsed_ms(self) -> int:
        return round(self._position_ms - self._clause_start_ms) if self._in_clause else 0

    @property
    def clause_start_ms(self) -> int:
        return round(self._clause_start_ms)

    @property
    def position_ms(self) -> int:
        return round(self._position_ms)

    @property
    def next_index(self) -> int:
        return self._next_index

    def current_pcm(self) -> bytes:
        """The open clause so far (for partial transcripts)."""
        return bytes(self._buffer)

    def mark_punctuated(self, punctuated: bool) -> None:
        """Record whether the latest partial transcript ends in terminal punctuation."""
        self._punctuated = punctuated

    def push(self, pcm: bytes, is_speech: bool) -> Clause | None:
        """Add one VAD window. Returns a clause when this window closes one."""
        duration_ms = len(pcm) / BYTES_PER_MS
        if not self._in_clause:
            if not is_speech:
                self._remember_preroll(pcm)
                self._position_ms += duration_ms
                return None
            preroll = b"".join(self._preroll)
            self._preroll.clear()
            self._in_clause = True
            self._clause_start_ms = self._position_ms - len(preroll) / BYTES_PER_MS
            self._buffer = bytearray(preroll)
            self._silence_run_ms = 0.0
            self._punctuated = False
        self._buffer.extend(pcm)
        self._position_ms += duration_ms
        if is_speech:
            self._silence_run_ms = 0.0
            self._last_voiced_ms = self._position_ms
        else:
            self._silence_run_ms += duration_ms
        if self._silence_run_ms >= self.silence_ms:
            return self._finalize("silence")
        if self._punctuated and self._silence_run_ms >= self.punctuation_silence_ms:
            return self._finalize("punctuation")
        return None

    def needs_split(self) -> bool:
        return self._in_clause and self.clause_elapsed_ms >= self.max_clause_ms

    def split_at(self, offset_ms: int) -> Clause:
        """Close the clause at `offset_ms` from its start (a word boundary); keep the rest open."""
        cut = max(0, min(len(self._buffer), offset_ms * BYTES_PER_MS))
        cut -= cut % 2
        head, tail = bytes(self._buffer[:cut]), bytes(self._buffer[cut:])
        start = self._clause_start_ms
        end = start + cut / BYTES_PER_MS
        clause = Clause(
            self._take_index(), head, round(start), round(end), round(end), "max_length"
        )
        self._buffer = bytearray(tail)
        self._clause_start_ms = end
        self._punctuated = False
        if not tail:
            self._in_clause = False
        return clause

    def _finalize(self, reason: FinalizeReason) -> Clause:
        clause = Clause(
            self._take_index(),
            bytes(self._buffer),
            round(self._clause_start_ms),
            round(self._position_ms),
            round(self._last_voiced_ms),
            reason,
        )
        self._buffer = bytearray()
        self._in_clause = False
        self._punctuated = False
        self._silence_run_ms = 0.0
        return clause

    def _take_index(self) -> int:
        index = self._next_index
        self._next_index += 1
        return index

    def _remember_preroll(self, pcm: bytes) -> None:
        self._preroll.append(pcm)
        while sum(len(chunk) for chunk in self._preroll) > self._preroll_bytes:
            self._preroll.popleft()


# Latin, CJK full stop and fullwidth ?/!, Arabic question mark, Devanagari danda.
TERMINAL_PUNCTUATION = (".", "?", "!", "\u3002", "\uff1f", "\uff01", "\u061f", "\u0964")


def ends_with_terminal_punctuation(text: str) -> bool:
    return text.rstrip().endswith(TERMINAL_PUNCTUATION)


def word_boundary_cut_ms(word_end_ms: list[int], max_ms: int) -> int:
    """Latest word end at or before `max_ms` (excluding the last word, which may be cut off)."""
    candidates = [end for end in word_end_ms[:-1] if 0 < end <= max_ms]
    return max(candidates) if candidates else max_ms

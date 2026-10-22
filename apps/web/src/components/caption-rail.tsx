"use client";

import { CAPTIONS_TOPIC, type CaptionMessage, captionMessageSchema } from "@parlivo/schemas";
import { type Room, RoomEvent } from "livekit-client";
import { useEffect, useState } from "react";

const MAX_LINES = 6;

/** Applies a caption to the rail: a final replaces its clause's partial; newest clauses last. */
export function applyCaption(lines: CaptionMessage[], caption: CaptionMessage): CaptionMessage[] {
  const existing = lines.findIndex((line) => line.clauseId === caption.clauseId);
  if (existing >= 0) {
    // Never let a late partial overwrite the final transcript of the same clause.
    if (lines[existing]?.isFinal && !caption.isFinal) return lines;
    const next = [...lines];
    next[existing] = caption;
    return next;
  }
  return [...lines, caption].slice(-MAX_LINES);
}

/** Two-tone rolling captions from the translation agent (ARCHITECTURE.md section 6). */
export function CaptionRail({ room }: { room: Room }) {
  const [lines, setLines] = useState<CaptionMessage[]>([]);

  useEffect(() => {
    const decoder = new TextDecoder();
    const onData = (payload: Uint8Array, _participant: unknown, _kind: unknown, topic?: string) => {
      if (topic !== CAPTIONS_TOPIC) return;
      try {
        const caption = captionMessageSchema.parse(JSON.parse(decoder.decode(payload)));
        setLines((current) => applyCaption(current, caption));
      } catch {
        // Ignore malformed messages; captions are best effort.
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  const nameOf = (speakerId: string) =>
    speakerId === room.localParticipant.identity
      ? "You"
      : room.remoteParticipants.get(speakerId)?.name || "Speaker";

  return (
    <div
      data-testid="caption-rail"
      style={{
        minHeight: 64,
        padding: "8px 12px",
        background: "rgba(0,0,0,0.75)",
        borderRadius: 8,
        color: "#fff",
        marginBottom: 16,
      }}
    >
      {lines.length === 0 && <span style={{ opacity: 0.5 }}>Captions appear here.</span>}
      {lines.map((line) => (
        <div
          key={line.clauseId}
          data-testid="caption"
          data-final={String(line.isFinal)}
          style={{
            opacity: line.isFinal ? 1 : 0.55,
            fontStyle: line.isFinal ? "normal" : "italic",
          }}
        >
          <strong>{nameOf(line.speakerId)}:</strong> {line.text}
        </div>
      ))}
    </div>
  );
}

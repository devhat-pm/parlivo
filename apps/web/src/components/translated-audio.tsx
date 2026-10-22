"use client";

import { parseTranslatedTrackName } from "@parlivo/realtime";
import type { Room, Track } from "livekit-client";
import { useEffect, useRef } from "react";

function AudioTrackElement({ track, name }: { track: Track; name: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [track]);
  return <audio ref={ref} autoPlay data-testid="translated-track" data-track-name={name} />;
}

/** Plays every translated track this listener is subscribed to (published by the agent). */
export function TranslatedAudio({ room }: { room: Room }) {
  const tracks = [...room.remoteParticipants.values()]
    .filter((participant) => participant.isAgent)
    .flatMap((participant) => [...participant.audioTrackPublications.values()])
    .filter((publication) => publication.isSubscribed && publication.track)
    .filter((publication) => parseTranslatedTrackName(publication.trackName) !== null);
  return (
    <>
      {tracks.map((publication) =>
        publication.track ? (
          <AudioTrackElement
            key={publication.trackSid}
            track={publication.track}
            name={publication.trackName}
          />
        ) : null,
      )}
    </>
  );
}

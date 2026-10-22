import { type Room, Track } from "livekit-client";

/**
 * Optional state reporter for spikes and manual verification. Only active when the app is
 * built with NEXT_PUBLIC_DIAGNOSTICS_URL; production builds never set it.
 */
export const DIAGNOSTICS_URL = process.env["NEXT_PUBLIC_DIAGNOSTICS_URL"];

export interface MeetingSnapshot {
  at: string;
  userAgent: string;
  roomState: string;
  identity: string;
  published: string[];
  micLevel: number;
  screenShareError: string | null;
  remotes: {
    identity: string;
    audioSubscribed: boolean;
    videoSubscribed: boolean;
    screenShareSubscribed: boolean;
  }[];
}

export function snapshot(
  room: Room,
  micLevel: number,
  screenShareError: string | null,
): MeetingSnapshot {
  const subscribed = (identity: string, source: Track.Source) => {
    const publication = room.remoteParticipants.get(identity)?.getTrackPublication(source);
    return Boolean(publication?.isSubscribed && publication.track);
  };
  return {
    at: new Date().toISOString(),
    userAgent: navigator.userAgent,
    roomState: room.state,
    identity: room.localParticipant.identity,
    published: [...room.localParticipant.trackPublications.values()].map(
      (publication) => publication.source,
    ),
    micLevel,
    screenShareError,
    remotes: [...room.remoteParticipants.values()].map((participant) => ({
      identity: participant.identity,
      audioSubscribed: subscribed(participant.identity, Track.Source.Microphone),
      videoSubscribed: subscribed(participant.identity, Track.Source.Camera),
      screenShareSubscribed: subscribed(participant.identity, Track.Source.ScreenShare),
    })),
  };
}

export function report(data: MeetingSnapshot): void {
  if (!DIAGNOSTICS_URL) return;
  void fetch(DIAGNOSTICS_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => undefined);
}

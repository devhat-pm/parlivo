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

/** Report a lifecycle step or error before a room exists (spikes only; no-op otherwise). */
export function reportEvent(event: string, detail?: unknown): void {
  if (!DIAGNOSTICS_URL) return;
  void fetch(DIAGNOSTICS_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      at: new Date().toISOString(),
      event,
      detail: detail instanceof Error ? `${detail.name}: ${detail.message}` : detail,
      userAgent: navigator.userAgent,
    }),
  }).catch(() => undefined);
}

let globalHandlersInstalled = false;

/** Forward uncaught errors, console errors and console warnings to the diagnostics receiver. */
export function installDiagnosticsHandlers(): void {
  if (!DIAGNOSTICS_URL || globalHandlersInstalled) return;
  globalHandlersInstalled = true;
  window.addEventListener("error", (event) => reportEvent("window.error", event.message));
  window.addEventListener("unhandledrejection", (event) =>
    reportEvent("unhandledrejection", String(event.reason)),
  );
  for (const level of ["error", "warn"] as const) {
    // Wrapping (not calling) console methods is the point of this diagnostics hook.
    // eslint-disable-next-line no-console
    const original = console[level].bind(console);
    // eslint-disable-next-line no-console
    console[level] = (...args: unknown[]) => {
      reportEvent(`console.${level}`, args.map(String).join(" ").slice(0, 2000));
      original(...args);
    };
  }
}

import {
  type RemoteParticipant,
  type RemoteTrackPublication,
  Room,
  RoomEvent,
  type RoomOptions,
} from "livekit-client";
import { decideSubscription, type LocalListener } from "./subscription.js";

export interface ConnectOptions {
  serverUrl: string;
  token: string;
  listener: LocalListener;
  audioDeviceId?: string | undefined;
  videoDeviceId?: string | undefined;
  /** Publish the microphone and camera after connecting (default true). */
  publish?: boolean;
}

/**
 * Connect to a meeting room with automatic subscription turned off, and subscribe to each
 * remote track according to `decideSubscription`. Returns the connected Room; the caller
 * renders it and calls `room.disconnect()` when leaving.
 */
export async function connectToMeeting(options: ConnectOptions): Promise<Room> {
  const roomOptions: RoomOptions = {
    adaptiveStream: true,
    dynacast: true,
    audioCaptureDefaults: options.audioDeviceId ? { deviceId: options.audioDeviceId } : {},
    videoCaptureDefaults: options.videoDeviceId ? { deviceId: options.videoDeviceId } : {},
  };
  const room = new Room(roomOptions);

  const apply = (publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    const decision = decideSubscription(
      { trackName: publication.trackName, publisherIdentity: participant.identity },
      options.listener,
    );
    publication.setSubscribed(decision.subscribe);
  };

  room.on(RoomEvent.TrackPublished, apply);
  room.on(RoomEvent.ParticipantConnected, (participant) => {
    participant.trackPublications.forEach((publication) => apply(publication, participant));
  });

  await room.connect(options.serverUrl, options.token, { autoSubscribe: false });
  room.remoteParticipants.forEach((participant) => {
    participant.trackPublications.forEach((publication) => apply(publication, participant));
  });

  if (options.publish !== false) {
    await room.localParticipant.setMicrophoneEnabled(true);
    await room.localParticipant.setCameraEnabled(true);
  }
  return room;
}

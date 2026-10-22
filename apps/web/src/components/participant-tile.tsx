"use client";

import { Card, Progress, Tag } from "antd";
import {
  ConnectionQuality,
  type Participant,
  type Track,
  Track as TrackNamespace,
} from "livekit-client";
import { useEffect, useRef } from "react";

const QUALITY_COLOR: Record<ConnectionQuality, string> = {
  [ConnectionQuality.Excellent]: "green",
  [ConnectionQuality.Good]: "blue",
  [ConnectionQuality.Poor]: "orange",
  [ConnectionQuality.Lost]: "red",
  [ConnectionQuality.Unknown]: "default",
};

function TrackElement({ track, kind }: { track: Track; kind: "audio" | "video" }) {
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [track]);
  if (kind === "audio") return <audio ref={ref} autoPlay />;
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      style={{ width: "100%", aspectRatio: "16 / 9", background: "#000", borderRadius: 6 }}
    />
  );
}

/** One participant: video, audio (remote only), name, languages and connection quality. */
export function ParticipantTile({
  participant,
  isLocal,
  languages,
  micLevel,
}: {
  participant: Participant;
  isLocal: boolean;
  languages: string;
  /** Local microphone level from the AudioWorklet meter, 0..1. */
  micLevel?: number;
}) {
  const camera = participant.getTrackPublication(TrackNamespace.Source.Camera);
  const screen = participant.getTrackPublication(TrackNamespace.Source.ScreenShare);
  const screenTrack = screen?.track;
  const microphone = participant.getTrackPublication(TrackNamespace.Source.Microphone);
  const videoTrack = camera?.track;
  const audioTrack = microphone?.track;
  const videoSubscribed = Boolean(videoTrack) && (isLocal || camera?.isSubscribed === true);
  const audioSubscribed = Boolean(audioTrack) && (isLocal || microphone?.isSubscribed === true);

  return (
    <Card
      size="small"
      data-testid={isLocal ? "local-participant" : "remote-participant"}
      data-identity={participant.identity}
      data-video-subscribed={String(videoSubscribed)}
      data-audio-subscribed={String(audioSubscribed)}
      title={`${participant.name || participant.identity}${isLocal ? " (you)" : ""}`}
      extra={
        <Tag color={QUALITY_COLOR[participant.connectionQuality]} data-testid="connection-quality">
          {participant.connectionQuality}
        </Tag>
      }
    >
      {videoTrack ? (
        <TrackElement track={videoTrack} kind="video" />
      ) : (
        <div style={{ aspectRatio: "16 / 9", background: "#222", borderRadius: 6 }} />
      )}
      {screenTrack && (
        <div data-testid="screen-share" style={{ marginTop: 8 }}>
          <TrackElement track={screenTrack} kind="video" />
        </div>
      )}
      {!isLocal && audioTrack && <TrackElement track={audioTrack} kind="audio" />}
      {micLevel !== undefined && (
        <Progress
          data-testid="local-mic-level"
          percent={Math.round(Math.min(1, micLevel * 4) * 100)}
          showInfo={false}
          size="small"
        />
      )}
      <div style={{ marginTop: 8 }}>
        <Tag>{languages}</Tag>
        <Tag color={audioSubscribed ? "green" : "default"}>
          audio {audioSubscribed ? "on" : "off"}
        </Tag>
        <Tag color={videoSubscribed ? "green" : "default"}>
          video {videoSubscribed ? "on" : "off"}
        </Tag>
      </div>
    </Card>
  );
}

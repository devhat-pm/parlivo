"use client";

import { createLevelMeter } from "@parlivo/audio";
import { connectToMeeting } from "@parlivo/realtime";
import { participantMetadataSchema } from "@parlivo/schemas";
import { Alert, Button, Col, Layout, Row, Space, Spin, Tag } from "antd";
import { type Participant, type Room, RoomEvent, Track } from "livekit-client";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState } from "react";
import { joinMeeting } from "@/lib/api";
import { installDiagnosticsHandlers, report, reportEvent, snapshot } from "@/lib/diagnostics";
import { useLobby } from "@/stores/lobby";
import { ensureDevSession } from "@/stores/session";
import { lobbyHref } from "@/lib/routes";
import { ParticipantTile } from "./participant-tile";

const RERENDER_EVENTS = [
  RoomEvent.ParticipantConnected,
  RoomEvent.ParticipantDisconnected,
  RoomEvent.TrackPublished,
  RoomEvent.TrackUnpublished,
  RoomEvent.TrackSubscribed,
  RoomEvent.TrackUnsubscribed,
  RoomEvent.LocalTrackPublished,
  RoomEvent.LocalTrackUnpublished,
  RoomEvent.ConnectionQualityChanged,
  RoomEvent.ConnectionStateChanged,
  RoomEvent.AudioPlaybackStatusChanged,
] as const;

function languagesOf(participant: Participant): string {
  try {
    const metadata = participantMetadataSchema.parse(JSON.parse(participant.metadata ?? ""));
    return `speaks ${metadata.speakingLanguage}, hears ${metadata.listeningLanguage}`;
  } catch {
    return "languages unknown";
  }
}

export function MeetingRoom({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const lobby = useLobby();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumping the attempt number re-runs the join effect (the Retry button).
  const [attempt, setAttempt] = useState(0);
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const [micLevel, setMicLevel] = useState(0);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  const lobbyConfirmed = lobby.confirmedForMeetingId === meetingId;

  useEffect(() => {
    if (!lobbyConfirmed) router.replace(lobbyHref(meetingId));
  }, [lobbyConfirmed, meetingId, router]);

  useEffect(() => {
    if (!lobbyConfirmed) return;
    let active = true;
    let connected: Room | null = null;

    async function join() {
      if (process.env.NEXT_PUBLIC_DIAGNOSTICS_URL) installDiagnosticsHandlers();
      try {
        if (process.env.NEXT_PUBLIC_DIAGNOSTICS_URL) reportEvent("join:start", { meetingId });
        const accessToken = await ensureDevSession();
        const ticket = await joinMeeting(accessToken, meetingId, {
          speakingLanguage: lobby.speakingLanguage,
          listeningLanguage: lobby.listeningLanguage,
        });
        if (process.env.NEXT_PUBLIC_DIAGNOSTICS_URL)
          reportEvent("join:ticket", { serverUrl: ticket.serverUrl, identity: ticket.identity });
        connected = await connectToMeeting({
          serverUrl: ticket.serverUrl,
          token: ticket.token,
          listener: { identity: ticket.identity, listeningLanguage: lobby.listeningLanguage },
          audioDeviceId: lobby.audioDeviceId,
          videoDeviceId: lobby.videoDeviceId,
        });
        if (process.env.NEXT_PUBLIC_DIAGNOSTICS_URL)
          reportEvent("join:connected", { state: connected.state });
        if (!active) {
          await connected.disconnect();
          return;
        }
        for (const event of RERENDER_EVENTS) connected.on(event, rerender);
        setRoom(connected);
      } catch (cause) {
        if (process.env.NEXT_PUBLIC_DIAGNOSTICS_URL) reportEvent("join:error", cause);
        if (active) setError(String(cause));
      }
    }

    void join();
    return () => {
      active = false;
      void connected?.disconnect();
    };
    // The lobby choice is fixed once confirmed for this meeting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyConfirmed, meetingId, attempt]);

  // Local microphone level, metered on the audio thread by an AudioWorklet (packages/audio).
  const micTrack = room?.localParticipant.getTrackPublication(Track.Source.Microphone)?.track;
  useEffect(() => {
    if (!micTrack) return;
    const context = new AudioContext();
    let meter: { stop: () => void } | null = null;
    let stopped = false;
    void createLevelMeter(context, micTrack.mediaStreamTrack, setMicLevel)
      .then((created) => {
        if (stopped) created.stop();
        else meter = created;
      })
      .catch((cause: unknown) => console.error("AudioWorklet level meter failed", cause));
    return () => {
      stopped = true;
      meter?.stop();
      void context.close();
    };
  }, [micTrack]);

  // Latest values for the diagnostics timer, which must not restart on every meter update.
  const latest = useRef({ micLevel, screenShareError });
  useEffect(() => {
    latest.current = { micLevel, screenShareError };
  }, [micLevel, screenShareError]);
  useEffect(() => {
    if (!room || !process.env.NEXT_PUBLIC_DIAGNOSTICS_URL) return;
    const timer = setInterval(() => {
      report(snapshot(room, latest.current.micLevel, latest.current.screenShareError));
    }, 2000);
    return () => clearInterval(timer);
  }, [room]);

  async function toggleScreenShare() {
    if (!room) return;
    try {
      await room.localParticipant.setScreenShareEnabled(
        !room.localParticipant.isScreenShareEnabled,
      );
      setScreenShareError(null);
    } catch (cause) {
      setScreenShareError(String(cause));
    }
    rerender();
  }

  async function leave() {
    await room?.disconnect();
    router.push("/");
  }

  function retry() {
    setError(null);
    setRoom(null);
    setAttempt((count) => count + 1);
  }

  if (error) {
    return (
      <div style={{ maxWidth: 640, margin: "48px auto", padding: "0 16px" }}>
        <Alert
          type="error"
          data-testid="join-error"
          title="Could not join the meeting"
          description={error}
          action={
            <Button type="primary" onClick={retry}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }
  if (!room) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  const remotes = [...room.remoteParticipants.values()];
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Header style={{ display: "flex", alignItems: "center", gap: 12, color: "#fff" }}>
        <span>Meeting {meetingId}</span>
        <Tag data-testid="room-state">{room.state}</Tag>
        <Tag data-testid="participant-count">{remotes.length + 1} in call</Tag>
        <Space style={{ marginLeft: "auto" }}>
          {!room.canPlaybackAudio && (
            <Button onClick={() => void room.startAudio()}>Enable audio</Button>
          )}
          <Button onClick={() => void toggleScreenShare()}>
            {room.localParticipant.isScreenShareEnabled ? "Stop sharing" : "Share screen"}
          </Button>
          <Button danger onClick={() => void leave()}>
            Leave
          </Button>
        </Space>
      </Layout.Header>
      <Layout.Content style={{ padding: 16 }}>
        {screenShareError && (
          <Alert
            type="warning"
            title="Screen sharing failed"
            description={screenShareError}
            style={{ marginBottom: 16 }}
          />
        )}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} lg={8}>
            <ParticipantTile
              participant={room.localParticipant}
              isLocal
              languages={languagesOf(room.localParticipant)}
              micLevel={micLevel}
            />
          </Col>
          {remotes.map((participant) => (
            <Col xs={24} md={12} lg={8} key={participant.identity}>
              <ParticipantTile
                participant={participant}
                isLocal={false}
                languages={languagesOf(participant)}
              />
            </Col>
          ))}
        </Row>
      </Layout.Content>
    </Layout>
  );
}

"use client";

import { LANGUAGES, type LanguageCode } from "@parlivo/schemas";
import { Alert, Button, Card, Form, Select, Space } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { installDiagnosticsHandlers, reportEvent } from "@/lib/diagnostics";
import { useLobby } from "@/stores/lobby";
import { meetingHref } from "@/lib/routes";

const languageOptions = LANGUAGES.map((language) => ({
  value: language.code,
  label: `${language.name} (${language.code})`,
}));

interface Devices {
  audio: MediaDeviceInfo[];
  video: MediaDeviceInfo[];
}

/** Pick microphone, camera, speaking and listening language; preview the camera and mic level. */
export function Lobby({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const saved = useLobby();
  const [devices, setDevices] = useState<Devices>({ audio: [], video: [] });
  const [audioDeviceId, setAudioDeviceId] = useState(saved.audioDeviceId);
  const [videoDeviceId, setVideoDeviceId] = useState(saved.videoDeviceId);
  const [speakingLanguage, setSpeakingLanguage] = useState<LanguageCode>(saved.speakingLanguage);
  const [listeningLanguage, setListeningLanguage] = useState<LanguageCode>(saved.listeningLanguage);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Preview the chosen devices. getUserMedia also unlocks device labels for enumeration.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let frame = 0;
    let cancelled = false;

    async function preview() {
      if (process.env.NEXT_PUBLIC_DIAGNOSTICS_URL) installDiagnosticsHandlers();
      try {
        if (process.env.NEXT_PUBLIC_DIAGNOSTICS_URL) reportEvent("lobby:getUserMedia:start");
        stream = await navigator.mediaDevices.getUserMedia({
          // "ideal", not "exact": a stored device ID can go stale (unplugged device, new
          // permission grant), and WKWebView then throws OverconstrainedError instead of
          // falling back to another device.
          audio: audioDeviceId ? { deviceId: { ideal: audioDeviceId } } : true,
          video: videoDeviceId ? { deviceId: { ideal: videoDeviceId } } : true,
        });
        if (cancelled) return;
        if (videoRef.current) videoRef.current.srcObject = stream;
        const all = await navigator.mediaDevices.enumerateDevices();
        setDevices({
          audio: all.filter((device) => device.kind === "audioinput"),
          video: all.filter((device) => device.kind === "videoinput"),
        });
        audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        audioContext.createMediaStreamSource(stream).connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(samples);
          let peak = 0;
          for (const sample of samples) peak = Math.max(peak, Math.abs(sample - 128));
          setLevel(peak / 128);
          frame = requestAnimationFrame(tick);
        };
        tick();
        setError(null);
        if (process.env.NEXT_PUBLIC_DIAGNOSTICS_URL)
          reportEvent("lobby:getUserMedia:ok", {
            tracks: stream.getTracks().map((track) => `${track.kind}:${track.label}`),
          });
      } catch (cause) {
        if (process.env.NEXT_PUBLIC_DIAGNOSTICS_URL) reportEvent("lobby:getUserMedia:error", cause);
        setError(`Camera or microphone unavailable: ${String(cause)}`);
      }
    }

    void preview();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      void audioContext?.close();
    };
  }, [audioDeviceId, videoDeviceId]);

  function join() {
    saved.confirm(meetingId, { audioDeviceId, videoDeviceId, speakingLanguage, listeningLanguage });
    router.push(meetingHref(meetingId));
  }

  return (
    <main style={{ maxWidth: 720, margin: "32px auto", padding: "0 16px" }}>
      <Card title="Lobby">
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          {error && <Alert type="error" title={error} />}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ width: "100%", maxHeight: 360, background: "#000", borderRadius: 8 }}
          />
          <div aria-label="Microphone level" data-testid="mic-level">
            <div
              style={{
                height: 8,
                width: `${Math.round(level * 100)}%`,
                background: "#1677ff",
                transition: "width 80ms linear",
              }}
            />
          </div>
          <Form layout="vertical">
            <Form.Item label="Microphone">
              <Select
                value={audioDeviceId}
                placeholder="Default microphone"
                onChange={setAudioDeviceId}
                options={devices.audio.map((device) => ({
                  value: device.deviceId,
                  label: device.label || device.deviceId,
                }))}
              />
            </Form.Item>
            <Form.Item label="Camera">
              <Select
                value={videoDeviceId}
                placeholder="Default camera"
                onChange={setVideoDeviceId}
                options={devices.video.map((device) => ({
                  value: device.deviceId,
                  label: device.label || device.deviceId,
                }))}
              />
            </Form.Item>
            <Form.Item label="I speak">
              <Select
                data-testid="speaking-language"
                value={speakingLanguage}
                onChange={setSpeakingLanguage}
                options={languageOptions}
              />
            </Form.Item>
            <Form.Item label="I want to hear">
              <Select
                data-testid="listening-language"
                value={listeningLanguage}
                onChange={setListeningLanguage}
                options={languageOptions}
              />
            </Form.Item>
          </Form>
          <Button type="primary" size="large" block onClick={join}>
            Join meeting
          </Button>
        </Space>
      </Card>
    </main>
  );
}

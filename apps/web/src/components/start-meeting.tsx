"use client";

import { App, Button, Input, Space } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMeeting } from "@/lib/api";
import { ensureDevSession } from "@/stores/session";

/** Development entry point: create a meeting as the seeded user, or join one by ID. */
export function StartMeeting() {
  const router = useRouter();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [meetingId, setMeetingId] = useState("");

  async function start() {
    setBusy(true);
    try {
      const meeting = await createMeeting(await ensureDevSession());
      router.push(`/m/${meeting.id}/lobby`);
    } catch (error) {
      void message.error(`Could not create a meeting: ${String(error)}`);
      setBusy(false);
    }
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <Button type="primary" size="large" loading={busy} onClick={() => void start()}>
        Start a dev meeting
      </Button>
      <Space.Compact style={{ width: "100%" }}>
        <Input
          placeholder="Meeting ID"
          value={meetingId}
          onChange={(event) => setMeetingId(event.target.value.trim())}
        />
        <Button disabled={!meetingId} onClick={() => router.push(`/m/${meetingId}/lobby`)}>
          Join
        </Button>
      </Space.Compact>
    </Space>
  );
}

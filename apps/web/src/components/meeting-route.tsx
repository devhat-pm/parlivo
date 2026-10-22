"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

// Client-only: the meeting room needs WebRTC, media devices and session storage.
const MeetingRoom = dynamic(
  () => import("@/components/meeting-room").then((module) => module.MeetingRoom),
  { ssr: false },
);

/** /m/[meetingId] on the web. */
export function MeetingRoute() {
  const { meetingId } = useParams<{ meetingId: string }>();
  return <MeetingRoom meetingId={meetingId} />;
}

"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const MeetingRoom = dynamic(
  () => import("@/components/meeting-room").then((module) => module.MeetingRoom),
  { ssr: false },
);

function MeetingFromQuery() {
  const meetingId = useSearchParams().get("id");
  if (!meetingId) return <p style={{ padding: 24 }}>Missing meeting ID.</p>;
  return <MeetingRoom meetingId={meetingId} />;
}

/** Query-parameter meeting route (/m?id=...) used by the desktop static export. */
export default function MeetingQueryPage() {
  return (
    <Suspense>
      <MeetingFromQuery />
    </Suspense>
  );
}

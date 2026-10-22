"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Lobby } from "@/components/lobby";

function LobbyFromQuery() {
  const meetingId = useSearchParams().get("id");
  if (!meetingId) return <p style={{ padding: 24 }}>Missing meeting ID.</p>;
  return <Lobby meetingId={meetingId} />;
}

/** Query-parameter lobby route (/m/lobby?id=...) used by the desktop static export. */
export default function LobbyQueryPage() {
  return (
    <Suspense>
      <LobbyFromQuery />
    </Suspense>
  );
}

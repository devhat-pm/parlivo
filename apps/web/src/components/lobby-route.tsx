"use client";

import { useParams } from "next/navigation";
import { Lobby } from "@/components/lobby";

/** /m/[meetingId]/lobby on the web. */
export function LobbyRoute() {
  const { meetingId } = useParams<{ meetingId: string }>();
  return <Lobby meetingId={meetingId} />;
}

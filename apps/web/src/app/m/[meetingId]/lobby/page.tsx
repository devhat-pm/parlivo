"use client";

import { useParams } from "next/navigation";
import { Lobby } from "@/components/lobby";

export default function LobbyPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  return <Lobby meetingId={meetingId} />;
}

import { LobbyRoute } from "@/components/lobby-route";

// See src/app/m/[meetingId]/page.tsx: the static export needs one pre-rendered ID.
export function generateStaticParams() {
  return [{ meetingId: "_" }];
}

export default function LobbyPage() {
  return <LobbyRoute />;
}

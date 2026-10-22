import { MeetingRoute } from "@/components/meeting-route";

// A static export must pre-render at least one ID. The desktop app never links here; it uses
// the query route /m?id=... (src/app/m/page.tsx). On the web, any ID still renders.
export function generateStaticParams() {
  return [{ meetingId: "_" }];
}

export default function MeetingPage() {
  return <MeetingRoute />;
}

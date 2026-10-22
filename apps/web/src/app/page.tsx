import { StartMeeting } from "@/components/start-meeting";
import { SITE_NAME, TAGLINE } from "@/lib/site";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 640, margin: "48px auto", padding: "0 16px" }}>
      <h1>{SITE_NAME}</h1>
      <p>{TAGLINE}</p>
      <StartMeeting />
    </main>
  );
}

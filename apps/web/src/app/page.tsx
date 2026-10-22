import { PACKAGE_NAME } from "@parlivo/ui";
import { SITE_NAME, TAGLINE } from "@/lib/site";

export default function HomePage() {
  return (
    <main>
      <h1>{SITE_NAME}</h1>
      <p>{TAGLINE}</p>
      <p>Placeholder page (design system: {PACKAGE_NAME}).</p>
    </main>
  );
}

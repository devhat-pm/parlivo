// Proves a normal build contains no diagnostics code: none of the reporter's event names or
// hooks may appear in the client bundles. Run after `next build` without
// NEXT_PUBLIC_DIAGNOSTICS_URL. Usage: pnpm --filter @parlivo/web test:no-diagnostics
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const STATIC = fileURLToPath(new URL("../.next/static/", import.meta.url));
// Strings that only the diagnostics reporter uses (generic names like "unhandledrejection" also
// appear in Next.js and core-js, so they are not markers).
const MARKERS = ["join:ticket", "lobby:getUserMedia", "window.error", "screenShareSubscribed"];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (path.endsWith(".js")) yield path;
  }
}

const hits = [];
for (const file of files(STATIC)) {
  const text = readFileSync(file, "utf8");
  for (const marker of MARKERS) if (text.includes(marker)) hits.push(`${marker} in ${file}`);
}
if (hits.length > 0) {
  process.stderr.write(`diagnostics code found in a normal build:\n  ${hits.join("\n  ")}\n`);
  process.exit(1);
}
process.stdout.write(`no diagnostics code in .next/static (checked ${MARKERS.length} markers)\n`);

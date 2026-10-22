// Verifies the desktop static export (out/) contains the query-parameter meeting routes.
// Usage: pnpm --filter @parlivo/web build:desktop && pnpm --filter @parlivo/web test:export
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../out/", import.meta.url));
const required = ["index.html", "m.html", "m/lobby.html"];
const failures = [];
for (const file of required) {
  const path = join(OUT, file);
  if (!existsSync(path)) failures.push(`missing ${file}`);
  else if (!readFileSync(path, "utf8").includes("<html")) failures.push(`${file} is not HTML`);
}
if (failures.length > 0) {
  process.stderr.write(`static export check failed:\n  ${failures.join("\n  ")}\n`);
  process.exit(1);
}
process.stdout.write(`static export OK: ${required.join(", ")}\n`);

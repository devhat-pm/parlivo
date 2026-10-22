// Render docs/assets/*.mmd to SVG with Mermaid in Playwright's Chromium (no Puppeteer).
// Usage: pnpm docs:diagrams
import { readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const require = createRequire(import.meta.url);
const ASSETS = fileURLToPath(new URL("../docs/assets/", import.meta.url));
const mermaidScript = require.resolve("mermaid/dist/mermaid.min.js");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<!doctype html><html><body></body></html>");
await page.addScriptTag({ path: mermaidScript });
await page.evaluate(() => {
  // @ts-expect-error mermaid is a browser global injected above
  window.mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "strict",
    // Native SVG text, not HTML in foreignObject: the files must be valid standalone SVG.
    htmlLabels: false,
    flowchart: { htmlLabels: false, wrappingWidth: 360 },
  });
});

const files = (await readdir(ASSETS)).filter((file) => file.endsWith(".mmd")).sort();
for (const file of files) {
  const source = await readFile(join(ASSETS, file), "utf8");
  const svg = await page.evaluate(async (text) => {
    // @ts-expect-error mermaid is a browser global injected above
    const { svg: rendered } = await window.mermaid.render("diagram", text);
    return rendered;
  }, source);
  const out = join(ASSETS, file.replace(/\.mmd$/, ".svg"));
  await writeFile(out, `${svg}\n`);
  process.stdout.write(`rendered ${file} -> ${out}\n`);
}
await browser.close();

// Headless participant for manual checks and spikes (e.g. the Tauri WebView spike):
// joins a meeting through the web app with Chromium's fake camera and microphone, stays
// for a while, and prints what it receives from the other participants every 5 seconds.
//
//   node tests/e2e/scripts/join-bot.mjs <meetingId> [seconds=120] [webUrl=http://localhost:3100]
import { chromium } from "@playwright/test";

const [meetingId, seconds = "120", webUrl = "http://localhost:3100"] = process.argv.slice(2);
if (!meetingId) {
  console.error("usage: join-bot.mjs <meetingId> [seconds] [webUrl]");
  process.exit(2);
}

const browser = await chromium.launch({
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
const context = await browser.newContext({ permissions: ["camera", "microphone"] });
const page = await context.newPage();
await page.goto(`${webUrl}/m/${meetingId}/lobby`);
await page.getByRole("button", { name: "Join meeting" }).click();
await page.getByTestId("room-state").waitFor();

const deadline = Date.now() + Number(seconds) * 1000;
while (Date.now() < deadline) {
  const remotes = await page.getByTestId("remote-participant").evaluateAll((tiles) =>
    tiles.map((tile) => ({
      identity: tile.getAttribute("data-identity"),
      audio: tile.getAttribute("data-audio-subscribed"),
      video: tile.getAttribute("data-video-subscribed"),
      screenShare: tile.querySelector('[data-testid="screen-share"]') !== null,
    })),
  );
  process.stdout.write(`${new Date().toISOString()} ${JSON.stringify(remotes)}\n`);
  await page.waitForTimeout(5000);
}
await browser.close();

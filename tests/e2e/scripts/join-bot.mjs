// Headless participant for manual checks and spikes (e.g. the Tauri WebView spike):
// joins a meeting through the web app with Chromium's fake camera and microphone, stays
// for a while, and prints what it receives from the other participants every 5 seconds.
//
//   node tests/e2e/scripts/join-bot.mjs <meetingId> [seconds=120] [webUrl=http://localhost:3100]
// Set FAKE_AUDIO=/path/to.wav to make the bot "speak" that file (looped) instead of a beep.
import { chromium } from "@playwright/test";

const [meetingId, seconds = "120", webUrl = "http://localhost:3100"] = process.argv.slice(2);
if (!meetingId) {
  console.error("usage: join-bot.mjs <meetingId> [seconds] [webUrl]");
  process.exit(2);
}

const args = ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"];
if (process.env["FAKE_AUDIO"])
  args.push(`--use-file-for-fake-audio-capture=${process.env["FAKE_AUDIO"]}`);
const browser = await chromium.launch({ args });
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
  const translation = await page.getByTestId("translation-status").getAttribute("data-status");
  const translated = await page
    .getByTestId("translated-track")
    .evaluateAll((tracks) => tracks.map((track) => track.getAttribute("data-track-name")));
  const captions = await page.getByTestId("caption").allInnerTexts();
  const state = { remotes, translation, translated, captions: captions.slice(-2) };
  process.stdout.write(`${new Date().toISOString()} ${JSON.stringify(state)}\n`);
  await page.waitForTimeout(5000);
}
await browser.close();

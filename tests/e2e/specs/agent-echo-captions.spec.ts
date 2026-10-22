import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { type Browser, chromium, expect, type Page, test } from "@playwright/test";

/**
 * Phase 1 gate (prompt 3, E1): one browser speaks a fixture clip, the other receives that
 * speaker's echo track and captions with the expected words. Then the agent worker is killed
 * and the echo must come back on a new track within 10 s. STT runs in STT_MODE (cpu in CI,
 * mac on Apple Silicon); see playwright.config.ts.
 */

const fixture = (name: string) =>
  fileURLToPath(new URL(`../../fixtures/speech/${name}`, import.meta.url));

async function launch(audioFile: string): Promise<Browser> {
  return chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-audio-capture=${audioFile}`,
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
}

async function openPage(browser: Browser, baseURL: string): Promise<Page> {
  const context = await browser.newContext({ baseURL, permissions: ["camera", "microphone"] });
  return context.newPage();
}

async function join(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Join meeting" }).click();
  await expect(page.getByTestId("room-state")).toHaveText("connected");
  return (await page.getByTestId("local-participant").getAttribute("data-identity")) ?? "";
}

test("listener gets the speaker's echo and captions, and the echo survives an agent crash", async ({
  baseURL,
}) => {
  test.setTimeout(180_000);
  const speakerBrowser = await launch(fixture("en-with-pause.wav"));
  const listenerBrowser = await launch(fixture("silence.wav"));
  try {
    const speaker = await openPage(speakerBrowser, baseURL ?? "");
    const listener = await openPage(listenerBrowser, baseURL ?? "");

    await speaker.goto("/");
    await speaker.getByRole("button", { name: "Start a dev meeting" }).click();
    await speaker.waitForURL(/\/lobby/);
    const meetingId = new URL(speaker.url()).pathname.split("/")[2];
    const speakerId = await join(speaker);
    await listener.goto(`/m/${meetingId}/lobby`);
    const listenerId = await join(listener);

    // Echo of the speaker, and never the listener's own echo.
    const echo = listener.locator(
      `[data-testid="translated-track"][data-track-name="translated-${speakerId}-echo"]`,
    );
    await expect(echo).toHaveCount(1, { timeout: 60_000 });
    await expect(speaker.locator(`[data-track-name="translated-${speakerId}-echo"]`)).toHaveCount(
      0,
    );
    expect(listenerId).not.toBe(speakerId);

    // Final captions with the fixture's words (tiny and large-v3-turbo both get these).
    const finals = listener.locator('[data-testid="caption"][data-final="true"]');
    await expect(finals.filter({ hasText: /weather/i })).not.toHaveCount(0, { timeout: 60_000 });
    await expect(finals.filter({ hasText: /Berlin/ })).not.toHaveCount(0);

    // Record every translation-status change on the listener's page.
    await listener.evaluate(() => {
      const statusLog: string[] = [];
      (window as unknown as { statusLog: string[] }).statusLog = statusLog;
      const tag = document.querySelector('[data-testid="translation-status"]');
      if (!tag) return;
      new MutationObserver(() => statusLog.push(tag.getAttribute("data-status") ?? "")).observe(
        tag,
        { attributes: true, attributeFilter: ["data-status"] },
      );
    });

    // Kill the agent worker (scripts/run-agent.sh restarts it); time until a new echo track.
    const sidBefore = await echo.getAttribute("data-track-sid");
    const killedAt = Date.now();
    execSync('pkill -9 -f "bin/parlivo-agent start"');
    await expect(
      listener.locator(
        `[data-testid="translated-track"][data-track-name="translated-${speakerId}-echo"]:not([data-track-sid="${sidBefore}"])`,
      ),
    ).toHaveCount(1, { timeout: 10_000 });
    const recoveryMs = Date.now() - killedAt;
    test.info().annotations.push({ type: "echo recovery ms", description: String(recoveryMs) });
    expect(recoveryMs).toBeLessThan(10_000);

    const statuses = await listener.evaluate(
      () => (window as unknown as { statusLog: string[] }).statusLog,
    );
    expect(statuses).toContain("reconnecting");
    await expect(listener.getByTestId("translation-status")).toHaveAttribute(
      "data-status",
      "active",
    );
    // Original audio never stopped.
    await expect(listener.getByTestId("remote-participant")).toHaveAttribute(
      "data-audio-subscribed",
      "true",
    );
  } finally {
    await speakerBrowser.close();
    await listenerBrowser.close();
  }
});

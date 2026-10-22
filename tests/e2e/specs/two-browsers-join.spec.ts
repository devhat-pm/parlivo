import { type Browser, expect, type Page, test } from "@playwright/test";

/**
 * Phase 0 gate (ARCHITECTURE.md section 11): two browsers join one meeting through our API
 * and each receives the other's audio and video. Chromium's fake devices supply the media.
 */

async function newPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  return context.newPage();
}

async function joinFromLobby(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: "Join meeting" })).toBeEnabled();
  await page.getByRole("button", { name: "Join meeting" }).click();
  await expect(page.getByTestId("room-state")).toHaveText("connected");
}

async function expectSeesOther(page: Page): Promise<string> {
  const remote = page.getByTestId("remote-participant");
  await expect(remote).toHaveCount(1);
  await expect(remote).toHaveAttribute("data-video-subscribed", "true");
  await expect(remote).toHaveAttribute("data-audio-subscribed", "true");
  return (await remote.getAttribute("data-identity")) ?? "";
}

test("two browsers join the same meeting and receive each other's audio and video", async ({
  browser,
}) => {
  const alice = await newPage(browser);
  const bob = await newPage(browser);

  await alice.goto("/");
  await alice.getByRole("button", { name: "Start a dev meeting" }).click();
  await alice.waitForURL(/\/m\/[0-9a-f-]{36}\/lobby$/);
  const meetingId = new URL(alice.url()).pathname.split("/")[2];
  await joinFromLobby(alice);

  await bob.goto(`/m/${meetingId}/lobby`);
  await joinFromLobby(bob);

  const aliceSees = await expectSeesOther(alice);
  const bobSees = await expectSeesOther(bob);

  const aliceIdentity = await alice.getByTestId("local-participant").getAttribute("data-identity");
  const bobIdentity = await bob.getByTestId("local-participant").getAttribute("data-identity");
  expect(aliceSees).toBe(bobIdentity);
  expect(bobSees).toBe(aliceIdentity);
  expect(aliceIdentity).not.toBe(bobIdentity);
});

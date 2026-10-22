import { expect, test } from "@playwright/test";

// A2: if LiveKit never answers, the meeting page gives up after 10 s, shows an error with a
// Retry button, and Retry joins once the server is reachable again.
test("shows a connect timeout with a working Retry button", async ({ page }) => {
  test.setTimeout(90_000);
  // Swallow the LiveKit signalling WebSocket so room.connect never completes, until unblocked.
  let blocked = true;
  await page.routeWebSocket(/:7880\//, (socket) => {
    if (!blocked) socket.connectToServer();
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Start a dev meeting" }).click();
  await page.waitForURL(/\/lobby/);
  await page.getByRole("button", { name: "Join meeting" }).click();

  // Either our 10 s cap or livekit-client's own (shorter) signalling timeout fires first;
  // the page must show the error within the cap plus a small margin.
  const error = page.getByTestId("join-error");
  await expect(error).toBeVisible({ timeout: 12_000 });
  await expect(error).toContainText(/within 10 s|signal connection/);

  blocked = false;
  await error.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByTestId("room-state")).toHaveText("connected");
});

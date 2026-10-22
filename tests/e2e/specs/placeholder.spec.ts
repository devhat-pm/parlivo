import { expect, test } from "@playwright/test";

// Placeholder: proves the runner works without a browser. The first real spec
// (two browsers join a room) arrives with the LiveKit room-join prompt.
test("toolchain runs", () => {
  expect(1 + 1).toBe(2);
});

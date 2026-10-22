import { describe, expect, it } from "vitest";
import { generateRoomId, ROOM_ID_LENGTH } from "./room-id.js";

describe("generateRoomId", () => {
  it("returns 12 lowercase alphanumeric characters", () => {
    expect(ROOM_ID_LENGTH).toBe(12);
    expect(generateRoomId()).toMatch(/^[a-z0-9]{12}$/);
  });

  it("does not repeat across many draws", () => {
    const ids = new Set(Array.from({ length: 1000 }, generateRoomId));
    expect(ids.size).toBe(1000);
  });
});

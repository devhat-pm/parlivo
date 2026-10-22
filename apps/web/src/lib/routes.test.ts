import { describe, expect, it } from "vitest";
import { lobbyHref, meetingHref } from "./routes";

const ID = "7e77a56e-b500-4fcb-9e30-cd418f32424e";

describe("meeting routes", () => {
  it("uses path routes on the web", () => {
    expect(meetingHref(ID, false)).toBe(`/m/${ID}`);
    expect(lobbyHref(ID, false)).toBe(`/m/${ID}/lobby`);
  });

  it("uses query routes in the static export", () => {
    expect(meetingHref(ID, true)).toBe(`/m?id=${ID}`);
    expect(lobbyHref(ID, true)).toBe(`/m/lobby?id=${ID}`);
  });

  it("encodes the ID", () => {
    expect(meetingHref("a b", true)).toBe("/m?id=a%20b");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const roomMock = vi.hoisted(() => ({
  connect: vi.fn<() => Promise<void>>(),
  disconnect: vi.fn(async () => undefined),
}));

vi.mock("livekit-client", () => ({
  Room: class {
    on = vi.fn();
    remoteParticipants = new Map();
    localParticipant = {
      setMicrophoneEnabled: vi.fn(async () => undefined),
      setCameraEnabled: vi.fn(async () => undefined),
    };
    connect = roomMock.connect;
    disconnect = roomMock.disconnect;
  },
  RoomEvent: { TrackPublished: "trackPublished", ParticipantConnected: "participantConnected" },
}));

const { connectToMeeting, DEFAULT_CONNECT_TIMEOUT_MS } = await import("./meeting-connection.js");
const { ConnectTimeoutError } = await import("./timeout.js");

const options = {
  serverUrl: "ws://localhost:7880",
  token: "token",
  listener: { identity: "me", listeningLanguage: "en" },
};

describe("connectToMeeting timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    roomMock.connect.mockReset();
    roomMock.disconnect.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("defaults to 10 seconds", () => {
    expect(DEFAULT_CONNECT_TIMEOUT_MS).toBe(10_000);
  });

  it("rejects with ConnectTimeoutError and disconnects when the server never answers", async () => {
    roomMock.connect.mockReturnValue(new Promise(() => undefined));
    const attempt = connectToMeeting(options);
    const assertion = expect(attempt).rejects.toBeInstanceOf(ConnectTimeoutError);
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
    expect(roomMock.disconnect).toHaveBeenCalledOnce();
  });

  it("resolves when the server answers in time", async () => {
    roomMock.connect.mockResolvedValue(undefined);
    await expect(connectToMeeting(options)).resolves.toBeDefined();
    expect(roomMock.disconnect).not.toHaveBeenCalled();
  });

  it("passes through connection errors without waiting for the timeout", async () => {
    roomMock.connect.mockRejectedValue(new Error("could not establish signal connection"));
    await expect(connectToMeeting(options)).rejects.toThrow("could not establish signal");
  });
});

import type { INestApplication } from "@nestjs/common";
import { devLoginResponseSchema, joinMeetingResponseSchema, meetingSchema } from "@parlivo/schemas";
import { decodeJwt } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.factory.js";
import { loadConfig } from "../config.js";
import { PrismaService } from "../prisma/prisma.service.js";

// Requires: pnpm dev:infra, then db:migrate and db:seed (see apps/api/README.md).
let app: INestApplication;
let baseUrl: string;
let prisma: PrismaService;
let accessToken: string;

async function api(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.auth !== false) headers["authorization"] = `Bearer ${accessToken}`;
  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? "POST",
    headers,
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
  return { status: response.status, body: (await response.json()) as unknown };
}

beforeAll(async () => {
  app = await createApp(loadConfig({ ...process.env, NODE_ENV: "test" }));
  await app.listen(0);
  baseUrl = await app.getUrl();
  prisma = app.get(PrismaService);
  const login = await api("/auth/dev-login", { body: {}, auth: false });
  expect(login.status).toBe(200);
  accessToken = devLoginResponseSchema.parse(login.body).accessToken;
});

afterAll(async () => {
  await app.close();
});

describe("POST /auth/dev-login", () => {
  it("rejects an unknown email", async () => {
    const response = await api("/auth/dev-login", {
      body: { email: "nobody@parlivo.local" },
      auth: false,
    });
    expect(response.status).toBe(401);
  });

  it("validates the body", async () => {
    const response = await api("/auth/dev-login", { body: { email: "not-an-email" }, auth: false });
    expect(response.status).toBe(400);
  });
});

describe("POST /meetings", () => {
  it("requires a bearer token", async () => {
    expect((await api("/meetings", { body: {}, auth: false })).status).toBe(401);
  });

  it("creates a scheduled meeting pinned to the workspace region", async () => {
    const response = await api("/meetings", { body: {} });
    expect(response.status).toBe(201);
    const meeting = meetingSchema.parse(response.body);
    expect(meeting.roomId).toMatch(/^[a-z0-9]{12}$/);
    expect(meeting.status).toBe("scheduled");
    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: meeting.workspaceId },
    });
    expect(meeting.region).toBe(workspace.region);
  });

  it("rejects unknown body fields", async () => {
    expect((await api("/meetings", { body: { region: "us" } })).status).toBe(400);
  });
});

describe("POST /meetings/:id/join", () => {
  async function newMeeting() {
    return meetingSchema.parse((await api("/meetings", { body: {} })).body);
  }

  it("records a participant and returns a one-hour room token for that room", async () => {
    const meeting = await newMeeting();
    const response = await api(`/meetings/${meeting.id}/join`, {
      body: { speakingLanguage: "de", listeningLanguage: "en" },
    });
    expect(response.status).toBe(200);
    const join = joinMeetingResponseSchema.parse(response.body);
    expect(join.roomName).toBe(meeting.roomId);
    expect(join.serverUrl).toBe("ws://localhost:7880");

    const claims = decodeJwt(join.token);
    expect(claims.sub).toBe(join.participantId);
    expect(claims["video"]).toEqual({
      room: meeting.roomId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });
    expect((claims.exp ?? 0) - (claims.nbf ?? 0)).toBe(3600);

    const participant = await prisma.participant.findUniqueOrThrow({
      where: { id: join.participantId },
    });
    expect(participant).toMatchObject({
      meetingId: meeting.id,
      speakingLanguage: "de",
      listeningLanguage: "en",
      guestId: null,
    });
    expect(participant.memberId).not.toBeNull();

    const updated = await prisma.meeting.findUniqueOrThrow({ where: { id: meeting.id } });
    expect(updated.status).toBe("live");
    expect(updated.languagesPresent).toEqual(["de", "en"]);
  });

  it("gives every join its own identity", async () => {
    const meeting = await newMeeting();
    const body = { speakingLanguage: "en", listeningLanguage: "en" };
    const first = joinMeetingResponseSchema.parse(
      (await api(`/meetings/${meeting.id}/join`, { body })).body,
    );
    const second = joinMeetingResponseSchema.parse(
      (await api(`/meetings/${meeting.id}/join`, { body })).body,
    );
    expect(first.identity).not.toBe(second.identity);
  });

  it("validates languages, meeting id and existence", async () => {
    const meeting = await newMeeting();
    expect(
      (
        await api(`/meetings/${meeting.id}/join`, {
          body: { speakingLanguage: "de", listeningLanguage: "xx" },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await api("/meetings/not-a-uuid/join", {
          body: { speakingLanguage: "de", listeningLanguage: "en" },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await api("/meetings/00000000-0000-4000-8000-000000000000/join", {
          body: { speakingLanguage: "de", listeningLanguage: "en" },
        })
      ).status,
    ).toBe(404);
  });

  it("requires a bearer token", async () => {
    const meeting = await newMeeting();
    const response = await api(`/meetings/${meeting.id}/join`, {
      body: { speakingLanguage: "de", listeningLanguage: "en" },
      auth: false,
    });
    expect(response.status).toBe(401);
  });
});

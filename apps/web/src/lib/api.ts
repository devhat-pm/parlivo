import {
  type CreateMeetingRequest,
  devLoginResponseSchema,
  type DevLoginResponse,
  type JoinMeetingRequest,
  joinMeetingResponseSchema,
  type JoinMeetingResponse,
  meetingSchema,
  type Meeting,
} from "@parlivo/schemas";
import type { z } from "zod";

export const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function post<T extends z.ZodType>(
  path: string,
  schema: T,
  body: unknown,
  accessToken?: string,
): Promise<z.infer<T>> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (accessToken) headers["authorization"] = `Bearer ${accessToken}`;
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new ApiError(response.status, `${path} failed with ${response.status}`);
  return schema.parse(await response.json());
}

export function devLogin(): Promise<DevLoginResponse> {
  return post("/auth/dev-login", devLoginResponseSchema, {});
}

export function createMeeting(accessToken: string, body: CreateMeetingRequest = {}): Promise<Meeting> {
  return post("/meetings", meetingSchema, body, accessToken);
}

export function joinMeeting(
  accessToken: string,
  meetingId: string,
  body: JoinMeetingRequest,
): Promise<JoinMeetingResponse> {
  return post(`/meetings/${meetingId}/join`, joinMeetingResponseSchema, body, accessToken);
}

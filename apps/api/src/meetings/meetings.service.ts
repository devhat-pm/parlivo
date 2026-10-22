import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateMeetingRequest,
  JoinMeetingRequest,
  JoinMeetingResponse,
  Meeting as MeetingDto,
} from "@parlivo/schemas";
import { APP_CONFIG, type AppConfig } from "../config.js";
import type { Meeting } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { mintRoomToken, ROOM_TOKEN_TTL_SECONDS } from "./livekit-token.js";
import { generateRoomId } from "./room-id.js";

@Injectable()
export class MeetingsService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  /** Create a meeting hosted by the caller, pinned to the workspace's region. */
  async create(userId: string, request: CreateMeetingRequest): Promise<MeetingDto> {
    const member = await this.prisma.member.findFirst({
      where: { userId, ...(request.workspaceId ? { workspaceId: request.workspaceId } : {}) },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
    if (!member) throw new ForbiddenException("Not a member of that workspace");
    const meeting = await this.prisma.meeting.create({
      data: {
        workspaceId: member.workspaceId,
        hostMemberId: member.id,
        roomId: generateRoomId(),
        region: member.workspace.region,
        scheduledAt: request.scheduledAt ? new Date(request.scheduledAt) : null,
      },
    });
    return toDto(meeting);
  }

  /** Join as a workspace member: records a Participant and returns a LiveKit room token. */
  async join(
    userId: string,
    meetingId: string,
    request: JoinMeetingRequest,
  ): Promise<JoinMeetingResponse> {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting || meeting.status === "ended") throw new NotFoundException("Meeting not found");
    const member = await this.prisma.member.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: meeting.workspaceId } },
      include: { user: true },
    });
    // Guests join through a separate flow with host approval (later prompt).
    if (!member) throw new ForbiddenException("Not a member of the meeting's workspace");

    const languages = new Set([
      ...meeting.languagesPresent,
      request.speakingLanguage,
      request.listeningLanguage,
    ]);
    const [participant] = await this.prisma.$transaction([
      this.prisma.participant.create({
        data: {
          meetingId: meeting.id,
          memberId: member.id,
          speakingLanguage: request.speakingLanguage,
          listeningLanguage: request.listeningLanguage,
        },
      }),
      this.prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: "live", languagesPresent: [...languages].sort() },
      }),
    ]);

    // The participant ID is the LiveKit identity, so the same user can join from two devices.
    const token = await mintRoomToken({
      apiKey: this.config.livekit.apiKey,
      apiSecret: this.config.livekit.apiSecret,
      roomName: meeting.roomId,
      identity: participant.id,
      name: member.user.name,
      metadata: {
        participantId: participant.id,
        speakingLanguage: request.speakingLanguage,
        listeningLanguage: request.listeningLanguage,
      },
    });
    return {
      participantId: participant.id,
      identity: participant.id,
      roomName: meeting.roomId,
      serverUrl: this.config.livekit.url,
      token,
      expiresInSeconds: ROOM_TOKEN_TTL_SECONDS,
    };
  }
}

function toDto(meeting: Meeting): MeetingDto {
  return {
    id: meeting.id,
    workspaceId: meeting.workspaceId,
    hostMemberId: meeting.hostMemberId,
    roomId: meeting.roomId,
    region: meeting.region,
    scheduledAt: meeting.scheduledAt ? meeting.scheduledAt.toISOString() : null,
    languagesPresent: meeting.languagesPresent as MeetingDto["languagesPresent"],
    recording: meeting.recording,
    status: meeting.status,
  };
}

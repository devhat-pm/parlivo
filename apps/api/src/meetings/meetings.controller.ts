import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  type CreateMeetingRequest,
  createMeetingRequestSchema,
  type JoinMeetingRequest,
  joinMeetingRequestSchema,
  type JoinMeetingResponse,
  type Meeting,
} from "@parlivo/schemas";
import { AuthGuard, CurrentUserId } from "../auth/auth.guard.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { MeetingsService } from "./meetings.service.js";

@Controller("meetings")
@UseGuards(AuthGuard)
export class MeetingsController {
  constructor(@Inject(MeetingsService) private readonly meetings: MeetingsService) {}

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createMeetingRequestSchema)) body: CreateMeetingRequest,
  ): Promise<Meeting> {
    return this.meetings.create(userId, body);
  }

  @Post(":id/join")
  @HttpCode(200)
  join(
    @CurrentUserId() userId: string,
    @Param("id", new ParseUUIDPipe()) meetingId: string,
    @Body(new ZodValidationPipe(joinMeetingRequestSchema)) body: JoinMeetingRequest,
  ): Promise<JoinMeetingResponse> {
    return this.meetings.join(userId, meetingId, body);
  }
}

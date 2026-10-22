import {
  Body,
  Controller,
  HttpCode,
  Inject,
  NotFoundException,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import {
  type DevLoginRequest,
  devLoginRequestSchema,
  type DevLoginResponse,
} from "@parlivo/schemas";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { APP_CONFIG, type AppConfig } from "../config.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { DEV_USER_EMAIL } from "../seed-data.js";
import { signAccessToken } from "./access-token.js";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  /** Development only: returns an access token for a seeded user without a password. */
  @Post("dev-login")
  @HttpCode(200)
  async devLogin(
    @Body(new ZodValidationPipe(devLoginRequestSchema)) body: DevLoginRequest,
  ): Promise<DevLoginResponse> {
    // Disabled in production regardless of DEV_LOGIN_ENABLED (see loadConfig).
    if (!this.config.devLoginEnabled) throw new NotFoundException();
    const user = await this.prisma.user.findUnique({
      where: { email: body.email ?? DEV_USER_EMAIL },
    });
    if (!user)
      throw new UnauthorizedException("Unknown dev user; run pnpm --filter @parlivo/api db:seed");
    return {
      accessToken: await signAccessToken(user.id, this.config.jwtSecret),
      user: { id: user.id, email: user.email, name: user.name },
    };
  }
}

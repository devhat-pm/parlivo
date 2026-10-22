import { type DynamicModule, Module } from "@nestjs/common";
import { AuthController } from "./auth/auth.controller.js";
import { AuthGuard } from "./auth/auth.guard.js";
import { APP_CONFIG, type AppConfig } from "./config.js";
import { HealthController } from "./health.controller.js";
import { MeetingsController } from "./meetings/meetings.controller.js";
import { MeetingsService } from "./meetings/meetings.service.js";
import { PrismaService } from "./prisma/prisma.service.js";

/** Root module. Built from an explicit config so tests can inject their own. */
@Module({})
export class AppModule {
  static forConfig(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      controllers: [AuthController, HealthController, MeetingsController],
      providers: [
        { provide: APP_CONFIG, useValue: config },
        PrismaService,
        AuthGuard,
        MeetingsService,
      ],
    };
  }
}

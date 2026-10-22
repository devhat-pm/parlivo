import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import type { AppConfig } from "./config.js";

export async function createApp(config: AppConfig): Promise<INestApplication> {
  const app = await NestFactory.create(
    AppModule.forConfig(config),
    config.nodeEnv === "test" ? { logger: false } : {},
  );
  app.enableCors({ origin: config.corsOrigins, credentials: false });
  app.enableShutdownHooks();
  return app;
}

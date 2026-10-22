import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { resolvePort } from "./config.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  await app.listen(resolvePort(process.env["PORT"]));
}

void bootstrap();

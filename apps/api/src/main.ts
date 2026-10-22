import { createApp } from "./app.factory.js";
import { loadConfig } from "./config.js";

async function bootstrap(): Promise<void> {
  const config = loadConfig(process.env);
  const app = await createApp(config);
  await app.listen(config.port);
}

void bootstrap();

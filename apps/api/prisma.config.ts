import { defineConfig } from "prisma/config";

// Local default matches infra/dev/docker-compose.yml (host port 5433).
const DEV_DATABASE_URL = "postgresql://parlivo:parlivo@localhost:5433/parlivo";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node dist/seed.js",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? DEV_DATABASE_URL,
  },
});

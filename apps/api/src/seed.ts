import "reflect-metadata";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadConfig } from "./config.js";
import { PrismaClient } from "./generated/prisma/client.js";
import { DEV_USER_EMAIL, DEV_USER_NAME, DEV_WORKSPACE_NAME } from "./seed-data.js";

/** Idempotent: one workspace (EU region) and one user who owns it. */
async function seed(): Promise<void> {
  const config = loadConfig(process.env);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: config.databaseUrl }),
  });
  try {
    const user = await prisma.user.upsert({
      where: { email: DEV_USER_EMAIL },
      update: {},
      create: { email: DEV_USER_EMAIL, name: DEV_USER_NAME },
    });
    const existing = await prisma.member.findFirst({ where: { userId: user.id, role: "owner" } });
    if (!existing) {
      await prisma.workspace.create({
        data: {
          name: DEV_WORKSPACE_NAME,
          region: "eu",
          members: { create: { userId: user.id, role: "owner" } },
        },
      });
    }
    console.warn(`Seeded ${DEV_USER_EMAIL} and workspace "${DEV_WORKSPACE_NAME}"`);
  } finally {
    await prisma.$disconnect();
  }
}

await seed();

import { z } from "zod";

export const DEFAULT_PORT = 3001;

/** Resolve the HTTP port from the environment, falling back to DEFAULT_PORT. */
export function resolvePort(value: string | undefined): number {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : DEFAULT_PORT;
}

// Development defaults match infra/dev. In production every secret must be set explicitly.
const DEV_DEFAULTS = {
  DATABASE_URL: "postgresql://parlivo:parlivo@localhost:5433/parlivo",
  JWT_SECRET: "parlivo-dev-jwt-secret-change-me-0123456789",
  LIVEKIT_URL: "ws://localhost:7880",
  LIVEKIT_API_KEY: "devkey",
  LIVEKIT_API_SECRET: "parlivo-dev-secret-0123456789abcdef",
  CORS_ORIGINS: "http://localhost:3000,tauri://localhost,http://tauri.localhost",
} as const;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  LIVEKIT_URL: z.string().min(1),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(32),
  CORS_ORIGINS: z.string(),
  DEV_LOGIN_ENABLED: z.enum(["true", "false"]).optional(),
});

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  livekit: { url: string; apiKey: string; apiSecret: string };
  corsOrigins: string[];
  devLoginEnabled: boolean;
}

export const APP_CONFIG = Symbol("APP_CONFIG");

/** Parse and validate the environment. Throws on missing or invalid values. */
export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const nodeEnv = env["NODE_ENV"] === "production" ? "production" : env["NODE_ENV"];
  const withDefaults = nodeEnv === "production" ? env : { ...DEV_DEFAULTS, ...definedOnly(env) };
  const parsed = envSchema.parse(withDefaults);
  const devLoginEnabled =
    parsed.NODE_ENV !== "production" && (parsed.DEV_LOGIN_ENABLED ?? "true") === "true";
  return {
    nodeEnv: parsed.NODE_ENV,
    port: resolvePort(parsed.PORT),
    databaseUrl: parsed.DATABASE_URL,
    jwtSecret: parsed.JWT_SECRET,
    livekit: {
      url: parsed.LIVEKIT_URL,
      apiKey: parsed.LIVEKIT_API_KEY,
      apiSecret: parsed.LIVEKIT_API_SECRET,
    },
    corsOrigins: parsed.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    devLoginEnabled,
  };
}

function definedOnly(env: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

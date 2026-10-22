export const DEFAULT_PORT = 3001;

/** Resolve the HTTP port from the environment, falling back to DEFAULT_PORT. */
export function resolvePort(value: string | undefined): number {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : DEFAULT_PORT;
}

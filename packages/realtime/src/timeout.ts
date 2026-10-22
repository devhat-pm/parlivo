export class ConnectTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`Could not connect to the meeting server within ${Math.round(timeoutMs / 1000)} s`);
    this.name = "ConnectTimeoutError";
  }
}

/**
 * Resolve with `promise`, or reject with ConnectTimeoutError after `timeoutMs`. `onTimeout`
 * runs once when the deadline passes, to cancel the underlying work.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void = () => undefined,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new ConnectTimeoutError(timeoutMs));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

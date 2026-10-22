import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectTimeoutError, withTimeout } from "./timeout.js";

describe("withTimeout", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("calls onTimeout once and rejects after the deadline", async () => {
    const onTimeout = vi.fn();
    const result = withTimeout(new Promise(() => undefined), 500, onTimeout);
    const assertion = expect(result).rejects.toThrow("within 1 s");
    await vi.advanceTimersByTimeAsync(500);
    await assertion;
    expect(onTimeout).toHaveBeenCalledOnce();
  });

  it("does not fire after the promise settles", async () => {
    const onTimeout = vi.fn();
    await expect(withTimeout(Promise.resolve(7), 500, onTimeout)).resolves.toBe(7);
    await vi.advanceTimersByTimeAsync(1000);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("names the error", () => {
    expect(new ConnectTimeoutError(10_000).name).toBe("ConnectTimeoutError");
  });
});

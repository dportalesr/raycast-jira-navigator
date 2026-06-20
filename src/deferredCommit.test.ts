import { createDeferredCommit } from "./deferredCommit";

type Op = { id: string };

describe("createDeferredCommit", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("commits the op after the delay elapses", () => {
    const commit = jest.fn();
    const dc = createDeferredCommit<Op>({ delayMs: 5000, commit });

    dc.schedule("PROD-1", { id: "31" });
    expect(commit).not.toHaveBeenCalled();

    jest.advanceTimersByTime(5000);
    expect(commit).toHaveBeenCalledWith({ id: "31" });
  });

  it("cancel before the delay prevents the commit", () => {
    const commit = jest.fn();
    const dc = createDeferredCommit<Op>({ delayMs: 5000, commit });

    dc.schedule("PROD-1", { id: "31" });
    expect(dc.cancel("PROD-1")).toBe(true);

    jest.advanceTimersByTime(5000);
    expect(commit).not.toHaveBeenCalled();
  });

  it("cancel returns false when nothing is pending for the key", () => {
    const dc = createDeferredCommit<Op>({ delayMs: 5000, commit: jest.fn() });
    expect(dc.cancel("PROD-1")).toBe(false);
  });

  it("re-scheduling the same key replaces the pending op (latest wins, one commit)", () => {
    const commit = jest.fn();
    const dc = createDeferredCommit<Op>({ delayMs: 5000, commit });

    dc.schedule("PROD-1", { id: "21" });
    jest.advanceTimersByTime(2000);
    dc.schedule("PROD-1", { id: "31" });
    jest.advanceTimersByTime(5000);

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith({ id: "31" });
  });

  it("flushAll commits all pending immediately and clears timers (no double commit)", () => {
    const commit = jest.fn();
    const dc = createDeferredCommit<Op>({ delayMs: 5000, commit });

    dc.schedule("PROD-1", { id: "31" });
    dc.schedule("PROD-2", { id: "21" });
    dc.flushAll();
    expect(commit).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(5000);
    expect(commit).toHaveBeenCalledTimes(2);
  });

  it("tracks pending state per key", () => {
    const dc = createDeferredCommit<Op>({ delayMs: 5000, commit: jest.fn() });

    expect(dc.pending("PROD-1")).toBe(false);
    dc.schedule("PROD-1", { id: "31" });
    expect(dc.pending("PROD-1")).toBe(true);

    jest.advanceTimersByTime(5000);
    expect(dc.pending("PROD-1")).toBe(false);
  });
});

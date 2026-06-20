/** A per-key deferred-commit scheduler with cancellation and flush. */
export type DeferredCommit<T> = {
  /** Queue (or replace) the pending op for a key; commits after the delay. */
  schedule: (key: string, op: T) => void;
  /** Drop a pending op without committing. Returns whether one was pending. */
  cancel: (key: string) => boolean;
  /** Whether a key currently has a pending op. */
  pending: (key: string) => boolean;
  /** Commit every pending op immediately and clear all timers. */
  flushAll: () => void;
};

/**
 * Build a scheduler that defers `commit(op)` by `delayMs` per key. Re-scheduling
 * a key replaces its pending op (latest wins, single commit). Used so a status
 * change can be undone within the window with no Jira call, and flushed on
 * unmount so a pending change is not lost when the window closes.
 */
export function createDeferredCommit<T>({
  delayMs,
  commit,
}: {
  delayMs: number;
  commit: (op: T) => void | Promise<void>;
}): DeferredCommit<T> {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const ops = new Map<string, T>();

  const clear = (key: string) => {
    const timer = timers.get(key);
    if (timer) clearTimeout(timer);
    timers.delete(key);
    ops.delete(key);
  };

  return {
    schedule(key, op) {
      const existing = timers.get(key);
      if (existing) clearTimeout(existing);
      ops.set(key, op);
      timers.set(
        key,
        setTimeout(() => {
          const op = ops.get(key);
          clear(key);
          if (op !== undefined) commit(op);
        }, delayMs)
      );
    },
    cancel(key) {
      if (!timers.has(key)) return false;
      clear(key);
      return true;
    },
    pending(key) {
      return timers.has(key);
    },
    flushAll() {
      const entries = Array.from(ops.entries());
      for (const [key] of entries) {
        const timer = timers.get(key);
        if (timer) clearTimeout(timer);
        timers.delete(key);
      }
      ops.clear();
      for (const [, op] of entries) commit(op);
    },
  };
}

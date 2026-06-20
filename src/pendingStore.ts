/** Minimal async key/value store, satisfied by Raycast's `LocalStorage`. */
export type PendingStorage = {
  getItem: (key: string) => Promise<string | undefined>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

/** A deferred transition persisted so it survives the command unmounting. */
export type PendingOp = {
  key: string;
  transitionId: string;
  targetStatus: string;
  targetCategory: string;
  prevStatus: string;
  prevCategory: string;
};

const STORE_KEY = "pending-transitions";

/** All persisted pending ops, keyed by issue key. Empty when none/corrupt. */
export async function loadPending(storage: PendingStorage): Promise<Record<string, PendingOp>> {
  const raw = await storage.getItem(STORE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, PendingOp>;
  } catch {
    return {};
  }
}

/** Persist (or replace) the pending op for its issue key. */
export async function savePending(storage: PendingStorage, op: PendingOp): Promise<void> {
  const map = await loadPending(storage);
  map[op.key] = op;
  await storage.setItem(STORE_KEY, JSON.stringify(map));
}

/** Drop the persisted op for an issue key, if present. */
export async function removePending(storage: PendingStorage, key: string): Promise<void> {
  const map = await loadPending(storage);
  if (!(key in map)) return;
  delete map[key];
  await storage.setItem(STORE_KEY, JSON.stringify(map));
}

/**
 * Commit every persisted op (called on launch to deliver changes that never
 * confirmed before the previous window closed). Clears the ones that succeed;
 * keeps failures for a later launch. Returns the committed issue keys.
 */
export async function reconcile(storage: PendingStorage, commit: (op: PendingOp) => Promise<void>): Promise<string[]> {
  const map = await loadPending(storage);
  const committed: string[] = [];

  for (const op of Object.values(map)) {
    try {
      await commit(op);
      committed.push(op.key);
    } catch {
      // Leave it persisted; a later launch retries.
    }
  }

  if (committed.length > 0) {
    for (const key of committed) delete map[key];
    await storage.setItem(STORE_KEY, JSON.stringify(map));
  }

  return committed;
}

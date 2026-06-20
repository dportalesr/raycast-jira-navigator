import { loadPending, savePending, removePending, reconcile, PendingOp, PendingStorage } from "./pendingStore";

const fakeStorage = (): PendingStorage & { _map: Map<string, string> } => {
  const map = new Map<string, string>();
  return {
    _map: map,
    getItem: async (k: string) => map.get(k),
    setItem: async (k: string, v: string) => void map.set(k, v),
    removeItem: async (k: string) => void map.delete(k),
  };
};

const op = (over: Partial<PendingOp> = {}): PendingOp => ({
  key: "PROD-1",
  transitionId: "31",
  targetStatus: "Done",
  targetCategory: "Done",
  prevStatus: "In Progress",
  prevCategory: "In Progress",
  ...over,
});

describe("pendingStore", () => {
  it("returns an empty map when nothing is stored", async () => {
    expect(await loadPending(fakeStorage())).toEqual({});
  });

  it("saves and loads a pending op keyed by issue key", async () => {
    const storage = fakeStorage();
    await savePending(storage, op());
    expect(await loadPending(storage)).toEqual({ "PROD-1": op() });
  });

  it("merges multiple pending ops without dropping earlier ones", async () => {
    const storage = fakeStorage();
    await savePending(storage, op());
    await savePending(storage, op({ key: "PROD-2", transitionId: "21" }));
    expect(Object.keys(await loadPending(storage)).sort()).toEqual(["PROD-1", "PROD-2"]);
  });

  it("replaces an op for a key that is scheduled again", async () => {
    const storage = fakeStorage();
    await savePending(storage, op({ transitionId: "21" }));
    await savePending(storage, op({ transitionId: "31" }));
    expect((await loadPending(storage))["PROD-1"].transitionId).toBe("31");
  });

  it("removes a pending op", async () => {
    const storage = fakeStorage();
    await savePending(storage, op());
    await removePending(storage, "PROD-1");
    expect(await loadPending(storage)).toEqual({});
  });

  it("reconcile commits each persisted op and clears the ones that succeed", async () => {
    const storage = fakeStorage();
    await savePending(storage, op());
    await savePending(storage, op({ key: "PROD-2" }));
    const commit = jest.fn().mockResolvedValue(undefined);

    const committed = await reconcile(storage, commit);

    expect(commit).toHaveBeenCalledTimes(2);
    expect(committed.sort()).toEqual(["PROD-1", "PROD-2"]);
    expect(await loadPending(storage)).toEqual({});
  });

  it("reconcile keeps ops whose commit fails (retried on a later launch)", async () => {
    const storage = fakeStorage();
    await savePending(storage, op());
    const commit = jest.fn().mockRejectedValue(new Error("boom"));

    const committed = await reconcile(storage, commit);

    expect(committed).toEqual([]);
    expect(Object.keys(await loadPending(storage))).toEqual(["PROD-1"]);
  });
});

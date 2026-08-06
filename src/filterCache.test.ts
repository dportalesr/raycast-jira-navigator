import { loadCachedFilters, saveCachedFilters, FilterStore } from "./filterCache";
import { FilterSummary } from "./types";

const fakeStore = (): FilterStore & { _map: Map<string, string> } => {
  const map = new Map<string, string>();
  return {
    _map: map,
    getItem: async (k: string) => map.get(k),
    setItem: async (k: string, v: string) => void map.set(k, v),
    removeItem: async (k: string) => void map.delete(k),
  };
};

const filters: FilterSummary[] = [
  { id: "10042", name: "Dan: Work" },
  { id: "10043", name: "Dan: Reported" },
];

describe("filterCache", () => {
  it("returns an empty array when nothing is cached", async () => {
    expect(await loadCachedFilters(fakeStore())).toEqual([]);
  });

  it("saves and reloads the scope list", async () => {
    const store = fakeStore();
    await saveCachedFilters(store, filters);
    expect(await loadCachedFilters(store)).toEqual(filters);
  });

  it("overwrites the cache on refresh (last write wins)", async () => {
    const store = fakeStore();
    await saveCachedFilters(store, filters);
    const next: FilterSummary[] = [{ id: "10099", name: "Dan: New" }];
    await saveCachedFilters(store, next);
    expect(await loadCachedFilters(store)).toEqual(next);
  });

  it("returns an empty array for malformed cached JSON", async () => {
    const store = fakeStore();
    await store.setItem("jira-navigator.filters", "{not json");
    expect(await loadCachedFilters(store)).toEqual([]);
  });
});

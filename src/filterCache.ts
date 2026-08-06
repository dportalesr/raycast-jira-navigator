import { FilterSummary } from "./types";

/** Minimal async key/value store, satisfied by Raycast's `LocalStorage`. */
export type FilterStore = {
  getItem: (key: string) => Promise<string | undefined>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const STORE_KEY = "jira-navigator.filters";

/** The cached scope list, or empty when nothing is cached or the JSON is corrupt. */
export async function loadCachedFilters(store: FilterStore): Promise<FilterSummary[]> {
  const raw = await store.getItem(STORE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FilterSummary[]) : [];
  } catch {
    return [];
  }
}

/** Replace the cached scope list (last write wins). */
export async function saveCachedFilters(store: FilterStore, filters: FilterSummary[]): Promise<void> {
  await store.setItem(STORE_KEY, JSON.stringify(filters));
}

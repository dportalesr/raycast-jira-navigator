import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { FilterStore, loadCachedFilters, saveCachedFilters } from "../filterCache";
import { syncSelection, toggleFilter } from "../selection";
import { FilterSummary } from "../types";

const store: FilterStore = {
  getItem: async key => (await LocalStorage.getItem<string>(key)) ?? undefined,
  setItem: (key, value) => LocalStorage.setItem(key, value),
  removeItem: key => LocalStorage.removeItem(key),
};

/**
 * The curated scope selection, persisted in LocalStorage. `toggle` flips one
 * filter in or out; `applySync` reconciles against a freshly fetched
 * catalogue (Manage Scopes calls it on open). Both persist immediately.
 */
const useFilters = () => {
  const [scopes, setScopes] = useState<FilterSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCachedFilters(store).then(cached => {
      if (!cancelled) setScopes(cached);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((mutate: (current: FilterSummary[]) => FilterSummary[]) => {
    setScopes(current => {
      const next = mutate(current ?? []);
      saveCachedFilters(store, next);
      return next;
    });
  }, []);

  const toggle = useCallback((filter: FilterSummary) => update(current => toggleFilter(current, filter)), [update]);

  const applySync = useCallback(
    (catalogue: FilterSummary[]) => update(current => syncSelection(current, catalogue)),
    [update]
  );

  return { isLoading: scopes === null, scopes: scopes ?? [], toggle, applySync };
};

export default useFilters;

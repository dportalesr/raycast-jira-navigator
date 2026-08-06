import { FilterSummary } from "./types";

const byName = (a: FilterSummary, b: FilterSummary) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id);

/** Add the filter if unselected, remove it if selected (matched by id). Name-sorted. */
export function toggleFilter(selection: FilterSummary[], filter: FilterSummary): FilterSummary[] {
  const without = selection.filter(s => s.id !== filter.id);
  return without.length < selection.length ? without : [...selection, filter].sort(byName);
}

/**
 * Reconcile the stored selection against a freshly fetched catalogue: renamed
 * filters take the catalogue name, deleted ones drop, unselected catalogue
 * entries are ignored. Name-sorted.
 */
export function syncSelection(selection: FilterSummary[], catalogue: FilterSummary[]): FilterSummary[] {
  const byId = new Map(catalogue.map(f => [f.id, f]));
  return selection.flatMap(s => byId.get(s.id) ?? []).sort(byName);
}

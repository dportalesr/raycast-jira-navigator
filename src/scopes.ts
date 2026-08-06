import { FilterSummary } from "./types";

/**
 * Pick the scope to select on launch: the stored one if it still exists,
 * otherwise the first available. Undefined when there are no scopes (the
 * caller falls back to the assignee scope).
 */
export function resolveDefaultScope(storedId: string | undefined, scopes: FilterSummary[]): FilterSummary | undefined {
  return scopes.find(scope => scope.id === storedId) ?? scopes[0];
}

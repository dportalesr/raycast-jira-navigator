import { Scope } from "./types";

/**
 * Build the single JQL query backing the dashboard for the given scope.
 *
 * A filter scope references the saved filter by id and appends only the
 * ordering: the filter owns all resolution (assignee/reporter/epics and its
 * own Done handling), so no clauses are ANDed onto it.
 *
 * The assignee fallback (nothing selected yet) shows the current user's
 * recent activity, newest first — a taste of the dashboard, not the whole
 * team backlog on a shared account.
 */
export function buildScopeJql(scope: Scope): string {
  if (scope.kind === "filter") return `filter = ${scope.id} ORDER BY priority DESC, updated DESC`;
  return "assignee = currentUser() AND updated >= -48h ORDER BY updated DESC";
}

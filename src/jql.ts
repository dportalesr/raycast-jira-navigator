export type ScopeOptions = {
  /** Issues moved to Done within this many days stay visible. 0 hides Done. */
  recentlyDoneDays: number;
  /**
   * Optional epic keys to scope to. When non-empty, the scope is narrowed with
   * `parent in (...)`, kept alongside the assignee clause. Empty/omitted leaves
   * the scope assignee-only, so projects without epic scoping need no config.
   */
  epics?: string[];
  /** Optional JQL AND-appended to the scope. */
  extraJql?: string;
};

/**
 * Split a comma-separated epic-keys preference into trimmed, non-empty keys.
 * Tolerates surrounding whitespace, blank entries, and trailing commas.
 */
export function parseEpicKeys(input?: string): string[] {
  return (input ?? "")
    .split(",")
    .map(key => key.trim())
    .filter(Boolean);
}

/**
 * Build the single JQL query backing the dashboard. Scoped to the current user
 * and to unresolved work plus recently-completed issues, optionally narrowed to
 * one or more epics, ordered for triage.
 */
export function buildScopeJql({ recentlyDoneDays, epics, extraJql }: ScopeOptions): string {
  const clauses = ["assignee = currentUser()"];

  if (epics && epics.length > 0) clauses.push(`parent in (${epics.join(", ")})`);

  clauses.push(
    recentlyDoneDays > 0
      ? `(statusCategory != Done OR statusCategoryChangedDate >= -${recentlyDoneDays}d)`
      : "statusCategory != Done"
  );

  const extra = extraJql?.trim();
  if (extra) clauses.push(`(${extra})`);

  return `${clauses.join(" AND ")} ORDER BY priority DESC, updated DESC`;
}

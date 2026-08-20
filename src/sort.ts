import { Issue } from "./types";

export type SortMode = "triage" | "updated" | "priority" | "created";

export const DEFAULT_SORT_MODE: SortMode = "updated";

const SORT_MODES: SortMode[] = ["triage", "updated", "priority", "created"];

/** Read a persisted sort mode, falling back to the default for a missing or stale value. */
export function parseSortMode(raw: string | undefined): SortMode {
  return SORT_MODES.includes(raw as SortMode) ? (raw as SortMode) : DEFAULT_SORT_MODE;
}

const PRIORITY_RANK: Record<string, number> = { highest: 1, high: 2, medium: 3, low: 4, lowest: 5 };

function priorityRank(issue: Issue): number {
  if (!issue.priority) return 100; // unset priorities sort last
  return PRIORITY_RANK[issue.priority.toLowerCase()] ?? 99;
}

const byRecency = (a: Issue, b: Issue) => Date.parse(b.updated) - Date.parse(a.updated);

/**
 * Order issues for a sort mode. "triage" is a no-op — the view groups those into
 * sections; the other modes return a flat, globally sorted copy. Never mutates.
 */
export function sortIssues(issues: Issue[], mode: SortMode): Issue[] {
  const list = [...issues];

  switch (mode) {
    case "updated":
      return list.sort(byRecency);
    case "priority":
      return list.sort((a, b) => priorityRank(a) - priorityRank(b) || byRecency(a, b));
    case "created":
      return list.sort((a, b) => Date.parse(b.created) - Date.parse(a.created));
    case "triage":
    default:
      return list;
  }
}

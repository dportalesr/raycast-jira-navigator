import { Issue } from "./types";

export type SortMode = "triage" | "updated" | "priority" | "key";

const PRIORITY_RANK: Record<string, number> = { highest: 1, high: 2, medium: 3, low: 4, lowest: 5 };

function priorityRank(issue: Issue): number {
  if (!issue.priority) return 100; // unset priorities sort last
  return PRIORITY_RANK[issue.priority.toLowerCase()] ?? 99;
}

function issueNumber(issue: Issue): number {
  const n = parseInt(issue.key.split("-")[1] ?? "", 10);
  return Number.isNaN(n) ? 0 : n;
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
    case "key":
      return list.sort((a, b) => issueNumber(b) - issueNumber(a));
    case "triage":
    default:
      return list;
  }
}

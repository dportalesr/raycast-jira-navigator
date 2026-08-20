import { Issue, IssueSection, SectionConfig } from "./types";

/**
 * Default triage lens, tuned to the observed PROD workflow. Order encodes
 * priority: an issue lands in the first section it matches. Named in-progress
 * statuses come before the `In Progress` category catch-all so the catch-all
 * still captures any new or unknown in-progress status.
 */
export const defaultSections: SectionConfig[] = [
  { title: "BLOCKED", color: "red", flagged: true },
  { title: "REVIEW", color: "orange", statuses: ["Review"] },
  { title: "READY FOR DEPLOYMENT", color: "green", statuses: ["Ready for Deployment"] },
  { title: "IN PROGRESS", color: "yellow", category: "In Progress" },
  { title: "TO DO", color: "blue", category: "To Do" },
  { title: "RECENTLY DONE", color: "purple", recentDone: true },
];

/** Client-side RECENTLY DONE window; `now` injectable for deterministic tests. */
export type PartitionOptions = {
  recentlyDoneDays: number;
  now: number;
};

function isRecentlyDone(issue: Issue, opts?: PartitionOptions): boolean {
  if (issue.statusCategory !== "Done") return false;
  if (!opts) return true;
  if (opts.recentlyDoneDays <= 0) return false;
  if (!issue.statusCategoryChangedDate) return true;
  return Date.parse(issue.statusCategoryChangedDate) >= opts.now - opts.recentlyDoneDays * 86400000;
}

function matches(issue: Issue, config: SectionConfig, opts?: PartitionOptions): boolean {
  if (config.flagged) return issue.flagged === true;
  if (config.recentDone) return isRecentlyDone(issue, opts);
  if (config.statuses?.length) {
    return config.statuses.some(s => s.toLowerCase() === issue.status.toLowerCase());
  }
  if (config.category) return issue.statusCategory === config.category;
  return false;
}

/**
 * Group issues into sections. Each issue joins the first section it matches;
 * unmatched issues are dropped. Sections list oldest-created issues first, so
 * the longest-waiting ones surface at the top. Empty sections are kept so the
 * view can decide to hide them. With `opts`, the `recentDone` matcher keeps only Done issues
 * changed within the window, so out-of-window Done issues (fetched under
 * filter scopes with no query-level Done restriction) fall out of triage.
 */
export function partitionIssues(
  issues: Issue[],
  sections: SectionConfig[] = defaultSections,
  opts?: PartitionOptions
): IssueSection[] {
  const result: IssueSection[] = sections.map(config => ({ config, issues: [] }));

  for (const issue of issues) {
    const index = sections.findIndex(config => matches(issue, config, opts));
    if (index >= 0) result[index].issues.push(issue);
  }

  for (const section of result) {
    section.issues.sort((a, b) => Date.parse(a.created) - Date.parse(b.created));
  }

  return result;
}

/**
 * Parse the `sectionConfig` preference. Falls back to {@link defaultSections}
 * for empty, malformed, or non-array input.
 */
export function parseSections(json?: string): SectionConfig[] {
  if (!json?.trim()) return defaultSections;

  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as SectionConfig[];
  } catch {
    // fall through to defaults
  }

  return defaultSections;
}

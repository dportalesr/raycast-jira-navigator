/**
 * A status category name, fixed by Atlassian across every Jira Cloud instance.
 * Canonical values: "To Do", "In Progress", "Done". Kept as `string` because the
 * REST payload is untyped and instances may surface "No Category".
 */
export type StatusCategoryName = string;

/** Section accent color, mapped to a Raycast `Color` in the view layer. */
export type SectionColor = "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "gray";

/** A normalized Jira issue, flattened from the REST search payload. */
export type Issue = {
  id: string;
  key: string;
  summary: string;
  url: string;
  type: string;
  status: string;
  statusCategory: StatusCategoryName;
  priority: string | null;
  priorityIconUrl?: string;
  project: string;
  updated: string;
  commentTotal: number;
  flagged?: boolean;
};

/**
 * Declares one dashboard section and how an issue matches it. The first
 * matching section (in list order) wins, so order encodes triage priority.
 * Exactly one matcher is expected per section; checked in this precedence:
 * `flagged` > `recentDone` > `statuses` > `category`.
 */
export type SectionConfig = {
  title: string;
  color: SectionColor;
  statuses?: string[];
  category?: StatusCategoryName;
  flagged?: boolean;
  recentDone?: boolean;
};

/** A section paired with the issues that fell into it. */
export type IssueSection = {
  config: SectionConfig;
  issues: Issue[];
};

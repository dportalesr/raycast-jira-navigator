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
  statusCategoryChangedDate?: string;
  priority: string | null;
  priorityIconUrl?: string;
  project: string;
  created: string;
  updated: string;
  commentTotal: number;
  flagged?: boolean;
};

/** A Jira saved filter, normalized to what the scope UI needs. */
export type FilterSummary = {
  id: string;
  name: string;
};

/** A catalogue entry for Manage Scopes; owner disambiguates duplicate names. */
export type CatalogueFilter = FilterSummary & {
  owner?: string;
};

/**
 * The scope backing the issue query: a selected saved filter (which owns all
 * resolution — assignee, reporter, Done handling), or the assignee fallback
 * (recent activity only) used while nothing is selected.
 */
export type Scope = { kind: "filter"; id: string | number } | { kind: "assignee" };

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

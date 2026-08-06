import { getPreferenceValues } from "@raycast/api";
import { CommentMeta } from "../activity";
import { RawTransition } from "../transitions";
import { CatalogueFilter, Issue } from "../types";

type ConnectionPrefs = {
  site: string;
  email: string;
  apiToken: string;
};

type JiraIssueRaw = {
  id: string;
  key: string;
  fields: {
    summary?: string;
    updated: string;
    issuetype?: { name: string };
    priority?: { name: string; iconUrl?: string } | null;
    project?: { key: string };
    status?: { name: string; statusCategory?: { name: string } };
    statuscategorychangedate?: string;
    comment?: { total?: number };
  };
};

type SearchResponse = {
  issues?: JiraIssueRaw[];
  nextPageToken?: string;
  isLast?: boolean;
};

const FIELDS = [
  "summary",
  "status",
  "issuetype",
  "priority",
  "updated",
  "project",
  "comment",
  "statuscategorychangedate",
];

/** Normalize a configured site into an absolute origin (no trailing slash). */
export function siteBase(site: string): string {
  const host = site
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  return `https://${host}`;
}

export function issueUrl(site: string, key: string): string {
  return `${siteBase(site)}/browse/${key}`;
}

/** Resolve the site origin and Basic-auth headers from preferences. */
function connection() {
  const { site, email, apiToken } = getPreferenceValues<ConnectionPrefs>();
  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");
  return { base: siteBase(site), headers: { Authorization: `Basic ${auth}`, Accept: "application/json" } };
}

let cachedAccountId: string | undefined;

/** The current user's accountId, used to exclude their own comments. Cached. */
export async function getMyAccountId(): Promise<string> {
  if (cachedAccountId) return cachedAccountId;
  const { base, headers } = connection();
  const response = await fetch(`${base}/rest/api/3/myself`, { headers });
  if (!response.ok) throw new Error(`Jira ${response.status} resolving current user`);
  const data = (await response.json()) as { accountId?: string };
  cachedAccountId = data.accountId ?? "";
  return cachedAccountId;
}

/** Fetch an issue's comments (newest first) as author + created pairs. */
export async function fetchComments(key: string): Promise<CommentMeta[]> {
  const { base, headers } = connection();
  const response = await fetch(`${base}/rest/api/3/issue/${key}/comment?orderBy=-created&maxResults=50`, { headers });
  if (!response.ok) throw new Error(`Jira ${response.status} fetching comments for ${key}`);
  const data = (await response.json()) as { comments?: { author?: { accountId?: string }; created: string }[] };
  return (data.comments ?? []).map(c => ({ author: c.author?.accountId ?? "", created: c.created }));
}

/**
 * Run a JQL search against Jira Cloud REST v3 on the site domain, using Basic
 * auth with an (unscoped) API token, following pagination.
 */
export async function searchIssues(jql: string): Promise<Issue[]> {
  const { base, headers } = connection();

  const issues: Issue[] = [];
  let nextPageToken: string | undefined;

  do {
    const params = new URLSearchParams({ jql, maxResults: "100", fields: FIELDS.join(",") });
    if (nextPageToken) params.set("nextPageToken", nextPageToken);

    const response = await fetch(`${base}/rest/api/3/search/jql?${params.toString()}`, { headers });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Jira ${response.status}: ${body.slice(0, 200) || response.statusText}`);
    }

    const data = (await response.json()) as SearchResponse;
    for (const raw of data.issues ?? []) issues.push(normalize(raw, base));
    nextPageToken = data.isLast ? undefined : data.nextPageToken;
  } while (nextPageToken);

  return issues;
}

type FilterSearchResponse = {
  values?: { id?: unknown; name?: unknown; owner?: { displayName?: string } }[];
  isLast?: boolean;
};

/**
 * The full saved-filter catalogue visible to the account, for Manage Scopes.
 * Paginated; capped at 20 pages (1000 filters) as a runaway guard. Jira
 * returns pages ordered by name.
 */
export async function fetchAllFilters(): Promise<CatalogueFilter[]> {
  const { base, headers } = connection();
  const filters: CatalogueFilter[] = [];
  let startAt = 0;

  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({ expand: "owner", maxResults: "50", startAt: String(startAt) });
    const response = await fetch(`${base}/rest/api/3/filter/search?${params.toString()}`, { headers });
    if (!response.ok) throw new Error(`Jira ${response.status} listing filters`);

    const data = (await response.json()) as FilterSearchResponse;
    const values = data.values ?? [];
    for (const value of values) {
      if (value.id == null || value.name == null) continue;
      filters.push({ id: String(value.id), name: String(value.name), owner: value.owner?.displayName });
    }

    if (data.isLast !== false || values.length === 0) break;
    startAt += values.length;
  }

  return filters;
}

/** Available workflow transitions for an issue (with field metadata). */
export async function fetchTransitions(key: string): Promise<RawTransition[]> {
  const { base, headers } = connection();
  const response = await fetch(`${base}/rest/api/3/issue/${key}/transitions?expand=transitions.fields`, { headers });
  if (!response.ok) throw new Error(`Jira ${response.status} fetching transitions for ${key}`);
  const data = (await response.json()) as { transitions?: RawTransition[] };
  return data.transitions ?? [];
}

/** Apply a workflow transition to an issue. Resolves on success (HTTP 204). */
export async function transitionIssue(key: string, transitionId: string): Promise<void> {
  const { base, headers } = connection();
  const response = await fetch(`${base}/rest/api/3/issue/${key}/transitions`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ transition: { id: transitionId } }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Jira ${response.status}: ${body.slice(0, 200) || response.statusText}`);
  }
}

function normalize(raw: JiraIssueRaw, base: string): Issue {
  const fields = raw.fields;
  return {
    id: raw.id,
    key: raw.key,
    summary: fields.summary ?? "",
    url: `${base}/browse/${raw.key}`,
    type: fields.issuetype?.name ?? "Task",
    status: fields.status?.name ?? "",
    statusCategory: fields.status?.statusCategory?.name ?? "",
    statusCategoryChangedDate: fields.statuscategorychangedate,
    priority: fields.priority?.name ?? null,
    priorityIconUrl: fields.priority?.iconUrl,
    project: fields.project?.key ?? raw.key.split("-")[0],
    updated: fields.updated,
    commentTotal: fields.comment?.total ?? 0,
  };
}

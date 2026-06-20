import { buildScopeJql, parseEpicKeys } from "./jql";

describe("buildScopeJql", () => {
  it("always scopes to the current user", () => {
    expect(buildScopeJql({ recentlyDoneDays: 3 })).toContain("assignee = currentUser()");
  });

  it("scopes to the given epics with parent in (...), kept alongside the assignee clause", () => {
    const jql = buildScopeJql({ recentlyDoneDays: 3, epics: ["PROD-5225", "PROD-5218"] });
    expect(jql).toContain("assignee = currentUser()");
    expect(jql).toContain("parent in (PROD-5225, PROD-5218)");
  });

  it("omits the epic clause when no epics are given", () => {
    expect(buildScopeJql({ recentlyDoneDays: 3 })).not.toContain("parent in");
  });

  it("omits the epic clause for an empty epic list", () => {
    expect(buildScopeJql({ recentlyDoneDays: 3, epics: [] })).not.toContain("parent in");
  });

  it("includes done issues changed within the recent window", () => {
    const jql = buildScopeJql({ recentlyDoneDays: 5 });
    expect(jql).toContain("statusCategory != Done OR statusCategoryChangedDate >= -5d");
  });

  it("excludes done entirely when the window is zero", () => {
    const jql = buildScopeJql({ recentlyDoneDays: 0 });
    expect(jql).toContain("statusCategory != Done");
    expect(jql).not.toContain("statusCategoryChangedDate");
  });

  it("appends extra JQL with AND, wrapped in parentheses", () => {
    const jql = buildScopeJql({ recentlyDoneDays: 3, extraJql: "project = PROD" });
    expect(jql).toContain("AND (project = PROD)");
  });

  it("ignores blank extra JQL", () => {
    const jql = buildScopeJql({ recentlyDoneDays: 3, extraJql: "   " });
    expect(jql).not.toContain("AND ()");
  });

  it("orders by priority then recency", () => {
    expect(buildScopeJql({ recentlyDoneDays: 3 })).toMatch(/ORDER BY priority DESC, updated DESC$/);
  });
});

describe("parseEpicKeys", () => {
  it("splits a comma-separated list into trimmed keys", () => {
    expect(parseEpicKeys("PROD-5225, PROD-5218")).toEqual(["PROD-5225", "PROD-5218"]);
  });

  it("tolerates extra whitespace and trailing commas", () => {
    expect(parseEpicKeys("  PROD-5225 ,, PROD-5218 , ")).toEqual(["PROD-5225", "PROD-5218"]);
  });

  it("returns an empty array for blank or missing input", () => {
    expect(parseEpicKeys("   ")).toEqual([]);
    expect(parseEpicKeys(undefined)).toEqual([]);
  });
});

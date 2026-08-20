import { buildScopeJql } from "./jql";

describe("buildScopeJql — filter scope", () => {
  it("references the saved filter by id", () => {
    expect(buildScopeJql({ kind: "filter", id: 123 })).toContain("filter = 123");
  });

  it("does not append an assignee or Done clause (the filter owns resolution)", () => {
    const jql = buildScopeJql({ kind: "filter", id: 123 });
    expect(jql).not.toContain("assignee = currentUser()");
    expect(jql).not.toContain("statusCategory");
  });

  it("orders by recency so triage sections read newest first", () => {
    expect(buildScopeJql({ kind: "filter", id: 123 })).toMatch(/ORDER BY updated DESC$/);
  });

  it("accepts a string id", () => {
    expect(buildScopeJql({ kind: "filter", id: "10042" })).toContain("filter = 10042");
  });
});

describe("buildScopeJql — assignee fallback", () => {
  it("scopes to the current user's recent activity, without a Done clause", () => {
    const jql = buildScopeJql({ kind: "assignee" });
    expect(jql).toContain("assignee = currentUser()");
    expect(jql).toContain("updated >= -48h");
    expect(jql).not.toContain("statusCategory");
  });

  it("orders by recency", () => {
    expect(buildScopeJql({ kind: "assignee" })).toMatch(/ORDER BY updated DESC$/);
  });
});

import { Issue } from "./types";
import { SortMode, sortIssues } from "./sort";

const issue = (overrides: Partial<Issue>): Issue => ({
  id: "1",
  key: "PROD-1",
  summary: "Summary",
  url: "https://example.atlassian.net/browse/PROD-1",
  type: "Task",
  status: "To Do",
  statusCategory: "To Do",
  priority: "Medium",
  project: "PROD",
  updated: "2026-06-18T00:00:00.000Z",
  commentTotal: 0,
  ...overrides,
});

describe("sortIssues", () => {
  it("triage preserves input order (sections handle grouping)", () => {
    const a = issue({ key: "PROD-1" });
    const b = issue({ key: "PROD-2" });
    expect(sortIssues([a, b], "triage").map(i => i.key)).toEqual(["PROD-1", "PROD-2"]);
  });

  it("updated sorts most-recent first", () => {
    const older = issue({ key: "PROD-1", updated: "2026-06-10T00:00:00.000Z" });
    const newer = issue({ key: "PROD-2", updated: "2026-06-18T00:00:00.000Z" });
    expect(sortIssues([older, newer], "updated").map(i => i.key)).toEqual(["PROD-2", "PROD-1"]);
  });

  it("priority sorts Highest first, nulls last", () => {
    const med = issue({ key: "PROD-1", priority: "Medium" });
    const highest = issue({ key: "PROD-2", priority: "Highest" });
    const none = issue({ key: "PROD-3", priority: null });
    const low = issue({ key: "PROD-4", priority: "Low" });
    expect(sortIssues([med, highest, none, low], "priority").map(i => i.key)).toEqual([
      "PROD-2",
      "PROD-1",
      "PROD-4",
      "PROD-3",
    ]);
  });

  it("priority breaks ties by recency", () => {
    const a = issue({ key: "PROD-1", priority: "High", updated: "2026-06-10T00:00:00.000Z" });
    const b = issue({ key: "PROD-2", priority: "High", updated: "2026-06-18T00:00:00.000Z" });
    expect(sortIssues([a, b], "priority").map(i => i.key)).toEqual(["PROD-2", "PROD-1"]);
  });

  it("key sorts by issue number, highest first", () => {
    const a = issue({ key: "PROD-9" });
    const b = issue({ key: "PROD-100" });
    const c = issue({ key: "PROD-21" });
    expect(sortIssues([a, b, c], "key").map(i => i.key)).toEqual(["PROD-100", "PROD-21", "PROD-9"]);
  });

  it("does not mutate the input array", () => {
    const input = [issue({ key: "PROD-1" }), issue({ key: "PROD-2" })];
    const copy = [...input];
    sortIssues(input, "updated");
    expect(input).toEqual(copy);
  });
});

import { Issue } from "./types";
import { countUnreadComments, isNew, mayHaveNewComments, snapshotOf } from "./activity";

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
  created: "2026-06-01T00:00:00.000Z",
  updated: "2026-06-18T00:00:00.000Z",
  commentTotal: 0,
  ...overrides,
});

describe("snapshotOf", () => {
  it("captures the updated timestamp and comment total", () => {
    expect(snapshotOf(issue({ updated: "2026-06-18T00:00:00.000Z", commentTotal: 3 }))).toEqual({
      updatedAt: "2026-06-18T00:00:00.000Z",
      commentTotal: 3,
    });
  });
});

describe("isNew", () => {
  it("is false when there is no snapshot (first sight is baselined elsewhere)", () => {
    expect(isNew(issue({}), undefined)).toBe(false);
  });

  it("is true when updated moved past the snapshot", () => {
    const snap = { updatedAt: "2026-06-10T00:00:00.000Z", commentTotal: 0 };
    expect(isNew(issue({ updated: "2026-06-18T00:00:00.000Z" }), snap)).toBe(true);
  });

  it("is false when nothing changed since the snapshot", () => {
    const snap = { updatedAt: "2026-06-18T00:00:00.000Z", commentTotal: 0 };
    expect(isNew(issue({ updated: "2026-06-18T00:00:00.000Z" }), snap)).toBe(false);
  });

  it("compares instants, not strings (timezone offsets)", () => {
    const snap = { updatedAt: "2026-06-18T10:00:00.000-07:00", commentTotal: 0 };
    // Same instant expressed in UTC — must NOT count as new.
    expect(isNew(issue({ updated: "2026-06-18T17:00:00.000Z" }), snap)).toBe(false);
  });
});

describe("mayHaveNewComments", () => {
  it("is false without a snapshot", () => {
    expect(mayHaveNewComments(issue({ commentTotal: 5 }), undefined)).toBe(false);
  });

  it("is true when the total grew past the snapshot", () => {
    const snap = { updatedAt: "2026-06-10T00:00:00.000Z", commentTotal: 2 };
    expect(mayHaveNewComments(issue({ commentTotal: 5 }), snap)).toBe(true);
  });

  it("is false when the total is unchanged", () => {
    const snap = { updatedAt: "2026-06-10T00:00:00.000Z", commentTotal: 5 };
    expect(mayHaveNewComments(issue({ commentTotal: 5 }), snap)).toBe(false);
  });
});

describe("countUnreadComments", () => {
  const me = "acc-me";
  const since = "2026-06-15T00:00:00.000Z";
  const comments = [
    { author: "acc-me", created: "2026-06-16T00:00:00.000Z" }, // mine, after — excluded
    { author: "acc-bob", created: "2026-06-16T00:00:00.000Z" }, // theirs, after — counts
    { author: "acc-ann", created: "2026-06-17T00:00:00.000Z" }, // theirs, after — counts
    { author: "acc-bob", created: "2026-06-10T00:00:00.000Z" }, // theirs, before — excluded
  ];

  it("counts only other people's comments created after the snapshot", () => {
    expect(countUnreadComments(comments, since, me)).toBe(2);
  });

  it("excludes all of my own comments", () => {
    const allMine = [
      { author: me, created: "2026-06-16T00:00:00.000Z" },
      { author: me, created: "2026-06-17T00:00:00.000Z" },
    ];
    expect(countUnreadComments(allMine, since, me)).toBe(0);
  });

  it("is zero when there are no comments", () => {
    expect(countUnreadComments([], since, me)).toBe(0);
  });
});

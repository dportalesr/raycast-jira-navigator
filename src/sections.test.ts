import { Issue, SectionConfig } from "./types";
import { defaultSections, partitionIssues, parseSections } from "./sections";

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

const sectionFor = (sections: ReturnType<typeof partitionIssues>, title: string) =>
  sections.find(s => s.config.title === title);

describe("partitionIssues (defaults)", () => {
  it("routes a status to its named section", () => {
    const sections = partitionIssues([issue({ status: "Review", statusCategory: "In Progress" })]);
    expect(sectionFor(sections, "REVIEW")?.issues).toHaveLength(1);
    expect(sectionFor(sections, "IN PROGRESS")?.issues).toHaveLength(0);
  });

  it("prefers the earliest matching section (dedup by order)", () => {
    // 'Review' is also In Progress category; it must land in REVIEW only.
    const sections = partitionIssues([issue({ status: "Review", statusCategory: "In Progress" })]);
    const total = sections.reduce((n, s) => n + s.issues.length, 0);
    expect(total).toBe(1);
  });

  it("falls through unknown in-progress statuses to the category catch-all", () => {
    const sections = partitionIssues([issue({ status: "QA Review", statusCategory: "In Progress" })]);
    expect(sectionFor(sections, "IN PROGRESS")?.issues).toHaveLength(1);
  });

  it("routes To Do category issues to TO DO", () => {
    const sections = partitionIssues([issue({ status: "To Do", statusCategory: "To Do" })]);
    expect(sectionFor(sections, "TO DO")?.issues).toHaveLength(1);
  });

  it("routes Done issues to RECENTLY DONE", () => {
    const sections = partitionIssues([issue({ status: "Done", statusCategory: "Done" })]);
    expect(sectionFor(sections, "RECENTLY DONE")?.issues).toHaveLength(1);
  });

  it("routes flagged issues to BLOCKED regardless of status", () => {
    const sections = partitionIssues([issue({ status: "In Progress", statusCategory: "In Progress", flagged: true })]);
    expect(sectionFor(sections, "BLOCKED")?.issues).toHaveLength(1);
    expect(sectionFor(sections, "IN PROGRESS")?.issues).toHaveLength(0);
  });

  it("matches status names case-insensitively", () => {
    const sections = partitionIssues([issue({ status: "ready for deployment", statusCategory: "In Progress" })]);
    expect(sectionFor(sections, "READY FOR DEPLOYMENT")?.issues).toHaveLength(1);
  });

  it("drops issues that match no section", () => {
    const sections = partitionIssues([issue({ status: "Whatever", statusCategory: "Unknown" })]);
    const total = sections.reduce((n, s) => n + s.issues.length, 0);
    expect(total).toBe(0);
  });

  it("returns every section, even empty ones", () => {
    const sections = partitionIssues([]);
    expect(sections).toHaveLength(defaultSections.length);
  });
});

describe("parseSections", () => {
  it("returns defaults for empty input", () => {
    expect(parseSections(undefined)).toBe(defaultSections);
    expect(parseSections("")).toBe(defaultSections);
    expect(parseSections("   ")).toBe(defaultSections);
  });

  it("returns defaults for invalid JSON", () => {
    expect(parseSections("{not json")).toBe(defaultSections);
  });

  it("returns defaults when JSON is not a non-empty array", () => {
    expect(parseSections("{}")).toBe(defaultSections);
    expect(parseSections("[]")).toBe(defaultSections);
  });

  it("parses a custom section list", () => {
    const custom: SectionConfig[] = [{ title: "MINE", color: "blue", category: "In Progress" }];
    expect(parseSections(JSON.stringify(custom))).toEqual(custom);
  });

  it("partitions using a custom config", () => {
    const custom = JSON.stringify([{ title: "MINE", color: "blue", statuses: ["Review"] }]);
    const sections = partitionIssues([issue({ status: "Review" })], parseSections(custom));
    expect(sections).toHaveLength(1);
    expect(sectionFor(sections, "MINE")?.issues).toHaveLength(1);
  });
});

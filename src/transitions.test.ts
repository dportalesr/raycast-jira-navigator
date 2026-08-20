import { selectableTransitions, requiresInput, applyOptimistic, RawTransition } from "./transitions";
import { Issue } from "./types";

const raw = (over: Partial<RawTransition> = {}): RawTransition => ({
  id: "31",
  name: "Done",
  hasScreen: false,
  isAvailable: true,
  to: { name: "Done", statusCategory: { name: "Done" } },
  fields: {},
  ...over,
});

const issue = (over: Partial<Issue> = {}): Issue => ({
  id: "1",
  key: "PROD-1",
  summary: "Some work",
  url: "https://x/browse/PROD-1",
  type: "Task",
  status: "In Progress",
  statusCategory: "In Progress",
  priority: null,
  project: "PROD",
  created: "2026-01-01T00:00:00.000Z",
  updated: "2026-01-01T00:00:00.000Z",
  commentTotal: 0,
  ...over,
});

describe("selectableTransitions", () => {
  it("maps available, screen-less transitions to a flat shape", () => {
    expect(selectableTransitions([raw()], "In Progress")).toEqual([
      { id: "31", name: "Done", to: { status: "Done", category: "Done" } },
    ]);
  });

  it("drops unavailable transitions", () => {
    expect(selectableTransitions([raw({ isAvailable: false })], "In Progress")).toEqual([]);
  });

  it("drops transitions that open a screen (would need fields we cannot render)", () => {
    expect(selectableTransitions([raw({ hasScreen: true })], "In Progress")).toEqual([]);
  });

  it("drops transitions with a required field", () => {
    const withRequired = raw({ fields: { resolution: { required: true } } });
    expect(selectableTransitions([withRequired], "In Progress")).toEqual([]);
  });

  it("keeps transitions whose only fields are optional", () => {
    const withOptional = raw({ fields: { assignee: { required: false } } });
    expect(selectableTransitions([withOptional], "In Progress")).toHaveLength(1);
  });

  it("drops the no-op transition back to the current status", () => {
    const same = raw({
      id: "21",
      name: "In Progress",
      to: { name: "In Progress", statusCategory: { name: "In Progress" } },
    });
    expect(selectableTransitions([same], "In Progress")).toEqual([]);
  });
});

describe("requiresInput", () => {
  it("is true when the transition opens a screen", () => {
    expect(requiresInput(raw({ hasScreen: true }))).toBe(true);
  });

  it("is true when any field is required", () => {
    expect(requiresInput(raw({ fields: { resolution: { required: true } } }))).toBe(true);
  });

  it("is false for a plain screen-less transition", () => {
    expect(requiresInput(raw())).toBe(false);
  });
});

describe("applyOptimistic", () => {
  it("patches status and statusCategory from the transition target", () => {
    const [done] = selectableTransitions([raw()], "In Progress");
    const next = applyOptimistic(issue(), done);
    expect(next.status).toBe("Done");
    expect(next.statusCategory).toBe("Done");
  });

  it("does not mutate the original issue", () => {
    const [done] = selectableTransitions([raw()], "In Progress");
    const original = issue();
    applyOptimistic(original, done);
    expect(original.status).toBe("In Progress");
    expect(original.statusCategory).toBe("In Progress");
  });
});

import { statusColor } from "./statusColor";

describe("statusColor", () => {
  it("matches the 'review' substring to orange", () => {
    expect(statusColor("Review", "In Progress")).toBe("orange");
    expect(statusColor("In Review", "In Progress")).toBe("orange");
  });

  it("matches the 'ready' substring to green", () => {
    expect(statusColor("Ready for Deployment", "In Progress")).toBe("green");
  });

  it("matches name hints case-insensitively", () => {
    expect(statusColor("ready for deployment", "In Progress")).toBe("green");
  });

  it("prefers a name hint over the category fallback", () => {
    // 'Review' is In Progress category, but the weak name hint wins.
    expect(statusColor("Review", "In Progress")).toBe("orange");
  });

  it("falls back to purple for the Done category", () => {
    expect(statusColor("Done", "Done")).toBe("purple");
    expect(statusColor("Closed", "Done")).toBe("purple");
  });

  it("falls back to blue for the To Do category", () => {
    expect(statusColor("To Do", "To Do")).toBe("blue");
    expect(statusColor("Backlog", "To Do")).toBe("blue");
  });

  it("falls back to yellow for In Progress and uncategorized statuses", () => {
    expect(statusColor("In Progress", "In Progress")).toBe("yellow");
    expect(statusColor("Whatever", "No Category")).toBe("yellow");
    expect(statusColor("Mystery", "")).toBe("yellow");
  });
});

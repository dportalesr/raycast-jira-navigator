import { resolveClipboardInput } from "./ticketInput";

describe("resolveClipboardInput", () => {
  it("opens a full issue key", () => {
    expect(resolveClipboardInput("PROD-123")).toEqual({ kind: "open", key: "PROD-123" });
  });

  it("uppercases a lowercase key before opening", () => {
    expect(resolveClipboardInput("prod-123")).toEqual({ kind: "open", key: "PROD-123" });
  });

  it("extracts a key embedded in surrounding text", () => {
    expect(resolveClipboardInput("see PROD-123 please")).toEqual({ kind: "open", key: "PROD-123" });
  });

  it("treats a bare number as a search term (no magic project resolution)", () => {
    expect(resolveClipboardInput("123")).toEqual({ kind: "search", term: "123" });
  });

  it("treats free text as a search term", () => {
    expect(resolveClipboardInput("login button bug")).toEqual({ kind: "search", term: "login button bug" });
  });

  it("trims the search term", () => {
    expect(resolveClipboardInput("  login bug  ")).toEqual({ kind: "search", term: "login bug" });
  });

  it("reports empty input", () => {
    expect(resolveClipboardInput("")).toEqual({ kind: "empty" });
  });

  it("reports whitespace-only input as empty", () => {
    expect(resolveClipboardInput("   ")).toEqual({ kind: "empty" });
  });
});

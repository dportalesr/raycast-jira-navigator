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

  it("treats a bare number as a search term when no fallback project key is set", () => {
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

describe("resolveClipboardInput with a fallback project key", () => {
  it("qualifies a bare number with the fallback key", () => {
    expect(resolveClipboardInput("123", "PROD-")).toEqual({ kind: "open", key: "PROD-123" });
  });

  it("accepts a fallback key written without the trailing hyphen", () => {
    expect(resolveClipboardInput("123", "PROD")).toEqual({ kind: "open", key: "PROD-123" });
  });

  it("uppercases a lowercase fallback key", () => {
    expect(resolveClipboardInput("123", "prod-")).toEqual({ kind: "open", key: "PROD-123" });
  });

  it("trims surrounding whitespace on both the number and the fallback key", () => {
    expect(resolveClipboardInput("  123  ", "  PROD-  ")).toEqual({ kind: "open", key: "PROD-123" });
  });

  it("ignores a leading # on the number", () => {
    expect(resolveClipboardInput("#123", "PROD-")).toEqual({ kind: "open", key: "PROD-123" });
  });

  it("still prefers a full key present in the input", () => {
    expect(resolveClipboardInput("OPS-9", "PROD-")).toEqual({ kind: "open", key: "OPS-9" });
  });

  it("ignores a blank fallback key", () => {
    expect(resolveClipboardInput("123", "   ")).toEqual({ kind: "search", term: "123" });
  });

  it("ignores a malformed fallback key", () => {
    expect(resolveClipboardInput("123", "not a key!")).toEqual({ kind: "search", term: "123" });
  });

  it("qualifies a number embedded in surrounding text", () => {
    expect(resolveClipboardInput("see 123 please", "PROD-")).toEqual({ kind: "open", key: "PROD-123" });
  });

  it("qualifies a number glued to other characters", () => {
    expect(resolveClipboardInput("v123", "PROD-")).toEqual({ kind: "open", key: "PROD-123" });
  });

  it("takes the first number when several are present", () => {
    expect(resolveClipboardInput("123 and 456", "PROD-")).toEqual({ kind: "open", key: "PROD-123" });
  });

  it("still searches text with no number at all", () => {
    expect(resolveClipboardInput("login button bug", "PROD-")).toEqual({ kind: "search", term: "login button bug" });
  });

  it("leaves empty input empty", () => {
    expect(resolveClipboardInput("", "PROD-")).toEqual({ kind: "empty" });
  });
});

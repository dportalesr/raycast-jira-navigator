import { resolveDefaultScope } from "./scopes";
import { FilterSummary } from "./types";

const summaries = (...names: string[]): FilterSummary[] => names.map((name, i) => ({ id: String(10040 + i), name }));

describe("resolveDefaultScope", () => {
  it("returns the stored scope when it still exists", () => {
    const scopes = summaries("Alpha", "Beta");
    expect(resolveDefaultScope("10041", scopes)).toEqual({ id: "10041", name: "Beta" });
  });

  it("falls back to the first scope when the stored id is gone", () => {
    const scopes = summaries("Alpha", "Beta");
    expect(resolveDefaultScope("99999", scopes)).toEqual({ id: "10040", name: "Alpha" });
  });

  it("falls back to the first scope when nothing is stored", () => {
    const scopes = summaries("Alpha", "Beta");
    expect(resolveDefaultScope(undefined, scopes)).toEqual({ id: "10040", name: "Alpha" });
  });

  it("returns undefined when there are no scopes", () => {
    expect(resolveDefaultScope("10040", [])).toBeUndefined();
  });
});

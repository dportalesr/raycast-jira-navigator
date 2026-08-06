import { toggleFilter, syncSelection } from "./selection";
import { FilterSummary } from "./types";

const f = (id: string, name: string): FilterSummary => ({ id, name });

describe("toggleFilter", () => {
  it("adds an unselected filter, keeping name order", () => {
    const selection = [f("1", "Alpha"), f("3", "Zeta")];
    expect(toggleFilter(selection, f("2", "Mid"))).toEqual([f("1", "Alpha"), f("2", "Mid"), f("3", "Zeta")]);
  });

  it("adds to an empty selection", () => {
    expect(toggleFilter([], f("1", "Alpha"))).toEqual([f("1", "Alpha")]);
  });

  it("removes an already-selected filter", () => {
    const selection = [f("1", "Alpha"), f("2", "Mid")];
    expect(toggleFilter(selection, f("2", "Mid"))).toEqual([f("1", "Alpha")]);
  });

  it("matches by id, so a renamed filter still toggles off", () => {
    expect(toggleFilter([f("1", "Old Name")], f("1", "New Name"))).toEqual([]);
  });
});

describe("syncSelection", () => {
  it("updates the name of a renamed filter and resorts", () => {
    const selection = [f("1", "Alpha"), f("2", "Beta")];
    const catalogue = [f("2", "Beta"), f("1", "Zulu")];
    expect(syncSelection(selection, catalogue)).toEqual([f("2", "Beta"), f("1", "Zulu")]);
  });

  it("drops a filter deleted from the catalogue, ignoring unselected extras", () => {
    const selection = [f("1", "Alpha"), f("2", "Beta")];
    const catalogue = [f("1", "Alpha"), f("9", "Unselected")];
    expect(syncSelection(selection, catalogue)).toEqual([f("1", "Alpha")]);
  });

  it("returns empty for an empty selection", () => {
    expect(syncSelection([], [f("1", "Alpha")])).toEqual([]);
  });

  it("returns empty when the catalogue is empty", () => {
    expect(syncSelection([f("1", "Alpha")], [])).toEqual([]);
  });
});

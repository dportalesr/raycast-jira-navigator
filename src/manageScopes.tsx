import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchAllFilters } from "./integration/jira";
import { syncSelection, toggleFilter } from "./selection";
import { CatalogueFilter, FilterSummary } from "./types";

type Props = {
  selection: FilterSummary[];
  onToggle: (filter: FilterSummary) => void;
  onSync: (catalogue: FilterSummary[]) => void;
};

/**
 * Searchable catalogue of every saved filter visible to the account; Enter
 * toggles a filter in or out of the scope selection. Opening syncs the stored
 * selection against the catalogue (renamed filters update, deleted ones drop).
 *
 * A pushed screen never re-renders from parent state (Action.Push snapshots
 * the element), so this view mirrors the selection locally with the same pure
 * functions and reports changes upward through the callbacks.
 */
export default function ManageScopes({ selection, onToggle, onSync }: Props) {
  const [catalogue, setCatalogue] = useState<CatalogueFilter[] | null>(null);
  const [selected, setSelected] = useState(selection);

  useEffect(() => {
    fetchAllFilters()
      .then(all => {
        setCatalogue(all);
        setSelected(current => syncSelection(current, all));
        onSync(all);
      })
      .catch((err: unknown) => {
        console.error(err);
        setCatalogue([]);
        showToast({
          style: Toast.Style.Failure,
          title: "Could not list filters",
          message: err instanceof Error ? err.message : String(err),
        });
      });
  }, []);

  const toggle = (filter: FilterSummary) => {
    setSelected(current => toggleFilter(current, filter));
    onToggle(filter);
  };

  const selectedIds = new Set(selected.map(scope => scope.id));
  const items = catalogue ?? [];
  const selectedFilters = items.filter(filter => selectedIds.has(filter.id));
  const available = items.filter(filter => !selectedIds.has(filter.id));

  return (
    <List isLoading={catalogue === null} searchBarPlaceholder="Search saved filters…">
      <List.Section title="Scopes" subtitle={`${selectedFilters.length}`}>
        {selectedFilters.map(filter => (
          <CatalogueItem key={filter.id} filter={filter} selected onToggle={toggle} />
        ))}
      </List.Section>
      <List.Section title="Available Filters" subtitle={`${available.length}`}>
        {available.map(filter => (
          <CatalogueItem key={filter.id} filter={filter} selected={false} onToggle={toggle} />
        ))}
      </List.Section>
    </List>
  );
}

function CatalogueItem({
  filter,
  selected,
  onToggle,
}: {
  filter: CatalogueFilter;
  selected: boolean;
  onToggle: (filter: FilterSummary) => void;
}) {
  return (
    <List.Item
      title={filter.name}
      subtitle={filter.owner}
      icon={selected ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
      actions={
        <ActionPanel>
          <Action
            title={selected ? "Remove from Scopes" : "Add to Scopes"}
            icon={selected ? Icon.MinusCircle : Icon.PlusCircle}
            onAction={() => onToggle({ id: filter.id, name: filter.name })}
          />
        </ActionPanel>
      }
    />
  );
}

import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { DEFAULT_SORT_MODE, parseSortMode, SortMode } from "../sort";

const SORT_MODE_KEY = "sortMode";

/** The list's sort mode, remembered across launches. */
const useSortMode = () => {
  const [sortMode, setMode] = useState<SortMode>(DEFAULT_SORT_MODE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    LocalStorage.getItem<string>(SORT_MODE_KEY)
      .then(value => setMode(parseSortMode(value)))
      .finally(() => setIsLoading(false));
  }, []);

  return {
    isLoading,
    sortMode,

    setSortMode: (mode: SortMode) => {
      setMode(mode);
      return LocalStorage.setItem(SORT_MODE_KEY, mode);
    },
  };
};

export default useSortMode;

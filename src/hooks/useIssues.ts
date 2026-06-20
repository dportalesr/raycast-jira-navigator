import { getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { Issue } from "../types";
import { buildScopeJql, parseEpicKeys } from "../jql";
import { searchIssues } from "../integration/jira";

type ScopePrefs = {
  epics?: string;
  extraJql?: string;
  recentlyDoneDays?: string;
};

const useIssues = () => {
  const { epics, extraJql, recentlyDoneDays } = getPreferenceValues<ScopePrefs>();

  const [isLoading, setIsLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(() => {
    setIsLoading(true);
    setError(null);

    const days = parseInt(recentlyDoneDays || "3", 10);
    const jql = buildScopeJql({
      recentlyDoneDays: Number.isFinite(days) ? days : 3,
      epics: parseEpicKeys(epics),
      extraJql,
    });

    return searchIssues(jql)
      .then(setIssues)
      .catch((err: unknown) => {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        console.error(wrapped);
        setError(wrapped);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { isLoading, issues, error, reload };
};

export default useIssues;

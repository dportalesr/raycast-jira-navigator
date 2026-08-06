import { useCallback, useEffect, useState } from "react";
import { Issue, Scope } from "../types";
import { buildScopeJql } from "../jql";
import { searchIssues } from "../integration/jira";

/**
 * Issues for the selected scope. Holds off fetching until a scope resolves
 * (filter discovery may still be in flight); reloads on scope change.
 */
const useIssues = (scope?: Scope) => {
  const [isLoading, setIsLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const scopeKey = scope ? JSON.stringify(scope) : undefined;

  const reload = useCallback(() => {
    if (!scope) return;
    setIsLoading(true);
    setError(null);

    return searchIssues(buildScopeJql(scope))
      .then(setIssues)
      .catch((err: unknown) => {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        console.error(wrapped);
        setError(wrapped);
      })
      .finally(() => setIsLoading(false));
  }, [scopeKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { isLoading, issues, error, reload };
};

export default useIssues;

import { useEffect, useState } from "react";
import { Issue } from "../types";
import { countUnreadComments, mayHaveNewComments } from "../activity";
import { fetchComments, getMyAccountId } from "../integration/jira";
import { SeenMap } from "./useSeenIssues";

/**
 * Resolves the count of *other people's* comments added since each issue was
 * last acknowledged. Comments are fetched only for issues whose total grew
 * (usually none), so this stays cheap. Returns a key -> count map; only issues
 * with at least one unread comment appear.
 */
const useUnreadComments = (issues: Issue[], snapshots: SeenMap, enabled: boolean) => {
  const [unreadByKey, setUnreadByKey] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!enabled) return;

    const candidates = issues.filter(issue => mayHaveNewComments(issue, snapshots[issue.key]));
    if (candidates.length === 0) {
      setUnreadByKey({});
      return;
    }

    let cancelled = false;
    (async () => {
      const me = await getMyAccountId().catch(() => "");
      const entries = await Promise.all(
        candidates.map(async issue => {
          const comments = await fetchComments(issue.key).catch(() => []);
          return [issue.key, countUnreadComments(comments, snapshots[issue.key].updatedAt, me)] as const;
        })
      );
      if (!cancelled) setUnreadByKey(Object.fromEntries(entries.filter(([, count]) => count > 0)));
    })();

    return () => {
      cancelled = true;
    };
  }, [issues, snapshots, enabled]);

  return unreadByKey;
};

export default useUnreadComments;

import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { Issue } from "../types";
import { isNew, snapshotOf, Snapshot } from "../activity";

const SEEN_KEY = "seenIssues";

export type SeenMap = Record<string, Snapshot>;

/**
 * Tracks, per issue, the state at the last time the user acknowledged it
 * (opened it or marked it seen). Drives the new-activity and unread-comment
 * signals. First sightings are silently baselined so nothing is "new" on the
 * initial run.
 */
const useSeenIssues = () => {
  const [snapshots, setSnapshots] = useState<SeenMap>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    LocalStorage.getItem(SEEN_KEY)
      .then(value => setSnapshots(value ? (JSON.parse(value as string) as SeenMap) : {}))
      .finally(() => setIsLoading(false));
  }, []);

  const persist = (next: SeenMap) => {
    setSnapshots(next);
    return LocalStorage.setItem(SEEN_KEY, JSON.stringify(next));
  };

  return {
    isLoading,
    snapshots,

    isNew: (issue: Issue) => isNew(issue, snapshots[issue.key]),

    markSeen: (issue: Issue) => persist({ ...snapshots, [issue.key]: snapshotOf(issue) }),

    markAllSeen: (issues: Issue[]) => {
      const next = { ...snapshots };
      for (const issue of issues) next[issue.key] = snapshotOf(issue);
      return persist(next);
    },

    /** Baseline any issue we have not snapshotted yet, so it starts quiet. */
    ensureBaseline: (issues: Issue[]) => {
      const next = { ...snapshots };
      let changed = false;
      for (const issue of issues) {
        if (!next[issue.key]) {
          next[issue.key] = snapshotOf(issue);
          changed = true;
        }
      }
      if (changed) persist(next);
    },
  };
};

export default useSeenIssues;

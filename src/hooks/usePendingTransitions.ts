import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { Issue } from "../types";
import { Transition } from "../transitions";
import { transitionIssue } from "../integration/jira";
import { createDeferredCommit, DeferredCommit } from "../deferredCommit";
import { PendingOp, PendingStorage, savePending, removePending, reconcile } from "../pendingStore";

const storage: PendingStorage = {
  getItem: async key => (await LocalStorage.getItem<string>(key)) ?? undefined,
  setItem: (key, value) => LocalStorage.setItem(key, value),
  removeItem: key => LocalStorage.removeItem(key),
};

type Overlay = Record<string, { status: string; category: string }>;

type Options = {
  /** How long a change waits, cancellable, before it hits Jira. */
  delayMs: number;
  /** Refresh the issue list after a change commits. */
  reload: () => Promise<void> | void;
};

/**
 * Manages deferred status changes: each pick is shown optimistically and queued
 * for `delayMs`, undoable with no Jira call. Pending changes are persisted so
 * they survive the command closing (flushed on unmount, reconciled on launch).
 */
export default function usePendingTransitions({ delayMs, reload }: Options) {
  const [overlay, setOverlay] = useState<Overlay>({});

  const dropOverlay = (key: string) =>
    setOverlay(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const controllerRef = useRef<DeferredCommit<PendingOp> | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = createDeferredCommit<PendingOp>({
      delayMs,
      commit: async op => {
        try {
          await transitionIssue(op.key, op.transitionId);
          await removePending(storage, op.key);
          await reload();
          dropOverlay(op.key);
          showToast({ style: Toast.Style.Success, title: `${op.key} → ${op.targetStatus}` });
        } catch (err) {
          await removePending(storage, op.key);
          dropOverlay(op.key);
          showToast({
            style: Toast.Style.Failure,
            title: `Couldn't move ${op.key}`,
            message: err instanceof Error ? err.message : String(err),
          });
        }
      },
    });
  }
  const controller = controllerRef.current;

  // Deliver any changes that never confirmed before a previous close; flush
  // anything still pending when this command unmounts.
  useEffect(() => {
    reconcile(storage, op => transitionIssue(op.key, op.transitionId))
      .then(committed => committed.length > 0 && reload())
      .catch(() => undefined);
    return () => controller.flushAll();
  }, []);

  const undo = (key: string) => {
    if (!controller.cancel(key)) return;
    removePending(storage, key);
    dropOverlay(key);
    showToast({ style: Toast.Style.Success, title: `Reverted ${key}` });
  };

  const begin = (issue: Issue, transition: Transition) => {
    const op: PendingOp = {
      key: issue.key,
      transitionId: transition.id,
      targetStatus: transition.to.status,
      targetCategory: transition.to.category,
      prevStatus: issue.status,
      prevCategory: issue.statusCategory,
    };

    setOverlay(prev => ({ ...prev, [issue.key]: { status: op.targetStatus, category: op.targetCategory } }));
    savePending(storage, op);
    controller.schedule(issue.key, op);

    showToast({
      style: Toast.Style.Animated,
      title: `${issue.key} → ${transition.to.status}`,
      message: `Applying in ${Math.round(delayMs / 1000)}s`,
      primaryAction: {
        title: "Undo",
        onAction: toast => {
          undo(issue.key);
          toast.hide();
        },
      },
    });
  };

  return { overlay, begin, undo };
}

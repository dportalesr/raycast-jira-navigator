import { Issue } from "./types";

/** State of an issue at the moment the user last acknowledged it. */
export type Snapshot = { updatedAt: string; commentTotal: number };

/** Minimal comment shape needed to decide if it is unread and by someone else. */
export type CommentMeta = { author: string; created: string };

/** Capture the current state of an issue as a snapshot. */
export function snapshotOf(issue: Pick<Issue, "updated" | "commentTotal">): Snapshot {
  return { updatedAt: issue.updated, commentTotal: issue.commentTotal };
}

/**
 * Whether the issue changed since it was last acknowledged. Without a snapshot
 * it is not "new" — first sightings are baselined separately so they stay quiet.
 */
export function isNew(issue: Pick<Issue, "updated">, snapshot?: Snapshot): boolean {
  if (!snapshot) return false;
  return Date.parse(issue.updated) > Date.parse(snapshot.updatedAt);
}

/** Whether an issue might have new comments — a cheap gate before fetching them. */
export function mayHaveNewComments(issue: Pick<Issue, "commentTotal">, snapshot?: Snapshot): boolean {
  if (!snapshot) return false;
  return issue.commentTotal > snapshot.commentTotal;
}

/**
 * Count comments left by other people since the issue was last acknowledged.
 * Your own comments are inherently seen, so they are excluded.
 */
export function countUnreadComments(comments: CommentMeta[], sinceIso: string, myAccountId: string): number {
  const since = Date.parse(sinceIso);
  return comments.filter(c => c.author !== myAccountId && Date.parse(c.created) > since).length;
}

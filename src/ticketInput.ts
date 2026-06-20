/** Matches a Jira issue key (e.g. `PROD-123`), anywhere in the input. */
export const KEY_RE = /[A-Z][A-Z0-9]+-\d+/i;

/** What the clipboard/argument resolves to for the "Open Issue" command. */
export type ClipboardResolution = { kind: "open"; key: string } | { kind: "search"; term: string } | { kind: "empty" };

/**
 * Resolve raw clipboard/argument text to an action: open a matched issue key,
 * otherwise hand the text to the dashboard as a search term. Empty input is
 * reported so the caller can show a distinct notice.
 */
export function resolveClipboardInput(raw: string): ClipboardResolution {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "empty" };

  const key = trimmed.match(KEY_RE);
  if (key) return { kind: "open", key: key[0].toUpperCase() };

  return { kind: "search", term: trimmed };
}

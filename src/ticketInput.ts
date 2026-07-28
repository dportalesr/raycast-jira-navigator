/** Matches a Jira issue key (e.g. `PROD-123`), anywhere in the input. */
export const KEY_RE = /[A-Z][A-Z0-9]+-\d+/i;

/** Matches the first run of digits, anywhere in the input. */
const NUMBER_RE = /\d+/;

/** Matches a project key, with or without the trailing hyphen (e.g. `PROD` or `PROD-`). */
const PROJECT_KEY_RE = /^([A-Z][A-Z0-9]+)-?$/i;

/** What the clipboard/argument resolves to for the "Open Issue" command. */
export type ClipboardResolution = { kind: "open"; key: string } | { kind: "search"; term: string } | { kind: "empty" };

/**
 * Normalize a user-entered fallback project key to its `PROD-` prefix form.
 *
 * @param raw Preference value, e.g. `prod`, `PROD-` or a malformed string.
 * @returns The uppercased prefix ending in a hyphen, or undefined when unusable.
 */
export function normalizeProjectPrefix(raw: string | undefined): string | undefined {
  const match = raw?.trim().match(PROJECT_KEY_RE);
  return match ? `${match[1].toUpperCase()}-` : undefined;
}

/**
 * Resolve raw clipboard/argument text to an action: open a matched issue key,
 * otherwise open a bare number qualified with the fallback project key, and
 * otherwise hand the text to the dashboard as a search term. Empty input is
 * reported so the caller can show a distinct notice.
 *
 * @param raw Clipboard contents or the command argument.
 * @param fallbackProjectKey Project key used to qualify a number that carries no prefix.
 */
export function resolveClipboardInput(raw: string, fallbackProjectKey?: string): ClipboardResolution {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "empty" };

  const key = trimmed.match(KEY_RE);
  if (key) return { kind: "open", key: key[0].toUpperCase() };

  const prefix = normalizeProjectPrefix(fallbackProjectKey);
  const number = prefix && trimmed.match(NUMBER_RE);
  if (number) return { kind: "open", key: `${prefix}${number[0]}` };

  return { kind: "search", term: trimmed };
}

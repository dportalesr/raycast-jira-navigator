import { SectionColor } from "./types";

/**
 * Weak status-name hints, tried before the category fallback. The first
 * substring match (case-insensitive) wins, so order encodes precedence. They
 * let the view distinguish custom workflow statuses that Jira collapses into a
 * single category (e.g. Review and Ready for Deployment are both `In Progress`).
 * Colors mirror the default section palette in {@link defaultSections}.
 */
const statusNameHints: { match: string; color: SectionColor }[] = [
  { match: "review", color: "orange" },
  { match: "ready", color: "green" },
];

/** Color for the three Jira status categories; `In Progress` and anything uncategorized share yellow. */
const categoryColor = (category: string): SectionColor => {
  if (category === "Done") return "purple";
  if (category === "To Do") return "blue";
  return "yellow";
};

/**
 * Accent color for a workflow status. Prefers a weak substring match on the
 * status name; otherwise falls back to the Jira status category.
 *
 * @param status the workflow status name (e.g. "Ready for Deployment")
 * @param category the Jira status category ("To Do" | "In Progress" | "Done")
 * @return [SectionColor] a section-palette color key
 */
export function statusColor(status: string, category: string): SectionColor {
  const hint = statusNameHints.find(h => status.toLowerCase().includes(h.match));
  return hint?.color ?? categoryColor(category);
}

import { Color, Icon } from "@raycast/api";
import { SectionColor } from "./types";
import { statusColor } from "./statusColor";

export const sectionColors: Record<SectionColor, Color> = {
  red: Color.Red,
  orange: Color.Orange,
  yellow: Color.Yellow,
  green: Color.Green,
  blue: Color.Blue,
  purple: Color.Purple,
  gray: Color.SecondaryText,
};

/**
 * Weak status-name → glyph hints, tried before the category fallback. First
 * substring match (case-insensitive) wins, so order encodes precedence. Tune
 * these freely; the color is resolved separately by {@link statusColor}.
 */
const statusIconHints: { match: string; icon: Icon }[] = [
  { match: "review", icon: Icon.CircleProgress100 },
  { match: "ready", icon: Icon.CheckCircle },
];

/** Glyph for the three Jira status categories, used when no name hint matches. */
const categoryGlyph = (category: string): Icon => {
  if (category === "Done") return Icon.CheckCircle;
  if (category === "In Progress") return Icon.CircleProgress50;
  return Icon.Circle;
};

/**
 * Icon for a workflow status (e.g. in the Change Status submenu). Resolves a
 * glyph from {@link statusIconHints}, falling back to the status category, and
 * tints it via {@link statusColor} so statuses Jira lumps into one category
 * stay distinguishable.
 */
export function statusIcon(status: string, category: string) {
  const lower = status.toLowerCase();
  const hint = statusIconHints.find(h => lower.includes(h.match));
  return {
    source: hint?.icon ?? categoryGlyph(category),
    tintColor: sectionColors[statusColor(status, category)],
  };
}

/** Map a Jira issue type to a Raycast icon. Falls back to a plain dot. */
export function typeIcon(type: string): Icon {
  switch (type.toLowerCase()) {
    case "epic":
      return Icon.Bolt;
    case "story":
      return Icon.Bookmark;
    case "bug":
      return Icon.Bug;
    case "sub-task":
    case "subtask":
      return Icon.BulletPoints;
    default:
      return Icon.List;
  }
}

const priorityColors: Record<string, Color> = {
  highest: Color.Red,
  high: Color.Orange,
  medium: Color.Yellow,
  low: Color.Blue,
  lowest: Color.SecondaryText,
};

/**
 * Priority accessory. Prefers Jira's own served priority icon (its colors are
 * baked in); falls back to a tinted dot when no icon URL is available.
 */
export function priorityAccessory(priority: string | null, iconUrl?: string) {
  if (!priority) return null;
  if (iconUrl) return { icon: { source: iconUrl }, tooltip: `Priority: ${priority}` };
  const color = priorityColors[priority.toLowerCase()] ?? Color.SecondaryText;
  return { icon: { source: Icon.Dot, tintColor: color }, tooltip: `Priority: ${priority}` };
}

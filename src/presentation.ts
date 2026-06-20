import { Color, Icon } from "@raycast/api";
import { SectionColor } from "./types";

export const sectionColors: Record<SectionColor, Color> = {
  red: Color.Red,
  orange: Color.Orange,
  yellow: Color.Yellow,
  green: Color.Green,
  blue: Color.Blue,
  purple: Color.Purple,
  gray: Color.SecondaryText,
};

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

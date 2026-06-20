import { Issue } from "./types";

/** A workflow transition as returned by `GET /issue/{key}/transitions`. */
export type RawTransition = {
  id: string;
  name: string;
  hasScreen: boolean;
  isAvailable: boolean;
  to: { name: string; statusCategory: { name: string } };
  fields: Record<string, { required: boolean }>;
};

/** A transition flattened to what the UI needs to show and apply it. */
export type Transition = {
  id: string;
  name: string;
  to: { status: string; category: string };
};

/**
 * True when applying the transition would need user input we cannot collect
 * from a one-tap action: it opens a screen or has a required field. These are
 * routed to the browser instead of POSTed blindly.
 */
export function requiresInput(raw: RawTransition): boolean {
  return raw.hasScreen || Object.values(raw.fields).some(field => field.required);
}

/**
 * Reduce raw transitions to the ones a one-tap action can safely apply:
 * available, screen-less, no required fields, and not a no-op back to the
 * current status. Mapped to the flat {@link Transition} shape.
 */
export function selectableTransitions(raws: RawTransition[], currentStatus: string): Transition[] {
  return raws
    .filter(raw => raw.isAvailable && !requiresInput(raw) && raw.to.name !== currentStatus)
    .map(raw => ({ id: raw.id, name: raw.name, to: { status: raw.to.name, category: raw.to.statusCategory.name } }));
}

/** Return a copy of the issue with the transition's target status applied. */
export function applyOptimistic(issue: Issue, transition: Transition): Issue {
  return { ...issue, status: transition.to.status, statusCategory: transition.to.category };
}

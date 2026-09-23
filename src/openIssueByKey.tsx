import {
  Clipboard,
  getPreferenceValues,
  getSelectedText,
  launchCommand,
  LaunchProps,
  LaunchType,
  showHUD,
} from "@raycast/api";
import { openInBrowser } from "./openInBrowser";
import { issueUrl } from "./integration/jira";
import { firstNonBlank, resolveClipboardInput } from "./ticketInput";

export default async function OpenIssueByKey(props: LaunchProps<{ arguments: { key?: string } }>) {
  const { site, fallbackProjectKey, readSelectedText } = getPreferenceValues<{
    site: string;
    fallbackProjectKey?: string;
    readSelectedText: boolean;
  }>();

  const raw = await firstNonBlank([
    () => props.arguments?.key,
    () => (readSelectedText ? getSelectedText() : undefined),
    () => Clipboard.readText(),
  ]);
  const resolution = resolveClipboardInput(raw, fallbackProjectKey);

  if (resolution.kind === "open") {
    await openInBrowser(issueUrl(site, resolution.key));
    await showHUD(`Opening ${resolution.key}`);
    return;
  }

  // Hand off to My Issues: a non-key string seeds the dashboard search, empty
  // input shows a window-anchored toast (survives longer than a HUD).
  const emptyNotice = readSelectedText
    ? "Nothing selected and clipboard is empty: nothing to open."
    : "Clipboard is empty: nothing to open.";
  const context = resolution.kind === "search" ? { searchText: resolution.term } : { notice: emptyNotice };

  await launchCommand({ name: "myIssues", type: LaunchType.UserInitiated, context }).catch(() =>
    showHUD(resolution.kind === "search" ? `Searching "${resolution.term}"` : emptyNotice)
  );
}

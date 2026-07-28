import { Clipboard, getPreferenceValues, launchCommand, LaunchProps, LaunchType, showHUD } from "@raycast/api";
import { openInBrowser } from "./openInBrowser";
import { issueUrl } from "./integration/jira";
import { resolveClipboardInput } from "./ticketInput";

export default async function OpenIssueByKey(props: LaunchProps<{ arguments: { key?: string } }>) {
  const { site, fallbackProjectKey } = getPreferenceValues<{ site: string; fallbackProjectKey?: string }>();

  const raw = props.arguments?.key || (await Clipboard.readText()) || "";
  const resolution = resolveClipboardInput(raw, fallbackProjectKey);

  if (resolution.kind === "open") {
    await openInBrowser(issueUrl(site, resolution.key));
    await showHUD(`Opening ${resolution.key}`);
    return;
  }

  // Hand off to My Issues: a non-key string seeds the dashboard search, an empty
  // clipboard shows a window-anchored toast (survives longer than a HUD).
  const context =
    resolution.kind === "search"
      ? { searchText: resolution.term }
      : { notice: "Clipboard is empty — nothing to open." };

  await launchCommand({ name: "myIssues", type: LaunchType.UserInitiated, context }).catch(() =>
    showHUD(resolution.kind === "search" ? `Searching "${resolution.term}"` : "Clipboard is empty — nothing to open.")
  );
}

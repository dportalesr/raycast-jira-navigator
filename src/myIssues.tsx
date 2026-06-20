import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import useIssues from "./hooks/useIssues";
import useHiddenIssues from "./hooks/useHiddenIssues";
import useSeenIssues from "./hooks/useSeenIssues";
import useUnreadComments from "./hooks/useUnreadComments";
import usePendingTransitions from "./hooks/usePendingTransitions";
import { parseSections, partitionIssues } from "./sections";
import { sortIssues, SortMode } from "./sort";
import { Issue, IssueSection } from "./types";
import { fetchTransitions } from "./integration/jira";
import { selectableTransitions, Transition } from "./transitions";
import { formatDate } from "./util";
import { openInBrowser } from "./openInBrowser";
import { priorityAccessory, sectionColors, statusIcon, typeIcon } from "./presentation";

type HideActions = { hideIssue: (key: string) => void; hideProject: (project: string) => void };

type ItemCtx = {
  isNew: (issue: Issue) => boolean;
  unread: (issue: Issue) => number;
  markSeen: (issue: Issue) => void;
  markAllSeen: () => void;
  changeStatus: (issue: Issue, transition: Transition) => void;
  cycleSort: () => void;
  nextSortLabel: string;
  hideActions: HideActions;
  reload: () => void;
};

const transitionDelayMs = (pref?: string) => {
  const seconds = parseInt(pref ?? "5", 10);
  return (Number.isFinite(seconds) && seconds >= 0 ? seconds : 5) * 1000;
};

const SORT_LABEL: Record<SortMode, string> = {
  triage: "Triage",
  updated: "Last Updated",
  priority: "Priority",
  key: "Issue Key",
};

const SORT_ORDER: SortMode[] = ["triage", "updated", "priority", "key"];

const isAuthError = (err: Error) => /\b(401|403)\b|unauthorized|forbidden|authentication/i.test(err.message);

export default function MyIssues(props: LaunchProps<{ launchContext?: { notice?: string; searchText?: string } }>) {
  const { isLoading: isIssuesLoading, issues, error, reload } = useIssues();
  const { isLoading: isHiddenLoading, isHiddenIssue, isHiddenProject, hideIssue, hideProject } = useHiddenIssues();
  const seen = useSeenIssues();
  const { sectionConfig, transitionDelaySeconds } = getPreferenceValues<{
    sectionConfig?: string;
    transitionDelaySeconds?: string;
  }>();
  const pending = usePendingTransitions({ delayMs: transitionDelayMs(transitionDelaySeconds), reload });
  const [sortMode, setSortMode] = useState<SortMode>("triage");
  const [searchText, setSearchText] = useState(props.launchContext?.searchText ?? "");

  const isLoading = isIssuesLoading || isHiddenLoading || seen.isLoading;

  const notice = props.launchContext?.notice;
  useEffect(() => {
    if (!notice) return;
    showToast({
      style: Toast.Style.Failure,
      title: "No issue opened",
      message: notice,
      primaryAction: { title: "Dismiss", onAction: toast => toast.hide() },
    });
  }, [notice]);

  useEffect(() => {
    if (!error) return;
    const auth = isAuthError(error);
    showToast({
      style: Toast.Style.Failure,
      title: auth ? "Jira auth failed" : "Failed to fetch issues",
      message: error.message,
      primaryAction: auth
        ? { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() }
        : { title: "Retry", onAction: () => reload() },
    });
  }, [error]);

  // Show queued status changes immediately, before they commit to Jira.
  const overlaidIssues = useMemo(
    () =>
      issues.map(issue => {
        const next = pending.overlay[issue.key];
        return next ? { ...issue, status: next.status, statusCategory: next.category } : issue;
      }),
    [issues, pending.overlay]
  );

  const visibleIssues = useMemo(
    () => overlaidIssues.filter(i => !isHiddenIssue(i.key) && !isHiddenProject(i.project)),
    [overlaidIssues, isHiddenIssue, isHiddenProject]
  );

  const sections = useMemo(
    () => partitionIssues(visibleIssues, parseSections(sectionConfig)),
    [visibleIssues, sectionConfig]
  );

  // Section color per issue, so the flat sort views can still hint status.
  const colorByKey = useMemo(() => {
    const map = new Map<string, Color>();
    for (const section of sections) {
      for (const issue of section.issues) map.set(issue.key, sectionColors[section.config.color]);
    }
    return map;
  }, [sections]);

  // Silently baseline issues we have not seen yet, so nothing is "new" on first load.
  useEffect(() => {
    if (isLoading) return;
    seen.ensureBaseline(visibleIssues);
  }, [isLoading, issues]);

  const hasAnyData = issues.length > 0;
  const showErrorEmptyView = !!error && !hasAnyData && !isLoading;
  const showEmptyView = !error && !isLoading && issues.length === 0;

  const unreadByKey = useUnreadComments(issues, seen.snapshots, !isLoading);

  const nextSortMode = SORT_ORDER[(SORT_ORDER.indexOf(sortMode) + 1) % SORT_ORDER.length];

  const ctx: ItemCtx = {
    isNew: seen.isNew,
    unread: (issue: Issue) => unreadByKey[issue.key] ?? 0,
    markSeen: seen.markSeen,
    markAllSeen: () => seen.markAllSeen(visibleIssues),
    changeStatus: (issue, transition) => {
      seen.markSeen(issue);
      pending.begin(issue, transition);
    },
    cycleSort: () => setSortMode(nextSortMode),
    nextSortLabel: SORT_LABEL[nextSortMode],
    hideActions: { hideIssue, hideProject },
    reload,
  };

  const flatIssues = sortMode === "triage" ? [] : sortIssues(visibleIssues, sortMode);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Sort" value={sortMode} onChange={v => setSortMode(v as SortMode)} storeValue>
          <List.Dropdown.Item title="Triage" value="triage" icon={Icon.Layers} />
          <List.Dropdown.Item title="Last Updated" value="updated" icon={Icon.Clock} />
          <List.Dropdown.Item title="Priority" value="priority" icon={Icon.BarChart} />
          <List.Dropdown.Item title="Issue Key" value="key" icon={Icon.Hashtag} />
        </List.Dropdown>
      }
    >
      {showErrorEmptyView && error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={isAuthError(error) ? "Jira auth failed" : "Failed to fetch issues"}
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={() => reload()} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
            </ActionPanel>
          }
        />
      ) : showEmptyView ? (
        <List.EmptyView
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
          title="No issues assigned to you"
          description="The connection worked but returned zero issues. Check that the API token belongs to the account that has these issues, and that the email matches it."
          actions={
            <ActionPanel>
              <Action title="Reload" icon={Icon.RotateClockwise} onAction={() => reload()} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
            </ActionPanel>
          }
        />
      ) : sortMode === "triage" ? (
        sections.map(section => <IssueSectionView key={section.config.title} section={section} ctx={ctx} />)
      ) : (
        <List.Section title={`${SORT_LABEL[sortMode]} (${flatIssues.length})`}>
          {flatIssues.map(issue => (
            <IssueListItem
              key={issue.id}
              issue={issue}
              tint={colorByKey.get(issue.key) ?? Color.SecondaryText}
              ctx={ctx}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function IssueSectionView({ section, ctx }: { section: IssueSection; ctx: ItemCtx }) {
  if (section.issues.length === 0) return null;

  const tint = sectionColors[section.config.color];

  return (
    <List.Section title={`${section.config.title} (${section.issues.length})`}>
      {section.issues.map(issue => (
        <IssueListItem key={issue.id} issue={issue} tint={tint} ctx={ctx} />
      ))}
    </List.Section>
  );
}

function IssueListItem({ issue, tint, ctx }: { issue: Issue; tint: Color; ctx: ItemCtx }) {
  const priority = priorityAccessory(issue.priority, issue.priorityIconUrl);
  const unread = ctx.unread(issue);
  const isNew = ctx.isNew(issue);
  const needsAttention = isNew || unread > 0;

  return (
    <List.Item
      icon={{ source: typeIcon(issue.type), tintColor: tint }}
      title={issue.key}
      subtitle={issue.summary}
      keywords={[issue.key, issue.key.split("-")[1] ?? "", issue.status, issue.type].filter(Boolean)}
      accessories={[
        ...(unread > 0 ? [{ icon: Icon.Bubble, text: `${unread}`, tooltip: `${unread} new comment(s)` }] : []),
        ...(isNew && unread === 0
          ? [{ icon: { source: Icon.Dot, tintColor: Color.Blue }, tooltip: "New activity" }]
          : []),
        { text: formatDate(issue.updated) },
        ...(priority ? [priority] : []),
      ]}
      actions={
        <ActionPanel title={issue.key}>
          <ActionPanel.Section>
            <Action
              title="Open in Browser"
              icon={Icon.Globe}
              onAction={() => {
                ctx.markSeen(issue);
                openInBrowser(issue.url);
              }}
            />
            <Action.CopyToClipboard
              title="Copy Issue Key"
              content={issue.key}
              shortcut={{ modifiers: ["opt"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Issue URL"
              content={issue.url}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Issue Key and Summary"
              content={`${issue.key} ${issue.summary}`}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy as Markdown Link"
              content={`[${issue.key}](${issue.url})`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy as Markdown Link With Summary"
              content={`[${issue.key} ${issue.summary}](${issue.url})`}
              shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Status">
            <ChangeStatusSubmenu issue={issue} onPick={transition => ctx.changeStatus(issue, transition)} />
          </ActionPanel.Section>
          <ActionPanel.Section title="View">
            <Action
              title={`Cycle Sort (${ctx.nextSortLabel})`}
              icon={Icon.Filter}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => ctx.cycleSort()}
            />
          </ActionPanel.Section>
          {needsAttention && (
            <ActionPanel.Section title="Activity">
              <Action
                title="Mark as Seen"
                icon={Icon.Check}
                shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                onAction={() => ctx.markSeen(issue)}
              />
              <Action
                title="Mark All as Seen"
                icon={Icon.CheckCircle}
                shortcut={{ modifiers: ["cmd", "opt"], key: "m" }}
                onAction={() => ctx.markAllSeen()}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Hide">
            <Action
              title="Hide Issue"
              icon={Icon.EyeDisabled}
              shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
              onAction={() => ctx.hideActions.hideIssue(issue.key)}
            />
            <Action
              title={`Hide Project (${issue.project})`}
              icon={Icon.Folder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={() => ctx.hideActions.hideProject(issue.project)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Reload Issues"
              icon={Icon.RotateClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={() => ctx.reload()}
            />
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              onAction={() => openExtensionPreferences()}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ChangeStatusSubmenu({ issue, onPick }: { issue: Issue; onPick: (transition: Transition) => void }) {
  const [transitions, setTransitions] = useState<Transition[] | null>(null);

  const load = () => {
    if (transitions) return;
    fetchTransitions(issue.key)
      .then(raw => setTransitions(selectableTransitions(raw, issue.status)))
      .catch(() => setTransitions([]));
  };

  return (
    <ActionPanel.Submenu
      title="Change Status"
      icon={Icon.Switch}
      shortcut={{ modifiers: ["cmd"], key: "t" }}
      onOpen={load}
    >
      {(transitions ?? []).map(transition => (
        <Action
          key={transition.id}
          title={transition.name}
          icon={statusIcon(transition.to.status, transition.to.category)}
          onAction={() => onPick(transition)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

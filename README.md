# Jira Navigator

A personal Jira triage dashboard for Raycast. One command shows your assigned
issues grouped by **actionable status** — not just an alphabetical list.

Modeled on the UI of `github-review-requests`, but driven by configurable
sections instead of hardcoded states, because Jira workflows vary per team.

## Commands

- **My Issues** — your assigned issues, grouped into triage sections.
- **Open Issue** — open any issue by its key from the argument or clipboard; any
  other text (a number, a phrase) opens My Issues pre-filtered by that term.

## Default sections

Issues land in the first section they match (order = priority):

| Section             | Matches                                          |
| ------------------- | ------------------------------------------------ |
| BLOCKED             | flagged / impediment (hidden when unused)        |
| REVIEW              | status `Review`                                  |
| READY FOR DEPLOYMENT| status `Ready for Deployment`                    |
| IN PROGRESS         | any other `In Progress` category status          |
| TO DO               | `To Do` category                                 |
| RECENTLY DONE       | `Done` within the last N days                    |

The named in-progress sections come before the `In Progress` catch-all, so any
new or unknown in-progress status still surfaces.

## Setup

1. Create an API token at
   [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens).
2. Set **Jira Site** (e.g. `your-team.atlassian.net`), **Account Email**, and
   **API Token** in the extension preferences.

## Preferences

| Preference            | Purpose                                                       |
| --------------------- | ------------------------------------------------------------- |
| Jira Site             | Atlassian Cloud host, without protocol                        |
| Account Email         | Atlassian account email for the API token                     |
| API Token             | Atlassian API token                                           |
| Epics                 | Comma-separated epic keys to scope to (e.g. `PROD-1, PROD-2`) |
| Extra JQL             | Optional JQL AND-appended to the scope (e.g. `project = PROD`)|
| Recently Done (days)  | Show issues completed within N days (default 3, 0 to hide)    |
| Status Change Delay   | Undo window before a status change reaches Jira (default 5)   |
| Section Config        | Optional JSON array overriding the default sections           |
| Browser / Tab Reuse   | Which browser to open issues in; reuse an existing tab        |

## Changing status

Each issue has a **Change Status** action (`⌘+T` for the inline submenu, `⌘+⇧+T`
for a pushed picker). The change shows immediately but is held for a few seconds
(see *Status Change Delay*); an **Undo** in the toast cancels it with no Jira
call. Transitions that need a Jira screen or required field are omitted — open
those in the browser. This is the extension's only write action; it uses the
same API token as everything else.

### Custom sections

Set **Section Config** to a JSON array to override the defaults. Each section:

```json
[
  { "title": "REVIEW", "color": "orange", "statuses": ["Review", "Code Review"] },
  { "title": "IN PROGRESS", "color": "yellow", "category": "In Progress" },
  { "title": "TO DO", "color": "blue", "category": "To Do" },
  { "title": "RECENTLY DONE", "color": "purple", "recentDone": true }
]
```

Matchers, checked in order: `flagged` → `recentDone` → `statuses` (by name,
case-insensitive) → `category` (To Do / In Progress / Done). Colors: `red`,
`orange`, `yellow`, `green`, `blue`, `purple`, `gray`.

## Development

```sh
npm install
npm test        # pure logic: section partitioning + JQL builder
npm run dev      # ray develop
```

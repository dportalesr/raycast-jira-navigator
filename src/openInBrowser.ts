import { getPreferenceValues, open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

interface BrowserPreferences {
  browser?: string;
  reuseExistingTab?: boolean;
  browserApp?: string;
}

// Chromium-family browsers share the same AppleScript dictionary. The URL is
// passed as `argv` (never interpolated) so it can't break out of the script.
const chromiumScript = (app: string) => `on run argv
  set theURL to item 1 of argv
  tell application "${app}"
    activate
    repeat with w in windows
      set i to 1
      repeat with t in tabs of w
        if (URL of t) starts with theURL then
          set active tab index of w to i
          set index of w to 1
          return
        end if
        set i to i + 1
      end repeat
    end repeat
    open location theURL
  end tell
end run`;

const safariScript = `on run argv
  set theURL to item 1 of argv
  tell application "Safari"
    activate
    repeat with w in windows
      repeat with t in tabs of w
        if (URL of t) starts with theURL then
          set current tab of w to t
          return
        end if
      end repeat
    end repeat
    if (count of windows) is 0 then
      make new document with properties {URL:theURL}
    else
      tell window 1 to set current tab to (make new tab with properties {URL:theURL})
    end if
  end tell
end run`;

// Browsers that expose their tabs to AppleScript. Keys match the app names used
// by `open()` and the `browser` preference values. Firefox and Arc aren't here:
// Firefox doesn't script its tabs at all, so they fall back to opening normally.
const reuseScripts: Record<string, string> = {
  "Google Chrome": chromiumScript("Google Chrome"),
  "Brave Browser": chromiumScript("Brave Browser"),
  "Microsoft Edge": chromiumScript("Microsoft Edge"),
  Safari: safariScript,
};

/**
 * Open a URL honoring the user's browser preference, reusing an existing tab
 * when the chosen browser supports it.
 *
 * - `browser` = "default": open in the system default browser (no tab reuse).
 * - A scriptable browser with reuse enabled: focus a tab already showing the
 *   URL, otherwise open a new one. Falls back to a normal open if the browser
 *   isn't running or the script fails.
 * - Any other browser (e.g. Firefox): open in that browser in a new tab.
 */
export async function openInBrowser(url: string) {
  const { browser = "default", reuseExistingTab = true, browserApp }: BrowserPreferences = getPreferenceValues();

  // An explicit app (path or bundle id) wins and is opened verbatim — this is how
  // you disambiguate variants like regular Firefox vs Firefox Developer Edition.
  // Tab reuse is skipped here since the override targets a specific app directly.
  const override = browserApp?.trim();
  if (override) {
    await open(url, override);
    return;
  }

  if (browser === "default") {
    await open(url);
    return;
  }

  const script = reuseScripts[browser];
  if (reuseExistingTab && script) {
    try {
      await runAppleScript(script, [url]);
      return;
    } catch {
      // Browser not running or not scriptable — fall through to a plain open.
    }
  }

  await open(url, browser);
}

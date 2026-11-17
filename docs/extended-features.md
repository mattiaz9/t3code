# Extended features

Features this fork adds on top of upstream T3 Code. When syncing with `main`, re-check each
entry below: resolve conflicts so the described behavior survives, and update the entry if the
code it points to moved.

## Workspace views: Chat, Browser, Code

The thread header has a segmented control, centered in the header, that switches the main
content between three views:

- **Chat**: the upstream thread view (timeline, composer, terminal drawer, thread details and the
  right panel). Nothing changes here.
- **Browser**: the integrated browser fills the content below the header. It shows the thread's
  active browser tab, or the "No preview yet" empty state when the thread has none. The browser
  surface in the right panel's launcher stays as it is.
- **Code**: the workspace file explorer and file viewer fill the content below the header. The
  Code tab is disabled for threads without a workspace.

In the Browser and Code views, the thread details, terminal drawer and right panel are hidden,
along with their header toggles. Their keyboard shortcuts do nothing: `terminal.*`,
`rightPanel.*`, `threadPanel.toggle`, `diff.toggle`, `preview.toggle`, project script chords,
`chat.find`, and the desktop menu's right-panel actions. Type-to-focus, paste-to-composer and the
composer chords are off too, so keys never land in the hidden composer. Preview chords (refresh,
zoom, find, focus URL) still work in the Browser view. Switching back to Chat restores every panel
as it was, because their open state is never changed, only ignored.

The selected view and the Code view's open file are per thread and in memory only, so a reload
returns to Chat. Embedded side-chat panes always render as Chat.

**Go to file** (`Cmd/Ctrl+P`) opens the chosen file in the Code view and switches to it. The Code
view's file tree sits on the left of the file. Opening a file leaves that tree open, at its own
width, with its own expanded folders. `pinExplorer` keeps it visible beside the file. It does not
use the right panel's explorer width or hide-explorer setting, and it has no hide control.

### Where it lives

- `apps/web/src/workspaceViewStore.ts`: per-thread view and Code view location (zustand).
- `apps/web/src/components/chat/WorkspaceView.tsx`: `WorkspaceViewTabs` (header control) and
  `WorkspaceViewContent` (mounts the lazy `PreviewPanel` or `FilePreviewPanel`).
- `apps/web/src/components/ChatView.tsx`: all wiring; search for `chatViewActive` and
  `workspaceView`.
- `apps/web/src/components/chat/useChatShortcuts.ts`: the `composerVisible` input.
- `apps/web/src/components/chat/ChatHeader.tsx`: the `className` prop that caps the breadcrumb
  width so it does not run under the centered control.

### Invariants to keep when merging

- `rightPanelOpen` in `ChatView` is `rightPanelState.isOpen && chatViewActive`. Everything derived
  from it (presence, maximize, titlebar ownership) then treats the panel as closed outside Chat,
  and `ChatRightPanel` itself only renders when `chatViewActive`. If upstream adds new uses of
  `rightPanelState.isOpen`, decide whether they need the same gate.
- The chat body is hidden, not unmounted: the canvas wrapper and the terminal drawers (wrapped in
  a `contents` div) get `inert` and `invisible` (`visibility: hidden`) outside Chat, and the
  overlay is positioned inside the chat column, which is `relative`. Unmounting or `display: none`
  would refit terminals to zero size and lose timeline scroll.
- The overlay must not get a z-index. On desktop the page is a `fixed` webview at the app root
  (`ElectronBrowserHost`, z-30 by default), so a stacking context on the overlay would paint over
  it and leave the Browser view blank. The find bar and agent cursor (z-40) inside the overlay must
  also stay above the webview, so raising the webview's z-index is not a fix either.
- Any new panel-opening shortcut or desktop menu action that upstream adds to `ChatView` needs the
  same `chatViewActive` gate. A handler written after the gated `rightPanelShortcuts` spread
  replaces that command, so `rightPanel.close` returns false unless `chatViewActive`.
  `useRightPanelActions` receives `embedded: embedded || !chatViewActive` only to drop its
  `preview.toggle` bus subscription.
- The preview mini player is not rendered outside Chat, so a browser tab is never presented in two
  places at once.
- The header is a `@container/chat-header`. Tab labels collapse to icons below 40rem of header
  width, and the breadcrumb's `max-w` uses the same breakpoint.
- New panel toggles rendered in the header must stay hidden outside Chat.

### Not covered

- Mobile (`apps/mobile`) has its own navigation and does not have these views.
- There is no command whose only job is switching views. Go to file (`Cmd/Ctrl+P`) does switch to
  Code, because that is where the file opens.

## Desktop updates from this fork

Desktop builds look for updates in this fork's GitHub releases instead of upstream's. No code
change is involved: build with the variable set in the shell, for example
`T3CODE_DESKTOP_UPDATE_REPOSITORY=mattiaz9/t3code vp run dist:desktop:dmg:arm64`. The build
script reads it from the environment only, not from `.env`. Without it, a local build has no
update feed and its updater is disabled; check for `app-update.yml` in the built app's
`Contents/Resources`.

When merging, check that `resolveGitHubPublishConfig` in `scripts/build-desktop-artifact.ts`
still honours `T3CODE_DESKTOP_UPDATE_REPOSITORY` and falls back to `GITHUB_REPOSITORY`.

## Fork releases (stable and nightly)

Upstream's `release.yml` only runs on `pingdotgg/t3code`. This fork publishes its own releases
with `.github/workflows/release-fork.yml`, which builds every desktop target upstream ships on
GitHub-hosted runners and publishes them as releases on this repository. CI builds pick up
`GITHUB_REPOSITORY` as their update feed, so installs update from the fork.

- **Nightly**: runs daily from the default branch (which must be `mattiaz9`; GitHub schedules only
  run there) when there are new commits since the last nightly, or by hand with
  `channel=nightly`. Versions are `<next patch>-nightly.<date>.<run>`, where the next patch is
  above both `apps/desktop/package.json` and the newest fork stable. Each nightly rewrites
  `nightly.json` on the `update-feed` release, which the patched electron-updater reads. Never
  delete that release. An upstream sync that rebases `mattiaz9` leaves the last nightly tag off
  the branch; the scheduled run still releases that rewritten tip. It still skips when the branch
  has only moved backward behind the tag, or when nothing new has landed inside the six-hour gap.
  `shouldReleaseNightly` keeps the upstream default (skip on divergence). Only `release-fork.yml`
  passes `releaseWhenDiverged: true`. Keep that call when merging.
- **Stable**: run the workflow by hand with `channel=stable` and a `version` (for example
  `0.1.10`). It becomes the repository's latest release.

The workflow only adds a file and calls the shared `release-desktop.yml` with its inputs. When
merging, check that `release-desktop.yml` inputs, artifact names (`js-bundle`, `desktop-*`,
`cli-*`) and the Windows job's wait for the job named `Build Linux <arch>` still match. Signing is
optional: without the Apple and Azure secrets that `release-desktop.yml` reads, builds are
unsigned and macOS cannot install in-app updates, so users download new versions by hand.
Remote-server CLI updates still come from upstream (`packages/shared/src/cliRelease.ts`).

## CI and pull request checks are off

This fork runs release workflows only. Every other file in `.github/workflows` keeps its original
`on:` block commented out, with a `workflow_dispatch` trigger in its place, so pushes and pull
requests do not start checks. The workflows that stay active are `release-fork.yml`, `release.yml`,
`release-desktop.yml`, and `publish-aur.yml` (the AUR step `release.yml` calls).

When merging upstream, leave those triggers commented on any workflow that is not one of those
four. Upstream will otherwise turn CI, previews, and issue automation back on.

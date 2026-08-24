# Nova_A 4.1.0 release notes

Nova_A 4.1 modernizes the editor shell while retaining Project Format 2 schema 29 and every frozen 4.0 public contract.

## Navigation

The public workspaces are Design, Script, Animation, UI, Debug and Manage. Settings, Packages, Project Health, Rendering and Build move to Manage. Physics Monitor is Debug-only. The bottom dock keeps Assets, Console, Animation, Audio and Profiler. Legacy calls to Packages/Project/Rendering/Build redirect to Manage; `interface` restores as UI, Settings restores through Manage, and `Complete` becomes automatic completion with Ctrl/Cmd+Space as the explicit request. See docs/NAVIGATION_4_1.md.

## Editor and typography

Workspace profiles, named/dock/split/floating/pinned/auto-hide layouts, tab rearrangement, context/history/recent assets, four search modes, shortcut conflict/import/export, Task Center and four build-readiness states are connected. Nunito Sans Variable, Noto Sans SC Variable and JetBrains Mono are local OFL-1.1 resources. The launcher validates one template and project path; guidance is dismissible project content.

## Window and compatibility

First launch is borderless and maximized on the active monitor without locking resize; later launches restore validated bounds, recover missing monitors, and re-layout under Per-Monitor-V2. F11 alone toggles exclusive fullscreen. No project schema or public runtime/plugin/package/CLI feature is removed.

## Qualification and publication gates

Local static/integration/compiler/Rust/browser/build/native checks and their hashes live in the evidence archive. Signing, five clean builds, clean-machine lifecycle, physical mixed-monitor DPI, 24 wall-clock hours, human visual/keyboard review and release-lead approval remain explicit external gates and are not falsely passed.

## Audience and supported platforms

This release is for 2D game teams that want a lighter editor with explicit production evidence. Windows x86-64 editor/runtime and Chromium web runtime are the locally qualified targets. Linux and macOS remain Experimental matching-host builds; mobile and console are unsupported/deferred.

## Additions, improvements, and compatibility

The workspace, launcher, typography, search, shortcut, Task Center, diagnostics, accessibility metadata, DPI behavior, and release automation additions are described above. No stable 4.0 feature is removed or deprecated. Project Format 2/schema 29, Rhai Runtime API 1, Plugin API 2, Package Manifest 1, and Build CLI 1 are unchanged, so no project-data migration is required. Internal features stay hidden; networking and non-Windows native targets retain their documented Experimental status. Security changes are limited to explicit disabled reasons, hidden Internal features, local font licensing, isolated native smoke, and truthful unsigned/pending-signing status.

## Upgrade and rollback

Back up the project, open it in 4.1.0, review compatibility preflight and Project Health, then save only after validation. A 4.1-saved schema-29 project remains format-compatible with 4.0, but retain the backup and prior editor for rollback. Do not uninstall or overwrite the prior build until project launch, play, tests, and export succeed. Portable builds keep user settings in the documented Nova_A application-data location unless an isolated profile is supplied.

## Known issues and external gates

There are no known Severity 0 or Severity 1 local failures. Publisher signing, malware scanning/internal security review (the build host Defender product is disabled), five clean builds, disposable-VM install/repair/update/rollback/uninstall, physical mixed-monitor DPI, Firefox, 24-hour soak, independent keyboard/screen-reader review, intentional visual-diff approval, and final human sign-off remain pending external gates. The unsigned artifacts are never labeled signed or security-approved.

## Evidence and help

See `Nova_A-v4.1.0-reference-projects.zip`, `Nova_A-v4.1.0-release-evidence.zip`, `manual/index.html`, `docs/NAVIGATION_4_1.md`, and the in-app Help → Learn Nova_A route.

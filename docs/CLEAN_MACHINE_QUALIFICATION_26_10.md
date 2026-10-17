# Nova_A 26.10 clean-machine qualification

This protocol is for a disposable machine that has never used the developer checkout. Running it in the build workspace is useful smoke evidence but does not satisfy the independent gate.

## Evidence identity

Record before installation:

- evidence schema/version, UTC start time and reviewer;
- machine/vendor model or VM image identity, CPU, RAM, GPU and storage;
- operating-system edition/build, architecture, locale, display scale and monitor resolution;
- network state, standard-user/admin state, WebView/runtime prerequisites and accessibility tools;
- SHA-256 for every tested installer, portable binary, Web archive and reference-game package;
- source commit or source-archive hash and release-evidence hash.

Do not collect private account data, unrelated file paths or signing secrets. Redact only a copy; preserve the original evidence under the release owner's access policy.

## Windows editor lifecycle

1. Start from the clean image as a standard user.
2. Verify the installer hash, publisher identity status and architecture before execution.
3. Install to the default path; record every prompt and unexpected dependency download.
4. Launch once. Confirm the decorated, resizable and maximized-by-default window can restore, resize, minimize, maximize, move across monitors and recover from an unavailable saved monitor.
5. Create a project from a startup template, save, close, reopen, Play, pause, step and stop.
6. Exercise project import/migration preview and cancel without changing the source.
7. Open each workspace, command palette, settings, Learning Center and recovery surface using keyboard navigation.
8. Build and run one representative game; verify the player starts independently of the editor and closes cleanly.
9. Upgrade from the prior supported build while preserving projects, preferences and rollback data.
10. Run Repair and confirm the application still opens the project.
11. Uninstall. Confirm installed program files/shortcuts are removed while user projects remain untouched; list any retained preference/cache data and its manual removal route.

Repeat the portable-editor/player path without installation. A locked earlier output executable must not be overwritten; a deterministic build-ID-suffixed output may be published beside it and must be reported by its actual name.

## Web lifecycle

1. Extract the Web archive into a clean directory and verify all member hashes.
2. Serve it over local HTTP(S); `file://` is unsupported.
3. Open the pinned Chromium version with an empty profile/cache.
4. Confirm first load, reload, offline-after-cache behavior where promised, input, audio unlock/recovery, storage, resizing/high DPI and fatal-error reporting.
5. Run the representative game trace and compare its expected state/checksum.

Firefox and WebKit are separate `deferred-external` matrix entries. Chromium evidence must not be copied into their results.

## Failure and recovery scenarios

Exercise insufficient output permission, locked output, full/limited storage, corrupted project, future schema, missing package, quarantined plugin, incompatible export template, network unavailable, WebView/runtime missing, graphics fallback and interrupted save/build. Each case must preserve the last valid data, show a specific error and safe next action, and leave a recoverable diagnostic bundle.

## Acceptance

Attach commands/actions, expected and actual results, screenshots where layout matters, unedited logs, exit codes, hashes, faults, repairs and final reviewer decision. A pass requires zero Severity 0/1, no silent data loss, successful install→use→upgrade→repair→uninstall, independent game launch and preserved user projects.

This gate remains `deferred-external` until a completed artifact is attached as `pending-external/windows-clean-machine.json`. A locally written checklist is not an execution result.

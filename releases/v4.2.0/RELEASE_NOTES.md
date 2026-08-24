# Nova_A 4.2.0 release notes

Nova_A 4.2 is the Project Format 2/schema 29 data-integrity foundation. It retains every v4.1 workspace and engine feature.

## Added and improved

- Central journaled project transactions with temporary files, affected-file manifests, checksums, preflight, native atomic replacement/rollback, classified failures, and Task Center/diagnostic summaries.
- Frozen canonical serialization, authored/generated separation, validator, deterministic re-save, and identity-based semantic diffs.
- Central named/grouped/nested undo history with resource/time metadata, memory limits, redo invalidation, dirty scopes, and Undo History UI.
- Separate verified autosaves and Recovery Browser preview/diff/restore/discard/open-copy; manual saves are never silently overwritten.
- Schema 5–29 migration dry run, report, estimates, backup, logs, full validation, deterministic rerun, rollback, read-only repair, reference mapping, cache rebuild, manifest reconstruction, lock/read-only open, and recoverable project trash.
- External watcher self-suppression, source-control/large-update conflict classification, compare/reload/keep-editor/keep-disk choices, plus guided Open/Add/Migrate/Archive launcher actions.

## Compatibility, upgrade, backup, rollback, and recovery

Project schema remains 29; Runtime API 1, Plugin API 2, Package Manifest 1, and Build CLI 1 are unchanged. Back up/commit the entire project, close other editors, open it through Project Manager, inspect compatibility/dry-run, migrate, validate Project Health, then save to a new branch/destination before replacing shared work. Restore the pre-upgrade download or Project Health rollback with the previous compatible editor if tests fail. After a crash, duplicate the folder, preview Recovery Browser differences, prefer Open as copy when uncertain, validate, and Save As; recovery never overwrites the manual file by itself.

## Removals/deprecations and security

Silent in-place migration, transaction-bypassing save paths, unstable serialization identity, and permanent deletion as the default are removed/deprecated. No gameplay or editor capability is removed. Archive paths are bounded/traversal-safe; diagnostics remain local.

## Platforms and known gates

Windows x86-64 and Chromium web remain the locally qualified targets; Linux/macOS remain Experimental and mobile/console unsupported. Signing, malware/independent security review, five clean builds, clean-machine lifecycle, physical DPI/accessibility/visual review, Firefox, and the 24-hour soak remain truthful external gates. See docs/KNOWN_ISSUES_4_2.md and the evidence archive.

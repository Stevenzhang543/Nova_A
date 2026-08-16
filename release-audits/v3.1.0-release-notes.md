# Nova_A 3.1.0 release notes

Release date: 16 August 2026  
Publisher: Whitelist  
Project format: 2, schema 22  
Runtime API: 1 · Plugin API: 2 · Package Manifest: 1 · Build CLI: 1

## Editor foundation

Nova_A 3.1.0 makes the editor more predictable, recoverable, and navigable without removing gameplay, rendering, physics, animation, scripting, UI, audio, build, package, or collaboration capabilities.

- The native editor starts borderless fullscreen on the active monitor. F11 restores the last valid windowed state and toggles back; monitor bounds, size, position, and scale are persisted and invalid monitor locations recover to a centered window. The launch preference is enabled by default.
- Design, Script, Animation, UI, Debug, and Custom workspaces now use one persistent layout model. Hierarchy and Inspector resize, collapse, and dock left or right. Custom layouts can be saved, duplicated, renamed, updated, imported/exported, reset, and stored per user or project. `safe-layout=1` bypasses saved geometry.
- Back/Forward navigation and the command palette cover pages, workspaces, core edit/run commands, settings, assets, scenes, objects, components, scripts, and plugin commands. Global keyboard shortcuts have a searchable editor with conflict rejection and reset controls.
- Named document transactions retain 100 operations and group continuous edits. Checksummed autosave snapshots are separate from manual saves and bounded by count and bytes. Crash startup skips corrupt entries and supports normal restore, Safe Mode, or read-only recovery.
- Task Center combines import, build, package, migration, and save state with progress, cancel, retry, errors, and copied diagnostics. Toast, banner, application modal, and inline validation have separate feedback roles; no browser alert/confirm/prompt remains.

## Renamed and relocated surfaces

- **Presentation** is no longer a separate bottom-dock identity. Its existing UI, theme, localization, accessibility, and audio tools are the central **UI workspace**. Saved Interface/Presentation layouts migrate automatically.
- **Production Lab** is now **Profiler**.
- Runtime counters and save-data inspection moved from general Settings to **Debug > Profiler > Diagnostics**.
- Plugin installation, enablement, and security moved from Settings to **Packages > Plugin API**.
- The permanent read-only Project Information surface became compact **Project Health**.
- AI, navigation, world streaming, object pooling, and networking remain intact but stay hidden unless a matching package, existing project component, or experimental project preference makes them relevant.

To reset a layout, open **View > Manage Workspaces** and choose **Reset layout**. Start with `?safe-layout=1` if a saved layout prevents access to that dialog.

## Validation summary

- Vue/TypeScript compiler: passed.
- Complete static audit: passed, including 1,167 bound controls and retained v2.5–v3.0 systems.
- Rust format and strict Clippy: passed.
- Rust workspace: 109 tests passed (32 format, 2 math, 59 physics, 5 runtime, 11 script; zero failures).
- Editor foundation automation: 13 assertions passed, including 100 mixed Undo and 100 Redo operations, grouped transactions, corrupt-latest recovery, snapshot bounds, and manual/autosave separation.
- Fresh-profile Edge 147 keyboard/layout qualification: passed with no console or fatal errors. Required layouts passed at 1366×768, 1920×1080, 2560×1440, and 3840×2160.
- Native window qualification: first fullscreen, F11 window restore, and return to fullscreen passed.
- Production WASM/Vue build and Tauri portable/MSI/NSIS builds: passed.
- Stability smoke: 500 play/stop, reimport, corrupt-input, and isolated plugin-fault cycles passed. This is not represented as the required long-duration qualification.

## Compatibility and migration

Schema remains 22 and no project-data migration was added. Engine/version metadata changes from 3.0.0 to 3.1.0. Legacy workspace identity `interface` maps to `ui`; legacy bottom tab `presentation` maps to Assets while UI authoring opens centrally. Existing optional components keep their tools visible even when experimental discovery is off.

## Known qualification limits

- The source archive is a snapshot of the reviewed working tree because no signed release tag or signing key was available in this workspace. Do not describe it as signed-tag provenance.
- Windows artifacts are not Authenticode-signed. MSI/NSIS clean-OS install/uninstall qualification remains pending; the produced portable executable was launched and window-tested locally.
- Tauri CLI reports that the optional `__TAURI_BUNDLE_TYPE` updater marker is absent. Nova_A 3.1 does not ship an updater plugin, so ordinary portable/MSI/NSIS startup is unaffected; updater-based distribution must remain disabled until separately qualified.
- The 500-cycle stability smoke is not a 24-hour or 100-hour pass. Firefox, WebKit, discrete-GPU families, OS scaling at 125/150/200%, and clean Linux/macOS runners remain pending where documented.
- Interactive cold-start, idle-memory, frame-time p95, and workspace-switch p95 were not invented by the headless benchmark; their entries are null with a follow-up plan.

## Release artifacts

The `releases/v3.1.0` folder contains exactly the mandatory top-level release notes, edit ledger, license, checksums, source, Web, reference-project, evidence, portable EXE, MSI, and NSIS artifacts. The Web archive includes hosting instructions, metadata, and internal SHA-256 integrity records.

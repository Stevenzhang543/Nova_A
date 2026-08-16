# Nova_A 3.2.0 release notes

Release date: 16 August 2026  
Publisher: Whitelist  
Project format: 2, schema 23  
Runtime API: 1 · Plugin API: 2 · Package Manifest: 1 · Build CLI: 1

## Highlights

Nova_A 3.2.0 establishes the authoritative project-data layer used by the remaining 3.x roadmap. Projects now carry an explicit manifest, stable project/asset/object identities, deterministic canonical text, nested scenes and prefabs, dependency-aware imports, ordered migration, validation, repair, backup, and rollback.

- Project Format 2 advances from schema 22 to 23. The manifest records project UUID, supported engine range, schema, package lockfile, build presets, and ownership of source/shared/generated/cache/user-local directories.
- Canonical serialization sorts object keys and set-like collections, preserves intentional authoring order, normalizes finite numbers, uses two-space UTF-8 JSON with LF endings, and preserves unknown fields. A no-op save is byte-identical.
- Scenes can be instanced and nested. Prefabs can contain nested prefab layers. Stable source identities and local IDs support Apply, Revert, individual Reset, Compare, outer-layer Unpack, duplication remapping, dependency validation, and a scene dependency graph.
- Asset metadata records importer/version, source and artifact SHA-256, dependencies and reverse dependencies, settings, previews, state, and source linkage. The bounded queue supports progress, cancellation, retry, logs, last-valid artifacts, and external-change choices.
- The Asset Browser now uses a searchable type menu, favorites, saved filters, status badges, previews, presets, dependency views, missing-reference repair, unused-resource reports, and previews before move, rename, replace, or delete.
- Project Manager previews engine/package compatibility and every migration step before opening. A full source backup is created before replacement; validation failure restores the previous project. Future schemas open in a non-mutating read-only compatibility viewer.
- **Window behavior follows the release-owner override:** Nova_A starts maximized in a normal decorated, resizable window. It is not true fullscreen. F11 explicitly enters/exits true fullscreen and restores the prior maximized/windowed state.
- All user-facing text uses a 16 px scalable base and an enforced 11 px absolute floor, including monospace previews and compact badges.

## Compatibility and migration

Schema 23 adds manifest and asset-database metadata plus nested scene/prefab layer records. Stable Runtime API 1, Plugin API 2, Package Manifest 1, and Build CLI 1 are unchanged. The migration registry contains every public source schema from 5 through 23. Schema 5–22 inputs are migrated in memory, validated, and only then replace the editor session. IDs, unknown fields, scenes, components, settings, packages, assets, and build data are preserved.

Projects from a future schema are never downgraded or silently mutated. They can be inspected and downloaded from the read-only compatibility viewer. Packages continue to use the declared `>=2.9.0 <4.0.0` engine range and are checked before project replacement.

## Upgrade and rollback

1. Open the project through Project Manager and inspect the compatibility and dry-run migration plan.
2. Download the offered full source backup before applying migration.
3. Apply migration. Nova_A validates the in-memory result before switching sessions.
4. If validation fails or the operation is interrupted, Nova_A restores the previous valid project automatically.
5. Use Project Health → **Download rollback** to retain the last migration/repair rollback document. Use **Validate project** or **Repair project** at any time; repair itself is transactional.

## Supported platforms

Windows 11 x86-64 is the locally built Tier-1 desktop target for this release. A deployable Web package is included. Linux, macOS, Android, Firefox/WebKit, discrete-GPU families, non-default DPI, code signing, and clean-OS installer qualification remain governed by the platform evidence and are not falsely reported as passed.

## Validation summary

- All retained feature audits from v2.5 through v3.1 plus the v3.2 data audit pass.
- Canonical/no-op serialization, schema 5–23 migration matrix, asset move/rename UUID preservation, interrupted replacement rollback, nested reference coverage, and a 50,000-asset benchmark pass.
- Vue/TypeScript, production Web/WASM, Rust format, strict Clippy, workspace tests, Tauri build, browser layout/keyboard/F11 qualification, and the exact native maximized/decorated/resizable startup are recorded in release evidence. The final native F11 automation rerun remains explicitly pending because the reused WebView2 process did not expose a stable debug target.
- No open S0 or S1 defect was found by the automated and local qualification described in the evidence.

## Breaking changes and deprecations

Path-only persistent references, nondeterministic serializers, direct editing of generated import artifacts, and ad-hoc folder scanning as the authoritative asset database are deprecated. Generated artifacts are visibly read-only. Existing paths remain useful display/source metadata, but UUIDs are authoritative.

No gameplay, rendering, physics, scripting, animation, UI, audio, build, package, workspace, or editor feature was removed.

## Known issues

The archives are generated from the reviewed working-tree snapshot because no signed release tag or signing key is available in this workspace. Windows binaries are not Authenticode-signed. Clean-machine install/uninstall, final native F11 interaction rerun, 24/100-hour soak, Firefox/WebKit, Linux/macOS, discrete-GPU, and complete OS scaling qualification remain pending and are identified in the evidence rather than claimed as passed.

## Release artifacts

`releases/v3.2.0` contains exactly the mandatory edit ledger, license, reference-project ZIP, evidence ZIP, source ZIP, Web ZIP, MSI, portable EXE, setup EXE, release notes, and SHA-256 checksum file.

# Nova_A 26.19 edit ledger

This deterministic path-level manifest lists every authored edit relative to the verified v26.18 candidate5 source digest 97c295f509211e43514844ef48a12f7fa19d40b278e47d452637cc19a1758537. Earlier uncommitted work and published releases are preserved. No authored file was removed. Individual pre-edit consequences are retained in VERSION_26_19_DELIVERY.md. Final qualification belongs to frozen-source evidence, not this list.

## Files changed

- `Cargo.lock` — Advance all seven local Nova crate versions; preserve third-party resolution.
- `Cargo.toml` — Advance Rust workspace engine version to 26.19.0; no dependency range changes.
- `README.md` — Present 26.19 delivery scope, lessons, notes and full edit ledger; retain the earlier multiplayer summary.
- `README.zh-CN.md` — Present 26.19 delivery scope, lessons, notes and full edit ledger; retain the earlier multiplayer summary.
- `crates/nova_format/src/lib.rs` — Advance engine authority to 26.19.0; public schema stays 29.
- `manual/MANUAL.de.md` — Integrate the complete localized 26.19 delivery lesson and advance current manual identity; preserve every previous lesson and bookmark.
- `manual/MANUAL.en.md` — Integrate the complete localized 26.19 delivery lesson and advance current manual identity; preserve every previous lesson and bookmark.
- `manual/MANUAL.zh-CN.md` — Integrate the complete localized 26.19 delivery lesson and advance current manual identity; preserve every previous lesson and bookmark.
- `manual/index.html` — Integrate the complete localized 26.19 delivery lesson and advance current manual identity; preserve every previous lesson and bookmark.
- `package.json` — Advance engine to 26.19.0; align required Node 22.22.2 and pnpm 10.30.0 with the verified release tools.
- `rust-toolchain.toml` — Pin previously working Rust 1.92.0, declare clippy, rustfmt and the WASM target; prevent future stable-channel drift.
- `scripts/nova-rhai-language-server.mjs` — Reject stale full-sync document revisions, bound framing headers, reject duplicate lengths and serialize dispatch/shutdown.
- `src-tauri/Cargo.lock` — Advance the local desktop crate version; preserve third-party resolution.
- `src-tauri/Cargo.toml` — Advance desktop application version to 26.19.0 and declare an independent resolver2 workspace so nested checkouts cannot attach to an ancestor workspace.
- `src-tauri/tauri.conf.json` — Advance packaged desktop version to 26.19.0.
- `src/components/BuildSettingsPanel.vue` — Show the localized blocked title and detail paragraph for idle builds with errors instead of Ready to build; wrap large-text Build tabs without overlapping labels.
- `src/components/PackageManagerPanel.vue` — Use core package enable/disposal, remove fake binary version relabeling, show full hashes, wrap metadata/links and stack narrow reviews; bind pending confirmations to the reviewed item. Validate attached plugins before package mutation; dispose any replaced instance.
- `src/components/TeamWorkflowPanel.vue` — Show readable local/incoming/base values, responsive stacked comparisons and pressed choice state; catch resolution errors; apply a merge through one undo transaction and reject stale previews.
- `src/i18n.ts` — Advance all three localized visible release labels to 26.19.
- `src/projects/projectData.ts` — Bound canonical input before recursive normalization and preserve literal __proto__ keys as data.
- `src/projects/projectFormat.ts` — Advance engine/public release labels to 26.19.0/26.19; preserve format and API numbers.
- `src/runtime/buildSettings.ts` — Separate detected desktop host capability from browser OS inference, block unsupported native export and retain actionable failed-detection diagnostics.
- `src/runtime/ecosystemShipping.ts` — Recheck update opt-in/channel/base/replay state after asynchronous signature verification, enforce minimum base version, cancel pending checks across opt-in changes, and reject stale commit origins. This still records operator-confirmed installer actions; it does not install binaries.
- `src/runtime/packages.ts` — Validate full candidate dependencies before install/update/removal/rollback commit and official activation; retain failed grants/history and old valid releases; notify actual plugin lifecycle. Hidden unverified flags no longer bypass full trust resolution.
- `src/runtime/plugins.ts` — Stop previous project instances; cancel pending loads before initialization and shut down stale instances; invalidate unload even before activation; unload revoked permissions; stop disabled/removed instances; prohibit implicit remote plugin asset fetching. Attached package plugins validate matching identity/version/API, clear imported consent and remain disabled.
- `src/runtime/projectExternalChanges.ts` — Bind watcher startup, reads, diagnostics and timers to a generation; ignore stale completion; retry partially written invalid files without hiding validation errors.
- `src/runtime/teamWorkflow.ts` — Preserve one-sided reorder during concurrent value edits; expose incompatible orders as explicit conflicts; restore deleted identities and allow repeat choices; escape tilde/slash in paths, copy chosen values, reject duplicate identities on merged array paths. Two initial defect reproductions now pass; broader validation remains pending.

- `tests/fixtures/migrations/public-schema-expected.json` — Advance only the expected current migration engine to 26.19.0; preserve schema 29 and historical input fixtures.

## Files added

- `docs/DELIVERY_FIELD_MATRIX_26_19.md` — Record all 142 delivery template binding/action occurrences and their ownership/acceptance routes.
- `docs/DELIVERY_LESSON_26_19.de.md` — Add the complete localized game, merge, package, build, offline, external-editor and recovery workflow with explicit acceptance limits.
- `docs/DELIVERY_LESSON_26_19.en.md` — Add the complete localized game, merge, package, build, offline, external-editor and recovery workflow with explicit acceptance limits.
- `docs/DELIVERY_LESSON_26_19.zh.md` — Add the complete localized game, merge, package, build, offline, external-editor and recovery workflow with explicit acceptance limits.
- `docs/EDIT_LEDGER_26_19.md` — Record every authored path added/changed relative to the verified 26.18 source snapshot; generated evidence stays outside source.
- `docs/IMPLEMENTATION_TRACKER_26_19.md` — Record completed implementation scope, source-freeze qualification policy and explicit unavailable external acceptance.
- `docs/RELEASE_NOTES_26_19.md` — Describe final behavior, audit requirements, exact packaging contract and unqualified platform/installer/editor-GUI limits.
- `docs/VERSION_26_19_DELIVERY.md` — Added pre-edit consequences and audit plan.
- `reference-projects/projects/creator-v2619-blocks-game/README.md` — Document this separate reference, engine/schema authority, run/edit/export instructions and boundaries.
- `reference-projects/projects/creator-v2619-blocks-game/expected-output.json` — Record expected behavior and audit assertions for this separate reference.
- `reference-projects/projects/creator-v2619-blocks-game/project.nova` — Add a separate 26.19 teaching project with stable internal identities and current checkpoint-position gameplay.
- `reference-projects/projects/creator-v2619-blocks-game/test-controls.json` — Record actual controls and user acceptance actions for this separate reference.
- `reference-projects/projects/creator-v2619-code-game/README.md` — Document this separate reference, engine/schema authority, run/edit/export instructions and boundaries.
- `reference-projects/projects/creator-v2619-code-game/expected-output.json` — Record expected behavior and audit assertions for this separate reference.
- `reference-projects/projects/creator-v2619-code-game/project.nova` — Add a separate 26.19 teaching project with stable internal identities and current checkpoint-position gameplay.
- `reference-projects/projects/creator-v2619-code-game/test-controls.json` — Record actual controls and user acceptance actions for this separate reference.
- `reference-projects/projects/creator-v2619-mixed-game/README.md` — Document this separate reference, engine/schema authority, run/edit/export instructions and boundaries.
- `reference-projects/projects/creator-v2619-mixed-game/expected-output.json` — Record expected behavior and audit assertions for this separate reference.
- `reference-projects/projects/creator-v2619-mixed-game/project.nova` — Add a separate 26.19 teaching project with stable internal identities and current checkpoint-position gameplay.
- `reference-projects/projects/creator-v2619-mixed-game/test-controls.json` — Record actual controls and user acceptance actions for this separate reference.
- `reference-projects/projects/delivery-v2619-package-build/README.md` — Document this separate reference, engine/schema authority, run/edit/export instructions and boundaries.
- `reference-projects/projects/delivery-v2619-package-build/expected-output.json` — Record expected behavior and audit assertions for this separate reference.
- `reference-projects/projects/delivery-v2619-package-build/project.nova` — Add a separate 26.19 teaching project with stable internal identities and current checkpoint-position gameplay.
- `reference-projects/projects/delivery-v2619-package-build/test-controls.json` — Record actual controls and user acceptance actions for this separate reference.
- `reference-projects/projects/delivery-v2619-semantic-merge/README.md` — Document this separate reference, engine/schema authority, run/edit/export instructions and boundaries.
- `reference-projects/projects/delivery-v2619-semantic-merge/expected-output.json` — Record expected behavior and audit assertions for this separate reference.
- `reference-projects/projects/delivery-v2619-semantic-merge/incoming.nova` — Add a separate conflicting incoming project that moves Checkpoint 1 to X=-2.
- `reference-projects/projects/delivery-v2619-semantic-merge/project.nova` — Add a separate 26.19 teaching project with stable internal identities and current checkpoint-position gameplay.
- `reference-projects/projects/delivery-v2619-semantic-merge/test-controls.json` — Record actual controls and user acceptance actions for this separate reference.
- `reference-projects/projects/server-v2619-headless-authority/README.md` — Document this separate reference, engine/schema authority, run/edit/export instructions and boundaries.
- `reference-projects/projects/server-v2619-headless-authority/expected-output.json` — Record expected behavior and audit assertions for this separate reference.
- `reference-projects/projects/server-v2619-headless-authority/project.nova` — Add a separate 26.19 teaching project with stable internal identities and current checkpoint-position gameplay.
- `reference-projects/projects/server-v2619-headless-authority/test-controls.json` — Record actual controls and user acceptance actions for this separate reference.
- `scripts/generate-v26.19-field-manual.mjs` — Inventory each delivery panel action/binding occurrence and its validation/persistence/runtime audit route; support read-only verification.
- `scripts/generate-v26.19-references.mjs` — Generate six isolated current references and incoming conflict fixture; query checkpoint world positions and deterministically regenerate equivalent linked graphs; support read-only verification.
- `scripts/generate-v26.19-teaching.mjs` — Integrate complete delivery lessons into three cumulative manuals and HTML while preserving historical lessons; support read-only verification.
- `scripts/lib/deliveryExportAudit19.mjs` — Verify actual exported ZIP entries, package/file hashes and saved scene values with real browser player input.
- `scripts/verify-v26.19-authoring.mjs` — Aggregate fresh actual-user reports and embedded screenshots/downloads with exact matrix counts.
- `scripts/verify-v26.19-delivery-user.mjs` — Add actual conflicting file import, selection, one-step history, save/reopen, exact Web export and changed checkpoint gameplay; 54 conflict layout surfaces.
- `scripts/verify-v26.19-delivery.mjs` — Add 27 actual-source programmer regression groups for merge identities/order/bounds, atomic package dependency rejection, real WASM disposal, updater signature/cancellation/replay, archive paths and watcher ownership.
- `scripts/verify-v26.19-focus.mjs` — Aggregate fresh version-bound programmer reports, code/graph/reference/manual checks and packaging metadata preflight.
- `scripts/verify-v26.19-lsp.mjs` — Exercise an actual stdio LSP process for stale edits, malformed-header recovery, document disposal and shutdown; all three groups pass.
- `scripts/verify-v26.19-package-user.mjs` — Add actual permission review/install, browser native/Web readiness, disable/enable/remove/Undo/save/reopen and 108 package layout surfaces.
- `scripts/verify-v26.19-reproducibility.mjs` — Add fresh-source offline WASM/Web/native compile checks, move into a path with spaces, explicitly repair pnpm links offline and rebuild native permission metadata in a fresh relocated target with four compiler jobs, capture complete logs, compare Web bytes and retain command logs/source digest.
- `scripts/verify-v26.19-save-recovery.mjs` — Run nine current-version real transaction checks with quota, destination and interrupted-write failure fixtures.
- `src/editor/deliveryLabels19.ts` — Add English/German/Chinese conflict comparison, absent-value, ordering and review copy.

Scratch scripts, intermediate failures, screenshots, build outputs and completion reports remain under .cache and release-audits; the 11 published artifacts belong only in releases/v26.19.

Attached plugin imports validate ID/version/API before package mutation, clear all imported grants and remain disabled for explicit review; replacing an attached manifest disposes the old instance. This closes the same consent boundary already enforced by the dedicated plugin importer.

Official package trust binds normalized operational metadata, including permissions, dependencies and visual declarations; legacy description and vulnerability-policy prose may differ. Publisher-signed verification binds the complete normalized manifest.

Official references retain compatibility with legacy description and vulnerability-policy wording; execution-relevant metadata remains trust-bound. A current-reference load regression covers this boundary.

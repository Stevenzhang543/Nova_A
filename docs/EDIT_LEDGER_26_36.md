# Nova_A26.36 — Edit ledger

Engine26.36.0. This deterministic path-level manifest compares the exact pre-task filesystem baseline, including pre-existing uncommitted work, with the current authored release source. It does not attribute earlier website/deployment changes or deleted www files to this task.

Baseline: 7c93392bc01512b1b7971cbb422169b33d7d2f62fd7193d706ed1a8a50213443; 3629 files. 85 recorded edits; 0 removed files. Generated outputs, caches, logs, builds and release folders are excluded by the shared source policy.

Original artwork is preserved without redesign or background removal. Supplied light/dark marks replace only Nova branding; authored game identity, project schema and runtime behavior remain. Static native/PWA fallback uses the dark artwork; editor and manual theme ownership remain separate.

Verification is scoped to linked asset/theme/manual and fresh Windows/Web/WASM/reference delivery risks. Only successful frozen-source execution in the evidence archive certifies the release. Signing, clean installation, physical icon-cache/DPI/device rendering and unrelated engine/UI sweeps remain unclaimed. Prior immutable releases remain intact.

## Files changed/added

- `Cargo.lock` — changed: Synchronize current26.36/26.36.0 authority and migration expectations; schema29 and dependency versions remain unchanged.
- `Cargo.toml` — changed: Synchronize current26.36/26.36.0 authority and migration expectations; schema29 and dependency versions remain unchanged.
- `crates/nova_format/src/lib.rs` — changed: Synchronize current26.36/26.36.0 authority and migration expectations; schema29 and dependency versions remain unchanged.
- `docs/EDIT_LEDGER_26_36.md` — added: List every path-level edit and consequence against the exact pre-task source inventory; final snapshot binds this self-referential document.
- `docs/NATIVE_HEADLESS_26_36.md` — added: Document current reference identities while preserving physics-only stdio versus renderer-disabled game authority distinctions.
- `docs/RELEASE_NOTES_26_36.md` — added: Document actual branding replacements, unchanged compatibility and exact11artifact delivery with measured/unclaimed verification limits.
- `docs/ui/DECISIONS.md` — changed: Record supplied-art theme ownership, fixed native/PWA fallback, bounded geometry and no new interface architecture.
- `docs/ui/MIGRATION.md` — changed: Track scoped26.36 branding integration and the difference between development screenshots and frozen release qualification.
- `docs/WEB_HOSTING_26_36.md` — added: Document relative current Web branding paths, fixed PWA icon and unchanged online-only install behavior.
- `index.html` — changed: Replace the old render-tool SVG favicon with the default dark32PNG link that the saved editor theme updates; nested relative hosting stays supported.
- `manual/index.html` — changed: Update current version and short multilingual branding lesson; replace literal manual N/gradient with same34px supplied marks and theme-following favicon using bundled relative asset URLs.
- `manual/MANUAL.de.md` — changed: Update current manual metadata and short translated branding lesson; preserve historical tutorials and engine/API behavior.
- `manual/MANUAL.en.md` — changed: Update current manual metadata and short translated branding lesson; preserve historical tutorials and engine/API behavior.
- `manual/MANUAL.zh-CN.md` — changed: Update current manual metadata and short translated branding lesson; preserve historical tutorials and engine/API behavior.
- `package.json` — changed: Advance engine authority to26.36.0 and expose current preparation/verification commands without changing dependencies.
- `player.html` — changed: Add a bundled default Nova Player PNG favicon whose Vite asset entry follows existing export collectors; authored game title/icon settings are not rewritten.
- `public/branding/nova-dark-256.png` — added: Serve a bounded256px supplied-theme derivative in launcher/editor shared marks; fixed-size dual images preserve live-switch geometry.
- `public/branding/nova-light-256.png` — added: Serve a bounded256px supplied-theme derivative in launcher/editor shared marks; fixed-size dual images preserve live-switch geometry.
- `public/nova-icon-192.png` — changed: Replace the existing PWA/home-screen icon with the supplied dark artwork at the declared192px size; installation stays online-only.
- `public/nova-icon-32.png` — added: Provide the compact default dark browser/favicon bitmap from the exact supplied artwork.
- `public/nova-icon-512.png` — changed: Replace the existing PWA install icon with the supplied dark artwork at the declared512px size; manifest identity and purpose remain.
- `public/nova-icon-light-32.png` — added: Provide the matching compact light browser favicon, selected by the saved editor theme.
- `README.md` — changed: Expose current26.36 release/artifact/edit evidence and retain previous version context.
- `README.zh-CN.md` — changed: Expose current26.36 release/artifact/edit evidence in the Chinese project entry.
- `reference-projects/projects/creator-v2636-mixed-game/expected-output.json` — added: Add current26.36 identity copy of the existing mixed-authoring or renderer-disabled authority example; gameplay, entity UUIDs and declared controls retain their contracts.
- `reference-projects/projects/creator-v2636-mixed-game/project.nova` — added: Add current26.36 identity copy of the existing mixed-authoring or renderer-disabled authority example; gameplay, entity UUIDs and declared controls retain their contracts.
- `reference-projects/projects/creator-v2636-mixed-game/README.md` — added: Add current26.36 identity copy of the existing mixed-authoring or renderer-disabled authority example; gameplay, entity UUIDs and declared controls retain their contracts.
- `reference-projects/projects/creator-v2636-mixed-game/test-controls.json` — added: Add current26.36 identity copy of the existing mixed-authoring or renderer-disabled authority example; gameplay, entity UUIDs and declared controls retain their contracts.
- `reference-projects/projects/server-v2636-headless-authority/expected-output.json` — added: Add current26.36 identity copy of the existing mixed-authoring or renderer-disabled authority example; gameplay, entity UUIDs and declared controls retain their contracts.
- `reference-projects/projects/server-v2636-headless-authority/project.nova` — added: Add current26.36 identity copy of the existing mixed-authoring or renderer-disabled authority example; gameplay, entity UUIDs and declared controls retain their contracts.
- `reference-projects/projects/server-v2636-headless-authority/README.md` — added: Add current26.36 identity copy of the existing mixed-authoring or renderer-disabled authority example; gameplay, entity UUIDs and declared controls retain their contracts.
- `reference-projects/projects/server-v2636-headless-authority/test-controls.json` — added: Add current26.36 identity copy of the existing mixed-authoring or renderer-disabled authority example; gameplay, entity UUIDs and declared controls retain their contracts.
- `reference-projects/README.md` — changed: Register the two current-version example identities while retaining historical examples.
- `reports/branding/26.36/development/v26.36-branding-user-editor-dark.png` — added: Preserve actual development branding observations/captures and their unqualified scope; final release acceptance comes from separate fresh frozen-source execution.
- `reports/branding/26.36/development/v26.36-branding-user-editor-light-minimum-200.png` — added: Preserve actual development branding observations/captures and their unqualified scope; final release acceptance comes from separate fresh frozen-source execution.
- `reports/branding/26.36/development/v26.36-branding-user-editor-light.png` — added: Preserve actual development branding observations/captures and their unqualified scope; final release acceptance comes from separate fresh frozen-source execution.
- `reports/branding/26.36/development/v26.36-branding-user-launcher-dark.png` — added: Preserve actual development branding observations/captures and their unqualified scope; final release acceptance comes from separate fresh frozen-source execution.
- `reports/branding/26.36/development/v26.36-branding-user-launcher-light-minimum-200.png` — added: Preserve actual development branding observations/captures and their unqualified scope; final release acceptance comes from separate fresh frozen-source execution.
- `reports/branding/26.36/development/v26.36-branding-user-launcher-light-reloaded.png` — added: Preserve actual development branding observations/captures and their unqualified scope; final release acceptance comes from separate fresh frozen-source execution.
- `reports/branding/26.36/development/v26.36-branding-user-manual-dark.png` — added: Preserve actual development branding observations/captures and their unqualified scope; final release acceptance comes from separate fresh frozen-source execution.
- `reports/branding/26.36/development/v26.36-branding-user-manual-light-reloaded.png` — added: Preserve actual development branding observations/captures and their unqualified scope; final release acceptance comes from separate fresh frozen-source execution.
- `reports/branding/26.36/development/v26.36-branding-user-manual-light.png` — added: Preserve actual development branding observations/captures and their unqualified scope; final release acceptance comes from separate fresh frozen-source execution.
- `reports/branding/26.36/development/v26.36-branding-user-static-nested-launcher.png` — added: Preserve actual development branding observations/captures and their unqualified scope; final release acceptance comes from separate fresh frozen-source execution.
- `reports/branding/26.36/development/v26.36-branding-user-static-root-launcher.png` — added: Preserve actual development branding observations/captures and their unqualified scope; final release acceptance comes from separate fresh frozen-source execution.
- `reports/branding/26.36/development/v26.36-branding-user.json` — added: Preserve actual development branding observations/captures and their unqualified scope; final release acceptance comes from separate fresh frozen-source execution.
- `reports/branding/26.36/EDIT_MANIFEST.json` — added: Machine-readable deterministic path-level manifest with before/after identities; self hashes are excluded recursively and bound by the final source snapshot.
- `scripts/generate-branding-icons.mjs` — added: Make the supplied-image icon derivation reproducible using the already pinned local Tauri CLI; preserve originals and emit only needed resources and provenance.
- `scripts/lib/browserUserAudit.mjs` — changed: Extend the existing bounded actual-version regression target allowlist through26.36; retained report origins and stale-source rejection remain.
- `scripts/lib/milestoneAuditContext.mjs` — changed: Allow integrated26.36 qualification without staged/private app overlays; retain version/provenance checks.
- `scripts/prepare-release-26.36.mjs` — added: Define12 linked fresh delivery gates and explicit omissions for the icon-only release; bind required binaries/assets/docs to frozen source.
- `scripts/qualify-v26.36-scoped.mjs` — added: Execute focused asset/browser/static-host/reference checks and collect fresh evidence without unrelated all-panel/runtime sweeps.
- `scripts/verify-v26.34-native-headless.mjs` — changed: Permit explicit current26.36 target while retaining the eight real physics-only process checks and historical regression origin.
- `scripts/verify-v26.36-branding-assets.mjs` — added: Verify original/derived identities, dimensions and source/native icon resources against fresh binaries; accept only observed PNG planes0-to1 Windows header normalization while requiring exact one-to-one payload identity and rejecting invalid headers, duplicates, missing frames or changed artwork. Preserve raw native resource evidence before assertions; bounded evidence does not claim physical OS cache behavior.
- `scripts/verify-v26.36-branding-user.mjs` — added: Verify loaded themed marks, all palettes, persistent shell geometry, minimum/large text, saved themes, local static/favicon/PWA and manual behavior through real input.
- `src-tauri/Cargo.lock` — changed: Synchronize current26.36/26.36.0 authority and migration expectations; schema29 and dependency versions remain unchanged.
- `src-tauri/Cargo.toml` — changed: Synchronize current26.36/26.36.0 authority and migration expectations; schema29 and dependency versions remain unchanged.
- `src-tauri/icons/128x128.png` — changed: Replace the existing native icon resource with the supplied dark design at its existing platform format/size; Windows editor, installer and default native-player branding inherit it.
- `src-tauri/icons/128x128@2x.png` — changed: Replace the existing native icon resource with the supplied dark design at its existing platform format/size; Windows editor, installer and default native-player branding inherit it.
- `src-tauri/icons/32x32.png` — changed: Replace the existing native icon resource with the supplied dark design at its existing platform format/size; Windows editor, installer and default native-player branding inherit it.
- `src-tauri/icons/icon.icns` — changed: Replace the existing native icon resource with the supplied dark design at its existing platform format/size; Windows editor, installer and default native-player branding inherit it.
- `src-tauri/icons/icon.ico` — changed: Replace the existing native icon resource with the supplied dark design at its existing platform format/size; Windows editor, installer and default native-player branding inherit it.
- `src-tauri/icons/icon.png` — changed: Replace the existing native icon resource with the supplied dark design at its existing platform format/size; Windows editor, installer and default native-player branding inherit it.
- `src-tauri/icons/Square107x107Logo.png` — changed: Replace the existing native icon resource with the supplied dark design at its existing platform format/size; Windows editor, installer and default native-player branding inherit it.
- `src-tauri/icons/Square142x142Logo.png` — changed: Replace the existing native icon resource with the supplied dark design at its existing platform format/size; Windows editor, installer and default native-player branding inherit it.
- `src-tauri/icons/Square150x150Logo.png` — changed: Replace the existing native icon resource with the supplied dark design at its existing platform format/size; Windows editor, installer and default native-player branding inherit it.
- `src-tauri/icons/Square284x284Logo.png` — changed: Replace the existing native icon resource with the supplied dark design at its existing platform format/size; Windows editor, installer and default native-player branding inherit it.
- `src-tauri/icons/Square30x30Logo.png` — changed: Replace the existing native icon resource with the supplied dark design at its existing platform format/size; Windows editor, installer and default native-player branding inherit it.
- `src-tauri/icons/Square310x310Logo.png` — changed: Replace the existing native icon resource with the supplied dark design at its existing platform format/size; Windows editor, installer and default native-player branding inherit it.
- `src-tauri/icons/Square44x44Logo.png` — changed: Replace the existing native icon resource with the supplied dark design at its existing platform format/size; Windows editor, installer and default native-player branding inherit it.
- `src-tauri/icons/Square71x71Logo.png` — changed: Replace the existing native icon resource with the supplied dark design at its existing platform format/size; Windows editor, installer and default native-player branding inherit it.
- `src-tauri/icons/Square89x89Logo.png` — changed: Replace the existing native icon resource with the supplied dark design at its existing platform format/size; Windows editor, installer and default native-player branding inherit it.
- `src-tauri/icons/StoreLogo.png` — changed: Replace the existing native icon resource with the supplied dark design at its existing platform format/size; Windows editor, installer and default native-player branding inherit it.
- `src-tauri/tauri.conf.json` — changed: Synchronize26.36.0 and explicitly bind both NSIS installer and uninstaller icons to the supplied dark ICO; replace their inherited generic NSIS graphics without changing installer behavior, dependencies or permissions.
- `src/assets/branding/manifest.json` — added: Preserve supplied original PNGs or record/serve exact derived assets for bundled manual/player use; provenance records distinguish light/dark and the artwork is not redesigned.
- `src/assets/branding/nova-dark-256.png` — added: Preserve supplied original PNGs or record/serve exact derived assets for bundled manual/player use; provenance records distinguish light/dark and the artwork is not redesigned.
- `src/assets/branding/nova-dark-32.png` — added: Preserve supplied original PNGs or record/serve exact derived assets for bundled manual/player use; provenance records distinguish light/dark and the artwork is not redesigned.
- `src/assets/branding/nova-dark-original.png` — added: Preserve supplied original PNGs or record/serve exact derived assets for bundled manual/player use; provenance records distinguish light/dark and the artwork is not redesigned.
- `src/assets/branding/nova-light-256.png` — added: Preserve supplied original PNGs or record/serve exact derived assets for bundled manual/player use; provenance records distinguish light/dark and the artwork is not redesigned.
- `src/assets/branding/nova-light-original.png` — added: Preserve supplied original PNGs or record/serve exact derived assets for bundled manual/player use; provenance records distinguish light/dark and the artwork is not redesigned.
- `src/layout/TopBar.vue` — changed: Use the same shared themed mark in the persistent editor header and remove its obsolete literal-N styling; existing name/link/menu behavior remains.
- `src/main.ts` — changed: Install the editor favicon watcher once and dispose it on development hot replacement; no idle timer or native permission is added.
- `src/projects/projectFormat.ts` — changed: Synchronize current26.36/26.36.0 authority and migration expectations; schema29 and dependency versions remain unchanged.
- `src/ui/branding.ts` — added: Centralize relative theme-specific brand/favicon URLs and a disposable editor favicon watcher; exported player theme/identity stays independent.
- `src/ui/components/NovaMark.vue` — changed: Replace the legacy vector N with both eagerly loaded supplied variants in the existing fixed decorative box; live theme switching preserves dimensions and suppresses drag/extra accessibility text.
- `tests/fixtures/migrations/public-schema-expected.json` — changed: Synchronize current26.36/26.36.0 authority and migration expectations; schema29 and dependency versions remain unchanged.

External workspace changes observed after the baseline (939 paths) are separately recorded in the manifest, preserved and not claimed as this task's edits. These include concurrent website work and externally removed instruction/design documents listed individually in the manifest; this task does not restore those deletions. Conversation instructions remain in effect. These external changes receive no app-release verification claim.

Exact before/after SHA-256 and byte counts are recorded in reports/branding/26.36/EDIT_MANIFEST.json. This ledger and manifest exclude their own recursive hashes; the immutable release snapshot binds both.

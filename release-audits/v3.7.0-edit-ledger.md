# Nova_A 3.7.0 exhaustive edit ledger

## Renderer and outline

- `src/world/components.ts`: changed only the new/default ShapeRenderer2D stroke width from 1 to 0.04 world units.
- `src/renderer/geometry.ts`: replaced independent edge quads with a joined bounded-miter stroke ring; removed ES2022-only last-element access.
- `src/renderer/types.ts`, `Canvas2DRenderer.ts`, `WebGL2Renderer.ts`, `sceneRenderer.ts`: added font outline/fallback command data, Canvas stroke text, cached WebGL outlined glyphs and imported fallback-family binding.
- `src/renderer/capabilities.ts`, `renderSettings.ts`, `renderGraph.ts`, `renderTextures.ts`, `materials.ts`, `lighting2d.ts`: retained and surfaced Tier 1/fallback reporting, quality, captures, targets, typed materials/shaders and 2D lighting infrastructure.
- `src/components/RenderingPanel.vue`: replaced the raw-default dock with Lighting, Materials, Shaders, Particles, Diagnostics and Quality sections; added typed controls, source-linked errors, live preview, capability/reset, captures/compare, debug views, overlays and presets.
- `src/components/ProjectHealthPanel.vue`: added live reactive renderer capability/fallback health.
- `src/renderer/renderSettings.ts`: made every quality preset, including PixelArt, explicit and auditable.

## Assets, fonts and particles

- `src/assets/types.ts`: added texture/audio/font profile types and explicit serialized defaults.
- `src/assets/importProfiles.ts`: added deterministic General/Pixel/UI/Normal and SFX/Music/Voice/Streaming profile application.
- `src/assets/AssetDatabase.ts`: normalized nested audio/font settings during load.
- `src/components/EditorBottomPanel.vue`: added profile, codec, quality, trim, scalable/bitmap, fallback, outline and shaping controls while retaining preview/import workflows.
- `src/runtime/gameUi.ts`: applied imported font fallback and outline settings to runtime UI text.
- `src/runtime/particles.ts`: retained bounded curves/gradients/shapes/subemitters/budgets and removed ES2022-only last-element access.

## Audio

- `src/runtime/audio.ts`: added import trim/loop binding with per-tick boundary enforcement, deterministic randomization, real per-component polyphonic voices, master/bus/component limits, virtual/limited counters, device-change handling, base/output latency and underrun metrics; polyphonic voices now follow pause/stop, spatial attenuation, pan and mixer graph changes.
- `src/components/PresentationPanel.vue` and `ProfilerPanel.vue`: added voice, latency, underrun and device diagnostics.

## Format, localization and product identity

- `crates/nova_format/src/lib.rs`: advanced to schema 27/engine 3.7.0; added visual-audio migration/defaults, safe legacy-outline correction and migration test.
- `src/projects/projectFormat.ts`, runtime/export/report/version surfaces, Cargo/Tauri/package metadata and both Cargo lockfiles: advanced engine authority to 3.7.0 and schema authority to 27.
- `src/world/World.ts`: made the deliberate Node audit fallback quiet while preserving normal browser/Tauri WASM initialization.
- `src/i18n.ts`: added English, German and Chinese labels for every new import/render/audio control.
- `tests/fixtures/migrations/public-schema-inputs.json` and `public-schema-expected.json`: added schema 27 to the complete public-schema matrix and advanced the golden target to engine 3.7.0.

## Qualification, references and release

- `scripts/export-reference-projects.mjs`: advanced generated projects to schema 27 and added lighting/shadows, particles, typed shaders, render textures, multilingual fonts, positional audio, bus effects and streaming-audio references with a playable WAV fixture.
- `scripts/audit-v3.7.mjs`, `verify-v3.7.mjs`, `qualify-layout-v3.7.mjs`, `generate-v3.7-release-evidence.mjs`: added static, headless, browser-layout and release-evidence qualification.
- Existing retained manual/rendering/v3 audits were updated only where current engine/schema/manual authority or the restored debug control must be checked; historical v3.6 evidence identities remain historical.
- `scripts/package-release.ps1`: advanced web release metadata to schema 27; mandatory Windows/Web/source/reference/evidence packages and checksums remain unchanged.
- `README.md`, `README.zh-CN.md`, manuals and docs: documented v3.7 workflows, fallback boundaries, codec limits and schema migration.
- `release-audits/v3.7.0-*` and `releases/v3.7.0/*`: added generated verification, notes, ledger, migration/deprecation/known-issue documents and distributable artifacts.

No feature, animation, project data, physics behavior, script API, plugin API or supported export target was removed.

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

process.env.NOVA_EVIDENCE_VERSION = '3.7.0'
await import('./generate-v3.3-release-evidence.mjs')

const root = dirname(dirname(fileURLToPath(import.meta.url))), output = join(root, 'release-audits')
const knownPath = join(output, 'v3.7.0-known-issues.json'), known = JSON.parse(await readFile(knownPath, 'utf8'))
known.items = [
  { severity: 'S2', area: 'platform qualification', issue: 'This release run builds and qualifies Windows/WebView2 and Chromium on the named Windows host; clean Linux and macOS package qualification remains an external matching-host task.', workaround: 'Run the documented platform matrix on Linux and macOS before making matching-host installer claims.' },
  { severity: 'S2', area: 'audio codecs', issue: 'Exact loop latency is codec, decoder and output-device dependent. PCM has the tightest loop budget; Vorbis/MP3 may contain encoder delay and streaming seeks use the browser media pipeline.', workaround: 'Use PCM for timing-critical short loops, place loop points at zero crossings, and inspect Audio latency/underrun metrics on each target device.' },
  { severity: 'S2', area: 'renderer fallback', issue: 'Canvas2D fallback cannot execute custom GLSL, GPU timings, normal-map lighting or post-process render targets.', workaround: 'Project Health reports the fallback. Use base materials and supported lighting, or deploy to a WebGL2-capable target.' },
  { severity: 'S2', area: 'long-duration qualification', issue: 'A 24-hour wall-clock visual/audio soak is supplied as a procedure but is not falsely claimed by this local accelerated release run.', workaround: 'Run the stability workflow on named release hardware before claiming 24-hour wall-clock endurance.' },
  { severity: 'S3', area: 'optional Tauri updater', issue: 'The Windows bundler reports that its package-type marker is unavailable because the local Tauri CLI 2.9.6 and pinned Rust crate 2.9.5 differ by one patch. Nova_A does not enable the updater plugin; portable, MSI and NSIS launch/install paths are unaffected.', workaround: 'If an updater is added later, align the Tauri CLI/Rust crate patches and requalify updater packages before enabling it.' }
]
await writeFile(knownPath, `${JSON.stringify(known, null, 2)}\n`)

await writeFile(join(output, 'v3.7.0-release-notes.md'), `# Nova_A 3.7.0 release notes

Nova_A 3.7.0 delivers the typed, asset-driven visual and audio pipeline from the 3.7 roadmap while retaining every v3.6 presentation, scripting, physics, animation, UI and export workflow.

## Visual pipeline

- WebGL2 Tier 1 and Canvas2D fallback now publish an explicit capability report, unsupported list, fallback rules, reset state, and context-loss/recovery evidence.
- The Rendering dock is divided into Lighting, Materials, Shaders, Particles, Diagnostics and Quality. Raw uniform/texture JSON is opt-in under Advanced.
- Typed material controls cover scalars, integers, ranges, enums, toggles, vectors, colors and textures. Includes, variants, compile cache, source-linked errors, inheritance and live preview remain bounded by the safe 2D shader subset.
- Quality presets visibly change shadow quality, pixel ratio, particle budget, pixel snapping and post-processing cost. Saved frame captures can be compared by pixel difference.
- Texture profiles cover General, Pixel Art, UI and Normal Map. Font profiles cover scalable/bitmap cache behavior, fallback families, shaping and outlines.
- New-shape outlines use a 0.04-world-unit default and one joined bounded-miter ring, eliminating the protruding cross-shaped corners reported in v3.6.

## Audio pipeline

- Audio imports expose Sound Effect, Music, Voice and Streaming profiles; Original/PCM/Vorbis/MP3 storage metadata; quality, normalize, trim, loop and streaming controls.
- Runtime audio supports 2D listener/panning/attenuation, buses, sends, snapshots, ducking, filters/compression/delay/reverb, deterministic per-component polyphony, random pitch/volume, priority, master/bus limits and virtualization counters.
- Profiler diagnostics expose active/streaming/buffered/virtual voices, base/output latency, underruns, device changes and bus meters.
- UI/animation audio continues through the same project mixer.

## Supported and fallback behavior

WebGL2 is the Tier 1 renderer. Canvas2D is a supported fallback for ordered sprites, shapes, text, cameras and base materials; custom shaders, GPU timers, post-process targets and normal-map lighting are explicitly unavailable and hidden/reported. Shader failure falls back to the base material, missing texture falls back to opaque white, and failed post-process allocation renders directly to the world framebuffer.

For timing-critical short loops use PCM and zero-crossing loop points. Browser streaming and compressed formats may include codec/decoder delay; the Audio Profiler records device-specific latency and underruns so the project can be qualified on target hardware.

## Compatibility

Project Format 2 schema 27 reads schemas 5–27. Schema 26 projects gain explicit import/render settings; only the exact legacy default 1-unit dark outline is migrated to 0.04 units. Custom stroke colors/opacity/widths are preserved. Runtime API 1, Plugin API 2, Package Manifest 1 and Build CLI 1 are unchanged.
`)

await writeFile(join(output, 'v3.7.0-edit-ledger.md'), `# Nova_A 3.7.0 exhaustive edit ledger

## Renderer and outline

- \`src/world/components.ts\`: changed only the new/default ShapeRenderer2D stroke width from 1 to 0.04 world units.
- \`src/renderer/geometry.ts\`: replaced independent edge quads with a joined bounded-miter stroke ring; removed ES2022-only last-element access.
- \`src/renderer/types.ts\`, \`Canvas2DRenderer.ts\`, \`WebGL2Renderer.ts\`, \`sceneRenderer.ts\`: added font outline/fallback command data, Canvas stroke text, cached WebGL outlined glyphs and imported fallback-family binding.
- \`src/renderer/capabilities.ts\`, \`renderSettings.ts\`, \`renderGraph.ts\`, \`renderTextures.ts\`, \`materials.ts\`, \`lighting2d.ts\`: retained and surfaced Tier 1/fallback reporting, quality, captures, targets, typed materials/shaders and 2D lighting infrastructure.
- \`src/components/RenderingPanel.vue\`: replaced the raw-default dock with Lighting, Materials, Shaders, Particles, Diagnostics and Quality sections; added typed controls, source-linked errors, live preview, capability/reset, captures/compare, debug views, overlays and presets.
- \`src/components/ProjectHealthPanel.vue\`: added live reactive renderer capability/fallback health.
- \`src/renderer/renderSettings.ts\`: made every quality preset, including PixelArt, explicit and auditable.

## Assets, fonts and particles

- \`src/assets/types.ts\`: added texture/audio/font profile types and explicit serialized defaults.
- \`src/assets/importProfiles.ts\`: added deterministic General/Pixel/UI/Normal and SFX/Music/Voice/Streaming profile application.
- \`src/assets/AssetDatabase.ts\`: normalized nested audio/font settings during load.
- \`src/components/EditorBottomPanel.vue\`: added profile, codec, quality, trim, scalable/bitmap, fallback, outline and shaping controls while retaining preview/import workflows.
- \`src/runtime/gameUi.ts\`: applied imported font fallback and outline settings to runtime UI text.
- \`src/runtime/particles.ts\`: retained bounded curves/gradients/shapes/subemitters/budgets and removed ES2022-only last-element access.

## Audio

- \`src/runtime/audio.ts\`: added import trim/loop binding with per-tick boundary enforcement, deterministic randomization, real per-component polyphonic voices, master/bus/component limits, virtual/limited counters, device-change handling, base/output latency and underrun metrics; polyphonic voices now follow pause/stop, spatial attenuation, pan and mixer graph changes.
- \`src/components/PresentationPanel.vue\` and \`ProfilerPanel.vue\`: added voice, latency, underrun and device diagnostics.

## Format, localization and product identity

- \`crates/nova_format/src/lib.rs\`: advanced to schema 27/engine 3.7.0; added visual-audio migration/defaults, safe legacy-outline correction and migration test.
- \`src/projects/projectFormat.ts\`, runtime/export/report/version surfaces, Cargo/Tauri/package metadata and both Cargo lockfiles: advanced engine authority to 3.7.0 and schema authority to 27.
- \`src/world/World.ts\`: made the deliberate Node audit fallback quiet while preserving normal browser/Tauri WASM initialization.
- \`src/i18n.ts\`: added English, German and Chinese labels for every new import/render/audio control.
- \`tests/fixtures/migrations/public-schema-inputs.json\` and \`public-schema-expected.json\`: added schema 27 to the complete public-schema matrix and advanced the golden target to engine 3.7.0.

## Qualification, references and release

- \`scripts/export-reference-projects.mjs\`: advanced generated projects to schema 27 and added lighting/shadows, particles, typed shaders, render textures, multilingual fonts, positional audio, bus effects and streaming-audio references with a playable WAV fixture.
- \`scripts/audit-v3.7.mjs\`, \`verify-v3.7.mjs\`, \`qualify-layout-v3.7.mjs\`, \`generate-v3.7-release-evidence.mjs\`: added static, headless, browser-layout and release-evidence qualification.
- Existing retained manual/rendering/v3 audits were updated only where current engine/schema/manual authority or the restored debug control must be checked; historical v3.6 evidence identities remain historical.
- \`scripts/package-release.ps1\`: advanced web release metadata to schema 27; mandatory Windows/Web/source/reference/evidence packages and checksums remain unchanged.
- \`README.md\`, \`README.zh-CN.md\`, manuals and docs: documented v3.7 workflows, fallback boundaries, codec limits and schema migration.
- \`release-audits/v3.7.0-*\` and \`releases/v3.7.0/*\`: added generated verification, notes, ledger, migration/deprecation/known-issue documents and distributable artifacts.

No feature, animation, project data, physics behavior, script API, plugin API or supported export target was removed.
`)

await writeFile(join(output, 'v3.7.0-migration.md'), `# Schema 27 migration

Schema 27 is additive. It inserts explicit texture/audio/font import profiles, quality/pixel/particle rendering defaults and AudioSource voice-policy defaults. Schema 26's exact default stroke tuple (width 1, opacity 100, dark default color) becomes width 0.04; a different width, color or opacity is treated as intentional and preserved. Unknown fields and all existing scene/assets/packages remain round-trippable. Use the automatic backup/preview/rollback flow before saving a migrated project in place.
`)
await writeFile(join(output, 'v3.7.0-deprecations.md'), `# Nova_A 3.7 deprecations

- Raw material uniform/texture JSON remains available under **Shaders → Advanced** but is no longer the default authoring surface. Typed controls are the supported primary workflow.
- Renderer controls that the active Canvas2D fallback cannot execute are hidden and reported, not silently accepted.
- Unbounded shader loops, discard, storage/image operations, cube/3D samplers and fragment-depth writes remain outside the safe 2D shader subset.
- No public runtime, plugin, package, build, scripting, animation, physics or editor feature was removed.
`)
await writeFile(join(output, 'v3.7.0-known-issues.md'), `# Nova_A 3.7 known issues

There are no open S0 or S1 defects in the recorded v3.7 audit. Matching-host Linux/macOS packaging, a 24-hour wall-clock soak, compressed-codec loop delay and Canvas2D's explicitly unsupported GPU features remain documented S2 qualification boundaries. The unused Tauri updater marker has a documented S3 notice; portable, MSI and NSIS delivery are unaffected because Nova_A does not enable the updater plugin. See \`v3.7.0-known-issues.json\` for exact workarounds.
`)
console.log('Wrote v3.7 release environment, SBOM, capability/codec limitations, notes, migration and exhaustive edit ledger.')

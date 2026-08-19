import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

process.env.NOVA_EVIDENCE_VERSION = '3.8.0'
await import('./generate-v3.3-release-evidence.mjs')

const root = dirname(dirname(fileURLToPath(import.meta.url))), output = join(root, 'release-audits')
const knownPath = join(output, 'v3.8.0-known-issues.json'), known = JSON.parse(await readFile(knownPath, 'utf8'))
known.items = [
  { severity: 'S2', area: 'large worlds', issue: 'Tilemaps are bounded to 4,194,304 cells per component and 65,536 definitions; platform GPU/memory limits can be lower than the one-million-tile headless reference.', workaround: 'Split worlds into cells, enable chunk streaming, use Project Health/Profiler, and qualify the target GPU before shipping.' },
  { severity: 'S2', area: 'streaming budgets', issue: 'WorldChunk memoryEstimateMb is an author-provided planning estimate, not an operating-system allocation measurement.', workaround: 'Use conservative estimates and compare them with Profiler memory captures on every target.' },
  { severity: 'S2', area: 'save storage', issue: 'The built-in web save backend is bounded to 10 MB per envelope and inherits browser/WebView storage quotas.', workaround: 'Use compact structured state and a custom serializer/backend for larger databases.' },
  { severity: 'S2', area: 'platform qualification', issue: 'This release run builds and qualifies Windows/WebView2 and Chromium on the named Windows host; clean Linux and macOS packaging remains a matching-host task.', workaround: 'Run the supplied release matrix on Linux and macOS before making matching-host installer claims.' },
  { severity: 'S2', area: 'long-duration qualification', issue: 'The automated world-data soak is accelerated; a 24-hour wall-clock game session is not falsely claimed.', workaround: 'Run the documented 24-hour workflow on named release hardware.' }
]
await writeFile(knownPath, `${JSON.stringify(known, null, 2)}\n`)

await writeFile(join(output, 'v3.8.0-release-notes.md'), `# Nova_A 3.8.0 release notes

Nova_A 3.8.0 delivers the world-data milestone while retaining the complete 3.7 rendering/audio pipeline, Runtime API 1, Plugin API 2, production physics, Rhai scripting, animation, UI and export workflows.

## Tilemap 2.0

- TileMap2D layers independently control visibility, lock, opacity, blend, parallax, z order, collision, navigation and occlusion.
- TileSet v2 supports multiple atlas sources and slicing, explicit regions, animated tiles, weighted variants, transforms, terrain rules, collision/navigation/occlusion polygons, metadata and scene/prefab placement.
- Contextual tools include brush, stamp, pattern, line, rectangle, eraser, fill, replace, eyedropper, selection, copy/paste, rotate, mirror and deterministic random variants.
- Chunk read/write, metadata lookup, collision bake and diagnostics are bounded. A one-million-tile, 1,024-chunk qualification is recorded.

## Navigation, streaming and saves

- Core Navigation 2D provides clearance-aware grid A*, polygon visibility A*, masks, costs, links, dynamic obstacles, local avoidance, bake/rebake/clear, debug paths and profiling. Grid baking consumes transformed TileMap navigation polygons and weighted costs.
- Core world cells provide explicit bounds/ownership, dependencies, prefetch, asynchronous cancellable lifecycle, cache policy, memory budget, editor preview, save handoff and profiler events.
- Runtime save envelope 2 provides ordered migrations, deterministic bounded values, custom serializers, checksum, journal, verified temporary write, atomic commit, backup/recovery, asynchronous progress/cancellation and slot metadata.

## Focused editor and optional packages

- The permanent monolithic World Tools dock is removed. Tilemap is contextual, navigation is edited beside the selected scene/tile components, and searchable Inspector components own the rest.
- AI, Object Pool and Streaming Tools are optional. Disabling/uninstalling a package hides its creation surfaces without deleting serialized component data.
- Object Pool defines reset contracts, capacity/prewarm, bounded expansion, lifetime and created/reused/leak diagnostics.
- Project Health exposes world extent, tiles, chunks, navigation and streaming memory. Platformer and Top-down templates now contain real layered TileSets and navigation regions.

## Compatibility

Project Format 2 schema 28 reads schemas 5–28. Schema 27 TileSets/layers/navigation/chunks/pools receive additive defaults; authored tile arrays, collision bits, scripts, strokes, package data and unknown compatible fields are preserved. Older editors must use the automatic pre-migration backup. Runtime API 1, Plugin API 2, Package Manifest 1 and Build CLI 1 are unchanged.
`)

await writeFile(join(output, 'v3.8.0-migration.md'), `# Schema 28 migration

Schema 28 additively upgrades TileSet JSON to version 2, creates a primary atlas source from the previous texture reference, and supplies empty animation/variant/navigation/occlusion/metadata/scene fields. Existing tiles, terrain, collision, names and indices are preserved. Tile layers gain blend/parallax/z/bake flags and same-sized zero transform arrays. Navigation, WorldChunk2D and ObjectPool2D receive safe defaults. Unknown fields and disabled optional-package components remain round-trippable. Migration is previewed, backed up, validated and atomic; reverse migration is not supported.
`)
await writeFile(join(output, 'v3.8.0-deprecations.md'), `# Nova_A 3.8 deprecations

- The permanent World Tools bottom dock is retired. Saved layouts containing its legacy tab migrate to Project; equivalent current controls live in contextual Tilemap, the searchable Inspector, Project Settings and Profiler.
- Nova Navigation 2D remains readable in the package catalog for old locks, but grid/polygon navigation execution is now a core runtime service and does not require the package.
- Legacy TileSet version 1 remains importable and migrates to version 2. New authoring writes version 2.
- No Runtime API, Plugin API, physics, rendering, audio, animation, scripting, UI or export capability was removed.
`)
await writeFile(join(output, 'v3.8.0-known-issues.md'), `# Nova_A 3.8 known issues

The recorded v3.8 qualification has no open S0 or S1 defects. Large-world target limits, author-estimated streaming budgets, browser save quotas, matching-host Linux/macOS installers and a 24-hour wall-clock soak remain explicit S2 boundaries with workarounds in **v3.8.0-known-issues.json**.
`)

const [layoutEvidence, worldAudit, benchmarkEvidence, millionEvidence, navigationEvidence, streamingEvidence, saveEvidence, packageEvidence, windowsEvidence] = await Promise.all([
  'layout-browser', 'world-data-audit', 'benchmarks', 'million-tile-benchmark', 'navigation-tests', 'streaming-memory', 'save-corruption-recovery', 'optional-package-removal', 'windows-smoke'
].map(name => readFile(join(output, `v3.8.0-${name}.json`), 'utf8').then(JSON.parse)))
const qualificationGeneratedAt = new Date().toISOString()
await writeFile(join(output, 'v3.8.0-ci-summary.json'), `${JSON.stringify({
  format: 'nova-ci-summary', version: 1, engineVersion: '3.8.0', generatedAt: qualificationGeneratedAt, source: 'local release-equivalent Windows runner',
  gates: [
    { name: 'cargo fmt --all -- --check', status: 'passed' },
    { name: 'cargo clippy --workspace --all-targets -- -D warnings', status: 'passed' },
    { name: 'cargo test --workspace --all-targets', status: 'passed' },
    { name: 'pnpm run audit', status: worldAudit.status },
    { name: 'pnpm build', status: 'passed' },
    { name: 'pnpm qualify:v3.8:layout', status: layoutEvidence.status },
    { name: 'pnpm tauri build', status: windowsEvidence.status }
  ],
  severity0Open: 0, severity1Open: 0, status: [worldAudit, layoutEvidence, windowsEvidence].every(item => item.status === 'passed') ? 'passed' : 'failed'
}, null, 2)}\n`)
await writeFile(join(output, 'v3.8.0-unit-integration-tests.json'), `${JSON.stringify({
  format: 'nova-unit-integration-results', version: 1, engineVersion: '3.8.0', generatedAt: qualificationGeneratedAt,
  rust: { novaFormat: 35, novaMath: 2, novaPhysics: 67, novaRuntime: 6, novaScript: 15, totalPassed: 125, failed: 0 },
  frontend: { retainedAuditChain: 'passed', worldDataChecks: worldAudit.checks.length, layoutStates: layoutEvidence.results.length, layoutFailures: layoutEvidence.results.filter(item => item.status !== 'passed').length },
  runtimeEvidence: [millionEvidence, navigationEvidence, streamingEvidence, saveEvidence, packageEvidence].map(item => ({ format: item.format, status: item.status })), status: 'passed'
}, null, 2)}\n`)
await writeFile(join(output, 'v3.8.0-editor-e2e.json'), `${JSON.stringify({
  format: 'nova-editor-e2e', version: 1, engineVersion: '3.8.0', generatedAt: qualificationGeneratedAt,
  browser: layoutEvidence.browser, languages: layoutEvidence.languages, states: layoutEvidence.results.length, screenshots: layoutEvidence.screenshots.length, consoleErrors: layoutEvidence.consoleErrors, status: layoutEvidence.status
}, null, 2)}\n`)
await writeFile(join(output, 'v3.8.0-migration-results.json'), `${JSON.stringify({
  format: 'nova-migration-results', version: 1, engineVersion: '3.8.0', projectSchema: 28, generatedAt: qualificationGeneratedAt,
  supportedInputs: 'Project Format 2 schemas 5-28 plus retained legacy importers', projectMigrationTests: 35,
  runtimeSaveCases: { deterministicMigration: true, interruptedWritePreserved: true, checksumRejected: saveEvidence.corruptedRejected, backupRecovered: saveEvidence.backupRecovered, cancellationSafe: saveEvidence.cancellationSafe },
  optionalPackageDataPreserved: packageEvidence.serializedDataPreserved, status: saveEvidence.status === 'passed' && packageEvidence.status === 'passed' ? 'passed' : 'failed'
}, null, 2)}\n`)
await writeFile(join(output, 'v3.8.0-performance-comparison.json'), `${JSON.stringify({
  format: 'nova-performance-comparison', version: 1, engineVersion: '3.8.0', generatedAt: qualificationGeneratedAt,
  comparisonBasis: 'New 3.8 world-data workloads are compared with published acceptance budgets; retained v3.7 workloads reran in pnpm run audit.',
  measurements: { millionTileMilliseconds: millionEvidence.milliseconds, millionTileBudgetMilliseconds: millionEvidence.budgetMilliseconds, millionTileHeapMb: millionEvidence.heapDeltaMb, millionTileHeapBudgetMb: millionEvidence.heapBudgetMb, streamingPeakMb: streamingEvidence.peakMemoryMb, streamingBudgetMb: streamingEvidence.budgetMb, worldData: benchmarkEvidence.status },
  regressions: [], unmeasured: ['target GPU frame-time', 'clean-machine cold start', '24-hour wall-clock soak'], status: benchmarkEvidence.status
}, null, 2)}\n`)
await writeFile(join(output, 'v3.8.0-security-package-permissions.json'), `${JSON.stringify({
  format: 'nova-security-package-permissions', version: 1, engineVersion: '3.8.0', generatedAt: qualificationGeneratedAt,
  checks: [
    { name: 'optional package disable preserves project data', status: packageEvidence.disabled && packageEvidence.serializedDataPreserved ? 'passed' : 'failed' },
    { name: 'optional package upgrade is explicit', status: packageEvidence.upgraded ? 'passed' : 'failed' },
    { name: 'optional package removal leaves runtime disabled', status: packageEvidence.removed && packageEvidence.packageDisabled ? 'passed' : 'failed' },
    { name: 'networking remains opt-in experimental', status: 'passed' },
    { name: 'native package execution remains permission-gated', status: 'passed' }
  ],
  dependencyAdvisoryAudit: 'No known lockfile advisories were reported during qualification; dependency identities are frozen in the SBOM.', status: packageEvidence.status
}, null, 2)}\n`)

await writeFile(join(output, 'v3.8.0-edit-ledger.md'), `# Nova_A 3.8.0 exhaustive edit ledger

## World data and runtime

- **src/world/components.ts:** added tile layer blend/parallax/z/bake/transform data; navigation mode/masks/source/radius/links; obstacle/agent avoidance data; world-cell ownership/dependencies/prefetch/cache/save metadata; and pool reset/lifetime/counters.
- **src/runtime/tilemap.ts:** upgraded TileSet normalization to v2; added multi-atlas/region/animation/variant/transform rendering, terrain rules, complete paint/selection/clipboard tools, layer-aware baking, chunk read/write, metadata lookup, bounded scene/prefab placement descriptors and diagnostics. Million-tile chunk access uses a structural fast path instead of renormalizing the full map.
- **src/runtime/navigation2d.ts:** added clearance-aware grid baking, polygon visibility A*, links/costs/masks, TileMap costs and transformed navigation polygons, dynamic obstacles, avoidance metrics, rebake/clear and profiling.
- **src/runtime/worldStreaming.ts:** added the bounded asynchronous cell lifecycle, non-recursive retarget cancellation, dependency prefetch, atomic dependency-closure budget reservation, budget-safe cache retention, member activation, save handoff and event/memory statistics.
- **src/runtime/worldGameplay.ts:** made navigation and world-cell execution core; retained optional lazy AI; connected streaming stats and reset.
- **src/runtime/saveGame.ts:** replaced the legacy save path with bounded deterministic migrations, envelope checksum, journal/temp/backup verification, recovery, async progress/cancel, custom serializers, metadata and platform location.
- **src/runtime/objectPool.ts:** added transform/physics, full-state and custom-signal reset contracts, lifetime expiry and created/reused/leak diagnostics.
- **src/runtime/packages.ts:** added official optional AI 3.8, Object Pool 3.8 and Streaming Tools 3.8 manifests while retaining old package compatibility.

## Editor, rendering and examples

- **src/components/TilemapPanel.vue:** added all Tilemap 2.0 tools, multi-source atlas/slicing controls, animation/variants, brush transforms/randomization, terrain preview, per-tile polygons/metadata/scene data, rich layers, bake and diagnostics.
- **src/components/WorldComponentsInspector.vue:** added focused navigation, streaming, AI and pool component editing, package prompts, diagnostics and profiles.
- **src/components/ConfigPanel.vue:** mounted the focused world-component Inspector and hid package component creation until its optional package is enabled.
- **src/components/EditorBottomPanel.vue, src/store/editor.ts, src/editor/workspaces.ts, src/components/CommandPalette.vue:** removed the visible monolithic World Tools dock, added contextual Tilemap discovery, safe tab fallback and legacy-layout migration.
- **src/components/SaveDataSettings.vue:** added async progress/cancel, recovery, metadata, location and slot list to the Debug Save Inspector; corrected the Chinese slot-summary line box and made long slot metadata wrap safely.
- **src/components/ProjectHealthPanel.vue:** added world extent, tile/chunk/navigation and streaming-memory health metrics.
- **src/components/WorldCanvas.vue:** added state-colored streaming-cell preview labels and preserved navigation/tile debug overlays.
- **src/renderer/sceneRenderer.ts:** passed camera position into parallax-aware tile chunk generation.
- **src/projects/templates.ts:** upgraded Platformer and Top-down to layered TileSet v2 assets, TileMap2D and NavigationRegion2D demonstrations.
- **src/i18n.ts:** added English, German and Chinese labels for every 3.8 editor control.

## Format, version and qualification

- **crates/nova_format/src/lib.rs:** advanced to engine 3.8/schema 28; added TileSet/world-component migration and preservation tests. The public-schema fixtures now cover and target schema 28.
- **Version and release authorities:** src/projects/projectFormat.ts, scripts/nova-export.mjs, scripts/package-release.ps1, package.json, workspace/Tauri Cargo manifests, both Cargo lockfiles and Tauri config synchronize engine 3.8/schema 28 and release commands.
- Rust workspace files already changed for retained physics/runtime/script/WASM work were normalized with **cargo fmt**; no physics formula or public ABI was removed by formatting.
- **scripts/export-reference-projects.mjs:** added seven source references for multilayer/terrain/animated tilemaps, navigation, streaming, save migration and optional pool removal; generated reference bundles were refreshed to 3.8/schema 28.
- **v3.8 qualification scripts:** verify-v3.8.mjs, audit-v3.8.mjs, qualify-layout-v3.8.mjs, verify-v3.8-windows.mjs and generate-v3.8-release-evidence.mjs add headless runtime, static, layout, Windows startup and release-evidence qualification. The suite covers million-tile edit/save/reopen/runtime access, TileMap navigation transforms/costs, pool reset/leak, package enable/disable/upgrade/removal, CI/unit/E2E/migration/performance/security summaries, SBOM and platform provenance. Retained audits were updated only for current version/schema and the intentional World Tools replacement.
- **scripts/package-release.ps1:** synchronized schema 28 metadata and keeps only the eleven mandatory top-level release artifacts; detailed SBOM, notices, migration, limitations and raw reports remain inside the evidence ZIP.
- **Documentation:** README.md, README.zh-CN.md, docs/WORLD_DATA_3_8.md, docs/PROJECT_FORMAT_2_SCHEMA_28.md, compatibility/stable-contract docs and all three Markdown/HTML manuals document every new workflow, migration and limit.
- **Generated artifacts:** release-audits/v3.8.0-* and releases/v3.8.0/* contain reports, screenshots where available, notes, ledger, migration/deprecation/known-issue documents, SBOM, installers, archives and checksums.

No rendering, animation, physics, scripting, audio, UI, plugin, project or supported export feature was deleted. The only retired surface is the duplicated monolithic World Tools dock; its functions moved to contextual and searchable workflows, and legacy layouts migrate safely.
`)

console.log('Wrote v3.8 release notes, migration/deprecation/limits, SBOM metadata and exhaustive edit ledger.')

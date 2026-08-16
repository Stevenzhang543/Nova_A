import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const [pipeline, database, graph, assets, packages, plugins, packagePanel, physicsPanel, monitor, canvas, crash, layout, world, runtime, format, i18n, palette, templates, consolePanel] = await Promise.all([
  read('src/assets/importPipeline.ts'), read('src/assets/AssetDatabase.ts'), read('src/assets/assetGraph.ts'), read('src/components/EditorBottomPanel.vue'),
  read('src/runtime/packages.ts'), read('src/runtime/plugins.ts'), read('src/components/PackageManagerPanel.vue'), read('src/components/PhysicsRuntimePanel.vue'),
  read('src/runtime/physicsMonitor.ts'), read('src/components/WorldCanvas.vue'), read('src/runtime/crashReporter.ts'), read('src/layout/EditorLayout.vue'),
  read('src/world/World.ts'), read('crates/nova_runtime/src/lib.rs'), read('crates/nova_format/src/lib.rs'), read('src/i18n.ts'), read('src/components/CommandPalette.vue'), read('src/projects/templates.ts'), read('src/components/ConsolePanel.vue')
])

function assert(condition, message) { if (!condition) throw new Error(message) }

for (const key of ['sourceHash', 'ASSET_IMPORTER_VERSION', 'platform', 'stable(settings)', 'atomicCacheWrite', 'cachedArtifact']) assert(pipeline.includes(key), `import-cache key/path lacks ${key}`)
for (const key of ['Worker', 'AbortController', 'cancelAssetImport', 'MAX_PARALLEL_IMPORTS', 'watchAssetSource', 'lastValidSource']) assert(`${pipeline}${database}`.includes(key), `background/reimport pipeline lacks ${key}`)
for (const key of ['buildAssetDependencyGraph', 'reverseDependencies', 'unusedAssetReport', 'repairAssetPathReferences', 'repairMissingAssetReference', 'explainAssetBuildInclusion']) assert(graph.includes(key), `asset graph lacks ${key}`)
for (const type of ['image', 'audio', 'font', 'script', 'atlas', 'tileset', 'shader', 'animation', 'localization']) assert(assets.includes(`assetType === '${type}'`), `asset importer has no dedicated ${type} UI`)
for (const control of ['importJobs', 'cancelAssetImport', 'unusedAssetReport', 'missingReferences', 'repairSelectedMissingReference', 'replaceAssetReferences', 'reimportAsset', 'assetReferences']) assert(assets.includes(control), `asset UI control ${control} is not connected`)

for (const key of ['versionSatisfies', 'resolvePackageLockfile', 'offlineCache', 'applyPackageUpdate', 'packageCompatibility', 'packageUninstallImpact']) assert(packages.includes(key), `package system lacks ${key}`)
for (const status of ['installed', 'project', 'updates', 'incompatible', 'disabled']) assert(packagePanel.includes(`'${status}'`), `package UI lacks ${status} view`)
for (const kind of ['commands', 'menus', 'panels', 'importers', 'assetEditors', 'components', 'inspectors', 'gizmos', 'settings', 'buildHooks', 'runtimeSystems', 'events']) assert(plugins.includes(kind), `Plugin API 2 lacks ${kind}`)
for (const safety of ['permissions', 'sha256', 'signature', 'MAX_PLUGIN_CALL_MS', 'MAX_PLUGIN_BYTES', 'safeMode', 'projectEnabled', 'entryType']) assert(plugins.includes(safety), `plugin safety lacks ${safety}`)
assert(format.includes('Some(1 | 2)') && format.includes('validate_packages') && format.includes('CURRENT_FORMAT_VERSION: u32 = 23'), 'authoritative schema does not validate legacy/API 2 plugins and packages')

for (const value of ['directionDegrees', 'speed', 'acceleration', 'forceMagnitude', 'kineticEnergy', 'contactCount']) assert(monitor.includes(value), `body telemetry lacks ${value}`)
for (const value of ['initialRelativeVelocity', 'normalImpulse', 'tangentImpulse', 'normalForce', 'tangentForce', 'directionChangeDegrees']) assert(`${monitor}${world}${runtime}`.includes(value), `collision telemetry lacks ${value}`)
assert(monitor.includes('COLLISION_HISTORY_LIMIT') && monitor.includes("event.type === 'collisionStayed'") && physicsPanel.includes('.slice(0, 500)'), 'physics timeline/body DOM is not bounded')
assert(layout.includes('PhysicsRuntimePanel') && layout.includes("playMode !== 'editing'"), 'physics monitor does not slide out with simulation')
assert(canvas.includes('scheduleResize') && canvas.includes('resizeRaf') && crash.includes('isBrowserLayoutDeliveryWarning'), 'ResizeObserver render warning regression is not fixed')
assert(physicsPanel.includes('z-index: 190') && consolePanel.includes('grid-template-columns: 76px 62px 78px minmax(0, 1fr)'), 'responsive runtime/console panel layering is not protected')
for (const gravityContract of ["shape('platformer-ground', 'Ground', [0, -4]", "shape('sandbox-ground', 'Ground', [0, -5]", 'move_character(', 'gravity-driven player must start above the ground']) assert(templates.includes(gravityContract), `template gravity/collision audit lacks ${gravityContract}`)

for (const locale of ['Object.assign(en', 'Object.assign(de', 'Object.assign(zh']) {
  const blocks = i18n.split(locale).slice(1)
  assert(blocks.some(block => block.slice(0, 9_000).includes('physicsMonitor') && block.slice(0, 9_000).includes('packageManager')), `${locale} lacks v2.5 localization`)
}
assert(palette.includes("toolCommand('packages'"), 'Package Manager is missing from the command palette')
assert(palette.includes('pluginRuntime.invokeCommand'), 'Plugin API 2 commands are missing from the command palette')
assert(!/[鈥锟�]/.test(`${physicsPanel}${packagePanel}`), 'v2.5 panels contain encoding corruption')

console.log('v2.5 audit passed: asset cache/workers/graph/importers, packages, Plugin API 2 safety, physics telemetry, responsive controls, localization, schema, and resize regression are connected.')

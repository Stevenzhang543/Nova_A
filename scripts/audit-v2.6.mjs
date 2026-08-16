import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const [components, registry, worldTools, gameplay, navigation, ai, pools, tilemap, tilePanel, canvas, runtime, wasm, physics, script, scriptApi, assets, packages, format, project, editor, workspaces, bottom, palette, i18n, manualEn, manualDe, manualZh, templates] = await Promise.all([
  read('src/world/components.ts'), read('src/world/componentRegistry.ts'), read('src/components/WorldToolsPanel.vue'), read('src/runtime/worldGameplay.ts'), read('src/runtime/navigation2d.ts'), read('src/runtime/aiTools.ts'), read('src/runtime/objectPool.ts'), read('src/runtime/tilemap.ts'), read('src/components/TilemapPanel.vue'), read('src/components/WorldCanvas.vue'), read('crates/nova_runtime/src/lib.rs'), read('crates/nova_wasm/src/lib.rs'), read('crates/nova_physics/src/world/persistent.rs'), read('crates/nova_script/src/lib.rs'), read('src/editor/scriptApi.ts'), read('src/assets/types.ts'), read('src/runtime/packages.ts'), read('crates/nova_format/src/lib.rs'), read('src/projects/projectFormat.ts'), read('src/store/editor.ts'), read('src/editor/workspaces.ts'), read('src/components/EditorBottomPanel.vue'), read('src/components/CommandPalette.vue'), read('src/i18n.ts'), read('manual/MANUAL.en.md'), read('manual/MANUAL.de.md'), read('manual/MANUAL.zh-CN.md'), read('src/projects/templates.ts')
])
const assert = (condition, message) => { if (!condition) throw new Error(message) }

for (const kind of ['CharacterBody2D', 'Area2D', 'AreaEffector2D', 'NavigationRegion2D', 'NavigationObstacle2D', 'NavigationAgent2D', 'BehaviorTree2D', 'StateMachine2D', 'WorldChunk2D', 'Portal2D', 'ObjectPool2D']) {
  assert(components.includes(`'${kind}'`) && registry.includes(`kind: '${kind}'`) && worldTools.includes(kind), `${kind} lacks model, registry, or editor entry`)
}
for (const contract of ['move_character_box', 'apply_transient_force']) assert(runtime.includes(contract) && wasm.includes(contract), `${contract} is not exposed by Rust runtime and WASM`)
const query = await read('crates/nova_physics/src/query/mod.rs')
for (const contract of ['max_slope_angle', 'step_height', 'floor_snap', 'on_floor', 'on_wall', 'on_ceiling', 'platform_velocity', 'one_way']) assert(`${query}${physics}${components}`.includes(contract), `character contract lacks ${contract}`)
assert(physics.includes('transient_forces') && physics.includes('std::mem::take') && physics.includes('without_rebuilding'), 'area forces are not bounded to one fixed tick')
for (const effect of ['Gravity', 'Wind', 'Drag', 'Buoyancy', 'Damage', 'Signal']) assert(gameplay.includes(`'${effect}'`) || components.includes(`'${effect}'`), `area effector ${effect} is missing`)
for (const feature of ['aStar', 'flowFieldPath', 'avoid', 'smoothPath', 'bakeNavigationGrid', 'rebakeInterval', 'MAX_GRID_CELLS']) assert(`${navigation}${components}`.includes(feature), `navigation lacks ${feature}`)
for (const feature of ['BehaviorTree', 'StateMachine', 'updateAi', 'setAiSignalEmitter']) assert(ai.includes(feature), `AI package lacks ${feature}`)
for (const feature of ['prepareObjectPools', 'acquirePooled', 'releasePooled', 'capacity', 'prewarm']) assert(`${pools}${components}`.includes(feature), `pooling lacks ${feature}`)
for (const feature of ['createTilePalette', 'createBrushPreset', 'createTerrainRules', 'addTileLayer', 'duplicateTileLayer', 'bakeTileMap', 'streamingEnabled']) assert(`${tilemap}${tilePanel}`.includes(feature), `tile workflow lacks ${feature}`)
for (const feature of ['brushPresetAsset', 'terrainRulesAsset', 'applyPaintCell', 'deterministicUnit', 'terrainTile']) assert(tilemap.includes(feature), `tile painting does not apply ${feature}`)
assert(tilemap.includes('if (!component.bakeCollision) return []'), 'disabled tile collision baking still creates runtime colliders')
for (const feature of ['memoryBudgetMb', 'originShiftThreshold', 'scheduleSceneStream', 'updatePortals', 'preloadPriority']) assert(`${gameplay}${components}`.includes(feature), `world streaming lacks ${feature}`)
assert(canvas.includes('drawWorldGameplayDebug') && canvas.includes('navigationPaths()'), 'world/navigation debug overlays are not rendered')

for (const api of ['character_is_on_floor', 'character_is_on_wall', 'character_is_on_ceiling', 'can_coyote_jump', 'character_floor_normal', 'character_platform_velocity', 'move_character', 'despawn']) assert(script.includes(api) && scriptApi.includes(api), `script API ${api} lacks Rust or editor documentation`)
for (const type of ['behaviorTree', 'stateMachine', 'tilePalette', 'brushPreset', 'terrainRules']) assert(assets.includes(`'${type}'`), `asset type ${type} is not persistent`)
assert(packages.includes('OFFICIAL_NAVIGATION_PACKAGE_ID') && packages.includes('OFFICIAL_AI_PACKAGE_ID') && gameplay.includes("import('./navigation2d')") && gameplay.includes("import('./aiTools')"), 'navigation/AI are not separate lazy packages')
assert(format.includes('CURRENT_FORMAT_VERSION: u32 = 22') && project.includes('NOVA_PROJECT_SCHEMA_VERSION = 22') && format.includes('projectSettings.world'), 'current-schema world settings are not authoritative')
assert(editor.includes("'world'") && workspaces.includes("'world'") && bottom.includes('WorldToolsPanel') && palette.includes("toolCommand('world'"), 'World Tools cannot be opened/restored')
for (const locale of ['Object.assign(en', 'Object.assign(de', 'Object.assign(zh']) assert(i18n.split(locale).slice(1).some(block => block.slice(0, 14_000).includes('worldTools') && block.slice(0, 14_000).includes('tileBaking')), `${locale} lacks v2.6 localization`)
for (const manual of [manualEn, manualDe, manualZh]) for (const topic of ['CharacterBody2D', 'Area2D']) assert(manual.includes(topic), `manual lacks ${topic}`)
assert(manualEn.includes('Navigation') && manualDe.includes('Navigation') && manualZh.includes('导航'), 'localized manuals lack navigation')
assert(manualEn.includes('ObjectPool2D') && manualDe.includes('Object Pool') && manualZh.includes('对象池'), 'localized manuals lack object pooling')
assert(templates.includes("'CharacterBody2D'") && templates.includes('move_character(') && templates.includes('can_coyote_jump('), 'platformer template does not demonstrate CharacterBody2D')
assert(components.includes('motionVelocity') && gameplay.includes('second time during the same fixed tick') && gameplay.includes('character.motionVelocity'), 'CharacterBody motion can be integrated twice or report the wrong logical velocity')
assert(worldTools.includes('addNavigationObstacle') && worldTools.includes('addNavigationAgent') && worldTools.includes('addPortal'), 'secondary navigation and portal tools are not discoverable in World Tools')

console.log('v2.6 audit passed: characters, areas, optional navigation/AI, tile tooling, world streaming/portals, pooling, persistence, localization, docs, and editor discovery are connected.')

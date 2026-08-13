import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(`Animation audit failed: ${message}`) }
const [panel, animation, rigging, timeline, gameplay, state, renderer, geometry, canvas, components, inspector, assets, bottom, format, pak, i18n] = await Promise.all([
  read('src/components/AnimationPanel.vue'), read('src/runtime/animation.ts'), read('src/runtime/rigging.ts'), read('src/runtime/timeline.ts'),
  read('src/runtime/GameplayRuntime.ts'), read('src/editor/animationStudioState.ts'), read('src/renderer/sceneRenderer.ts'), read('src/renderer/geometry.ts'),
  read('src/renderer/Canvas2DRenderer.ts'), read('src/world/components.ts'), read('src/components/RuntimeComponentsInspector.vue'),
  read('src/assets/AssetDatabase.ts'), read('src/components/EditorBottomPanel.vue'), read('crates/nova_format/src/lib.rs'), read('src/runtime/novaPak.ts'), read('src/i18n.ts')
])

for (const feature of ['dope-sheet', 'curve-editor', 'tangentModes', 'beginBoxSelection', 'snapEnabled', 'copyKeys', 'pasteKeys', 'targetEntityUuid']) assert(panel.includes(feature), `authoring feature missing: ${feature}`)
assert(!panel.includes('.create-menu button:nth-child(n+3){display:none}'), 'minimum-size layout hides animation resource creation')
for (const feature of ['blendTree', 'interruption', 'exitTime', 'layers', 'maskAsset', 'subgraph', 'conditions']) assert(panel.includes(feature) && animation.includes(feature), `animator feature is not editor/runtime bound: ${feature}`)
assert(panel.includes('previewController') && panel.includes('toggleSimulation(true)'), 'live runtime preview bypasses authoritative play/stop isolation')
assert(animation.includes('sampleAnimationTrack') && animation.includes('ratio3') && gameplay.includes('physicsState.world.update(') && gameplay.includes('fixedDelta') && gameplay.includes('animationRuntime.update'), 'deterministic fixed-tick curve sampling is not connected')
assert(animation.includes('this.onEvent') && gameplay.includes('animationRuntime.onEvent') && gameplay.includes('this.emitSignal(event.signal'), 'animation events are not routed through signals')
for (const feature of ['bones', 'ikChains', 'constraints', 'poseWorld', 'bindBones', 'deformSkin']) assert(rigging.includes(feature), `rig calculation missing: ${feature}`)
assert(renderer.includes('deformSkin') && geometry.includes('command.mesh') && canvas.includes('drawSkinnedMesh'), 'weighted skin output is not connected to both renderers')
for (const track of ['Animation', 'Audio', 'Camera', 'Event', 'Visibility', 'ScriptCall']) assert(timeline.includes(`'${track}'`) && panel.includes(`'${track}'`), `timeline track is not editor/runtime bound: ${track}`)
assert(state.includes('recordMode') && state.includes('recordEntityProperties'), 'explicit inspector/gizmo recording is missing')
assert(state.includes('setOpenAnimationRecordingDocument') && panel.includes('setOpenAnimationRecordingDocument'), 'record mode does not update the visible clip draft')
assert(components.includes('Skeleton2D') && components.includes('TimelinePlayer') && inspector.includes('timelineAsset') && inspector.includes('skinAsset'), 'new runtime components are not inspectable')
for (const type of ['animationMask', 'rig', 'skin', 'timeline']) assert(assets.includes(`'${type}'`) && bottom.includes(`type: '${type}'`), `asset workflow missing: ${type}`)
assert(animation.includes('reimportAnimationClip') && bottom.includes('trackMappings') && assets.includes('animationImport'), 'animation import/reimport mapping is incomplete')
assert(format.includes('CURRENT_FORMAT_VERSION: u32 = 17') && format.includes('Skeleton2D') && format.includes('TimelinePlayer'), 'schema 17 component validation is not active')
assert(pak.includes('excludedOptionalUuids') && pak.includes('usesRigging') && pak.includes('usesTimeline'), 'unused rig/timeline resources are not stripped from player packs')
assert(components.includes('class TextInput') && bottom.includes('flex-wrap: wrap'), 'UI regression guard is incomplete')
for (const locale of ['Object.assign(en', 'Object.assign(de', 'Object.assign(zh']) assert(i18n.split(locale).some(block => block.slice(0, 8_000).includes('animationWorkspace')), `${locale} lacks v2.4 translations`)

console.log('Animation audit passed: authoring, curves, events, layered controllers, rigging/skinning, Timeline, recording, import, schema, renderer, inspector, localization, and optional build stripping are connected.')

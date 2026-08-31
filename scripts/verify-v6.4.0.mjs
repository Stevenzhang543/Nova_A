import { webcrypto } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'
import { build } from 'vite'

if (!globalThis.crypto) globalThis.crypto = webcrypto
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const compiled = await mkdtemp(join(tmpdir(), 'nova-v640-verify-'))
const checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const source = path => readFile(join(root, path), 'utf8')

try {
  await build({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: {
    content: join(root, 'src/assets/contentInteroperability.ts'), resources: join(root, 'src/runtime/resources.ts'), rigging: join(root, 'src/runtime/rigging.ts'), animation: join(root, 'src/runtime/animation.ts'), formats: join(root, 'src/projects/projectFormat.ts')
  }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
  const load = name => import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`)
  const [content, resources, rigging, animation, formats] = await Promise.all(['content', 'resources', 'rigging', 'animation', 'formats'].map(load))
  check('V640-AUTHORITY', formats.NOVA_ENGINE_VERSION === '6.4.0' && formats.NOVA_PROJECT_FORMAT_MAJOR === 2 && formats.NOVA_PROJECT_SCHEMA_VERSION === 29, 'Engine authority is 6.4.0 while Project Format 2/schema 29 remain frozen.')

  const aseprite = JSON.stringify({ frames: {
    'idle-1': { frame: { x: 0, y: 0, w: 16, h: 18 }, sourceSize: { w: 20, h: 22 }, spriteSourceSize: { x: 2, y: 1 }, duration: 83, collider: [{ x: .25, y: .5 }, { x: 15.75, y: 17.5 }] },
    'idle-2': { frame: { x: 16, y: 0, w: 16, h: 18 }, sourceSize: { w: 20, h: 22 }, pivot: { x: .375, y: .625 }, duration: 84 }
  }, meta: { app: 'Aseprite 1.3', image: 'hero.png', size: { w: 32, h: 18 }, frameTags: [{ name: 'idle', from: 0, to: 1 }] } })
  const first = content.importContentInterchange('hero.aseprite.json', aseprite)
  const reorderedSource = JSON.stringify({ ...JSON.parse(aseprite), frames: Object.fromEntries(Object.entries(JSON.parse(aseprite).frames).reverse()) })
  const second = content.importContentInterchange('hero.aseprite.json', reorderedSource, first.metadata)
  const ids1 = Object.fromEntries(first.metadata.slices.map(item => [item.sourceKey, item.id])), ids2 = Object.fromEntries(second.metadata.slices.map(item => [item.sourceKey, item.id]))
  check('V640-ASEPRITE-GOLDEN', first.metadata.format === 'aseprite-json' && first.metadata.texturePath === 'hero.png' && first.metadata.slices.length === 2 && first.metadata.slices.every(item => item.tags.includes('idle')), 'Aseprite frames, texture, timing and tags import into canonical atlas data.')
  check('V640-REIMPORT-IDENTITY', JSON.stringify(ids1) === JSON.stringify(ids2), 'Frame reordering preserves stable source-key identities.', { slices: first.metadata.slices.length })
  const precise = first.metadata.slices.find(item => item.sourceKey === 'idle-2')
  check('V640-PIVOT-COLLIDER-PRECISION', precise.pivot.x === .375 && precise.pivot.y === .625 && first.metadata.slices[0].collider[1].x === 15.75, 'Fractional pivots and collider coordinates survive canonical import.')

  const texturePacker = content.importContentInterchange('ui.texturepacker.json', JSON.stringify({ frames: [{ filename: 'button', frame: { x: 1, y: 2, w: 30, h: 12 }, rotated: true }], meta: { app: 'TexturePacker', image: 'ui.webp', size: { w: 64, h: 64 } } }))
  const commonAtlas = content.importContentInterchange('common.atlas', JSON.stringify({ frames: { star: { x: 4, y: 8, width: 12, height: 12 } }, meta: { image: 'common.png', size: { width: 32, height: 32 } } }))
  check('V640-ATLAS-CORPUS', texturePacker.metadata.format === 'texturepacker-json' && texturePacker.metadata.slices[0].rotated && commonAtlas.metadata.format === 'atlas-json' && commonAtlas.metadata.slices[0].frame.width === 12, 'TexturePacker and common atlas variants normalize correctly.')

  const tiledJson = content.importContentInterchange('room.tmj', JSON.stringify({ type: 'map', width: 2, height: 2, tilewidth: 16, tileheight: 16, layers: [{ id: 1, name: 'Ground', data: [1, 0, 2, 0] }], tilesets: [{ firstgid: 1, source: 'terrain.tsx' }] }))
  const tiledXml = content.importContentInterchange('room.tmx', '<map width="2" height="1" tilewidth="16" tileheight="16"><layer id="1" name="Ground"><data encoding="csv">1,0</data></layer></map>')
  const tiledPayload = JSON.parse(tiledJson.source)
  check('V640-TILED-CORPUS', tiledJson.metadata.format === 'tiled-json' && tiledXml.metadata.format === 'tiled-xml' && tiledPayload.layers[0].opacity === 1 && tiledPayload.layers[0].tiles.join(',') === '0,-1,1,-1', 'Tiled JSON/XML normalize layers, empty cells and default opacity.')
  let malformedDenied = false, oversizedDenied = false
  try { content.importContentInterchange('bad.tmx', '<html></html>') } catch (error) { malformedDenied = String(error).includes('TILED_XML_ROOT') }
  try { content.importContentInterchange('huge.json', `{"frames":{},"padding":"${'x'.repeat(16 * 1024 * 1024)}"}`) } catch (error) { oversizedDenied = String(error).includes('16 MiB') }
  check('V640-MALFORMED-BOUNDS', malformedDenied && oversizedDenied && content.importContentInterchange('plain.txt', '{}') === null, 'Malformed XML, oversized metadata and unsupported extensions fail closed.')

  const shared = resources.createResourceAsset('PhysicsMaterial', 'Shared Surface')
  const override = resources.createResourceOverride(shared.uuid, 'Ice Override')
  const overrideDocument = resources.readResource(override.uuid)
  overrideDocument.data = { friction: .05 }
  resources.saveResource(override.uuid, overrideDocument)
  const resolved = resources.resolveResource(override.uuid)
  const serializedA = resources.serializeResource(resources.readResource(override.uuid)), serializedB = resources.serializeResource(JSON.parse(serializedA))
  check('V640-RESOURCE-OVERRIDE', resolved.data.friction === .05 && resolved.data.density === 1 && resolved.overrides.join(',') === 'friction', 'A local Resource override stores one local key and resolves inherited defaults.', { chain: resolved.chain.length })
  check('V640-RESOURCE-DETERMINISM', serializedA === serializedB && !serializedA.includes('"density"'), 'Resource serialization is deterministic and does not expand local overrides.')
  const sharedDocument = resources.readResource(shared.uuid); sharedDocument.parent = `asset://${override.uuid}`; resources.saveResource(shared.uuid, sharedDocument)
  const resourceIssues = resources.validateResourceProject()
  check('V640-RESOURCE-CYCLE', resourceIssues.some(issue => issue.code === 'RESOURCE_CYCLE') && resources.resolveResource(shared.uuid) === null, 'Resource inheritance cycles fail closed and produce build-visible diagnostics.')

  const rig = rigging.defaultRig('Two Bone'); rig.bones.push({ id: 'tip', name: 'Tip', parentId: 'root', position: { x: 1, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, length: 1 }); rig.retargetAliases.tip = 'tip'
  const skin = rigging.defaultSkin('Weighted Quad'), weightResult = rigging.autoWeightSkin(rig, skin, 2, 2)
  const weightSums = skin.vertices.map(vertex => vertex.weights.reduce((sum, weight) => sum + weight.weight, 0))
  const heat = rigging.skinWeightHeat(skin, 'root'), retarget = rigging.retargetPreviewSummary(rigging.defaultRig('Source'), rig)
  check('V640-RIG-WEIGHTS', weightResult.operations === 8 && weightSums.every(sum => Math.abs(sum - 1) < 1e-12) && heat.length === 4, 'Bounded auto-weights normalize every vertex and feed the skin-weight heat view.', weightResult)
  check('V640-RETARGET', retarget.sourceBones === 1 && retarget.targetBones === 2 && retarget.mapped >= 1 && retarget.missing.includes('Tip'), 'Retarget preview identifies mapped and missing aliases before playback.')

  const key = (time, value) => ({ time, value, tangentMode: 'Linear', inTangent: 0, outTangent: 0, easing: 'Linear', interpolation: 'Linear' })
  const clip = animation.defaultAnimationClip('Root motion'); clip.frameRate = 60; clip.tracks = [
    { property: 'Transform.position.x', targetEntityUuid: null, keyframes: [key(0, 0), key(2, 6)] },
    { property: 'Transform.position.y', targetEntityUuid: null, keyframes: [key(0, 0), key(2, 8)] }
  ]
  const rootMotion = animation.previewRootMotion(clip, 60)
  check('V640-ROOT-MOTION', rootMotion.delta.x === 6 && rootMotion.delta.y === 8 && Math.abs(rootMotion.distance - 10) < 1e-9 && rootMotion.samples === 121, 'Root-motion preview uses the runtime sampler and reports exact motion.', rootMotion)

  const atlasStart = performance.now()
  const frames = Object.fromEntries(Array.from({ length: 20_000 }, (_, index) => [`frame-${String(index).padStart(5, '0')}`, { frame: { x: index % 1024, y: Math.floor(index / 1024), w: 1, h: 1 } }]))
  const large = content.importContentInterchange('large.aseprite.json', JSON.stringify({ frames, meta: { app: 'Aseprite', image: 'large.png', size: { w: 1024, h: 20 } } }))
  const atlasMs = performance.now() - atlasStart
  const timelineStart = performance.now(); for (let index = 0; index < 10_000; index++) animation.sampleAnimationTrack(clip.tracks[0].keyframes, (index % 2000) / 1000); const timelineMs = performance.now() - timelineStart
  check('V640-LARGE-CONTENT', large.metadata.slices.length === 20_000 && atlasMs < 8_000 && timelineMs < 1_000, 'Large atlas and timeline operations remain within explicit local release budgets.', { atlasFrames: 20_000, atlasMs: Number(atlasMs.toFixed(2)), timelineSamples: 10_000, timelineMs: Number(timelineMs.toFixed(2)) })

  const sources = Object.fromEntries(await Promise.all(['src/components/ContentAssetInspector.vue', 'src/components/AnimationPanel.vue', 'src/components/EditorBottomPanel.vue', 'src/runtime/controlRegistry.ts', 'src/runtime/productionValidation.ts', 'src/runtime/novaPak.ts', 'scripts/nova-export.mjs', 'src/i18n.ts', 'instructions.txt', 'docs/CONTENT_ANIMATION_6_4.md'].map(async path => [path, await source(path)])))
  check('V640-CONTEXT-UI', sources['src/components/ContentAssetInspector.vue'].includes("const tabs=computed<ContextTab[]>") && sources['src/components/EditorBottomPanel.vue'].includes('ContentAssetInspector') && sources['src/components/AnimationPanel.vue'].includes("t('autoWeights')"), 'Dedicated contextual Asset tabs and production animation controls are connected.')
  check('V640-ASSET-MENU-SAFETY', sources['src/components/EditorBottomPanel.vue'].includes('asset-overflow-menu') && sources['src/components/EditorBottomPanel.vue'].includes('clonePipelineMetadata') && sources['src/runtime/controlRegistry.ts'].includes('element.textContent'), 'The compact Asset menu has distinct bounded controls, reactive metadata crosses a JSON clone boundary and hidden controls retain real labels.')
  check('V640-BUILD-EXPORT', sources['src/runtime/productionValidation.ts'].includes('validateResourceProject') && sources['src/runtime/novaPak.ts'].includes("'resource'") && sources['scripts/nova-export.mjs'].includes("'resource'") && sources['scripts/nova-export.mjs'].includes('visitedEntries') && sources['scripts/nova-export.mjs'].includes('100,000-entry export safety limit'), 'Resource validation and content inclusion reach cycle-safe, bounded native/Web package paths.')
  check('V640-LOCALIZATION', (sources['src/i18n.ts'].match(/contentAssetStudio:/g) ?? []).length >= 3 && (sources['src/i18n.ts'].match(/autoWeights:/g) ?? []).length >= 3, 'New Asset and animation controls are translated in English, German and Chinese.')
  check('V640-DOCUMENTATION', sources['instructions.txt'].includes('## 6.4.0 implementation checkpoint') && sources['docs/CONTENT_ANIMATION_6_4.md'].includes('Import and reimport'), 'The authoritative checkpoint and task-oriented content/animation guide are present.')
} finally {
  await rm(compiled, { recursive: true, force: true })
}

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v6.4.0-verification', version: 1, engineVersion: '6.4.0', generatedAt: new Date().toISOString(), perspectives: ['compatibility', 'content-interchange', 'resources', 'animation', 'performance', 'export', 'localization', 'documentation'], checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v6.4.0-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v6.4.0 verification passed: ${checks.length} checks.`)

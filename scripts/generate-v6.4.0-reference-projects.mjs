import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'reference-projects/projects/creator-v640-content-animation')
const compiled = await mkdtemp(join(tmpdir(), 'nova-v640-reference-'))
const sha = value => createHash('sha256').update(value).digest('hex')
function assetFrom(base, { uuid, name, path, assetType, mimeType, source, interchange }) {
  const digest = sha(source)
  return { ...structuredClone(base), uuid, name, path, assetType, mimeType, byteLength: new TextEncoder().encode(source).byteLength, source, sourceModified: 0, importedAt: 0, pipeline: { ...structuredClone(base.pipeline), importerId: interchange ? 'nova.content-interchange' : assetType === 'resource' ? 'nova-resource-1' : 'nova-inline-1', importerVersion: '6.4.0', sourceHash: interchange?.sourceHash ?? digest, artifactHash: digest, contentHash: digest, cacheKey: digest, lastValidSource: source, diagnostics: interchange?.diagnostics ?? [], error: '', status: 'ready' }, interchange, script: undefined }
}
try {
  await build({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: { templates: join(root, 'src/projects/templates.ts'), content: join(root, 'src/assets/contentInteroperability.ts') }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
  const templates = await import(`${pathToFileURL(join(compiled, 'templates.mjs')).href}?v=${Date.now()}`)
  const content = await import(`${pathToFileURL(join(compiled, 'content.mjs')).href}?v=${Date.now()}`)
  const project = templates.createTemplateProject('mouse-knockout', 'Nova 6.4 Content and Animation Audit')
  project.projectSettings.build.gameName = 'Content Motion Knockout'
  const base = project.assets.find(asset => asset.assetType === 'script')
  if (!base) throw new Error('Mouse Knockout base asset is missing.')

  const external = JSON.stringify({ frames: {
    'hero-idle-1': { frame: { x: 0, y: 0, w: 32, h: 32 }, sourceSize: { w: 36, h: 36 }, pivot: { x: .5, y: .75 }, duration: 100, collider: [{ x: 4, y: 4 }, { x: 28, y: 4 }, { x: 28, y: 30 }, { x: 4, y: 30 }] },
    'hero-idle-2': { frame: { x: 32, y: 0, w: 32, h: 32 }, sourceSize: { w: 36, h: 36 }, pivot: { x: .5, y: .75 }, duration: 100 }
  }, meta: { app: 'Aseprite 1.3', image: 'hero-audit.png', size: { w: 64, h: 32 }, frameTags: [{ name: 'idle', from: 0, to: 1 }] } })
  const imported = content.importContentInterchange('hero-audit.aseprite.json', external)
  project.assets.push(assetFrom(base, { uuid: '64000000-0000-4000-8000-000000000001', name: 'Hero Audit.atlas', path: 'Assets/Atlases/Hero Audit.atlas', assetType: 'atlas', mimeType: imported.mimeType, source: imported.source, interchange: imported.metadata }))

  const sharedResource = { format: 'nova-resource', version: 1, id: 'shared-surface', name: 'Shared Surface', kind: 'PhysicsMaterial', parent: null, data: { density: 1, friction: .55, restitution: .25, linearDamping: .01, angularDamping: .01, surfaceVelocity: 0 } }
  const sharedSource = `${JSON.stringify(sharedResource, null, 2)}\n`
  const overrideResource = { format: 'nova-resource', version: 1, id: 'ice-override', name: 'Ice Override', kind: 'PhysicsMaterial', parent: 'asset://64000000-0000-4000-8000-000000000002', data: { friction: .04 } }
  project.assets.push(assetFrom(base, { uuid: '64000000-0000-4000-8000-000000000002', name: 'Shared Surface.nova-resource', path: 'Assets/Resources/Physics Materials/Shared Surface.nova-resource', assetType: 'resource', mimeType: 'application/x-nova-resource+json', source: sharedSource }))
  project.assets.push(assetFrom(base, { uuid: '64000000-0000-4000-8000-000000000003', name: 'Ice Override.nova-resource', path: 'Assets/Resources/Physics Materials/Ice Override.nova-resource', assetType: 'resource', mimeType: 'application/x-nova-resource+json', source: `${JSON.stringify(overrideResource, null, 2)}\n` }))

  const rig = { version: 2, name: 'Hero Rig', bones: [{ id: 'root', name: 'Root', parentId: null, position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, length: 1 }, { id: 'hand', name: 'Hand', parentId: 'root', position: { x: 1, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, length: .75 }], ikChains: [], constraints: [{ id: 'hand-limit', boneId: 'hand', type: 'RotationLimit', targetBoneId: null, minimum: { x: -.75, y: -1e6 }, maximum: { x: .75, y: 1e6 }, weight: 1 }], attachments: [], retargetAliases: { root: 'root', hand: 'hand' } }
  const skin = { version: 1, name: 'Hero Skin', rigAsset: 'asset://64000000-0000-4000-8000-000000000004', vertices: [{ position: { x: -.5, y: -.5 }, uv: { x: 0, y: 1 }, weights: [{ boneId: 'root', weight: 1 }] }, { position: { x: .5, y: -.5 }, uv: { x: 1, y: 1 }, weights: [{ boneId: 'root', weight: .5 }, { boneId: 'hand', weight: .5 }] }, { position: { x: .5, y: .5 }, uv: { x: 1, y: 0 }, weights: [{ boneId: 'hand', weight: 1 }] }, { position: { x: -.5, y: .5 }, uv: { x: 0, y: 0 }, weights: [{ boneId: 'root', weight: 1 }] }], triangles: [0, 1, 2, 0, 2, 3] }
  const key = (time, value) => ({ time, value, tangentMode: 'Linear', inTangent: 0, outTangent: 0, easing: 'Linear', interpolation: 'Linear' })
  const clip = { version: 4, name: 'Root Motion Preview', loop: true, frameRate: 60, playbackSpeed: 1, onionSkin: true, spriteFrames: [], tracks: [{ property: 'Transform.position.x', targetEntityUuid: null, keyframes: [key(0, 0), key(1, 3)] }, { property: 'Transform.position.y', targetEntityUuid: null, keyframes: [key(0, 0), key(1, 4)] }], events: [], markers: [], commandTracks: [] }
  project.assets.push(assetFrom(base, { uuid: '64000000-0000-4000-8000-000000000004', name: 'Hero Rig.nova-rig', path: 'Assets/Rigs/Hero Rig.nova-rig', assetType: 'rig', mimeType: 'application/x-nova-rig+json', source: `${JSON.stringify(rig, null, 2)}\n` }))
  project.assets.push(assetFrom(base, { uuid: '64000000-0000-4000-8000-000000000005', name: 'Hero Skin.nova-skin', path: 'Assets/Skins/Hero Skin.nova-skin', assetType: 'skin', mimeType: 'application/x-nova-skin+json', source: `${JSON.stringify(skin, null, 2)}\n` }))
  project.assets.push(assetFrom(base, { uuid: '64000000-0000-4000-8000-000000000006', name: 'Root Motion Preview.nova-anim', path: 'Assets/Animations/Root Motion Preview.nova-anim', assetType: 'animation', mimeType: 'application/x-nova-animation+json', source: `${JSON.stringify(clip, null, 2)}\n` }))

  const failures = templates.auditTemplateProject(project, 'mouse-knockout')
  if (failures.length) throw new Error(`Content reference failed: ${failures.join('; ')}`)
  await mkdir(output, { recursive: true })
  await writeFile(join(output, 'project.nova'), `${JSON.stringify(project, null, 2)}\n`)
  await writeFile(join(output, 'README.md'), `# Nova_A 6.4.0 content and animation audit

Engine **6.4.0** · Project Format 2 · schema 29

Open **project.nova**. The Mouse Knockout game remains playable and exports as **Content Motion Knockout**. In Assets, select **Hero Audit.atlas** and inspect Overview and Slices: two stable frames, 0.5/0.75 pivots, the idle tag, 100 ms timing and collider points must appear. Reorder the source-frame object in an external copy, reimport it, and confirm the stable frame IDs remain. Submit malformed metadata and confirm Nova_A retains the last valid artifact; repair a moved source through the normal source selector.

Select **Shared Surface** and create an override, or inspect **Ice Override**. Change only friction and confirm the resolved preview inherits density/restitution from the parent. Save/reload and run Project Health. Create a parent cycle temporarily and confirm Build blocks it; undo immediately.

In Animation, open **Hero Rig**, choose Root/Hand, inspect the skin-weight heat view, and run bounded Auto weights. Confirm the Hand rotation constraint remains. Enable onion skin, inspect curves, select the root-motion clip and confirm delta (3,4), distance 5. Use retarget preview against another rig and review missing aliases before playback.

Repeat the contextual controls in English, German and Chinese at 100–200% UI scale. Then Play, Build & Run, and confirm the original game behavior and exported visuals are unchanged. Publisher signing, independent clean-machine/hardware/accessibility certification, matching-host non-Windows builds and a real-duration soak remain external gates.
`)
  await writeFile(join(output, 'test-controls.json'), `${JSON.stringify({ engineVersion: '6.4.0', reference: 'creator-v640-content-animation', locales: ['en', 'de', 'zh'], uiScales: [1, 1.25, 1.5, 1.75, 2], actions: ['inspect atlas overview and slices', 'reorder external frames and reimport', 'malformed reimport and undo', 'repair moved source', 'resolve shared Resource and local override', 'trigger and undo Resource cycle', 'inspect skin heat and auto weights', 'inspect constraint, onion skin and curves', 'preview retarget and root motion', 'play and build game'], expected: { projectFormat: 2, schema: 29, stableSlices: 2, localOverrideKeys: 1, rootMotionDistance: 5, featuresRemoved: 0, animationsRemoved: 0, portableBuildConfigured: true } }, null, 2)}\n`)
  await writeFile(join(output, 'expected-output.json'), `${JSON.stringify({ engineVersion: '6.4.0', status: 'passed', content: { aseprite: true, texturePacker: true, tiled: true, stableReimport: true }, resources: { kinds: 6, inheritance: true, cycleRejection: true }, animation: { heatView: true, autoWeights: true, constraints: true, onionSkin: true, curves: true, retarget: true, rootMotion: true }, game: { template: 'mouse-knockout', playable: true }, externalCertification: 'pending' }, null, 2)}\n`)
} finally {
  await rm(compiled, { recursive: true, force: true })
}

const indexPath = join(root, 'reference-projects/README.md')
let index = await readFile(indexPath, 'utf8')
const start = '<!-- NOVA_V640_REFERENCES_START -->', end = '<!-- NOVA_V640_REFERENCES_END -->'
const block = `${start}\n## Nova_A 6.4.0 content and animation project\n\n- [Content and animation audit](projects/creator-v640-content-animation/README.md) — deterministic external-content reimport, contextual Asset tabs, shared/local Resources, rig weights, onion skin, retarget/root motion, and playable portable output.\n${end}`
const expression = new RegExp(`${start}[\\s\\S]*?${end}`, 'm')
index = expression.test(index) ? index.replace(expression, block) : `${index.trimEnd()}\n\n${block}\n`
await writeFile(indexPath, index, 'utf8')
console.log('Generated the Nova_A v6.4.0 content and animation reference project.')

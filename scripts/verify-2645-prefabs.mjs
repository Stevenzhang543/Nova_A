/** 26.45 prefab checks in the real editor store (headless): Apply to prefab updates the other
 * instances in the open scene while they keep their own overrides, the instances in scenes that are
 * not open (stored documents) and the prefab's variants (which keep their own changes; their instances
 * follow too), and the closed scene loads with the change.
 *
 * Usage: node scripts/verify-2645-prefabs.mjs. Results: .cache/verify/prefabs-2645.json */
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { webcrypto } from 'node:crypto'
import { build } from 'vite'

const root = process.cwd()
const out = await mkdtemp(join(tmpdir(), 'nova-prefabs-2645-'))
const results = []
const observations = {}
const check = async (name, run) => { try { await run(); results.push({ name, ok: true }); console.log('PASS', name) } catch (error) { results.push({ name, ok: false, error: String(error?.stack ?? error) }); console.log('FAIL', name, '\n   ', String(error?.message ?? error)) } }
if (!globalThis.crypto) globalThis.crypto = webcrypto
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class {}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [], maxTouchPoints: 0, platform: 'Win32' } })
try {
  const entries = {
    'src/store/physics.ts': 'physicsState, sceneManager, createScene, setActiveScene',
    'src/runtime/prefabs.ts': 'createPrefabFromEntities, instantiatePrefab, applyPrefabFromInstance, createPrefabVariantFromInstance, lastPrefabPropagation, getRuntimePrefabRecord',
    'src/runtime/prefabRebase.ts': 'rebasePrefabInstance'
  }
  const entry = join(out, 'entry.ts')
  // The Editor installs the tile and world gameplay ports when its adapter loads.
  await writeFile(entry, [`import '${join(root, 'src/editor/worldGameplayAdapter.ts').replaceAll('\\', '/')}';`, ...Object.entries(entries).map(([path, names]) => `export { ${names} } from '${join(root, path).replaceAll('\\', '/')}';`)].join('\n'))
  await writeFile(join(out, 'package.json'), '{"type":"module"}\n')
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, build: { ssr: true, outDir: join(out, 'build'), emptyOutDir: false, rollupOptions: { input: { prefabs: entry }, output: { entryFileNames: '[name].mjs' } } } })
  const api = await import(pathToFileURL(join(out, 'build', 'prefabs.mjs')).href)
  // Editor history schedules an autosave; the timer never holds the process open.
  globalThis.window ??= { setTimeout: (run, ms) => { const timer = setTimeout(run, ms); timer.unref?.(); return timer }, clearTimeout, addEventListener() {}, removeEventListener() {} }
  const world = () => api.physicsState.world
  const byUuid = uuid => world().entities.find(entity => entity.uuid === uuid)
  const body = record => record.components.find(component => component.kind === 'RigidBody2D').data

  const ids = {}
  await check('setup: a prefab, an overriding instance, a variant and a closed scene using both', () => {
    const crate = world().addBox({ x: 0, y: 0 }, { x: 1, y: 1 }); crate.name = 'Crate'
    ids.reference = api.createPrefabFromEntities([crate.id], 'Crate')
    assert.ok(ids.reference, 'prefab created')
    ids.crate = crate.uuid
    const [second] = api.instantiatePrefab(ids.reference, { x: 4, y: 0 }, false)
    second.rigidBody.gravityScale = 0.5
    ids.second = second.uuid
    const [third] = api.instantiatePrefab(ids.reference, { x: 8, y: 0 }, false)
    third.rigidBody.linearDamping = 2
    ids.variant = api.createPrefabVariantFromInstance(third, 'Crate Damped')
    assert.ok(ids.variant, 'variant created')
    ids.third = third.uuid
    ids.mainScene = api.sceneManager.activeSceneUuid
    assert.equal(api.createScene('Level 2'), true)
    ids.level2 = api.sceneManager.activeSceneUuid
    const [inLevel] = api.instantiatePrefab(ids.reference, { x: 1, y: 1 }, false)
    inLevel.rigidBody.angularDamping = 3
    ids.inLevel = inLevel.uuid
    const [variantInLevel] = api.instantiatePrefab(ids.variant, { x: 2, y: 2 }, false)
    ids.variantInLevel = variantInLevel.uuid
    assert.equal(api.setActiveScene(ids.mainScene), true)
    assert.ok(byUuid(ids.crate) && byUuid(ids.second) && byUuid(ids.third), 'the main scene is back')
  })

  await check('Apply to prefab reaches the open scene, the closed scene and the variant; overrides survive', () => {
    const crate = byUuid(ids.crate)
    crate.rigidBody.density = 7; crate.rigidBody.gravityScale = 2
    assert.equal(api.applyPrefabFromInstance(crate), true)
    observations.propagation = { ...api.lastPrefabPropagation }
    // Open scene: the other instance takes the change but keeps its own gravity scale.
    const second = byUuid(ids.second)
    assert.equal(second.rigidBody.density, 7, 'the other instance took the applied density')
    assert.equal(second.rigidBody.gravityScale, 0.5, 'and kept its own gravity scale')
    // The variant document and its open instance: base change in, own change kept.
    const variant = api.getRuntimePrefabRecord(ids.variant).document.bundle.entities[0]
    assert.equal(body(variant).density, 7, 'the variant inherited the density')
    assert.equal(body(variant).gravityScale, 2, 'and the gravity scale')
    assert.equal(body(variant).linearDamping, 2, 'and kept its own damping')
    const third = byUuid(ids.third)
    assert.equal(third.rigidBody.density, 7); assert.equal(third.rigidBody.linearDamping, 2)
    // The closed scene's stored records.
    const stored = api.sceneManager.scenes.find(scene => scene.uuid === ids.level2)
    assert.equal(stored.dirty, true, 'the closed scene is marked unsaved')
    const record = uuid => stored.data.entities.find(entry => entry.uuid === uuid)
    assert.equal(body(record(ids.inLevel)).density, 7)
    assert.equal(body(record(ids.inLevel)).angularDamping, 3, 'the closed-scene override survives')
    assert.equal(body(record(ids.inLevel)).gravityScale, 2)
    assert.equal(body(record(ids.variantInLevel)).density, 7, 'the variant instance in the closed scene follows its base')
    assert.equal(body(record(ids.variantInLevel)).linearDamping, 2)
    assert.ok(observations.propagation.scenes === 1 && observations.propagation.variants === 1, JSON.stringify(observations.propagation))
  })

  await check('the closed scene opens with the change', () => {
    assert.equal(api.setActiveScene(ids.level2), true)
    const inLevel = byUuid(ids.inLevel), variantInLevel = byUuid(ids.variantInLevel)
    assert.ok(inLevel && variantInLevel)
    assert.equal(inLevel.rigidBody.density, 7); assert.equal(inLevel.rigidBody.angularDamping, 3)
    assert.equal(variantInLevel.rigidBody.density, 7); assert.equal(variantInLevel.rigidBody.linearDamping, 2)
    observations.loaded = { inLevel: { density: inLevel.rigidBody.density, angularDamping: inLevel.rigidBody.angularDamping, overrides: inLevel.prefabOverrides }, variant: { density: variantInLevel.rigidBody.density } }
    api.setActiveScene(ids.mainScene)
  })

  await check('rebasing drops records the prefab removed and adds the ones it gained', () => {
    const record = (uuid, name, x) => ({ uuid, name, components: [{ kind: 'Transform2D', data: { position: { x, y: 0 }, parentUuid: null } }] })
    const before = { bundle: { entities: [record('a', 'A', 0), record('b', 'B', 1)], connections: [], rootUuids: ['a', 'b'] } }
    const after = { bundle: { entities: [record('a', 'A2', 0), record('c', 'C', 2)], connections: [], rootUuids: ['a', 'c'] } }
    const instance = [{ record: { ...record('i-a', 'A', 5) }, sourceUuid: 'a' }, { record: record('i-b', 'B', 1), sourceUuid: 'b' }]
    let next = 0
    const rebased = api.rebasePrefabInstance(instance, before, after, () => `new-${next++}`)
    assert.deepEqual(rebased.removed, ['i-b'])
    assert.deepEqual(rebased.records.map(entry => entry.record.uuid), ['i-a', 'new-0'])
    assert.equal(rebased.records[0].record.name, 'A2', 'the renamed source')
    assert.equal(rebased.records[0].record.components[0].data.position.x, 5, 'the instance kept its position')
    assert.deepEqual(rebased.records[0].overrides, { 'components.Transform2D.data.position.x': 5 }, 'overrides name the component by kind')
  })
} catch (error) {
  results.push({ name: 'setup', ok: false, error: String(error?.stack ?? error) }); console.log('FAIL setup\n   ', String(error?.stack ?? error))
} finally {
  await rm(out, { recursive: true, force: true })
}
await mkdir(join(root, '.cache', 'verify'), { recursive: true })
await writeFile(join(root, '.cache', 'verify', 'prefabs-2645.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results, observations }, null, 2))
const passed = results.filter(result => result.ok).length
console.log(`\n${passed}/${results.length} checks passed`)
process.exitCode = passed === results.length ? 0 : 1

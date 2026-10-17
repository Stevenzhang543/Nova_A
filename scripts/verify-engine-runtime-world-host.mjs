import assert from 'node:assert/strict'
import { readFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createHash, webcrypto } from 'node:crypto'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'
import { openMediaAuditModules, mediaUuid as uuid } from './lib/mediaAudit16.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url))), before = process.argv.includes('--before')
const temporary = await mkdtemp(join(tmpdir(), 'nova-world-host-')), checks = [], runtimes = []
const normalize = value => value.replaceAll('\\', '/')
const reportPath = join(root, '.cache/engine-runtime', `world-host-${before ? 'before' : 'after'}.json`)
const sourceFiles = ['src/world/World.ts', 'src/store/physics.ts', 'scripts/verify-v26.17-bindings.mjs', 'scripts/verify-v26.17-queries.mjs', 'scripts/verify-v26.17-world-streaming.mjs']
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async file => [file, createHash('sha256').update(await readFile(join(root, file))).digest('hex')])))
const wasmBytes = await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm'))
let graph, directLoad, opened
if (!globalThis.crypto) globalThis.crypto = webcrypto
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class {}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [], maxTouchPoints: 0, platform: 'Win32', userAgent: 'Nova World host integration test' } })
const check = async (name, run) => {
  try { await run(); checks.push({ name, status: 'passed' }); console.log(`PASS ${name}`) }
  catch (error) { checks.push({ name, status: 'failed', error: error.stack ?? String(error) }); console.error(`FAIL ${name}: ${error.message}`) }
}
try {
  const entry = join(temporary, 'entry.ts')
  await writeFile(entry, `export { World, defaultCollisionMatrix } from '${normalize(join(root, 'src/world/World.ts'))}';\nexport { BoxEntity } from '${normalize(join(root, 'src/world/BoxEntity.ts'))}';\nexport { TileMap2D } from '${normalize(join(root, 'src/world/components.ts'))}';\nexport { defaultPhysicsLayers, defaultPhysicsProfile } from '${normalize(join(root, 'src/runtime/physicsProduction.ts'))}';\nexport { initSync, WasmRuntimeWorld } from '${normalize(join(root, 'nova_core/pkg/nova_core.js'))}';\n`)
  const worldEntry = normalize(join(root, 'src/world/World.ts'))
  const graphPlugin = {
    name: 'world-host-production-value-graph',
    generateBundle() {
      const modules = new Map([...this.getModuleIds()].map(id => [normalize(id), this.getModuleInfo(id)]))
      const reachable = new Set(), pending = [worldEntry]
      for (let index = 0; index < pending.length; index++) {
        const id = pending[index]
        if (reachable.has(id)) continue
        reachable.add(id)
        const info = modules.get(id)
        for (const dependency of [...(info?.importedIds ?? []), ...(info?.dynamicallyImportedIds ?? [])]) pending.push(normalize(dependency))
      }
      const paths = [...reachable].map(id => normalize(relative(root, id)))
      const forbidden = paths.filter(id => /(?:^|\/)node_modules\/.*(?:\/vue(?:@|\/)|\/@vue\/|\/pinia(?:@|\/))/.test(id) || /^src\/(?:editor|store|components|layout|ui)\//.test(id) || /^src\/assets\/(?:AssetDatabase|importPipeline)\./.test(id))
      graph = { entry: 'src/world/World.ts', reachableModules: reachable.size, modules: paths.sort(), forbidden: forbidden.sort(), scope: 'Actual Rollup module value-import graph; type-only package boundaries and complete Player isolation are separate gates.' }
    }
  }
  await build({ configFile: false, root, plugins: [graphPlugin], logLevel: 'error', ssr: { noExternal: true }, build: { ssr: true, outDir: temporary, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'world.mjs', inlineDynamicImports: true } } } })
  if (before) {
    assert.ok(graph.forbidden.length > 0, 'The unchanged production World graph must reproduce the boundary defect')
    try { await import(pathToFileURL(join(temporary, 'world.mjs')).href); directLoad = { status: 'loaded' } }
    catch (error) { directLoad = { status: 'failed', name: error.name, message: error.message } }
    checks.push({ name: 'Unchanged actual World graph reaches forbidden Editor/Vue dependencies', status: 'confirmed', count: graph.forbidden.length })
  } else {
    await check('Actual compiled World value graph excludes Vue, stores and Editor asset/importer modules', () => assert.equal(graph.forbidden.length, 0, JSON.stringify(graph.forbidden)))
    const core = await import(pathToFileURL(join(temporary, 'world.mjs')).href)
    directLoad = { status: 'loaded' }
    core.initSync({ module: wasmBytes })
    const settings = { gravity: 0, airFriction: 0, timeScale: 1, tickRate: 60, maxCatchUpSteps: 4, collisionMatrix: core.defaultCollisionMatrix(), interpolation: 'Interpolate', layers: core.defaultPhysicsLayers(), profile: core.defaultPhysicsProfile() }
    const attach = world => { world.runtime = new core.WasmRuntimeWorld(); world.wasmLoaded = true; runtimes.push(world.runtime); return world }
    const body = (world, x = 0) => { const entity = world.addBox({ x, y: 0 }, { x: 2, y: 2 }); entity.isStatic = true; return entity }
    const sync = world => world.queryPhysics({ kind: 'Point', origin: { x: 999, y: 999 } })
    const record = (world, entity) => world.bodyRecords.get(world.bodyHandles.get(entity.id))
    await check('Pure World constructor runs actual ordinary WASM physics with inline material', () => {
      const world = attach(new core.World()), entity = body(world)
      assert.equal(world.queryPhysics({ kind: 'Point', origin: { x: 0, y: 0 } })[0].entityUuid, entity.uuid)
      world.update(1 / 60, true, settings); assert.equal(world.diagnostics.totalPhysicsSteps, 1)
    })
    await check('Unconfigured resource material is rejected explicitly rather than using an Editor global', () => {
      const world = attach(new core.World()), entity = body(world); entity.collider.materialAsset = 'asset://unconfigured-material'
      assert.throws(() => sync(world), /PHYSICS_MATERIAL_MISSING/)
    })
    await check('Unconfigured bound tile collision is rejected while unbound or disabled maps remain valid', () => {
      const world = attach(new core.World()), entity = body(world); entity.removeComponent('RigidBody2D'); entity.removeComponent('BoxCollider2D')
      const map = entity.addComponent(new core.TileMap2D()); sync(world)
      map.tileSetAsset = 'asset://unconfigured-tiles'; map.revision++
      assert.throws(() => sync(world), /WORLD_TILE_SERVICE_REQUIRED/)
      assert.throws(() => sync(world), /WORLD_TILE_SERVICE_REQUIRED/, 'A failed projection must not be cached as successfully empty')
      map.bakeCollision = false; map.revision++; assert.doesNotThrow(() => sync(world))
    })
    await check('Invalid resource revisions fail before changing native world state and can recover', () => {
      let revision = 0
      const world = attach(new core.World({ readTextAsset: () => null, assetRevision: () => revision, buildTileColliderDescriptors: () => [] })); body(world); sync(world)
      const checksum = world.stateChecksum()
      for (const invalid of [NaN, Infinity, -1, .5, Number.MAX_SAFE_INTEGER + 1]) {
        revision = invalid; assert.throws(() => sync(world), /WORLD_ASSET_REVISION_INVALID/); assert.equal(world.stateChecksum(), checksum)
      }
      revision = 1; assert.doesNotThrow(() => sync(world)); assert.equal(world.stateChecksum(), checksum)
    })
    await check('Bound callback owner and fixed per-world service selection survive changes to the supplied host object', () => {
      const host = {
        revision: 1,
        source: JSON.stringify({ format: 'nova-physics-material', density: 5, restitution: .5 }),
        readTextAsset() { return this.source }, assetRevision() { return this.revision }, buildTileColliderDescriptors() { return [] }
      }
      const world = attach(new core.World(host)), entity = body(world); entity.collider.materialAsset = 'asset://owned-material'
      sync(world); assert.equal(record(world, entity)[8], 20)
      host.readTextAsset = () => JSON.stringify({ format: 'nova-physics-material', density: 9 }); host.source = JSON.stringify({ format: 'nova-physics-material', density: 6 }); host.revision++
      sync(world); assert.equal(record(world, entity)[8], 24)
    })
    await check('Two real World instances use independent material catalogs and native records', () => {
      const material = density => JSON.stringify({ format: 'nova-physics-material', version: 1, density, restitution: density / 10, staticFriction: .7, dynamicFriction: .5, frictionCombine: 'Multiply', restitutionCombine: 'Minimum' })
      const sourceA = new Map([['asset://same-material', material(3)]]), sourceB = new Map([['asset://same-material', material(7)]])
      const host = sources => ({ readTextAsset: reference => sources.get(reference) ?? null, assetRevision: () => 1, buildTileColliderDescriptors: () => [] })
      const a = attach(new core.World(host(sourceA))), b = attach(new core.World(host(sourceB))), ea = body(a), eb = body(b)
      ea.collider.materialAsset = eb.collider.materialAsset = 'asset://same-material'; sync(a); sync(b)
      assert.equal(record(a, ea)[8], 12); assert.equal(record(b, eb)[8], 28)
      assert.equal(record(a, ea)[10], .3); assert.equal(record(b, eb)[10], .7)
      sourceA.set('asset://same-material', material(4)); sync(a); sync(b)
      assert.equal(record(a, ea)[8], 16); assert.equal(record(b, eb)[8], 28)
    })
    await check('Optional physics observation stays attached to its own real World', () => {
      const first = [], second = []
      const host = observed => ({ readTextAsset: () => null, assetRevision: () => 0, buildTileColliderDescriptors: () => [], recordPhysicsTelemetry: (entities, _connections, _events, diagnostics) => observed.push({ owner: entities[0].uuid, step: diagnostics.totalPhysicsSteps }) })
      const a = attach(new core.World(host(first))), b = attach(new core.World(host(second))), ea = body(a), eb = body(b)
      a.update(1 / 60, true, settings); b.update(1 / 60, true, settings); a.update(1 / 60, true, settings)
      assert.deepEqual(first.map(item => item.step), [1, 2]); assert.deepEqual(second.map(item => item.step), [1])
      assert(first.every(item => item.owner === ea.uuid)); assert(second.every(item => item.owner === eb.uuid))
    })
    opened = await openMediaAuditModules({ repository: root, bases: [root] }, { physics: 'store/physics', database: 'assets/AssetDatabase', types: 'assets/types', components: 'world/components', tiles: 'runtime/tilemap', monitor: 'runtime/physicsMonitor' })
    const { physics, database, types, components, tiles, monitor } = opened.modules, native = await opened.wasm()
    const editorWorld = () => { const world = physics.createEditorWorld(); world.runtime = new native.module.WasmRuntimeWorld(); world.wasmLoaded = true; runtimes.push(world.runtime); return world }
    await check('Existing production Editor factory supplies live material reads without changing authoring values', () => {
      const world = editorWorld(), entity = world.addBox({ x: 0, y: 0 }, { x: 2, y: 2 }); entity.isStatic = true
      const inline = JSON.stringify(entity.collider.material), material = { format: 'nova-physics-material', version: 1, density: 3, restitution: .8 }
      const asset = database.createTextAsset('Host material', 'material', JSON.stringify(material), 'Assets'); entity.collider.materialAsset = `asset://${asset.uuid}`
      sync(world); assert.equal(record(world, entity)[8], 12); assert.equal(record(world, entity)[10], .8)
      database.updateTextAsset(asset.uuid, JSON.stringify({ ...material, density: 4, restitution: .2 })); sync(world)
      assert.equal(record(world, entity)[8], 16); assert.equal(record(world, entity)[10], .2); assert.equal(JSON.stringify(entity.collider.material), inline)
      database.updateTextAsset(asset.uuid, '{'); assert.throws(() => sync(world), /PHYSICS_MATERIAL_INPUT/)
    })
    await check('Existing tile algorithm and live asset revision rebuild real native owner-query bodies', () => {
      const reference = uuid(741), source = collision => JSON.stringify({ columns: 1, rows: 1, tiles: [{ index: 0, collision }] })
      database.loadAssets([{ uuid: reference, name: 'Host tiles', path: 'Assets/host.tileset', assetType: 'tileset', mimeType: 'application/json', source: source('Box'), byteLength: source('Box').length, sourceModified: 1, importedAt: 1, width: 0, height: 0, duration: 0, fontFamily: '', settings: types.defaultImportSettings() }])
      const world = editorWorld(), entity = world.addBox({ x: 3, y: 0 }, { x: 1, y: 1 }); entity.removeComponent('BoxCollider2D'); entity.removeComponent('RigidBody2D')
      const map = entity.addComponent(new components.TileMap2D()); map.width = map.height = 1; map.tiles = [0]; map.layers[0].tiles = map.tiles; map.layers[0].transforms = [0]; map.tileSetAsset = `asset://${reference}`; tiles.normalizeTileMap(map)
      const query = () => world.queryPhysics({ kind: 'Point', origin: { x: 3, y: 0 } })
      assert.equal(query()[0].entityUuid, entity.uuid); const revision = map.revision, previousGeneration = database.assetState.generation
      database.updateTextAsset(reference, source('None')); assert(database.assetState.generation > previousGeneration); assert.equal(map.revision, revision); assert.equal(query().length, 0)
      database.updateTextAsset(reference, source('Box')); assert.equal(query()[0].entityUuid, entity.uuid)
      assert.equal(world.queryPhysics({ kind: 'Nearest', origin: { x: 0, y: 0 }, distance: 10, excludeEntityUuids: [entity.uuid] }).length, 0)
    })
    await check('A real tile projector failure retains the last published derived cache and native state until successful retry', () => {
      let revision = database.assetState.generation, fail = false
      const world = new physics.physicsState.world.constructor({
        readTextAsset: database.readTextAsset,
        assetRevision: () => revision,
        buildTileColliderDescriptors(component) { if (fail) throw new Error('TEST_TILE_SOURCE_UNAVAILABLE'); return tiles.buildTileColliderDescriptors(component) }
      })
      world.runtime = new native.module.WasmRuntimeWorld(); world.wasmLoaded = true; runtimes.push(world.runtime)
      const entity = world.addBox({ x: 3, y: 0 }, { x: 1, y: 1 }); entity.removeComponent('BoxCollider2D'); entity.removeComponent('RigidBody2D')
      const map = entity.addComponent(new components.TileMap2D()); map.width = map.height = 1; map.tiles = [0]; map.layers[0].tiles = map.tiles; map.layers[0].transforms = [0]; map.tileSetAsset = `asset://${uuid(741)}`; tiles.normalizeTileMap(map)
      const query = () => world.queryPhysics({ kind: 'Point', origin: { x: 3, y: 0 } })
      assert.equal(query()[0].entityUuid, entity.uuid)
      const bodies = world.tileCollisionBodies, owners = world.tileCollisionOwners, signature = world.tileCollisionSignature, checksum = world.stateChecksum()
      revision++; fail = true
      for (let retry = 0; retry < 2; retry++) {
        assert.throws(query, /TEST_TILE_SOURCE_UNAVAILABLE/); assert.equal(world.tileCollisionBodies, bodies); assert.equal(world.tileCollisionOwners, owners); assert.equal(world.tileCollisionSignature, signature); assert.equal(world.stateChecksum(), checksum)
      }
      fail = false; assert.equal(query()[0].entityUuid, entity.uuid); assert.notEqual(world.tileCollisionSignature, signature)
    })
    await check('Existing production factory preserves Editor physics telemetry after native advance', () => {
      monitor.beginPhysicsMonitorSession(); const world = editorWorld(), entity = world.addBox({ x: 0, y: 0 }, { x: 1, y: 1 }); entity.velocity.x = 2
      world.update(1 / 60, true, settings)
      assert.equal(world.diagnostics.totalPhysicsSteps, 1); assert(monitor.physicsMonitorState.bodies.some(item => item.uuid === entity.uuid))
    })
  }
} catch (error) {
  checks.push({ name: 'World host verifier setup', status: 'failed', error: error.stack ?? String(error) })
} finally {
  for (const runtime of runtimes) runtime.free()
  if (opened) await opened.close()
  const temporaryTarget = resolve(temporary), expectedParent = resolve(tmpdir())
  assert.equal(dirname(temporaryTarget), expectedParent); assert.ok(temporaryTarget.startsWith(join(expectedParent, 'nova-world-host-')))
  await rm(temporaryTarget, { recursive: true, force: true })
  const status = before ? (checks.some(item => item.status === 'failed') ? 'failed' : 'CONFIRMED_BOUNDARY_DEFECT') : checks.every(item => item.status === 'passed') ? 'passed' : 'failed'
  const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), status, mode: before ? 'before' : 'after', sourceHashes, wasm: { bytes: wasmBytes.length, sha256: createHash('sha256').update(wasmBytes).digest('hex'), variant: 'optimized ordinary nonshared' }, graph, directLoad, checks, limits: ['Local World value-import boundary and real Node/WASM business fixtures only.', 'No complete Gameplay/Player/package-export isolation or browser/GPU/Worker claims.', 'Injected material catalogs supply real JSON to the unchanged production World/native physics; Editor tile fixtures call the existing algorithm without copying it.'] }
  await mkdir(dirname(reportPath), { recursive: true }); await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ status, checks: checks.length, forbiddenModules: graph?.forbidden.length, report: reportPath }))
  if (status === 'failed') process.exitCode = 1
}

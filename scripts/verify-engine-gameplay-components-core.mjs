/** Paired actual Core / ordinary WASM component ownership checks. Not a performance benchmark. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash, webcrypto } from 'node:crypto'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const before = process.argv.includes('--before'), mode = before ? 'before' : 'after'
const outputRoot = join(root, '.cache/engine-overhaul/gameplay-components/core-integration')
const baselineRoot = join(outputRoot, 'before-39140-CiOrty')
const normalize = value => value.replaceAll('\\', '/'), sha = value => createHash('sha256').update(value).digest('hex')
await mkdir(outputRoot, { recursive: true })
const output = await mkdtemp(join(outputRoot, `${mode}-`)), snapshot = join(output, 'source')
await writeFile(join(output, 'verifier.mjs'), await readFile(fileURLToPath(import.meta.url)), { flag: 'wx' })
const baselineBytes = await readFile(join(baselineRoot, 'source.json')), baseline = JSON.parse(baselineBytes)
const manifestBytes = await readFile(join(baselineRoot, 'engine-build-manifest.json')), manifest = JSON.parse(manifestBytes)
assert.equal(sha(manifestBytes), baseline.manifestSha256)
const manifestRecords = new Map(manifest.source.map(record => [normalize(record.path), record]))
const originals = new Map(), currentHashes = new Map(), sourceHashes = {}, reached = new Set()
for (const record of baseline.files) {
  const bytes = await readFile(join(baselineRoot, record.path))
  assert.equal(sha(bytes), record.sha256); assert.equal(record.sha256, manifestRecords.get(record.path)?.sha256)
  if (/\.(ts|js|json)$/.test(record.path)) originals.set(normalize(join(root, record.path)), bytes.toString('utf8'))
}
const checks = [], observations = [], nativeCalls = [], serviceCalls = [], runtimes = [], worlds = [], restorers = []
const cleanup = { runtimes: [], worlds: [], instrumentation: [] }
let api, finished = false, failure = null, bundleEvidence = null, loadedSources = []
const verify = (name, operation, scope = 'component-ownership') => {
  try { operation(); checks.push({ name, scope, status: 'PASSED' }) }
  catch (error) { checks.push({ name, scope, status: 'FAILED', error: error.stack ?? String(error) }) }
}
const copy = value => JSON.parse(JSON.stringify(value))
if (!globalThis.crypto) globalThis.crypto = webcrypto
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class {}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [], maxTouchPoints: 0, platform: 'Win32' } })

try {
  const entries = {
    'src/runtime/GameplayRuntime.ts': 'GameplayRuntime, GameplayRuntimeCore',
    'src/editor/gameplayScriptServices.ts': 'createEditorGameplayScriptServices',
    'src/editor/gameplayWorldHost.ts': 'createEditorGameplayWorldHost',
    'src/store/physics.ts': 'physicsState, sceneManager, createEditorWorld, serializeEntity',
    'src/world/BoxEntity.ts': 'BoxEntity',
    'src/world/components.ts': 'CharacterBody2D, PlatformController2D, Health2D, DamageHitbox2D, Collectible2D, Projectile2D, Spawner2D, ObjectPool2D, Lifetime2D',
    'src/runtime/gameplayComponents.ts': 'gameplayComponentDiagnostics',
    'src/runtime/streamLifecycle.ts': 'activateStreamEntities, deactivateStreamEntities',
    'src/runtime/objectPool.ts': 'prepareObjectPools, acquirePooled, releasePooled',
    'src/runtime/entityLifetimes.ts': 'beginEntityLifetime, entityLifetimeActive',
    'src/assets/AssetDatabase.ts': 'assetState, assetReference',
    'src/runtime/scriptSettings.ts': 'scriptProjectSettings',
    'src/runtime/simulationAuthoring26.ts': 'simulationEvidenceState',
    'src/runtime/packages.ts': 'packageState',
    'nova_core/pkg/nova_core.js': 'default as initWasm, WasmRuntimeWorld'
  }
  const entry = join(output, 'entry.ts')
  await writeFile(entry, Object.entries(entries).map(([path, names]) => `export { ${names} } from '${normalize(join(root, path))}';`).join('\n') + "\nexport { toRaw } from 'vue';", { flag: 'wx' })
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: [{ name: 'paired-components-actual-closure', enforce: 'pre', async load(id) {
    const path = normalize(id.split('?')[0])
    if (path.startsWith(`${normalize(root)}/src/`) || path.startsWith(`${normalize(root)}/nova_core/pkg/`)) {
      const current = await readFile(path), key = normalize(relative(root, path)); currentHashes.set(path, sha(current))
      const original = before ? originals.get(path) : undefined
      if (before && original === undefined) throw Error(`Baseline production dependency absent from frozen172 closure: ${key}`)
      const bytes = original === undefined ? current : Buffer.from(original)
      if (before) assert.equal(sha(bytes), manifestRecords.get(key)?.sha256, `Unpaired39140 baseline: ${key}`)
      await mkdir(dirname(join(snapshot, key)), { recursive: true }); await writeFile(join(snapshot, key), bytes, { flag: 'wx' })
      sourceHashes[key] = { sha256: sha(bytes), currentSha256: sha(current), snapshotPath: join(snapshot, key), overlay: before, matches39140Manifest: sha(bytes) === manifestRecords.get(key)?.sha256 }
      return bytes.toString('utf8')
    }
  }, buildEnd() { for (const id of this.getModuleIds()) { const path = normalize(id.split('?')[0]); if (currentHashes.has(path)) reached.add(path) } } }], build: { ssr: true, outDir: output, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'integration.mjs', inlineDynamicImports: true } } } })
  loadedSources = [...reached].sort().map(path => normalize(relative(root, path)))
  for (const path of loadedSources) sourceHashes[path].loadedInSsr = true
  if (before) assert(!loadedSources.includes('src/runtime/gameplayComponentsOwner.ts'))
  else assert(loadedSources.includes('src/runtime/gameplayComponentsOwner.ts'))
  bundleEvidence = { entryPath: entry, bundlePath: join(output, 'integration.mjs'), entrySha256: sha(await readFile(entry)), bundleSha256: sha(await readFile(join(output, 'integration.mjs'))) }
  api = await import(pathToFileURL(join(output, 'integration.mjs')).href)
  const wasmBytes = await readFile(join(baselineRoot, 'nova_core/pkg/nova_core_bg.wasm'))
  assert.equal(sha(wasmBytes), baseline.files.find(record => record.path.endsWith('_bg.wasm')).sha256)
  assert.equal(sha(await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm'))), sha(wasmBytes))
  await api.initWasm({ module_or_path: wasmBytes })
  globalThis.window = Object.assign(new EventTarget(), { performance: globalThis.performance })
  globalThis.document = Object.assign(new EventTarget(), { hidden: false, activeElement: null })
  globalThis.CustomEvent = class extends Event { constructor(name, options) { super(name); this.detail = options?.detail } }
  api.scriptProjectSettings.debuggerEnabled = false; api.scriptProjectSettings.testing.coverageEnabled = false
  const key = type => window.dispatchEvent(Object.assign(new Event(type), { code: 'KeyD', key: 'd', repeat: false, isComposing: false, keyCode: 68, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false }))
  const instrument = (object, method, sink, label) => {
    const actual = object[method]; assert.equal(typeof actual, 'function', `Missing actual ${method}`)
    object[method] = function (...args) { const record = { owner: label, method, args: args.map(value => value?.uuid ? { uuid: value.uuid } : copy(value)), returned: null }; sink.push(record); try { const result = actual.apply(this, args); record.returned = copy(result ?? null); return result } catch (error) { record.error = String(error); throw error } }
    restorers.push(() => { object[method] = actual; cleanup.instrumentation.push({ owner: label, method, restored: object[method] === actual }) })
  }
  const attach = (world, label) => {
    world.runtime = new api.WasmRuntimeWorld(); world.wasmLoaded = true; worlds.push({ world, label })
    instrument(world.runtime, 'move_character_box_json', nativeCalls, label)
    return world
  }
  let id = 2000
  const make = (uuid, name, x = 0) => { const entity = new api.BoxEntity(id++, { x, y: 100 }, { x: 1, y: 1 }, uuid); entity.name = name; return entity }
  const char = entity => entity.getComponent('CharacterBody2D'), health = entity => entity.getComponent('Health2D')
  const platform = (name, uuid, jump = 'MoveRight') => { const entity = make(uuid, name); entity.isStatic = false; entity.isKinematic = true; entity.addComponent(new api.CharacterBody2D()); entity.addComponent(new api.PlatformController2D()).jumpAction = jump; return entity }
  const pair = name => { const source = make('22222222-2222-4222-8222-222222222222', name + ' source', 100), target = make('33333333-3333-4333-8333-333333333333', name + ' target', 200); source.addComponent(new api.DamageHitbox2D()).hitCooldown = 10; target.tags.push('damageable'); target.addComponent(new api.Health2D()).destroyOnZero = false; return { source, target } }
  const contact = (runtime, pair) => {
    const event = { type: 'collisionStarted', firstEntityUuid: pair.source.uuid, secondEntityUuid: pair.target.uuid, point: [0, 0], normal: [0, 1], relativeVelocity: [0, 0] }
    observations.push({ stage: 'supplied-contact-fixture', event, provenance: 'Supplied fixture event through actual Core.dispatchPhysicsEvents, not a Rust-produced collision.' })
    runtime.dispatchPhysicsEvents([event])
  }
  const child = runtime => before ? null : runtime.worldGameplayOwner.componentsOwner
  const diagnostic = runtime => before ? api.gameplayComponentDiagnostics : child(runtime).diagnostics
  const moved = (label, start = 0) => nativeCalls.slice(start).filter(call => call.owner === label).map(call => ({ dx: call.args[3], dy: call.args[4] }))
  const originalWorld = attach(api.physicsState.world, 'Editor-root'), services = api.createEditorGameplayScriptServices(), editorHost = api.createEditorGameplayWorldHost()
  const oldSettings = copy(api.physicsState.globalSettings), oldMode = api.physicsState.playMode
  Object.assign(api.physicsState.globalSettings, { gravity: 0, airFriction: 0, timeScale: 1, tickRate: 10, maxCatchUpSteps: 8 }); api.physicsState.playMode = 'playing'
  const legacyCharacter = platform('Legacy player', '11111111-1111-4111-8111-111111111111')
  originalWorld.entities.splice(0, originalWorld.entities.length, legacyCharacter)
  const legacy = new api.GameplayRuntime(); runtimes.push(legacy)
  const deleteActual = editorHost.deleteEntity
  // Later fixtures construct a fresh legacy Core whose host records and delegates deletion.
  legacy.beginSession(); char(legacyCharacter).onFloor = true; key('keydown'); legacy.frame(.11); key('keyup'); legacy.stepOnce()
  verify('normal-legacy-begin-frame-step-real-input-and-native-controller-positive-control', () => { assert(moved('Editor-root').some(value => value.dy > 0)); assert.equal(char(legacyCharacter).requestedMotion.y, 0); if (!before) { assert.equal(child(legacy).world, originalWorld); assert.equal(child(legacy).diagnostics, api.gameplayComponentDiagnostics) } }, 'positive-control')
  const legacyCounters = copy(diagnostic(legacy)); legacy.stopSession(false)
  verify('normal-stop-keeps-diagnostics-and-releases-input-VM', () => { assert.deepEqual(copy(diagnostic(legacy)), legacyCounters); assert.equal(legacy.isActive, false); assert.equal(legacy.input.attached, false); assert.equal(legacy.scriptRuntime, null) }, 'positive-control')
  const makeHost = (world, label) => ({ ...editorHost, state: { ...api.physicsState, world, camera: { scale: 1, offset: { x: 0, y: 0 }, targetOffset: { x: 0, y: 0 } }, globalSettings: { ...api.physicsState.globalSettings }, engineDiagnostics: { ...api.physicsState.engineDiagnostics }, playMode: 'playing' }, get activeSceneUuid() { return label } })
  const aWorld = attach(api.createEditorWorld(), 'World-A'), bWorld = attach(api.createEditorWorld(), 'World-B')
  const sameUuid = '11111111-1111-4111-8111-111111111111', aPlayer = platform('A player', sameUuid), bPlayer = platform('B player', sameUuid, 'UnusedFixtureJump'), hitA = pair('A'), hitB = pair('B')
  aWorld.entities.push(aPlayer, hitA.source, hitA.target); bWorld.entities.push(bPlayer, hitB.source, hitB.target)
  const aHost = makeHost(aWorld, 'fixture-scene-a'), bHost = makeHost(bWorld, 'fixture-scene-b')
  const a = new api.GameplayRuntimeCore(services, aHost), b = new api.GameplayRuntimeCore(services, bHost); runtimes.push(a, b)
  a.beginSession(); b.beginSession()
  verify('actual-session-begin-resets-all-six-diagnostics-before-any-fixed-step', () => { assert.deepEqual(copy(diagnostic(a)), { controllers: 0, spawns: 0, damageEvents: 0, collections: 0, expired: 0, lastError: '' }); if (!before) { assert.equal(child(a).verticalVelocity.size, 0); assert.equal(child(a).hitCooldowns.size, 0); assert.equal(child(a).cooldownParticipants.size, 0) } }, 'positive-control')
  char(aPlayer).onFloor = true; key('keydown'); a.frame(.11); key('keyup')
  const bStart = nativeCalls.length; b.frame(.11); const bMove = moved('World-B', bStart)
  observations.push({ stage: 'same-UUID-native-controller-after-A-jump', sameUuid: aPlayer.uuid === bPlayer.uuid, distinctActualWorlds: aWorld !== bWorld, bMove })
  verify('B-same-UUID-native-controller-falls-without-consuming-A-jump-cache', () => { assert(bMove.length); assert(bMove.every(value => value.dy < 0)) })
  b.stopSession(false); b.beginSession(); char(aPlayer).onFloor = false
  const aStart = nativeCalls.length; a.stepOnce(); const afterBBegin = moved('World-A', aStart)
  observations.push({ stage: 'A-real-step-after-B-begin', afterBBegin })
  verify('B-begin-does-not-reset-A-positive-vertical-history-in-real-step', () => { assert(afterBBegin.length); assert(afterBBegin.some(value => value.dy > 0)) })
  contact(a, hitA); contact(b, hitB)
  verify('actual-Core-contact-damage-positive-control', () => { assert.equal(health(hitA.target).current, 90) }, 'positive-control')
  verify('same-UUID-pair-in-B-hits-independently-from-A-cooldown', () => { assert.equal(health(hitB.target).current, 90) })
  const aBeforeTicks = health(hitA.target).current
  for (let tick = 0; tick < 101; tick++) b.stepOnce()
  contact(a, hitA)
  observations.push({ stage: 'B-clock-vs-A-cooldown', AElapsedWhenFirstHit: a.time.value.elapsed, BElapsed: b.time.value.elapsed, AHealthBefore: aBeforeTicks, AHealthAfter: health(hitA.target).current })
  verify('other-World-fixed-ticks-do-not-expire-A-hit-cooldown', () => { assert.equal(health(hitA.target).current, aBeforeTicks) })
  // Rebegin A intentionally establishes a new live cooldown, then rebegin only B.
  a.stopSession(false); a.beginSession(); health(hitA.target).current = 100; contact(a, hitA); b.stopSession(false); b.beginSession(); contact(a, hitA)
  verify('B-begin-does-not-clear-A-live-hit-cooldown', () => { assert.equal(health(hitA.target).current, 90) })
  a.frame(.11); const aDiag = copy(diagnostic(a)); bPlayer.getComponent('PlatformController2D').enabled = false; b.frame(.11); b.stopSession(false)
  verify('B-update-and-stop-preserve-A-own-diagnostic-view', () => { assert.deepEqual(copy(diagnostic(a)), aDiag); if (!before) assert.notEqual(child(a).diagnostics, child(b).diagnostics) })
  b.beginSession()
  const collectA = make(undefined, 'A collectible', 300), collectB = make(undefined, 'B collectible', 300)
  for (const [value, score] of [[collectA, 3], [collectB, 7]]) { const component = value.addComponent(new api.Collectible2D()); component.score = score; component.destroyOnCollect = false }
  aPlayer.tags.push('player'); bPlayer.tags.push('player'); aWorld.entities.push(collectA); bWorld.entities.push(collectB)
  contact(a, { source: collectA, target: aPlayer }); contact(b, { source: collectB, target: bPlayer })
  verify('actual-Core-contacts-use-own-explicit-GameFlow-score-callback', () => { assert.equal(a.gameFlowOwner.state.score, 3); assert.equal(b.gameFlowOwner.state.score, 7) }, 'positive-control')
  api.simulationEvidenceState.enabled = true; a.frame(.11); b.frame(.11); a.frame(.11)
  const evidenceA = copy(api.simulationEvidenceState); b.stopSession(false)
  observations.push({ stage: 'remaining-real-shared-evidence-stop-B', before: evidenceA, after: copy(api.simulationEvidenceState), AActive: a.isActive })
  verify('remaining-shared-evidence-survives-other-World-stop', () => { assert(evidenceA.frames.length); assert.deepEqual(copy(api.simulationEvidenceState), evidenceA) }, 'remaining-shared-service')
  const countersA = copy(diagnostic(a)); a.stopSession(false)
  verify('own-stop-preserves-session-counters-and-clears-only-own-component-caches', () => { assert.deepEqual(copy(diagnostic(a)), countersA); if (!before) { assert.equal(child(a).verticalVelocity.size, 0); assert.equal(child(a).hitCooldowns.size, 0); assert.equal(child(a).cooldownParticipants.size, 0) } }, 'positive-control')

  // Actual legacy spawner and pool/stream hooks. All service implementations remain real.
  const template = make(undefined, 'Actual projectile template'); template.addComponent(new api.Projectile2D()).lifetime = .3
  const prefab = { uuid: '44444444-4444-4444-8444-444444444444', name: 'Core components projectile', path: 'Assets/core-components.prefab', assetType: 'prefab', source: JSON.stringify({ prefabVersion: 2, name: 'Core components projectile', bundle: { entities: [api.serializeEntity(template)], connections: [], rootUuids: [template.uuid] }, variantOf: null }), mimeType: 'application/json', width: 0, height: 0 }
  api.assetState.records.push(prefab); api.assetState.generation++
  const spawnerEntity = make(undefined, 'Actual spawner'), spawner = spawnerEntity.addComponent(new api.Spawner2D()); spawner.prefabAsset = api.assetReference(prefab.uuid); spawner.interval = 100
  originalWorld.entities.splice(0, originalWorld.entities.length, spawnerEntity)
  const recordingHost = { ...editorHost, deleteEntity(entityId) { serviceCalls.push({ service: 'actual-Editor-deleteEntity', id: entityId }); return deleteActual(entityId) } }
  const normal = new api.GameplayRuntimeCore(services, recordingHost); runtimes.push(normal)
  normal.beginSession(); normal.frame(.11)
  const spawned = originalWorld.entities.find(entity => entity.uuid === spawner.runtimeSpawned[0]), spawnedSnapshot = spawned ? { id: spawned.id, uuid: spawned.uuid, velocity: copy(spawned.velocity), remaining: spawned.getComponent('Projectile2D')?.runtimeLifetime } : null
  normal.frame(.22)
  observations.push({ stage: 'actual-Core-spawn-projectile-expire-delete-chain', spawned: spawnedSnapshot, stillLive: spawned ? originalWorld.entities.includes(spawned) : null, diagnostics: copy(diagnostic(normal)), serviceCalls: copy(serviceCalls) })
  verify('real-Core-spawner-prefab-initializer-projectile-expiry-deferred-delete-chain', () => { assert(spawned); assert.equal(spawnedSnapshot.velocity.x, 12); assert(!originalWorld.entities.some(entity => entity.uuid === spawned.uuid)); assert(serviceCalls.some(call => call.service === 'actual-Editor-deleteEntity' && call.id === spawned.id)); assert.equal(diagnostic(normal).spawns, 1); assert.equal(diagnostic(normal).expired, 1) }, 'positive-control')
  const fresh = make(undefined, 'Fresh streamed lifetime'), life = fresh.addComponent(new api.Lifetime2D()); life.seconds = 3; life.runtimeRemaining = -10
  const existingHealth = spawnerEntity.addComponent(new api.Health2D()); existingHealth.runtimeInvulnerability = .4
  originalWorld.entities.push(fresh); const beforeStreamDiag = copy(diagnostic(normal)); api.activateStreamEntities([spawnerEntity, fresh])
  verify('actual-stream-activation-initializes-only-fresh-entities-without-resetting-diagnostics', () => { assert.equal(life.runtimeRemaining, 3); assert.equal(existingHealth.runtimeInvulnerability, .4); assert.deepEqual(copy(diagnostic(normal)), beforeStreamDiag) }, 'positive-control')
  normal.frame(.11); const lifetimeBeforeReactivation = life.runtimeRemaining; api.activateStreamEntities([fresh])
  verify('repeated-real-stream-activation-does-not-reinitialize-an-existing-lifetime', () => { assert(lifetimeBeforeReactivation < 3); assert.equal(life.runtimeRemaining, lifetimeBeforeReactivation) }, 'positive-control')
  normal.stopSession(false)

  const pooledTemplate = platform('Pooled controller template', undefined, 'MoveRight'); pooledTemplate.addComponent(new api.DamageHitbox2D()).hitCooldown = 10
  const poolAsset = { ...prefab, uuid: '55555555-5555-4555-8555-555555555555', name: 'Core pooled controller', path: 'Assets/core-pooled-controller.prefab', source: JSON.stringify({ prefabVersion: 2, name: 'Core pooled controller', bundle: { entities: [api.serializeEntity(pooledTemplate)], connections: [], rootUuids: [pooledTemplate.uuid] }, variantOf: null }) }
  api.assetState.records.push(poolAsset); api.assetState.generation++
  const poolEntity = make(undefined, 'Actual pool owner', 500), pool = poolEntity.addComponent(new api.ObjectPool2D()); pool.prefabAsset = api.assetReference(poolAsset.uuid); pool.prewarm = 1; pool.capacity = 1
  const pooledTarget = make(undefined, 'Pooled target', 600); pooledTarget.tags.push('damageable'); pooledTarget.addComponent(new api.Health2D()).destroyOnZero = false
  originalWorld.entities.splice(0, originalWorld.entities.length, poolEntity, pooledTarget); api.prepareObjectPools()
  normal.beginSession(); const acquired = api.acquirePooled(pool.prefabAsset, { x: 0, y: 100 }); assert(acquired?.length); const pooledPlayer = acquired[0]
  char(pooledPlayer).onFloor = true; key('keydown'); normal.frame(.11); key('keyup'); contact(normal, { source: pooledPlayer, target: pooledTarget })
  const poolDiag = copy(diagnostic(normal)); const released = api.releasePooled(pooledPlayer); const reacquired = api.acquirePooled(pool.prefabAsset, { x: 0, y: 100 }); assert.equal(reacquired?.[0], pooledPlayer); char(pooledPlayer).onFloor = false
  const reuseAt = nativeCalls.length; normal.stepOnce(); contact(normal, { source: pooledPlayer, target: pooledTarget })
  observations.push({ stage: 'actual-pool-release-Core-retire-and-reuse', released, sameObject: reacquired[0] === pooledPlayer, nativeMovement: moved('Editor-root', reuseAt), health: health(pooledTarget).current })
  verify('actual-pool-release-hook-clears-controller-and-pair-cache-before-same-object-reuse', () => { assert(released); assert(moved('Editor-root', reuseAt).some(value => value.dy < 0)); assert.equal(health(pooledTarget).current, 80); assert(diagnostic(normal).damageEvents >= poolDiag.damageEvents) })
  normal.queueEntityRemoval(pooledPlayer, false); api.beginEntityLifetime(pooledPlayer); normal.flushEntityCommands(); const healthBeforeRejectedGenerationContact = health(pooledTarget).current; contact(normal, { source: pooledPlayer, target: pooledTarget })
  verify('stale-generation-removal-preserves-live-membership-and-current-hit-cache', () => { assert(originalWorld.entities.includes(pooledPlayer)); assert.equal(health(pooledTarget).current, healthBeforeRejectedGenerationContact) }, 'positive-control')
  const hitBeforeDeactivate = health(pooledTarget).current; api.deactivateStreamEntities([pooledPlayer], originalWorld.entities); api.activateStreamEntities([pooledPlayer]); contact(normal, { source: pooledPlayer, target: pooledTarget })
  verify('actual-stream-deactivate-Core-retire-clears-own-pair-before-reactivation', () => { assert.equal(health(pooledTarget).current, hitBeforeDeactivate - 10); assert(api.entityLifetimeActive(pooledPlayer)) })
  const diagBeforeReject = copy(diagnostic(normal)); normal.pendingScene = { type: 'load', identifier: 'unregistered-components-fixture' }; normal.flushStructuralCommands()
  verify('failed-real-scene-preparation-keeps-component-diagnostics-and-live-membership', () => { assert.deepEqual(copy(diagnostic(normal)), diagBeforeReject); assert(originalWorld.entities.includes(pooledPlayer)) }, 'positive-control')
  const nextHealth = make(undefined, 'Next scene health'); nextHealth.addComponent(new api.Health2D()).runtimeInvulnerability = 9
  const nextScene = api.sceneManager.create('Components accepted fixture'); nextScene.data = { entities: [api.serializeEntity(nextHealth)], connections: [] }
  const bMembershipBeforeScene = bWorld.entities.map(entity => ({ uuid: entity.uuid, position: copy(entity.transform.position) }))
  normal.pendingScene = { type: 'load', identifier: nextScene.uuid }; normal.flushStructuralCommands()
  const installedHealth = originalWorld.entities.find(entity => entity.uuid === nextHealth.uuid)
  verify('accepted-real-Editor-scene-transaction-begins-current-World-components', () => { assert.equal(api.sceneManager.activeSceneUuid, nextScene.uuid); assert(installedHealth); assert.equal(health(installedHealth).runtimeInvulnerability, 0); assert.equal(diagnostic(normal).damageEvents, 0); assert.equal(diagnostic(normal).spawns, 0) }, 'positive-control')
  verify('accepted-Editor-scene-retains-fixed-World-identity-and-does-not-replace-foreign-membership', () => { assert.equal(normal.worldGameplayOwner.world, originalWorld); assert.deepEqual(bWorld.entities.map(entity => ({ uuid: entity.uuid, position: copy(entity.transform.position) })), bMembershipBeforeScene); if (!before) assert.equal(child(normal).world, originalWorld) }, 'positive-control')
  normal.stopSession(false)

  if (!before) {
    // Explicit noncanonical JS fixtures exercise exact metadata, not canonical authoring parsing.
    const noncanonical = (sourceUuid, targetUuid, name) => { const p = pair(name); Object.defineProperty(p.source, 'uuid', { value: sourceUuid }); Object.defineProperty(p.target, 'uuid', { value: targetUuid }); return p }
    const accepted = noncanonical('a:b', 'c', 'Accepted colon pair'), colliding = noncanonical('a', 'b:c', 'Colliding legacy-key pair'), unrelated = noncanonical('aa:b', 'cc', 'Unrelated colon pair')
    aWorld.entities.splice(0, aWorld.entities.length, ...Object.values(accepted), ...Object.values(colliding), ...Object.values(unrelated)); a.beginSession()
    contact(a, accepted); contact(a, colliding); contact(a, unrelated)
    const participantBefore = [...child(a).cooldownParticipants].map(([k, value]) => [k, copy(value)])
    a.clearEntityRuntimeState(colliding.source); contact(a, accepted)
    verify('noncanonical-colon-key-collision-keeps-old-suppression-and-retire-unrecorded-endpoint-preserves-accepted-pair', () => { assert.equal(health(colliding.target).current, 100); assert.equal(health(accepted.target).current, 90); assert.equal(child(a).hitCooldowns.size, 2); assert.equal(child(a).cooldownParticipants.size, 2) })
    a.clearEntityRuntimeState(accepted.target); contact(a, accepted); contact(a, unrelated)
    verify('retire-exact-recorded-target-clears-only-its-pair-and-preserves-unrelated-endpoints', () => { assert.equal(health(accepted.target).current, 80); assert.equal(health(unrelated.target).current, 90); assert.equal(child(a).cooldownParticipants.size, child(a).hitCooldowns.size) })
    observations.push({ stage: 'noncanonical-runtime-fixture-exact-metadata', provenance: 'Object.defineProperty supplies noncanonical JS-only UUIDs deliberately; canonical Entity constructor would replace them. Existing colon key collision suppression is preserved.', participantBefore, participantAfter: [...child(a).cooldownParticipants].map(([k, value]) => [k, copy(value)]) })
    accepted.source.isStatic = false; accepted.source.isKinematic = true; accepted.source.addComponent(new api.CharacterBody2D()); accepted.source.addComponent(new api.PlatformController2D()).jumpAction = 'UnusedFixtureJump'
    aWorld.entities.push(aPlayer); a.frame(.11)
    observations.push({ stage: 'fault-finally-real-controller-cache-precondition', velocities: [...child(a).verticalVelocity], cooldowns: [...child(a).hitCooldowns], participants: [...child(a).cooldownParticipants] })
    const originalRetire = a.worldGameplayOwner.retireWorldGameplayEntity, retireError = Error('Injected actual service retire failure')
    a.worldGameplayOwner.retireWorldGameplayEntity = () => { throw retireError }
    const otherPair = [...child(a).hitCooldowns.keys()].filter(key => key !== 'a:b:c'), savedDiag = copy(diagnostic(a))
    verify('Core-retire-finally-cleans-local-cache-and-preserves-original-service-error', () => { assert(child(a).verticalVelocity.has(accepted.source.uuid)); assert(child(a).verticalVelocity.has(aPlayer.uuid)); assert.throws(() => a.clearEntityRuntimeState(accepted.source), error => error === retireError); assert(!child(a).verticalVelocity.has(accepted.source.uuid)); assert(child(a).verticalVelocity.has(aPlayer.uuid)); assert(!child(a).hitCooldowns.has('a:b:c')); assert(otherPair.every(key => child(a).hitCooldowns.has(key))); assert.deepEqual(copy(diagnostic(a)), savedDiag) })
    a.worldGameplayOwner.retireWorldGameplayEntity = originalRetire
    contact(a, accepted); a.frame(.11); const originalReset = a.worldGameplayOwner.resetWorldGameplay, resetError = Error('Injected actual service reset failure'), stopDiag = copy(diagnostic(a))
    a.worldGameplayOwner.resetWorldGameplay = () => { throw resetError }
    verify('Core-stop-finally-clears-all-local-caches-preserves-counters-and-original-service-error', () => { assert(child(a).verticalVelocity.size > 0); assert(child(a).hitCooldowns.size > 0); assert(child(a).cooldownParticipants.size > 0); assert.throws(() => a.stopSession(false), error => error === resetError); assert.equal(child(a).verticalVelocity.size, 0); assert.equal(child(a).hitCooldowns.size, 0); assert.equal(child(a).cooldownParticipants.size, 0); assert.deepEqual(copy(diagnostic(a)), stopDiag) })
    a.worldGameplayOwner.resetWorldGameplay = originalReset; a.stopSession(false)
  }
  await Promise.resolve(); await Promise.resolve()
  Object.assign(api.physicsState.globalSettings, oldSettings); api.physicsState.playMode = oldMode
  observations.push({ stage: 'actual-config', packages: copy(api.packageState), settings: { tickRate: 10, gravity: 0, airFriction: 0, timeScale: 1 }, nativeCharacterMoves: nativeCalls.length, services: 'Original real Editor composition. No no-op service, disabled feature, physical/math change or performance inference.' })
  finished = true
} catch (error) { failure = error.stack ?? String(error) }
finally {
  for (const [index, runtime] of runtimes.entries()) { try { runtime.stopSession(false); cleanup.runtimes.push({ index, active: runtime.isActive, inputAttached: runtime.input.attached, vmReleased: runtime.scriptRuntime === null }) } catch (error) { cleanup.runtimes.push({ index, error: error.stack ?? String(error) }) } }
  for (const restore of restorers.reverse()) { try { restore() } catch (error) { cleanup.instrumentation.push({ error: error.stack ?? String(error) }) } }
  for (const { world, label } of worlds) { try { world.runtime?.free(); world.runtime = null; world.wasmLoaded = false; cleanup.worlds.push({ label, released: true }) } catch (error) { cleanup.worlds.push({ label, error: error.stack ?? String(error) }) } }
  const sourceChangesDuringRun = []
  for (const [path, hash] of currentHashes) if (sha(await readFile(path)) !== hash) sourceChangesDuringRun.push(normalize(relative(root, path)))
  if (sourceChangesDuringRun.length) failure = `${failure ?? ''}\nSource changed during integration: ${sourceChangesDuringRun.join(', ')}`
  const componentFailed = checks.filter(check => check.scope === 'component-ownership' && check.status === 'FAILED').length, controlsFailed = checks.filter(check => check.scope === 'positive-control' && check.status === 'FAILED').length, sharedFailed = checks.filter(check => check.scope === 'remaining-shared-service' && check.status === 'FAILED').length
  const status = failure || !finished || controlsFailed ? 'FAILED' : componentFailed ? (before ? 'BASELINE_COMPONENT_SCOPE_NOT_PASSED' : 'COMPONENT_SCOPE_NOT_PASSED') : sharedFailed ? 'COMPONENT_SCOPE_PASSED_SHARED_SERVICES_NOT_PASSED' : 'COMPONENT_SCOPE_PASSED'
  sourceHashes['scripts/verify-engine-gameplay-components-core.mjs'] = { sha256: sha(await readFile(fileURLToPath(import.meta.url))), loadedInSsr: false }
  sourceHashes['nova_core/pkg/nova_core_bg.wasm'] = { sha256: baseline.files.find(record => record.path.endsWith('_bg.wasm')).sha256, loadedInSsr: false, executed: true }
  const report = { schema: 'nova-gameplay-components-core-integration-v1', generatedAt: new Date().toISOString(), mode, status, scope: 'Actual normal Core / ordinary WASM component ownership with retained shared-service failure kept separate.', checks, observations, nativeCalls, serviceCalls, baseline: { buildId: baseline.buildId, sourceHash: baseline.sourceHash, snapshotRecordSha256: sha(baselineBytes), manifestSha256: baseline.manifestSha256, frozenFiles: baseline.files.length, overlays: baseline.overrides }, sourceHashes, loadedSources, sourceChangesDuringRun, bundleEvidence, cleanup, environment: { node: process.version, platform: process.platform, architecture: process.arch, execution: 'Node SSR synchronous actual Core and ordinary WASM', browser: null, graphicsBackend: null, performanceComparison: false }, limitations: ['All explicitly supplied contact fixtures are not Rust-produced collisions; real native controller movement is separately recorded.', 'Noncanonical colon fixtures deliberately bypass canonical constructor normalization and only test retirement metadata semantics; original colon key suppression is retained.', 'No GUI, browser, Worker, independent Player, GPU, motion or performance validation.', 'Hidden original prefab/pool/stream/navigation/AI/tile/particle/evidence Owners remain shared; component isolation alone is not full Runtime isolation.', 'Fault injections throw original identifiable errors only; no no-op or fallback replaces gameplay algorithms.', 'The before cohort uses exact39140 source including saved4879 GameFlowOwner, not current independent670 session fix. After source closure is snapshotted separately.', 'After-only cache metadata/finally tests are unavailable before migration and are not invented as baseline passes.'], failure }
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx' })
  console.log(JSON.stringify({ mode, status, checks: checks.length, passed: checks.filter(check => check.status === 'PASSED').length, componentFailed, controlsFailed, sharedFailed, report: join(output, 'report.json'), failure }))
  if (failure || controlsFailed || !finished || !before && componentFailed) process.exitCode = 1
}

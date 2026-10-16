/** Read-only audit: actual component functions and original services; no production edits. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash, webcrypto } from 'node:crypto'
import ts from 'typescript'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), cache = join(root, '.cache/engine-overhaul/gameplay-components/readonly')
await mkdir(cache, { recursive: true })
const output = await mkdtemp(join(cache, 'review-')), snapshot = join(output, 'source')
const baselineRoot = join(root, '.cache/engine-overhaul/world-gameplay/core-integration/before-9c0e')
const normalize = value => value.replaceAll('\\', '/'), sha = value => createHash('sha256').update(value).digest('hex')
const originalManifest = JSON.parse(await readFile(join(baselineRoot, 'engine-build-manifest.json'), 'utf8')), manifest = new Map(originalManifest.source.map(item => [normalize(item.path), item]))
const baseline = JSON.parse(await readFile(join(baselineRoot, 'source.json'), 'utf8'))
const originals = new Map(), hashes = {}, capturedCurrent = new Map(), checks = [], observations = [], queuedRemoval = [], serviceCalls = []
let failure = null, finished = false, bundleEvidence = null, api, loadedSources = [], cleanup = { queuedRemoval: null }
for (const record of baseline.files) {
  const bytes = await readFile(join(baselineRoot, record.path)); assert.equal(sha(bytes), record.sha256)
  if (/\.(ts|js)$/.test(record.path)) originals.set(normalize(join(root, record.path)), bytes.toString('utf8'))
}
const relevant = ['src/runtime/gameplayComponents.ts', 'src/world/World.ts', 'src/world/Entity.ts', 'src/world/BoxEntity.ts', 'src/world/components.ts', 'src/world/hierarchy.ts', 'src/world/geometry.ts', 'src/runtime/input.ts', 'src/runtime/dynamicObjects.ts', 'src/runtime/objectPool.ts', 'src/runtime/prefabs.ts', 'src/runtime/entityLifetimes.ts', 'src/runtime/gameFlowOwner.ts', 'src/runtime/gameFlow.ts', 'src/editor/gameFlowAdapter.ts', 'src/assets/AssetDatabase.ts', 'src/assets/types.ts', 'src/store/physics.ts']
for (const path of relevant) {
  const original = originals.get(normalize(join(root, path))), bytes = original === undefined ? await readFile(join(root, path)) : Buffer.from(original)
  assert.equal(sha(bytes), manifest.get(path)?.sha256, `Unpaired original audit source: ${path}`)
  await mkdir(dirname(join(snapshot, path)), { recursive: true }); await writeFile(join(snapshot, path), bytes, { flag: 'wx' })
  hashes[path] = { sha256: sha(bytes), bytes: bytes.length, snapshotPath: join(snapshot, path), matches9c0eManifest: true }
  if (original === undefined) originals.set(normalize(join(root, path)), bytes.toString('utf8'))
}
assert.equal(hashes['src/runtime/gameplayComponents.ts'].sha256, '92003dbeecd7236b7976c7b6644023785d0d1d1f32d85940e016554a82df296f')
const componentSource = await readFile(join(snapshot, 'src/runtime/gameplayComponents.ts'), 'utf8'), componentAst = ts.createSourceFile('gameplayComponents.ts', componentSource, ts.ScriptTarget.Latest, true)
const functions = componentAst.statements.filter(ts.isFunctionDeclaration).map(node => ({ name: node.name?.text, exported: !!node.modifiers?.some(item => item.kind === ts.SyntaxKind.ExportKeyword), startLine: componentAst.getLineAndCharacterOfPosition(node.getStart(componentAst)).line + 1, bodySha256: sha(node.body.getText(componentAst)), calls: (() => { const calls = new Set(); const visit = child => { if (ts.isCallExpression(child)) calls.add(child.expression.getText(componentAst)); ts.forEachChild(child, visit) }; visit(node.body); return [...calls].sort() })() }))
// Current Core is static review only. Execution uses the immutable 9c0e dependency overlay.
const reviewCore = await readFile(join(root, 'src/runtime/GameplayRuntimeCore.ts'), 'utf8'), coreAst = ts.createSourceFile('GameplayRuntimeCore.ts', reviewCore, ts.ScriptTarget.Latest, true), coreCalls = []
const inspected = new Set(['beginGameplayComponents', 'initializeGameplayEntities', 'updateGameplayComponents', 'processGameplayContacts', 'spawnRuntimePrefab', 'releasePooled', 'this.queueEntityRemoval', 'this.clearEntityRuntimeState', 'retireEntityLifetime', 'this.worldHost.deleteEntity'])
const coreVisit = node => { if (ts.isCallExpression(node) && inspected.has(node.expression.getText(coreAst))) coreCalls.push({ name: node.expression.getText(coreAst), line: coreAst.getLineAndCharacterOfPosition(node.getStart(coreAst)).line + 1, text: node.getText(coreAst) }); ts.forEachChild(node, coreVisit) }; coreVisit(coreAst)
await writeFile(join(output, 'current-Core-static-review.ts'), reviewCore, { flag: 'wx' })
const verify = (name, operation, scope = 'independence-target') => { try { operation(); checks.push({ name, scope, status: 'PASSED' }) } catch (error) { checks.push({ name, scope, status: 'FAILED', error: error.stack ?? String(error) }) } }
const copy = value => JSON.parse(JSON.stringify(value))
if (!globalThis.crypto) globalThis.crypto = webcrypto
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [], maxTouchPoints: 0, platform: 'Win32' } })
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class {}

try {
  const entries = {
    'src/runtime/gameplayComponents.ts': 'beginGameplayComponents, initializeGameplayEntities, updateGameplayComponents, processGameplayContacts, gameplayComponentDiagnostics',
    'src/world/BoxEntity.ts': 'BoxEntity',
    'src/world/components.ts': 'CharacterBody2D, PlatformController2D, Health2D, DamageHitbox2D, Projectile2D, Spawner2D, Lifetime2D, Cooldown2D',
    'src/store/physics.ts': 'physicsState, createEditorWorld, deleteEntity, serializeEntity',
    'src/world/hierarchy.ts': 'worldTransform',
    'src/runtime/dynamicObjects.ts': 'spawnRuntimePrefab',
    'src/runtime/objectPool.ts': 'releasePooled',
    'src/assets/AssetDatabase.ts': 'assetState, assetReference'
  }
  const entry = join(output, 'entry.ts')
  await writeFile(entry, Object.entries(entries).map(([path, names]) => `export { ${names} } from '${normalize(join(root, path))}';`).join('\n'), { flag: 'wx' })
  const reached = new Set()
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: [{ name: 'locked-original-components-readonly', enforce: 'pre', async load(id) {
    const path = normalize(id.split('?')[0])
    if (path.startsWith(`${normalize(root)}/src/`) || path.startsWith(`${normalize(root)}/nova_core/pkg/`)) {
      const current = await readFile(path); capturedCurrent.set(path, sha(current)); const old = originals.get(path), key = normalize(relative(root, path))
      if (old === undefined) assert.equal(sha(current), manifest.get(key)?.sha256, `Unpaired baseline dependency: ${key}`)
      return old
    }
  }, buildEnd() { for (const id of this.getModuleIds()) if (capturedCurrent.has(normalize(id.split('?')[0]))) reached.add(normalize(id.split('?')[0])) } }], build: { ssr: true, outDir: output, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'integration.mjs', inlineDynamicImports: true } } } })
  loadedSources = [...reached].sort().map(path => normalize(relative(root, path)))
  for (const path of reached) { const key = normalize(relative(root, path)); hashes[key] = { ...hashes[key], sha256: sha(originals.get(path) ?? await readFile(path)), currentSha256: capturedCurrent.get(path), loadedInSsr: true, overlay: originals.has(path) } }
  assert(!loadedSources.includes('src/runtime/worldGameplayOwner.ts')); assert(!loadedSources.includes('src/editor/worldGameplayAdapter.ts'))
  bundleEvidence = { entryPath: entry, bundlePath: join(output, 'integration.mjs'), entrySha256: sha(await readFile(entry)), bundleSha256: sha(await readFile(join(output, 'integration.mjs'))) }
  api = await import(pathToFileURL(join(output, 'integration.mjs')).href)
  const worldA = api.createEditorWorld(), worldB = api.createEditorWorld(), originalWorld = api.physicsState.world
  assert.notEqual(worldA, worldB); assert.notEqual(worldA.entities, worldB.entities)
  // Only event surfaces are supplied. No actual Core session or native tick is started.
  globalThis.window = Object.assign(new EventTarget(), { performance: globalThis.performance })
  globalThis.document = Object.assign(new EventTarget(), { hidden: false, activeElement: null })
  globalThis.CustomEvent = class extends Event { constructor(name, options) { super(name); this.detail = options?.detail } }
  let id = 1000
  const make = (uuid, name) => { const entity = new api.BoxEntity(id++, { x: 0, y: 0 }, { x: 1, y: 1 }, uuid); entity.name = name; return entity }
  const sameUuid = '11111111-1111-4111-8111-111111111111'
  const platform = name => { const value = make(sameUuid, name); value.addComponent(new api.CharacterBody2D()); value.addComponent(new api.PlatformController2D()); return value }
  const a = platform('World A player'), b = platform('World B player'); worldA.entities.push(a); worldB.entities.push(b)
  const empty = () => ({ down: {}, pressed: {}, released: {}, performed: {}, cancelled: {}, phases: {}, durations: {}, tapCounts: {}, consumed: {}, axes: {}, vectors: {}, mousePosition: [0, 0], mouseWorldPosition: [0, 0], viewBounds: [0, 0, 0, 0], viewportSize: [0, 0], wheel: [0, 0], pointerDelta: [0, 0], touches: 0, devices: [], contexts: [], maps: [], scheme: 'Any' })
  const emit = (...args) => { serviceCalls.push({ service: 'component-signal-observation', args: copy(args) }) }
  const spawn = (reference, owner) => { const transform = api.worldTransform(owner, originalWorld.entities), created = api.spawnRuntimePrefab(reference, { position: transform.position, rotation: transform.rotation, scale: { x: 1, y: 1 } }); serviceCalls.push({ service: 'actual-spawnRuntimePrefab', reference, owner: owner.uuid, created: created?.uuid ?? null }); return created }
  const remove = (entity, despawn) => { queuedRemoval.push({ entity, despawn }); serviceCalls.push({ service: 'deferred-component-removal', uuid: entity.uuid, despawn }) }
  const flushRemovals = () => { for (const { entity, despawn } of queuedRemoval.splice(0)) { const pooled = despawn && api.releasePooled(entity); serviceCalls.push({ service: 'actual-releasePooled', uuid: entity.uuid, pooled }); if (!pooled) { api.deleteEntity(entity.id); serviceCalls.push({ service: 'actual-deleteEntity', uuid: entity.uuid }) } } }
  const update = (world, input = empty(), dt = .1) => { api.updateGameplayComponents(world.entities, input, dt, emit, spawn, remove); flushRemovals() }
  const jump = () => { const input = empty(); input.pressed.Jump = true; return input }
  const character = value => value.getComponent('CharacterBody2D')
  api.beginGameplayComponents(worldA.entities); api.beginGameplayComponents(worldB.entities)
  character(a).onFloor = true; update(worldA, jump()); character(a).onFloor = false; update(worldB)
  const leakedB = character(b).requestedMotion.y
  character(b).requestedMotion = { x: 0, y: 0 }; api.beginGameplayComponents(worldB.entities); update(worldB); const isolatedB = character(b).requestedMotion.y
  observations.push({ stage: 'same-authoring-UUID-vertical-velocity', sameUuid: a.uuid === b.uuid, distinctEntities: a !== b, actualWorlds: worldA !== worldB, afterAJumpThenB: leakedB, isolatedBWithoutA: isolatedB, physicsNativeTick: false })
  verify('isolated-controller-positive-control-falls-from-zero-vertical-velocity', () => { assert(isolatedB < 0); assert.equal(api.gameplayComponentDiagnostics.controllers, 1) }, 'positive-control')
  verify('same-UUID-controller-B-does-not-read-A-jump-velocity', () => { assert.equal(leakedB, isolatedB) })
  api.beginGameplayComponents(worldA.entities); character(a).requestedMotion = { x: 0, y: 0 }; character(a).onFloor = true; update(worldA, jump()); character(a).onFloor = false; character(a).requestedMotion = { x: 0, y: 0 }; api.beginGameplayComponents(worldB.entities); update(worldA)
  const afterBBegin = character(a).requestedMotion.y
  observations.push({ stage: 'B-begin-clears-A-vertical-history', afterBBegin, uninterruptedAExpectedPositive: true })
  verify('B-begin-does-not-reset-A-controller-vertical-history', () => { assert(afterBBegin > 0) })
  const pair = name => { const source = make('22222222-2222-4222-8222-222222222222', `${name} source`), target = make('33333333-3333-4333-8333-333333333333', `${name} target`); source.addComponent(new api.DamageHitbox2D()).hitCooldown = 1; target.tags.push('damageable'); target.addComponent(new api.Health2D()); return { source, target } }
  const hitA = pair('A'), hitB = pair('B'); worldA.entities.splice(0, worldA.entities.length, hitA.source, hitA.target); worldB.entities.splice(0, worldB.entities.length, hitB.source, hitB.target)
  const health = value => value.getComponent('Health2D').current
  const contact = (pair, world) => { const event = { type: 'collisionStarted', firstEntityUuid: pair.source.uuid, secondEntityUuid: pair.target.uuid, point: [0, 0], normal: [0, 1], relativeVelocity: [0, 0] }; api.processGameplayContacts([event], world.entities, emit, remove); flushRemovals(); return event }
  api.beginGameplayComponents(worldA.entities); api.beginGameplayComponents(worldB.entities); const fixtureEvent = contact(hitA, worldA); contact(hitB, worldB)
  observations.push({ stage: 'same-UUID-contact-cooldown', healthA: health(hitA.target), healthB: health(hitB.target), fixtureEvent, provenance: 'Supplied fixture collisionStarted through actual processGameplayContacts; not Rust-generated collision.' })
  verify('actual-damage-positive-control-changes-health-and-emits-signal', () => { assert.equal(health(hitA.target), 90); assert(serviceCalls.some(call => call.service === 'component-signal-observation' && call.args[0] === 'damage.hit')) }, 'positive-control')
  verify('same-source-target-UUID-pair-in-B-is-not-blocked-by-A-hit-cooldown', () => { assert.equal(health(hitB.target), 90) })
  api.beginGameplayComponents(worldA.entities); api.beginGameplayComponents(worldB.entities); hitA.target.getComponent('Health2D').current = 100; contact(hitA, worldA)
  for (let tick = 0; tick < 4; tick++) update(worldB, empty(), .25)
  contact(hitA, worldA)
  observations.push({ stage: 'B-time-reduces-A-cooldown', AOwnElapsed: 0, BElapsed: 1, healthA: health(hitA.target) })
  verify('other-World-fixed-updates-do-not-expire-A-hit-cooldown', () => { assert.equal(health(hitA.target), 90) })
  api.beginGameplayComponents(worldA.entities); hitA.target.getComponent('Health2D').current = 100; contact(hitA, worldA); api.beginGameplayComponents(worldB.entities); contact(hitA, worldA)
  observations.push({ stage: 'B-begin-clears-A-hit-cooldown', AOwnElapsed: 0, healthA: health(hitA.target) })
  verify('B-begin-does-not-clear-A-live-hit-cooldown', () => { assert.equal(health(hitA.target), 90) })
  worldA.entities.splice(0, worldA.entities.length, a); api.beginGameplayComponents(worldA.entities); update(worldA); const diagnosticA = copy(api.gameplayComponentDiagnostics); update(worldB); const diagnosticAfterB = copy(api.gameplayComponentDiagnostics)
  observations.push({ stage: 'global-diagnostic-overwrite', A: diagnosticA, afterB: diagnosticAfterB })
  verify('diagnostic-view-for-A-is-not-overwritten-by-B-update', () => { assert.deepEqual(diagnosticAfterB, diagnosticA) })
  const initialized = make(undefined, 'Initialization positive control'), hp = initialized.addComponent(new api.Health2D()), cd = initialized.addComponent(new api.Cooldown2D()), life = initialized.addComponent(new api.Lifetime2D())
  hp.current = 1000; hp.runtimeInvulnerability = 100; cd.autoStart = true; cd.duration = 2; life.seconds = 3; api.initializeGameplayEntities([initialized])
  verify('stateless-initialize-positive-control-preserves-health-cooldown-lifetime-semantics', () => { assert.equal(hp.current, 100); assert.equal(hp.runtimeInvulnerability, 0); assert.equal(cd.runtimeRemaining, 2); assert.equal(cd.runtimeReady, false); assert.equal(life.runtimeRemaining, 3) }, 'positive-control')
  const template = make(undefined, 'Actual prefab projectile'); template.addComponent(new api.Projectile2D()).lifetime = .3
  const asset = { uuid: '44444444-4444-4444-8444-444444444444', name: 'Readonly component prefab', path: 'Assets/readonly-components.prefab', assetType: 'prefab', source: JSON.stringify({ prefabVersion: 2, name: 'Readonly component prefab', bundle: { entities: [api.serializeEntity(template)], connections: [], rootUuids: [template.uuid] }, variantOf: null }), mimeType: 'application/json', width: 0, height: 0 }
  api.assetState.records.push(asset); api.assetState.generation++
  const spawnerEntity = make(undefined, 'Real spawner'), spawner = spawnerEntity.addComponent(new api.Spawner2D()); spawner.prefabAsset = api.assetReference(asset.uuid); spawner.interval = 100
  originalWorld.entities.splice(0, originalWorld.entities.length, spawnerEntity); api.beginGameplayComponents(originalWorld.entities); update(originalWorld)
  const spawned = originalWorld.entities.find(value => value.uuid === spawner.runtimeSpawned[0]), spawnObservation = { uuid: spawned?.uuid, velocity: spawned ? copy(spawned.velocity) : null, lifetime: spawned?.getComponent('Projectile2D')?.runtimeLifetime, diagnostics: copy(api.gameplayComponentDiagnostics) }
  update(originalWorld, empty(), .25)
  observations.push({ stage: 'actual-spawn-and-deferred-remove-services', afterSpawn: spawnObservation, afterExpiry: { live: spawned ? originalWorld.entities.some(value => value.uuid === spawned.uuid) : null, diagnostics: copy(api.gameplayComponentDiagnostics) }, limitation: 'Actual original spawnRuntimePrefab/releasePooled/deleteEntity services, with deferred structural removal. No Core destruction callback or lifetime transaction claim.' })
  verify('normal-spawner-projectile-expiry-executes-real-prefab-init-pool-release-delete-chain', () => { assert(spawned); assert.equal(spawnObservation.velocity.x, 12); assert(spawnObservation.lifetime > 0); assert.equal(spawnObservation.diagnostics.spawns, 1); assert(!originalWorld.entities.some(value => value.uuid === spawned.uuid)); assert(serviceCalls.some(call => call.service === 'actual-releasePooled' && call.uuid === spawned.uuid && !call.pooled)); assert(serviceCalls.some(call => call.service === 'actual-deleteEntity' && call.uuid === spawned.uuid)); assert.equal(api.gameplayComponentDiagnostics.expired, 1) }, 'positive-control')
  finished = true
} catch (error) { failure = error.stack ?? String(error) }
finally {
  cleanup.queuedRemoval = queuedRemoval.length
  const sourceChangesDuringRun = []
  for (const [path, hash] of capturedCurrent) if (sha(await readFile(path)) !== hash) sourceChangesDuringRun.push(normalize(relative(root, path)))
  const findings = [
    { id: 'GC-01', severity: 'P1', status: 'HYPOTHESIS_PENDING_REPORT_CHECKS', target: 'same-UUID-controller-B-does-not-read-A-jump-velocity', lines: [19, 84, 87], explanation: 'Map key lacks World/session identity; direct actual B update can consume A vertical history.' },
    { id: 'GC-02', severity: 'P1', status: 'HYPOTHESIS_PENDING_REPORT_CHECKS', target: 'same-source-target-UUID-pair-in-B-is-not-blocked-by-A-hit-cooldown', lines: [20, 126], explanation: 'Damage pair keyed by two authoring UUIDs blocks a distinct World pair.' },
    { id: 'GC-03', severity: 'P1', status: 'HYPOTHESIS_PENDING_REPORT_CHECKS', target: 'other-World-fixed-updates-do-not-expire-A-hit-cooldown', lines: [43, 126], explanation: 'Every update reduces the full shared hit map independently of its World clock.' },
    { id: 'GC-04', severity: 'P1', status: 'HYPOTHESIS_PENDING_REPORT_CHECKS', target: 'B-begin-does-not-clear-A-live-hit-cooldown', lines: [35, 36], explanation: 'Begin and scene installation clear other Worlds velocity/cooldown history.' },
    { id: 'GC-05', severity: 'P2', status: 'HYPOTHESIS_PENDING_REPORT_CHECKS', target: 'diagnostic-view-for-A-is-not-overwritten-by-B-update', lines: [18, 36, 42], explanation: 'Single shared diagnostic view is overwritten by another World; no external production UI reader currently found.' }
  ]
  for (const finding of findings) { const result = checks.find(item => item.name === finding.target); finding.status = result?.status === 'FAILED' && finished ? 'CONFIRMED' : result?.status === 'PASSED' ? 'NOT_PRESENT_IN_EXECUTED_CASE' : 'NOT_TESTED' }
  const review = { sourceSha256: sha(reviewCore), snapshotPath: join(output, 'current-Core-static-review.ts'), execution: false, calls: coreCalls, absentResetRetire: 'Module has no reset/retire API. Current Core stop and clearEntityRuntimeState do not call gameplay-component reset/retire; next begin/scene transition globally clears both maps.', diagnosticUi: { status: 'NOT_PRESENT', evidence: 'rg of gameplayComponentDiagnostics across production src .vue/.ts/.tsx/.js/.jsx found only its own producer module; public export remains a compatibility contract.' }, nextMinimalOwner: { scope: 'Entire gameplayComponents orchestration: 4 public +3 internal functions, 2 maps, diagnostics per fixed World Owner. Preserve formulas and order.', pureInitialize: 'initializeGameplayEntities only mutates supplied entity-local component fields; keep a pure shared initializer for dynamicObjects and stream-fresh paths.', coreIntegration: ['begin and accepted scene installation', 'frame and step fixed updates', 'contacts with own GameFlow score port', 'stream fresh initializer', 'entity retire and stop reset using explicit Owner methods'], legacy: 'Preserve 4/5 argument contacts compatibility and sameRaw Editor diagnostic view. Required real spawn/remove ports; do not silently default to a global World.', excluded: 'Do not automatically refactor pool, dynamicObjects, prefab, stream or gameplay physics algorithms. Their shared owners remain explicitly unresolved.' } }
  const status = failure || !finished ? 'FAILED' : checks.some(item => item.scope === 'positive-control' && item.status === 'FAILED') ? 'FIXTURE_OR_CONTROL_FAILED' : findings.some(item => item.status === 'CONFIRMED') ? 'CONFIRMED_SHARED_STATE_FAILURES' : 'NO_FAILURE_REPRODUCED'
  hashes['scripts/verify-engine-gameplay-components-readonly.mjs'] = { sha256: sha(await readFile(fileURLToPath(import.meta.url))), loadedInSsr: false }
  const report = { schema: 'nova-gameplay-components-readonly-v1', generatedAt: new Date().toISOString(), status, scope: 'Actual original component functions with distinct actual World containers and same authoring UUIDs. No production changes, actual Core lifecycle or native physics tick.', baseline: { buildId: originalManifest.buildId, sourceHash: originalManifest.sourceHash, gameplayComponentsSha256: hashes['src/runtime/gameplayComponents.ts'].sha256 }, checks, observations, serviceCalls, functions, findings, staticCoreReview: review, sourceHashes: hashes, loadedSources, sourceChangesDuringRun, bundleEvidence, cleanup, environment: { node: process.version, platform: process.platform, architecture: process.arch, execution: 'Node SSR of locked9c0e actual component functions; ordinary World classes, no native tick', wasmExecuted: false, browser: null, graphicsBackend: null }, limitations: ['Supplied contact event is not a Rust collision. Real component math/state is executed.', 'No new/current Core session executes; incidental SSR Core dependencies use immutable9c0e originals, not the changing WorldGameplay phase2 cohort.', 'Positive spawn/remove uses real services but is not the complete Core lifetime/destruction transaction.', 'Native physics, browser, Engine Worker, Player, UI and performance are NOT_TESTED.', 'All failed independence targets and any fixture failures remain in unique output; no production or old tests edited.'], failure }
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx' })
  console.log(JSON.stringify({ status, checks: checks.length, positivePassed: checks.filter(item => item.scope === 'positive-control' && item.status === 'PASSED').length, independenceFailed: checks.filter(item => item.scope === 'independence-target' && item.status === 'FAILED').length, report: join(output, 'report.json'), failure, sourceChangesDuringRun }))
  if (failure || status === 'FIXTURE_OR_CONTROL_FAILED') process.exitCode = 1
}

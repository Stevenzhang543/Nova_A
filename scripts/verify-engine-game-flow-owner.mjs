/** Actual algorithms/World/Entity/same-bundle Vue. Functional smoke, not a benchmark. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { build } from 'vite'
import { canonicalGameFlowOwnerBeforeSessionKeys } from './lib/gameFlowSessionKeyContract.mjs'
import { canonicalGameplayComponentsBeforeOwner } from './lib/gameplayComponentsOwnerContract.mjs'
const root = process.cwd(), normal = value => value.replaceAll('\\', '/'), hash = bytes => createHash('sha256').update(bytes).digest('hex')
const phase = process.env.NOVA_GAME_FLOW_PHASE ?? 'after', directory = resolve(process.env.NOVA_GAME_FLOW_REPORT ?? `.cache/engine-overhaul/game-flow/raw-${phase}`)
assert(['before', 'after'].includes(phase))
const checks = [], failures = [], observations = {}, artifacts = {}, graphs = {}, source = {}, original = new Map()
const check = async (name, action) => { try { await action(); checks.push({ name, status: 'passed' }) } catch (error) { const row = { name, status: 'failed', error: String(error.stack ?? error) }; checks.push(row); failures.push(row) } }
await mkdir(directory, { recursive: true }); await assert.rejects(readFile(resolve(directory, 'report.json')), { code: 'ENOENT' })
await writeFile(resolve(directory, 'verifier.mjs'), await readFile(new URL(import.meta.url)))
const manifestBytes = await readFile(resolve('.cache/engine-overhaul/game-flow/before/engine-build-manifest.json')), manifest = JSON.parse(manifestBytes)
assert.equal(manifest.buildId, 'engine-profile-a4211a26348a4f129394')
for (const path of ['src/runtime/gameFlow.ts', 'src/runtime/gameplayComponents.ts']) {
  const bytes = await readFile(resolve('.cache/engine-overhaul/game-flow/before', path)); assert.equal(hash(bytes), manifest.source.find(row => row.path === path)?.sha256)
  original.set(normal(resolve(path)), bytes.toString('utf8'))
}
const savedGlobals = new Map(['window', 'document', 'navigator'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
delete globalThis.window; delete globalThis.document
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', userAgent: 'Node actual GameFlow host', hardwareConcurrency: 8 } })
const absolute = path => JSON.stringify(normal(resolve(path)))
const commonExports = [`export { World } from ${absolute('src/world/World.ts')};`, `export { Entity } from ${absolute('src/world/Entity.ts')};`, `export { Health2D, Collectible2D } from ${absolute('src/world/components.ts')};`, `export { worldTransform } from ${absolute('src/world/hierarchy.ts')};`, `export { processGameplayContacts, gameplayComponentDiagnostics } from ${absolute('src/runtime/gameplayComponents.ts')};`, `export { watch, nextTick, toRaw, reactive } from 'vue';`]
async function entry(name, lines) {
  const input = resolve(directory, `${name}-entry.ts`), output = resolve(directory, name, 'actual.mjs'), ids = []
  await writeFile(input, lines.join('\n'))
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: [{ name: `game-flow-${phase}-${name}`, enforce: 'pre', load(id) { return phase === 'before' ? original.get(normal(id)) ?? null : null }, generateBundle() { ids.push(...this.getModuleIds()) } }], build: { ssr: true, outDir: dirname(output), emptyOutDir: false, rollupOptions: { input, output: { entryFileNames: 'actual.mjs', inlineDynamicImports: true } } } })
  graphs[name] = ids.map(id => normal(normal(id).startsWith(normal(root) + '/') ? relative(root, id) : id))
  for (const id of ids) if (normal(id).startsWith(normal(root) + '/') && /\.(?:ts|js|mjs|json)$/.test(id) && !id.includes('node_modules')) source[`${name}:${normal(relative(root, id))}`] = hash(phase === 'before' && original.has(normal(id)) ? original.get(normal(id)) : await readFile(id))
  artifacts[name] = { path: normal(relative(root, output)), sha256: hash(await readFile(output)), buildId: `game-flow-node-functional-${phase}-${name}` }
  return import(pathToFileURL(output).href)
}
const entity = (api, id) => new api.Entity(id, 'Box', `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`)
async function commonCases(api) {
  const world = api.physicsState.world, parent = entity(api, 1), child = entity(api, 2), health = child.addComponent(new api.Health2D())
  api.resetGameFlow(); api.physicsState.globalSettings.timeScale = 2
  parent.transform.position = { x: 12, y: -9 }; parent.transform.rotation = .4; parent.transform.scale = { x: -2, y: 1.5 }; child.parentUuid = parent.uuid; child.transform.position = { x: 3, y: -2 }; health.current = 73
  world.entities = [parent, child]; world.invalidateRuntime(); const cpArray = api.gameFlowState.checkpoints
  let invalidations = 0; const invalidate = world.invalidateRuntime; world.invalidateRuntime = function () { invalidations++; return invalidate.call(this) }
  try {
    await check(`${phase}-six-defaults-and-pause-live-settings-reset`, () => {
      assert.deepEqual(Object.keys(api.gameFlowState), ['paused', 'score', 'session', 'checkpoints', 'transitions', 'lastError']); assert.deepEqual(api.gameFlowSnapshot(), { paused: false, score: 0, session: {}, checkpoints: [] })
      api.setGamePaused(true); api.setGamePaused(true); assert.equal(api.physicsState.globalSettings.timeScale, 0); api.physicsState.globalSettings = { ...api.physicsState.globalSettings, timeScale: 7 }; api.setGamePaused(false); assert.equal(api.physicsState.globalSettings.timeScale, 2)
      api.setGamePaused(true); api.resetGameFlow(); assert.equal(api.physicsState.globalSettings.timeScale, 2); assert.equal(api.gameFlowState.checkpoints, cpArray)
    })
    await check(`${phase}-score-and-session-original-limits`, () => {
      api.setRuntimeScore(1e16); assert.equal(api.gameFlowState.score, 1e15); api.addRuntimeScore(-2e16); assert.equal(api.gameFlowState.score, -1e15); api.setRuntimeScore(Infinity); assert.equal(api.gameFlowState.score, 0)
      assert.equal(api.setSessionValue(' ' + 'k'.repeat(100), 1), true); assert.equal(Object.keys(api.gameFlowState.session)[0].length, 80); assert.equal(api.setSessionValue('null', null), false); assert.equal(api.setSessionValue('undefined', undefined), false)
      const cycle = {}; cycle.self = cycle; assert.equal(api.setSessionValue('cycle', cycle), false); assert.equal(api.setSessionValue('boundary', 'x'.repeat(63_998)), true); assert.equal(api.setSessionValue('overflow', 'x'.repeat(63_999)), false)
      api.resetGameFlow(); for (let index = 0; index < 512; index++) assert.equal(api.setSessionValue(`key-${index}`, index), true); assert.equal(api.setSessionValue('extra', 1), false); assert.equal(api.setSessionValue('key-0', 10), true); api.resetGameFlow()
    })
    await check(`${phase}-checkpoint-cap-replacement-order-and-entity-limit`, () => {
      assert.equal(api.setRuntimeCheckpoint(' '), false); for (let index = 0; index < 33; index++) api.setRuntimeCheckpoint(`cp-${index}`)
      assert.deepEqual(api.gameFlowSnapshot().checkpoints, Array.from({ length: 32 }, (_, index) => `cp-${32 - index}`)); api.setRuntimeCheckpoint('cp-10'); assert.equal(api.gameFlowSnapshot().checkpoints.indexOf('cp-10'), 22)
      api.setRuntimeCheckpoint('limit', Array(10_001).fill(parent)); assert.equal(api.gameFlowState.checkpoints[0].entities.length, 10_000); api.resetGameFlow()
    })
    await check(`${phase}-real-hierarchy-health-session-restore-and-invalidation`, () => {
      api.setRuntimeScore(17); api.setSessionValue('answer', { value: 42 }); api.setRuntimeCheckpoint(' saved '); const saved = world.entities.map(value => api.worldTransform(value, world.entities)), detached = api.gameFlowSnapshot()
      parent.transform.position = { x: -50, y: 100 }; child.transform.position = { x: 90, y: 80 }; child.enabled = false; health.maximum = 20; health.current = 1; api.setRuntimeScore(900); api.setSessionValue('answer', { value: 0 })
      const count = invalidations; assert.equal(api.restoreRuntimeCheckpoint(' saved '), true); assert.equal(invalidations, count + 1); const restored = world.entities.map(value => api.worldTransform(value, world.entities)); assert.deepEqual(restored, saved)
      assert.equal(child.enabled, true); assert.equal(health.current, 20); assert.equal(api.gameFlowState.score, 17); assert.deepEqual(api.gameFlowState.session, { answer: { value: 42 } }); detached.session.answer.value = -1; assert.equal(api.gameFlowState.session.answer.value, 42)
      observations.checkpoint = { saved, restored, health: health.current, snapshot: api.gameFlowSnapshot(), invalidations }
    })
    await check(`${phase}-missing-cross-scene-missing-entity-and-retained-uuid-gap`, () => {
      const count = invalidations, scene = api.sceneManager.activeSceneUuid; assert.equal(api.restoreRuntimeCheckpoint('missing'), false); assert.match(api.gameFlowState.lastError, /^Checkpoint not found:/)
      api.sceneManager.activeSceneUuid = 'foreign'; assert.equal(api.restoreRuntimeCheckpoint('saved'), false); assert.match(api.gameFlowState.lastError, /^Checkpoint belongs to another scene:/); assert.equal(invalidations, count); api.sceneManager.activeSceneUuid = scene
      world.entities = [parent]; assert.equal(api.restoreRuntimeCheckpoint('saved'), true); const replacement = entity(api, 2); replacement.transform.position = { x: 300, y: 400 }; world.entities = [parent, replacement]; world.invalidateRuntime(); assert.equal(api.restoreRuntimeCheckpoint('saved'), true); assert.notDeepEqual(replacement.transform.position, { x: 300, y: 400 }); observations.uuidReuseGap = 'CONFIRMED_RETAINED'
    })
    await check(`${phase}-actual-collectible-score-emit-diagnostic-remove-order`, () => {
      api.resetGameFlow(); const pickup = entity(api, 3), player = entity(api, 4), collectible = pickup.addComponent(new api.Collectible2D()); collectible.score = 5; collectible.collectorTag = 'Player'; collectible.destroyOnCollect = true; player.tags = ['Player']
      const trace = [], start = api.gameplayComponentDiagnostics.collections; api.processGameplayContacts([{ type: 'triggerEntered', firstEntityUuid: pickup.uuid, secondEntityUuid: player.uuid }], [pickup, player], (...args) => trace.push({ step: 'emit', args, score: api.gameFlowState.score, collections: api.gameplayComponentDiagnostics.collections }), (target, despawn) => trace.push({ step: 'remove', uuid: target.uuid, despawn, score: api.gameFlowState.score, collections: api.gameplayComponentDiagnostics.collections }))
      assert.equal(api.gameFlowState.score, 5); assert.equal(trace[0].score, 5); assert.equal(trace[0].collections, start); assert.equal(trace[1].collections, start + 1); observations.collectible = { trace, snapshot: api.gameFlowSnapshot() }
    })
    await check(`${phase}-stop-style-reset-clears-same-array-and-restores-time`, () => { api.setGamePaused(true); api.resetGameFlow(); assert.equal(api.physicsState.globalSettings.timeScale, 2); assert.deepEqual(api.gameFlowSnapshot(), { paused: false, score: 0, session: {}, checkpoints: [] }); assert.equal(api.gameFlowState.checkpoints, cpArray); assert.equal(api.gameFlowState.transitions, 0); assert.equal(api.gameFlowState.lastError, '') })
  } finally { world.invalidateRuntime = invalidate }
}
try {
  const editor = await entry('editor', [`export * from ${absolute('src/runtime/gameFlow.ts')};`, ...(phase === 'after' ? [`export { getEditorGameFlowOwner } from ${absolute('src/editor/gameFlowAdapter.ts')};`, `import ${absolute('src/editor/worldGameplayAdapter.ts')};`] : []), `export { physicsState, sceneManager } from ${absolute('src/store/physics.ts')};`, ...commonExports])
  await commonCases(editor)
  if (phase === 'after') {
    await check('editor-same-raw-live-export-lazy-single-owner-and-deep-watch', async () => {
      const owner = editor.getEditorGameFlowOwner(); assert.equal(owner, editor.getEditorGameFlowOwner()); assert.equal(owner.world, editor.physicsState.world); assert.equal(owner.state, editor.gameFlowState); assert.equal(editor.toRaw(owner.state), editor.getLegacyGameFlowRawState())
      let scoreChanges = 0, deepChanges = 0; const stopScore = editor.watch(() => editor.gameFlowState.score, () => scoreChanges++), stopDeep = editor.watch(() => editor.gameFlowState.session, () => deepChanges++, { deep: true })
      try { owner.setRuntimeScore(12); owner.setSessionValue('nested', { value: 1 }); await editor.nextTick(); assert.equal(scoreChanges, 1); assert.equal(deepChanges, 1); editor.addRuntimeScore(3); owner.state.session.nested.value = 2; await editor.nextTick(); assert.equal(scoreChanges, 2); assert.equal(deepChanges, 2); assert.equal(owner.state.score, 15) }
      finally { stopScore(); stopDeep(); owner.resetGameFlow() }
    })
    await check('editor-explicit-new-world-creates-new-owner-same-view-and-preserves-paused-resume-history', () => {
      const previousWorld = editor.physicsState.world, previousSettings = editor.physicsState.globalSettings, previousOwner = editor.getEditorGameFlowOwner(), newWorld = new editor.World(), view = editor.gameFlowState
      try {
        editor.physicsState.globalSettings = { ...previousSettings, timeScale: 2 }; previousOwner.setGamePaused(true)
        editor.physicsState.world = newWorld; editor.physicsState.globalSettings = { ...previousSettings, timeScale: 7 }
        const next = editor.getEditorGameFlowOwner(); assert.notEqual(next, previousOwner); assert.equal(next.world, editor.physicsState.world); assert.equal(editor.toRaw(next.world), newWorld); assert.equal(previousOwner.world, previousWorld); assert.equal(next.state, view); assert.equal(previousOwner.state, view); assert.equal(editor.toRaw(next.state), editor.getLegacyGameFlowRawState())
        next.setGamePaused(false); assert.equal(editor.physicsState.globalSettings.timeScale, 2)
        next.setGamePaused(true); const anotherWorld = new editor.World(); editor.physicsState.world = anotherWorld; editor.physicsState.globalSettings = { ...previousSettings, timeScale: 9 }; const another = editor.getEditorGameFlowOwner(); another.resetGameFlow(); assert.equal(editor.physicsState.globalSettings.timeScale, 2)
        observations.legacyRebind = { newOwnerWorld: true, oldOwnerWorldUnchanged: true, sameRawView: true, resumeScaleAfterNewWorld: 2, resetScaleAfterAnotherWorld: 2, editorScope: 'temporary single-root bridge, not independent concurrent Editor Worlds' }
      } finally { editor.physicsState.world = previousWorld; editor.physicsState.globalSettings = previousSettings; editor.getEditorGameFlowOwner().resetGameFlow() }
    })
    await check('stale-editor-owner-settings-and-scene-getters-reject-before-touching-new-world', () => {
      const previousWorld = editor.physicsState.world, previousSettings = editor.physicsState.globalSettings, old = editor.getEditorGameFlowOwner(), newWorld = new editor.World()
      try {
        old.resetGameFlow(); editor.physicsState.world = newWorld; editor.physicsState.globalSettings = { ...previousSettings, timeScale: 7 }; const next = editor.getEditorGameFlowOwner()
        assert.throws(() => old.setGamePaused(true), /GAME_FLOW_WORLD_CHANGED/); assert.equal(editor.physicsState.globalSettings.timeScale, 7); assert.equal(next.state.paused, false)
        const count = next.state.checkpoints.length; assert.throws(() => old.setRuntimeCheckpoint('stale'), /GAME_FLOW_WORLD_CHANGED/); assert.equal(next.state.checkpoints.length, count); assert.equal(old.world, previousWorld); assert.equal(next.world, editor.physicsState.world); assert.equal(editor.toRaw(next.world), newWorld)
      } finally { editor.physicsState.world = previousWorld; editor.physicsState.globalSettings = previousSettings; editor.getEditorGameFlowOwner().resetGameFlow() }
    })
    const pure = await entry('pure', [`export * from ${absolute('src/runtime/gameFlowOwner.ts')};`, `export * from ${absolute('src/runtime/gameFlow.ts')};`, `export { WorldGameplayOwner } from ${absolute('src/runtime/worldGameplayOwner.ts')};`, `export { installLegacyWorldGameplayPort, getLegacyWorldGameplayRawState } from ${absolute('src/runtime/worldGameplay.ts')};`, ...commonExports])
    // The legacy components API now uses the already explicit WorldGameplay port.
    // This narrow contacts fixture rejects all unused services instead of silently stubbing them.
    const unused = () => { throw Error('Unused WorldGameplay service in pure GameFlow contacts fixture') }
    const contactsWorld = new pure.World(), worldView = pure.reactive(pure.getLegacyWorldGameplayRawState())
    const contactsPorts = { packages: { aiEnabled: unused, objectPoolEnabled: unused }, loadAi: unused,
      runtimeObjects: { readPrefab: unused, createEntity: unused, unwrapEntity: unused,
        lifetimes: { begin: unused, retire: unused, active: unused, generation: unused }, log: unused, defaultClockSeconds: unused },
      navigation: { updateNavigation: unused, shiftNavigationOrigin: unused, resetNavigation: unused, navigationDebugPaths: new Map() },
      streaming: { updateWorldStreaming: unused, resetWorldStreaming: unused, shiftStreamingOrigin: unused, state: {} },
      createSceneStreaming: unused, tile: { updateTileSceneRuntime: unused, resetTileSceneRuntime: unused, state: {} },
      evidence: { captureSimulationEvidence: unused, clearSimulationEvidence: unused }, particles: { shiftParticleOrigin: unused } }
    const contactsOwner = new pure.WorldGameplayOwner({ world: contactsWorld, camera: { scale: 100, offset: { x: 0, y: 0 } }, activeSceneUuid: 'contacts-fixture' }, contactsPorts, worldView, pure.gameplayComponentDiagnostics)
    pure.installLegacyWorldGameplayPort({ stateView: worldView, unwrapState: pure.toRaw, getOwner: () => contactsOwner })
    await check('missing-port-is-explicit-but-four-arg-non-collectible-and-five-arg-real-score-work', () => {
      assert.throws(() => pure.setRuntimeScore(1), /GAME_FLOW_LEGACY_PORT_REQUIRED/)
      const first = entity(pure, 10), second = entity(pure, 11), event = [{ type: 'triggerEntered', firstEntityUuid: first.uuid, secondEntityUuid: second.uuid }]
      pure.processGameplayContacts(event, [first, second], () => {}, () => {})
      const collectible = first.addComponent(new pure.Collectible2D()); collectible.score = 9; second.tags = ['player']
      const world = new pure.World(), owner = new pure.GameFlowOwner({ world, settings: { timeScale: 1 }, activeSceneUuid: 'A' }), trace = []
      pure.processGameplayContacts(event, [first, second], () => trace.push('emit'), () => trace.push('remove'), value => { owner.addRuntimeScore(value); trace.push('score') })
      assert.equal(owner.state.score, 9); assert.equal(trace[0], 'score'); assert.equal(trace[1], 'emit')
      const emitted = []; assert.throws(() => pure.processGameplayContacts(event, [first, second], () => emitted.push(1), () => {}), /GAME_FLOW_LEGACY_PORT_REQUIRED/); assert.equal(emitted.length, 0)
    })
    await check('two-real-worlds-isolate-state-pause-checkpoints-and-live-settings-scene', () => {
      const worldA = new pure.World(), worldB = new pure.World(); worldA.entities = [entity(pure, 20)]; worldB.entities = [entity(pure, 21)]
      let settingsA = { timeScale: 3 }, sceneA = 'A'; const settingsB = { timeScale: .5 }, hostA = { world: worldA, get settings() { return settingsA }, get activeSceneUuid() { return sceneA } }
      const first = new pure.GameFlowOwner(hostA), second = new pure.GameFlowOwner({ world: worldB, settings: settingsB, activeSceneUuid: 'B' })
      first.setGamePaused(true); first.setRuntimeScore(20); first.setSessionValue('world', 'A'); first.setRuntimeCheckpoint('one'); second.setRuntimeScore(2); second.setSessionValue('world', 'B'); second.setRuntimeCheckpoint('two')
      assert.equal(settingsA.timeScale, 0); assert.equal(settingsB.timeScale, .5); assert.equal(second.state.paused, false); assert.equal(second.restoreRuntimeCheckpoint('one'), false); assert.equal(second.state.score, 2)
      settingsA = { timeScale: 7 }; first.setGamePaused(false); assert.equal(settingsA.timeScale, 3); sceneA = 'A-new'; assert.equal(first.restoreRuntimeCheckpoint('one'), false); sceneA = 'A'; assert.equal(first.restoreRuntimeCheckpoint('one'), true)
      first.resetGameFlow(); assert.deepEqual(second.gameFlowSnapshot(), { paused: false, score: 2, session: { world: 'B' }, checkpoints: ['two'] }); assert.notEqual(first.state, second.state)
      hostA.world = worldB; assert.equal(first.world, worldA, 'Owner cannot silently retarget; Core rejects mismatched live World before lifecycle work')
      observations.twoWorlds = { first: first.gameFlowSnapshot(), second: second.gameFlowSnapshot(), settingsA, settingsB, fixedWorld: true }
    })
    await check('legacy-install-is-lazy-same-raw-one-time-and-four-arg-collectible-keeps-owner', () => {
      const raw = pure.getLegacyGameFlowRawState(), view = pure.reactive(raw), world = new pure.World(), owner = new pure.GameFlowOwner({ world, settings: { timeScale: 1 }, activeSceneUuid: 'legacy' }, view)
      let getterCalls = 0; const getter = () => { getterCalls++; return owner }, port = { stateView: view, unwrapState: pure.toRaw, getOwner: getter }
      assert.throws(() => pure.installLegacyGameFlowPort({ ...port, stateView: { ...raw } }), /GAME_FLOW_SAME_RAW_REQUIRED/); pure.installLegacyGameFlowPort(port); pure.installLegacyGameFlowPort(port); assert.equal(getterCalls, 0)
      assert.equal(pure.gameFlowState, view); assert.equal(pure.requireLegacyGameFlowOwner(), owner); assert.equal(getterCalls, 1); assert.throws(() => pure.installLegacyGameFlowPort({ ...port, getOwner: () => owner }), /GAME_FLOW_LEGACY_PORT_ALREADY_INSTALLED/)
      const first = entity(pure, 30), second = entity(pure, 31), collectible = first.addComponent(new pure.Collectible2D()); collectible.score = 7; second.tags = ['player']
      pure.processGameplayContacts([{ type: 'collisionStarted', firstEntityUuid: first.uuid, secondEntityUuid: second.uuid }], [first, second], () => {}, () => {}); assert.equal(owner.state.score, 7); assert.equal(getterCalls, 2)
    })
    await entry('owner-only', [`export { GameFlowOwner, createInitialGameFlowState } from ${absolute('src/runtime/gameFlowOwner.ts')};`])
    await check('pure-owner-source-and-compiled-closure-have-no-editor-store-vue-dom-clock', async () => {
      assert.equal(graphs['owner-only'].some(path => /(?:src\/editor\/|src\/store\/|node_modules\/.*(?:vue|pinia))/.test(path)), false)
      const owner = await readFile(resolve('src/runtime/gameFlowOwner.ts'), 'utf8'), facade = await readFile(resolve('src/runtime/gameFlow.ts'), 'utf8')
      for (const text of [owner, facade]) { assert.equal(/\b(?:window|document|requestAnimationFrame|setInterval|setTimeout)\b/.test(text), false); assert.equal(/from ['"](?:vue|pinia|.*(?:store|editor)\/)/.test(text), false) }
    })
    await check('nine-original-body-hashes-and-contacts-entire-file-exact-inverse', async () => {
      const oldText = original.get(normal(resolve('src/runtime/gameFlow.ts'))).replaceAll('\r\n', '\n'), newText = (await canonicalGameFlowOwnerBeforeSessionKeys(await readFile(resolve('src/runtime/gameFlowOwner.ts'), 'utf8'))).replaceAll('\r\n', '\n')
      const oldTree = ts.createSourceFile('before.ts', oldText, ts.ScriptTarget.Latest, true), newTree = ts.createSourceFile('after.ts', newText, ts.ScriptTarget.Latest, true), oldBodies = new Map(), newBodies = new Map()
      for (const statement of oldTree.statements) if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) oldBodies.set(statement.name.text, statement.body.getText(oldTree))
      for (const statement of newTree.statements) { if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) newBodies.set(statement.name.text, statement.body.getText(newTree)); if (ts.isClassDeclaration(statement)) for (const method of statement.members) if (ts.isMethodDeclaration(method) && method.body && ts.isIdentifier(method.name)) newBodies.set(method.name.text, method.body.getText(newTree)) }
      const inverse = text => text.replaceAll('this.host.settings', 'physicsState.globalSettings').replaceAll('this.host.activeSceneUuid', 'sceneManager.activeSceneUuid').replaceAll('this.world', 'physicsState.world').replaceAll('this.state', 'gameFlowState').replaceAll('this.resumeScale', 'resumeScale').replaceAll('this.setRuntimeScore(', 'setRuntimeScore(')
      observations.inverseBodies = []
      for (const name of ['safeValue', 'resetGameFlow', 'setGamePaused', 'setRuntimeScore', 'addRuntimeScore', 'setSessionValue', 'setRuntimeCheckpoint', 'restoreRuntimeCheckpoint', 'gameFlowSnapshot']) { const restored = inverse(newBodies.get(name)); assert.equal(restored, oldBodies.get(name), name); observations.inverseBodies.push({ name, originalSha256: hash(oldBodies.get(name)), inverseSha256: hash(restored) }) }
      const migration = JSON.parse(await readFile(resolve('.cache/engine-overhaul/game-flow/contacts-migration.json'))); let contacts = await canonicalGameplayComponentsBeforeOwner(await readFile(resolve('src/runtime/gameplayComponents.ts'), 'utf8')); for (const [before, after] of [...migration.edits].reverse()) contacts = contacts.replace(after, before); assert.equal(contacts, original.get(normal(resolve('src/runtime/gameplayComponents.ts')))); observations.contactsInverse = { originalSha256: hash(contacts), inverseSha256: hash(contacts), exactWholeFile: true }
    })
    await check('actual-before-after-checkpoint-collectible-and-known-gap-match', async () => {
      const previous = JSON.parse(await readFile(resolve(process.env.NOVA_GAME_FLOW_BASELINE_REPORT ?? '.cache/engine-overhaul/game-flow/raw-before/report.json'))); assert.equal(previous.status, 'VERIFIED_FUNCTIONAL_SMOKE')
      for (const key of ['checkpoint', 'collectible', 'uuidReuseGap']) assert.deepEqual(observations[key], previous.observations[key])
    })
  }
} catch (error) { failures.push({ name: 'module-bootstrap', error: String(error.stack ?? error) }) }
finally { for (const [key, descriptor] of savedGlobals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key] } }
const report = { schema: 'nova-game-flow-owner-functional-v1', phase, status: failures.length ? 'FAILED' : 'VERIFIED_FUNCTIONAL_SMOKE', checks, failures, observations, artifacts, graphs, source, frozenBaselineBuildId: manifest.buildId, frozenManifestSha256: hash(manifestBytes), scriptSha256: hash(await readFile(new URL(import.meta.url))), node: process.version, limits: ['Actual World/Entity/algorithms and same-bundle Vue. Node browser/WASM initialization absent; real invalidateRuntime delegates unchanged.', 'UUID generation/epoch gap preserved. Other Gameplay global Owners remain. No whole M1, browser GUI, hardware or formal performance claim.', 'Current diagnostic bundles are separate from immutable a4211 GUI artifact.'] }
await writeFile(resolve(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ phase, status: report.status, passed: checks.filter(row => row.status === 'passed').length, failed: failures.length, report: normal(relative(root, resolve(directory, 'report.json'))) })); if (failures.length) process.exitCode = 1

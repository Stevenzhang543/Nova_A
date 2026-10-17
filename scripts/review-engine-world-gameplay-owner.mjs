/** Read-only ownership audit; snapshots/evidence only, never modifies production sources. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import ts from 'typescript'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const outputRoot = join(root, '.cache/engine-overhaul/world-gameplay/readonly')
await mkdir(outputRoot, { recursive: true })
const output = await mkdtemp(join(outputRoot, 'review-'))
const sha = value => createHash('sha256').update(value).digest('hex')
const normalize = value => value.replaceAll('\\', '/')
const files = [
  'src/runtime/GameplayRuntimeCore.ts', 'src/runtime/GameplayRuntime.ts',
  'src/runtime/worldGameplay.ts', 'src/runtime/gameplayComponents.ts', 'src/runtime/objectPool.ts',
  'src/runtime/dynamicObjects.ts', 'src/runtime/prefabs.ts', 'src/runtime/navigation2d.ts', 'src/runtime/aiTools.ts',
  'src/runtime/worldStreaming.ts', 'src/runtime/tileSceneRuntime.ts', 'src/runtime/runtimeSceneStreaming.ts',
  'src/runtime/streamLifecycle.ts', 'src/runtime/simulationAuthoring26.ts', 'src/runtime/particles.ts',
  'src/runtime/packages.ts', 'src/runtime/gameFlowOwner.ts', 'src/editor/gameFlowAdapter.ts',
  'src/runtime/gameplayWorldHost.ts', 'src/editor/gameplayWorldHost.ts',
  'src/store/physics.ts', 'src/world/World.ts', 'src/world/hierarchy.ts'
]
const sources = new Map(), analysis = [], stateNames = new Map()
const lineOf = (sf, position) => sf.getLineAndCharacterOfPosition(position).line + 1
const textOf = (sf, node) => node.getText(sf)
for (const path of files) {
  const bytes = await readFile(join(root, path)), source = bytes.toString('utf8'), sf = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
  assert.equal(sf.parseDiagnostics.length, 0, `Source parse diagnostics: ${path}`)
  sources.set(path, { bytes, source, sf, sha256: sha(bytes) })
  const names = new Set()
  for (const statement of sf.statements) if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text)
  stateNames.set(path, names)
}
for (const [path, { sf, sha256, bytes }] of sources) {
  const imports = [], topLevelState = [], functions = [], classes = [], references = []
  for (const statement of sf.statements) {
    if (ts.isImportDeclaration(statement)) imports.push({ module: statement.moduleSpecifier.text, typeOnly: statement.importClause?.isTypeOnly ?? false, bindings: statement.importClause?.getText(sf) ?? null, line: lineOf(sf, statement.getStart(sf)) })
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) topLevelState.push({ name: textOf(sf, declaration.name), line: lineOf(sf, declaration.getStart(sf)), constantBinding: !!(statement.declarationList.flags & ts.NodeFlags.Const), initializer: declaration.initializer ? textOf(sf, declaration.initializer) : null })
    if (ts.isClassDeclaration(statement)) classes.push({ name: statement.name?.text ?? '<anonymous>', line: lineOf(sf, statement.getStart(sf)), fields: statement.members.filter(ts.isPropertyDeclaration).map(field => ({ name: textOf(sf, field.name), initializer: field.initializer ? textOf(sf, field.initializer) : null, line: lineOf(sf, field.getStart(sf)) })) })
  }
  const collectFunction = node => {
    const body = node.body
    if (!body) return
    const name = node.name ? textOf(sf, node.name) : '<constructor>', calls = [], stateReferences = []
    const visit = child => {
      if (ts.isCallExpression(child)) calls.push({ callee: textOf(sf, child.expression), line: lineOf(sf, child.getStart(sf)), arguments: child.arguments.map(arg => ts.isArrowFunction(arg) || ts.isFunctionExpression(arg) ? '<closure: see source snapshot>' : textOf(sf, arg)) })
      if (ts.isIdentifier(child) && (stateNames.get(path).has(child.text) || ['physicsState', 'sceneManager', 'worldGameplayState', 'this'].includes(child.text))) stateReferences.push({ identifier: child.text, line: lineOf(sf, child.getStart(sf)), context: child.parent ? textOf(sf, child.parent).slice(0, 260) : child.text })
      ts.forEachChild(child, visit)
    }
    visit(body)
    functions.push({ name, line: lineOf(sf, node.getStart(sf)), endLine: lineOf(sf, node.end), parameters: node.parameters.map(parameter => textOf(sf, parameter)), bodySha256: sha(textOf(sf, body)), calls, stateReferences })
  }
  for (const statement of sf.statements) {
    if (ts.isFunctionDeclaration(statement)) collectFunction(statement)
    if (ts.isClassDeclaration(statement)) for (const member of statement.members) if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member) || ts.isGetAccessorDeclaration(member)) collectFunction(member)
  }
  const visitReferences = node => {
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && ['physicsState', 'sceneManager'].includes(node.expression.text)) references.push({ expression: textOf(sf, node), line: lineOf(sf, node.getStart(sf)) })
    ts.forEachChild(node, visitReferences)
  }
  visitReferences(sf)
  analysis.push({ path, sha256, bytes: bytes.length, imports, topLevelState, classes, functions, directEditorOwnerReferences: references })
  const snapshotPath = join(output, 'source', path)
  await mkdir(dirname(snapshotPath), { recursive: true }); await writeFile(snapshotPath, bytes, { flag: 'wx' })
}
const anchor = (path, name) => {
  const fn = analysis.find(item => item.path === path)?.functions.find(item => item.name === name)
  assert(fn, `Required source function: ${path}#${name}`)
  return { path, line: fn.line, endLine: fn.endLine, function: name, bodySha256: fn.bodySha256 }
}
const occurrence = (path, text) => {
  const { source, sf } = sources.get(path), at = source.indexOf(text)
  assert(at >= 0, `Required exact call chain anchor: ${path}: ${text}`)
  return { path, line: lineOf(sf, at), expression: text }
}
const evidencePaths = [
  '.cache/engine-overhaul/gameplay-world-host/after-lifecycle.json',
  '.cache/engine-overhaul/game-flow/core-integration/after-mV9xCi/report.json',
  'scripts/verify-engine-gameplay-world-host.mjs',
  'scripts/review-engine-world-gameplay-owner.mjs',
  'scripts/fixtures/game-flow-core-transform-v1.json',
  'Nova_A_Engine_Runtime_Player_Overhaul_Prompt_Expanded.md', 'AGENTS.md'
]
const supportingEvidence = []
for (const path of evidencePaths) {
  const bytes = await readFile(join(root, path)); supportingEvidence.push({ path, sha256: sha(bytes), bytes: bytes.length })
  if (path.endsWith('report.json') || path.endsWith('after-lifecycle.json')) { const copy = join(output, 'supporting', path.replaceAll('/', '_')); await mkdir(dirname(copy), { recursive: true }); await writeFile(copy, bytes, { flag: 'wx' }) }
}
const previousHost = JSON.parse(await readFile(join(root, evidencePaths[0]), 'utf8'))
const currentCoreRun = JSON.parse(await readFile(join(root, evidencePaths[1]), 'utf8'))
const currentDependencyMatchesLatestCoreRun = ['src/runtime/worldGameplay.ts', 'src/runtime/gameplayComponents.ts', 'src/runtime/objectPool.ts', 'src/runtime/dynamicObjects.ts'].map(path => ({ path, currentSha256: sources.get(path).sha256, runSha256: currentCoreRun.sourceHashes[path]?.sha256 ?? null, matches: currentCoreRun.sourceHashes[path]?.sha256 === sources.get(path).sha256 }))
const findings = [
  {
    id: 'WG-01', severity: 'P1', status: 'CONFIRMED', scope: 'Existing foreign-World ownership defect; not introduced by the GameFlow slice.',
    title: 'Foreign Core fixed ticks consume Editor World character motion.',
    chain: [occurrence('src/runtime/GameplayRuntimeCore.ts', 'beforeWorldPhysicsStep(fixedDelta, this.time.value.elapsed'), anchor('src/runtime/worldGameplay.ts', 'beforeWorldPhysicsStep'), anchor('src/runtime/worldGameplay.ts', 'moveCharacters'), anchor('src/runtime/worldGameplay.ts', 'colliderSize')],
    consequence: 'Injected World.update owns the fixed tick, but moveCharacters iterates physicsState.world.entities and invokes that Editor World.moveCharacterBox. It clears the foreign-to-Core character requestedMotion and may mutate its contacts, velocity and transform.',
    runtimeEvidence: { path: evidencePaths[0], generatedAt: previousHost.generatedAt, coreSha256: previousHost.sourceHashes['src/runtime/GameplayRuntimeCore.ts'], observation: previousHost.observations.find(row => row.capability === 'independent-gameplay-worlds-and-sessions'), qualification: 'Previous actual normal beginSession/frame + ordinary WASM reproduction. The GameFlow-era current cohort has not rerun this Character reproduction; current unchanged source/call chain confirms the unresolved route. Old observation mentions global GameFlow, which has since been repaired and is not adopted as a current finding.' }
  },
  {
    id: 'WG-02', severity: 'P1', status: 'CONFIRMED_STATIC', title: 'The remaining fixed-step orchestration binds areas, focus, portals and origin to the Editor root.',
    chain: ['applyAreaEffects', 'areaMembers', 'focusPosition', 'updatePortals', 'updateWorldStreaming', 'shiftWorldOrigin', 'finishWorldSceneTransition'].map(name => anchor('src/runtime/worldGameplay.ts', name)),
    consequence: 'Area queries and transient forces use the Editor World; focus selects its first active Camera2D or first entity; portals request scenes from its travelers and apply arrival using sceneManager; origin shifts its World and Editor camera. Current foreign-World versions of these feature paths have not been dynamically reproduced by this review.'
  },
  {
    id: 'WG-03', severity: 'P1', status: 'CONFIRMED_STATIC', title: 'Spawn, handle mutation and pool closures leave the injected World.',
    chain: [occurrence('src/runtime/GameplayRuntimeCore.ts', 'return spawnRuntimePrefab(prefab,'), anchor('src/runtime/dynamicObjects.ts', 'spawnRuntimePrefab'), anchor('src/runtime/dynamicObjects.ts', 'resolveRuntimeHandle'), anchor('src/runtime/dynamicObjects.ts', 'applyTargetMutation'), anchor('src/runtime/objectPool.ts', 'poolOwners'), anchor('src/runtime/objectPool.ts', 'acquirePooled'), anchor('src/runtime/objectPool.ts', 'releasePooled')],
    consequence: 'Gameplay component updates receive the correct entity list, but Core spawn closures call global dynamicObjects/objectPool/prefabs. Handle lookup and transform/invalidation again use physicsState.world; pool lifetime hooks and signal emitters are single global slots.'
  },
  {
    id: 'WG-04', severity: 'P2', status: 'CONFIRMED_STATIC', title: 'Shared component caches, stream hooks and reset operations prevent session independence.',
    chain: [anchor('src/runtime/gameplayComponents.ts', 'beginGameplayComponents'), anchor('src/runtime/gameplayComponents.ts', 'updateGameplayComponents'), anchor('src/runtime/gameplayComponents.ts', 'processGameplayContacts'), anchor('src/runtime/worldGameplay.ts', 'resetWorldGameplay'), anchor('src/runtime/streamLifecycle.ts', 'setStreamRuntimeHooks')],
    consequence: 'verticalVelocity/hitCooldowns and diagnostics are module globals. Another begin or scene transition clears them; contacts act on supplied entities and now receive the correct GameFlow addScore callback, but cooldown state remains shared. begin/stop replaces the single stream/pool callbacks and globally resets navigation/AI/pools/streaming/TileScene/evidence.'
  },
  {
    id: 'WG-05', severity: 'P1', status: 'CONFIRMED_STATIC', title: 'Deferred stream and optional AI closures retain unversioned global ownership.',
    chain: [anchor('src/runtime/worldGameplay.ts', 'scheduleSceneStream'), anchor('src/runtime/worldGameplay.ts', 'streamedScenes'), anchor('src/runtime/worldGameplay.ts', 'ensureOptionalPackages'), anchor('src/runtime/worldGameplay.ts', 'beginWorldGameplay')],
    consequence: 'Queued microtasks use a global queue and lazy global sceneStreaming bound to the Editor World. AI import is process-global; its completion writes shared errors and the currently assigned global AI emitter. isCurrent protects begin continuation only; it does not make streaming/AI caches or callbacks per World.'
  }
]
const proposedSlices = [
  {
    priority: 1, name: 'Whole WorldGameplay direct orchestration Owner', implementationStatus: 'PROPOSED_NOT_IMPLEMENTED',
    files: ['src/runtime/worldGameplay.ts', 'src/runtime/GameplayRuntimeCore.ts', 'Editor compatibility composition', 'new pure WorldGameplay Owner/contracts', 'controlled source fixtures and real Core/WASM ownership verifier'],
    design: 'Migrate the entire worldGameplay direct orchestration to one fixed-World Owner with plain state. Keep all character/area/focus/portal/origin algorithms and before-step order. Read the fixed World, live scenes and camera through an explicit host. Inject original navigation, AI loading/update/retirement/reset, pool preparation/update/reset/emitter, world streaming state/update/reset/handoff/origin, SceneStreaming factory, TileScene update/reset/state, simulation evidence capture/clear, particle origin and package capability ports. A pure entry may not import Editor/Vue or type-import a Vue-bearing service implementation. Legacy Editor composition retains its same-raw state view and original real services; missing required services fail explicitly, never become no-op stubs.',
    ownerFields: ['worldGameplayState', 'areaOccupants', 'sceneStreamQueue', 'activePortals', 'prefetchedScenes', 'portalArrival', 'sceneStreaming', 'aiModule/loadingAi presentation and continuation ownership'],
    hostFields: ['fixed World (entities/connections/moveCharacterBox/overlapBox/overlapCircle/applyTransientForce/shiftOrigin)', 'live scene collection and activeSceneUuid', 'live camera scale/offset/targetOffset', 'createEntity/serializeEntity and explicit real service ports'],
    proof: ['Paired actual normal Core/WASM foreign Character failure and repair: global Editor Character requests/transform/contacts remain untouched, foreign requests are consumed once by its Rust-backed solver.', 'Actual frame and stepOnce preserve before-step order, area queries/forces, active-camera focus, origin/camera shifts and portal selection against the same fixed World.', 'Same-raw Editor settings/diagnostics and all old public APIs remain connected; no new global World and no dropped gameplay service.', 'Old/new body inverse or structural identities, old project/script/scene/checkpoint/Undo checks, strict pure source+compiled entry scans and actual entry builds.', 'Every global service remains explicitly identified as legacy-scoped until separately migrated; reject stale/wrong-world service execution before touching another World.'],
    asyncRequirement: 'Per-Owner queue is insufficient by itself: queueMicrotask and AI import continuations need Owner/session generation and stop/reset cancellation. Capture generation when scheduling; reject stale callbacks before consuming fresh queue values, changing lastError or installing emitters. If implemented separately, retain the failing/unverified status and exact follow-up obligation; do not certify whole foreign safety.',
    limits: 'This coherent slice can remove all direct Editor World reads and fix direct physics/focus/origin/portal ownership. It cannot certify hidden global navigation/AI/pool/stream/tile/particle/evidence ownership, concurrent sessions or M1 while those services remain legacy-scoped.'
  },
  {
    priority: 2, name: 'Character-motion leaf as an internal part of the whole Owner slice', implementationStatus: 'PROPOSED_NOT_IMPLEMENTED',
    files: ['src/runtime/worldGameplay.ts', 'src/runtime/GameplayRuntimeCore.ts', 'new pure character-motion module', 'Editor compatibility composition and existing controlled fixtures'],
    design: 'Extract colliderSize/moveCharacters unchanged to an explicit fixed-World host using actual entities, moveCharacterBox and hierarchy. queueCharacterMotion/canUseCoyoteTime are already entity-local and should retain semantics. Existing worldGameplay entry must route character motion exactly once to the supplied host; its legacy default uses the original Editor World. Core must supply its injected World at both frame and stepOnce paths.',
    proof: ['Paired real normal Core/WASM reproduction: Editor character request remains untouched by foreign frame; foreign character request is consumed exactly once and actually changes collision-safe pose.', 'Floor/wall/ceiling normals, coyote timing, moving platform probe-before-carry and no second solver velocity integration remain identical.', 'Normal Editor compatibility and actual stepOnce use the same unchanged algorithms; malformed/wrong/stale World rejected before mutation.', 'Full inverse/AST body identity plus related character/platform, lifecycle, old-project/Undo and script commands regression tests.'],
    limits: 'Not an independent safe exit: keeping Core on the original global beforeWorldPhysicsStep after only repairing characters would still mutate Editor areas/streaming/tile/portals. Use this extraction within the whole fixed-World orchestration slice, not to claim foreign safety or M1 completion.'
  },
  {
    priority: 3, name: 'Per-World GameplayComponents Owner', implementationStatus: 'PROPOSED_NOT_IMPLEMENTED',
    design: 'Own verticalVelocity/hitCooldowns/plain diagnostics in one Owner, retain existing entities/input/emit/spawn/remove functions and formulas. Editor exposes same-raw reactive view through one explicit composition; Core owns its instance. Preserve injected GameFlow scoring introduced by the completed slice.',
    limits: 'Does not repair the global spawn/remove services; caller ownership and transaction semantics must be migrated explicitly.'
  },
  {
    priority: 4, name: 'Hidden services Owners and async continuation qualification', implementationStatus: 'PROPOSED_NOT_IMPLEMENTED',
    design: 'Fixed World + live scene/settings/camera host, plain shared settings contract and per-Owner occupants/portal/stream queues. Supply navigation/AI/pool/stream/tile/evidence/particle-origin services whose Own world identity is checked. Services may not be stubbed or optional no-ops to claim foreign safety; source/runtime limitations remain explicit until their Owners are migrated. Reuse RuntimeSceneStreaming host structure, but its global StreamRuntimeHooks and toRaw dependency also need ownership/host unwrap migration.',
    limits: 'A wider coherent slice; do not combine protocol/Rust ABI/renderer replacement or change gameplay math and order.'
  }
]
const associatedChanges = {
  section30: [
    { topic: 'Editor/Runtime/Player package boundaries', status: 'REQUIRED_FOR_IMPLEMENTATION', items: 'Imports and old reexports, all Core/step/legacy call sites, strict source/compiled gates, fixtures and actual entry builds; no package/milestone pass claimed by this review.' },
    { topic: 'World ownership', status: 'REQUIRED_FOR_IMPLEMENTATION', items: 'Inspector/debug mirrors, Undo authoring isolation, script move_character/coyote callbacks, World physics synchronization, animation transforms, Prefab/spawn/pool, saves/checkpoints, scene serialization, object retirement/hot reload. Ownership-only migration must preserve formulas and runtime order.' },
    { topic: 'Per-script JSON snapshots', status: 'VERIFY_PRESERVED', items: 'Keep current incrementally published script world and epoch/revision/handle checks; do not introduce new full-world snapshots or per-entity RPC.' },
    { topic: 'Worker/OffscreenCanvas, ABI packets, GPU batches/backends, resolution, PAK/single-file', status: 'NOT_APPLICABLE_TO_THIS_READ_ONLY_REVIEW', items: 'No such production change made. Existing unfinished requirements remain; future Owner transfer still requires Worker stop/restart/compatibility verification.' },
    { topic: 'Player and performance instrumentation', status: 'REQUIRED_AT_STAGE_EXIT', items: 'Independent Player must run the same real character/gameplay paths; gameplay diagnostics become host-owned without renaming counters or falsely reporting performance gain.' }
  ],
  section64: [
    { topic: 'Coordinator/queues/helper/Worker/WASM enhancement/native/GPU tuning/compute/quality', status: 'NOT_APPLICABLE_TO_THIS_READ_ONLY_REVIEW', items: 'No policy, concurrency, protocol, algorithm, build variant or graphics change. Future async stream/AI work must retain global quotas, cancellation/backpressure and epoch/owner validation.' },
    { topic: 'Comfortable UI/Motion/blur', status: 'VERIFY_PRESERVED', items: 'Shared debug/property views must remain reactive via Editor adapters; preserve 16px/44px visual floor, core motion and precise input. No UI change is proposed for the character leaf.' },
    { topic: 'Visibility/idle', status: 'REQUIRED_FOR_IMPLEMENTATION', items: 'Pause/hidden/resume and stop must not consume another World character requests, reset another World cache or leave stale asynchronous callbacks; retain actual clock/input behavior.' },
    { topic: 'Production logs', status: 'REQUIRED_FOR_IMPLEMENTATION', items: 'Report actual Owner/backend/mode and original diagnostic counter meaning, snapshot raw failure/success evidence with hashes; no CPU/GPU/FPS claim from an ownership test.' }
  ]
}
const sourceChangesDuringReview = []
for (const [path, { sha256 }] of sources) if (sha(await readFile(join(root, path))) !== sha256) sourceChangesDuringReview.push(path)
const report = { schema: 'nova-world-gameplay-readonly-review-v1', generatedAt: new Date().toISOString(), status: sourceChangesDuringReview.length ? 'SOURCE_CHANGED_REVIEW_REQUIRES_REFRESH' : 'READ_ONLY_REVIEW_COMPLETE', scope: 'Current source ownership/call chains; no production edits, no benchmark, no browser, no stub-based success or new dynamic reproduction.', findings, proposedSlices, associatedChanges, currentDependencyMatchesLatestCoreRun, supportingEvidence, sourceChangesDuringReview, sourceHashes: Object.fromEntries([...sources].map(([path, row]) => [path, row.sha256])), analysis, limits: ['Overall independent foreign World/session safety and M1 remain NOT_PASSED.', 'Previous actual foreign Character reproduction is retained with its original Core hash; no current-cohort dynamic Character pass is claimed.', 'GameFlow is already Owner-scoped and is not reported as an unresolved global score/pause defect.', 'AI/navigation/pool/stream/particle/evidence paths are statically traced, not certified by new runtime tests.'] }
await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx' })
const reportHash = sha(await readFile(join(output, 'report.json')))
console.log(JSON.stringify({ path: normalize(relative(root, join(output, 'report.json'))), sha256: reportHash, status: report.status, files: files.length, findings: findings.length, sourceChangesDuringReview, dependencyMatches: currentDependencyMatchesLatestCoreRun }))

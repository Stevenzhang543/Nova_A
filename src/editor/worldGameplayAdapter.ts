/** Unique legacy Editor composition. Shared service Owners are retained explicitly;
 * foreign direct-world orchestration is not independent service/session isolation. */
import { reactive, toRaw } from 'vue'
import { getLegacyGameplayComponentDiagnosticsRaw, installLegacyGameplayComponentDiagnosticsView } from '../runtime/gameplayComponents'
import { physicsState, sceneManager, createEntityFromData, serializeEntity } from '../store/physics'
import { WorldGameplayOwner, type WorldGameplayCamera, type WorldGameplayPorts, type WorldGameplayWorld } from '../runtime/worldGameplayOwner'
import { getLegacyWorldGameplayRawState, installLegacyWorldGameplayPort } from '../runtime/worldGameplay'
import { RuntimeSceneStreaming } from '../runtime/runtimeSceneStreaming'
import { OFFICIAL_AI_PACKAGE_ID, OFFICIAL_OBJECT_POOL_PACKAGE_ID, packageEnabled } from '../runtime/packages'
import { getRuntimePrefabRecord } from '../runtime/prefabs'
import { installLegacyEntityLifetimePort } from '../runtime/entityLifetimes'
import { installLegacyStreamLifecyclePort } from '../runtime/streamLifecycle'
import type { RuntimeObjectPorts } from '../runtime/runtimePrefabInstantiator'
import { createEditorEntityLifecycle } from './entityLifecycleAdapter'
import { addEditorLog } from '../store/editor'
import { createEditorNavigationOwner, installEditorNavigationOwnerProvider } from './navigationAdapter'
import type { NavigationOwner } from '../runtime/navigationOwner'
import { createEditorWorldStreamingOwner, installEditorWorldStreamingOwnerProvider } from './worldStreamingAdapter'
import {getEditorTileMapOwner,createEditorRuntimeSceneInstantiator,editorTileSceneStateView,installEditorTileOwnerProvider} from './tileMapAdapter'
import { createEditorSimulationEvidenceOwner } from './simulationEvidenceAdapter'
import { createEditorAiOwner, installEditorAiOwnerProvider } from './aiAdapter'
import type { AiOwner } from '../runtime/aiOwner'
import { GraphDebugOwner } from '../runtime/graphDebugOwner'
import { createEditorGraphDebugOwner, installEditorGraphDebugOwnerProvider } from './graphDebugAdapter'
import { createEditorGameplayScriptServices } from './gameplayScriptServices'
import { createEditorParticleOwner } from './particleAdapter'

export interface EditorWorldGameplayHost {
  readonly state: { world: WorldGameplayWorld; camera: WorldGameplayCamera }
  readonly activeSceneUuid: string
}
const stateView = reactive(getLegacyWorldGameplayRawState())
const componentsDiagnosticsView = reactive(getLegacyGameplayComponentDiagnosticsRaw())
installLegacyGameplayComponentDiagnosticsView({ view: componentsDiagnosticsView, unwrap: toRaw })
let legacyOwner: WorldGameplayOwner | null = null
const owners = new WeakMap<EditorWorldGameplayHost, WorldGameplayOwner>()
const aiOwners = new WeakMap<WorldGameplayOwner, AiOwner>()
// Lazy authoring reads can precede the first Core. Only explicit Core bindings claim the Owner.
const coreBoundOwners = new WeakSet<WorldGameplayOwner>()
const ports: Omit<WorldGameplayPorts, 'evidence' | 'loadAi' | 'navigation' | 'lifecycle' | 'runtimeObjects' | 'tile' | 'particles' | 'graphDebug' | 'streaming'> & { runtimeObjects: Omit<RuntimeObjectPorts, 'lifetimes'> } = {
  packages: { aiEnabled: () => packageEnabled(OFFICIAL_AI_PACKAGE_ID), objectPoolEnabled: () => packageEnabled(OFFICIAL_OBJECT_POOL_PACKAGE_ID) },

  runtimeObjects: {
    readPrefab: getRuntimePrefabRecord, createEntity: createEntityFromData, unwrapEntity: toRaw,
    log: addEditorLog, defaultClockSeconds: () => performance.now() / 1_000
  },

  createSceneStreaming(host) {
    return new RuntimeSceneStreaming({ world: host.world,
      // Keep the original authored catalog. The supplied fixed World owns live membership.
      scenes: { get scenes() { return sceneManager.scenes }, get activeSceneUuid() { return host.activeSceneUuid() } },
      origin: host.origin, createEntity: createEntityFromData, serializeEntity,
      readHandoff: host.streamingOwner.sceneHandoffPorts.readHandoff, writeHandoff: host.streamingOwner.sceneHandoffPorts.writeHandoff, lifecycle: host.lifecycle, streamingOwner: host.streamingOwner })
  },

  // Particle origin is supplied by the selected fixed-World child below.
}

/** Equal Worlds can have different cameras/scenes. legacyRoot is an explicit
 * Editor single-root choice, never inferred from World equality. */
export function createEditorWorldGameplayOwner(suppliedHost: EditorWorldGameplayHost, options: { legacyRoot: boolean }, graphDebug?: GraphDebugOwner): WorldGameplayOwner {
  if (options.legacyRoot && (suppliedHost.state as unknown) !== physicsState) throw new Error('WORLD_GAMEPLAY_LEGACY_ROOT_REQUIRED: Only the original Editor root uses its shared view.')
  const world = suppliedHost.state.world
  if (graphDebug && (!(graphDebug instanceof GraphDebugOwner) || graphDebug.world !== world)) throw new Error('WORLD_GAMEPLAY_GRAPH_DEBUG_WORLD_MISMATCH')
  const cached = options.legacyRoot ? legacyOwner : owners.get(suppliedHost)
  if (cached?.world === world && (!graphDebug || cached.graphDebugOwner === graphDebug)) { if (graphDebug) coreBoundOwners.add(cached); return cached }
  // A second Core for this same World must not retire the first Core's fixed services.
  // Only a real World replacement follows the disposal/recomposition path below.
  if (cached?.world === world && coreBoundOwners.has(cached) && graphDebug && cached.graphDebugOwner !== graphDebug) throw new Error('WORLD_GAMEPLAY_WORLD_ALREADY_BOUND: Use a separate World or the existing Core for this World.')
if (cached) { cached.streamingOwner.dispose(); cached.navigationOwner.dispose() }
  if (suppliedHost.state.world !== world) throw new Error('WORLD_GAMEPLAY_HOST_WORLD_CHANGED: The fixed World changed during navigation handoff.')
  const reentered = options.legacyRoot ? legacyOwner : owners.get(suppliedHost)
  if (reentered?.world === world && (!graphDebug || reentered.graphDebugOwner === graphDebug)) { if (graphDebug) coreBoundOwners.add(reentered); return reentered }
  if (reentered?.world === world && coreBoundOwners.has(reentered) && graphDebug && reentered.graphDebugOwner !== graphDebug) throw new Error('WORLD_GAMEPLAY_WORLD_ALREADY_BOUND: Use a separate World or the existing Core for this World.')
  const lifecycle = createEditorEntityLifecycle(world)
  const particles = createEditorParticleOwner(world,options)
  const requireCapturedWorld = () => {
    if (suppliedHost.state.world !== world) throw new Error('WORLD_GAMEPLAY_HOST_WORLD_CHANGED: Recreate the runtime host for the current World.')
  }
  const host = { world,
    get camera() { requireCapturedWorld(); return suppliedHost.state.camera },
    get activeSceneUuid() { requireCapturedWorld(); return suppliedHost.activeSceneUuid }
  }
  const graphDebugOwner = graphDebug ?? createEditorGraphDebugOwner(world, createEditorGameplayScriptServices(), options)
  const navigation = createEditorNavigationOwner(world, options)
  const streaming = createEditorWorldStreamingOwner(world, lifecycle.streams, options)
  const ai = createEditorAiOwner(world, options, graphDebugOwner)
  const portsForOwner: WorldGameplayPorts = { ...ports, graphDebug: graphDebugOwner, navigation, lifecycle, particles: { shiftParticleOrigin(offset, entities) { if(entities!==world.entities)throw new Error('PARTICLE_ORIGIN_WORLD_MISMATCH');particles.shiftOrigin(offset) } }, runtimeObjects: { ...ports.runtimeObjects, lifetimes: lifecycle.lifetimes },
    streaming,
    tile:{map:getEditorTileMapOwner(world),scene:createEditorRuntimeSceneInstantiator(world,{createEntity:ports.runtimeObjects.createEntity}),state:options.legacyRoot?editorTileSceneStateView():undefined},
    loadAi: async () => ai, evidence: createEditorSimulationEvidenceOwner(world, options, ai) }
let owner: WorldGameplayOwner | null = null
  try {
    owner = options.legacyRoot ? new WorldGameplayOwner(host, portsForOwner, stateView, componentsDiagnosticsView) : new WorldGameplayOwner(host, portsForOwner)
    if (owner.world !== suppliedHost.state.world) throw new Error('WORLD_GAMEPLAY_WORLD_OWNER_MISMATCH: The fixed World changed during composition.')
    aiOwners.set(owner, ai)
    if (graphDebug) coreBoundOwners.add(owner)
    if (options.legacyRoot) legacyOwner = owner
    else owners.set(suppliedHost, owner)
    navigation.activateDiagnostics()
    streaming.activateDiagnostics()
    requireCapturedWorld()
    return owner
  } catch (error) {
    let cleanupFailed = false, cleanupError: unknown
    try { streaming.dispose(); navigation.dispose() } catch (cause) { cleanupFailed = true; cleanupError = cause }
    finally {
      if (owner && legacyOwner === owner) legacyOwner = null
      if (owner && owners.get(suppliedHost) === owner) owners.delete(suppliedHost)
    }
    if (cleanupFailed) throw Object.assign(new Error('WORLD_GAMEPLAY_NAVIGATION_HANDOFF_CLEANUP: ' + String(error) + '; cleanup: ' + String(cleanupError)), { primaryError: error, cleanupError })
    throw error
  }
}

// Installation wraps only the original raw view; all World reads stay lazy.
const legacyHost: EditorWorldGameplayHost = {
  get state() { return physicsState },
  get activeSceneUuid() { return sceneManager.activeSceneUuid }
}
export function getEditorWorldGameplayOwner(): WorldGameplayOwner { return createEditorWorldGameplayOwner(legacyHost, { legacyRoot: true }) }
installLegacyWorldGameplayPort({ stateView, unwrapState: toRaw, getOwner: getEditorWorldGameplayOwner })
installLegacyEntityLifetimePort({ getOwner: () => getEditorWorldGameplayOwner().entityLifetimes })
installLegacyStreamLifecyclePort({ getOwner: () => getEditorWorldGameplayOwner().streamLifecycle })

/** The same fixed instance serves the WGO and its checksum port. */
export function getEditorAiOwner(): AiOwner {
  const owner = getEditorWorldGameplayOwner(), ai = aiOwners.get(owner)
  if (!ai || ai.world !== owner.world) throw new Error('WORLD_GAMEPLAY_AI_WORLD_MISMATCH: Resolve the AI Owner from the current Editor composition.')
  return ai
}
installEditorAiOwnerProvider(getEditorAiOwner)

export function getEditorGraphDebugOwner(): GraphDebugOwner { return getEditorWorldGameplayOwner().graphDebugOwner }
installEditorGraphDebugOwnerProvider(getEditorGraphDebugOwner)

export function getEditorNavigationOwner(): NavigationOwner {
  const owner = getEditorWorldGameplayOwner(), navigation = owner.navigationOwner
  if (navigation.world !== owner.world) throw new Error('WORLD_GAMEPLAY_NAVIGATION_WORLD_MISMATCH: Resolve the fixed child from the current composition.')
  return navigation
}
installEditorNavigationOwnerProvider(getEditorNavigationOwner)
installEditorWorldStreamingOwnerProvider(() => getEditorWorldGameplayOwner().streamingOwner)
installEditorTileOwnerProvider(()=>getEditorWorldGameplayOwner().tileSceneOwner,()=>getEditorWorldGameplayOwner().tileMapOwner)

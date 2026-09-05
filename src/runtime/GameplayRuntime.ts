import { assetState, readTextAsset, resolveAsset, updateTextAsset } from '../assets/AssetDatabase'
import { addEditorLog, editorState } from '../store/editor'
import {
  deleteEntity,
  physicsState,
  sceneManager,
  prepareRuntimeSceneTransition,
  readEntityAuthoringData,
  stopPlayMode
} from '../store/physics'
import { finiteNumber, normalizeEntity } from '../world/geometry'
import type { Entity } from '../world/Entity'
import type { Animator, AudioSource, Checkbox, NavigationAgent2D, ProgressBar, ScriptPropertyValue, Slider, Text as UIText, TextRenderer2D, TimelinePlayer } from '../world/components'
import { worldTransform, setWorldTransform } from '../world/hierarchy'
import type { RuntimePhysicsEvent } from '../world/World'
import { instantiatePrefab } from './prefabs'
import { InputManager, type InputSnapshot } from './input'
import { RuntimeTime, type TimerExpiration } from './time'
import { executeScriptTestSuite } from './scriptTestExecution'
import { WasmScriptRuntime } from '../../nova_core/pkg/nova_core.js'
import { subtreeEntities } from '../editor/selection'
import { animationRuntime, setAnimatorParameter } from './animation'
import { timelineRuntime } from './timeline'
import { dispatchTimelineUiAction } from './timelineUiActions'
import { audioRuntime } from './audio'
import { MediaClock } from './mediaClock'
import { setTileAnimationTime } from './tilemap'
import { setRuntimeCaptionTime } from './presentation'
import { particleRuntime } from './particles'
import { clearSaveValues, commitSaveSlot, deleteSaveValue, loadSaveSlot, saveSnapshot, setSaveValue, useSaveProject, type SaveValue } from './saveGame'
import { pluginRuntime } from './plugins'
import { analyzeScript } from '../editor/scriptLanguage'
import { analyzeScript26, statementAtLine } from '../editor/scriptLanguage26'
import { beginDebugSession, clearScriptDebugger, evaluateDebugExpression, pauseScriptDebugger, requestDebugStep, scriptDebugState, updateDebugTask, type DebugStepMode, type ScriptTestResult } from './scriptDebug'
import { scriptProjectSettings } from './scriptSettings'
import { beforeWorldPhysicsStep, beginWorldGameplay, canUseCoyoteTime, queueCharacterMotion, resetWorldGameplay } from './worldGameplay'
import { acquirePooled, hasObjectPool, releasePooled, setPoolRuntimeHooks } from './objectPool'
import { beginEntityLifetime, entityLifetimeActive, entityLifetimeGeneration, inspectEntityLifetimeGeneration, retireEntityLifetime } from './entityLifetimes'
import type { CharacterBody2D } from '../world/components'
import { completeReplayFixedStep, deterministicRandom, replayFixedInput, resetDeterministicSeed } from './replay'
import { beginProductionRuntime, callProductionRpc, onProductionRemoteInput, onProductionRpc, onProductionSceneHandoff, productionNetworkContext, stopProductionRuntime, updateProductionRuntime } from './productionRuntime'
import { recordScriptFunction } from './profiler'
import { synchronizePerformanceWorld } from './largeWorldPerformance'
import type { ScriptBreakpointMetadata } from '../assets/types'
import { commitHotReload, completeHotReloadRollback, peekHotReloadRollback, prepareHotReload, rejectHotReload } from './scriptHotReload'
import { recordScriptCoverage, resetScriptCoverage } from './scriptCoverage'
import { executableGraphSource } from '../visual/graphCompiler'
import {
  beginGraphDebugSession,
  clearGraphPause,
  graphDebugState,
  recordGraphError,
  recordGraphTrace,
  registerGraphDebugDocument,
  requestGraphStep,
  type GraphTraceCommand
} from '../visual/graphDebugger'
import { graphStateValues } from '../visual/graphDebugger'
import { planGraphHotReload } from '../visual/graphProduction'
import { applyTargetMutation, resolveRuntimeHandle, runtimeSceneEntitySnapshots, spawnRuntimePrefab, type PendingEntityResolution, type RuntimeEntityHandle, type TargetMutation } from './dynamicObjects'
import { addRuntimeScore, gameFlowSnapshot, resetGameFlow, restoreRuntimeCheckpoint, setGamePaused, setRuntimeCheckpoint, setRuntimeScore, setSessionValue } from './gameFlow'
import { beginGameplayComponents, processGameplayContacts, updateGameplayComponents } from './gameplayComponents'
import { activeGameCamera, gameScreenToWorld, visibleWorldBounds } from '../renderer/sceneRenderer'
import { packageState } from './packages'
import { parseScriptContract, validateScriptContract, type ScriptContractReport } from './scriptContracts'
import { eventCallbackFamily, resolveEventHandlers, type ObjectEventKind } from './eventSheets'
import { resolveProjectScriptBundle } from './scriptModules'

type LifecycleFunction = 'awake' | 'start' | 'fixed_update' | 'update' | 'late_update' | 'on_destroy' | 'on_timer' | 'on_task' | 'on_signal'

interface ScriptExecution {
  commands: ScriptCommand[]
  logs: Array<{ level: string; message: string }>
  properties: Record<string, ScriptPropertyValue>
}

const MAX_SCRIPT_BRIDGE_BYTES = 16 * 1024 * 1024
const MAX_SCRIPT_BRIDGE_COMMANDS = 4_096
const MAX_SCRIPT_BRIDGE_LOGS = 512

function parseScriptExecution(source: string, limits = { commands: MAX_SCRIPT_BRIDGE_COMMANDS, logs: MAX_SCRIPT_BRIDGE_LOGS }): ScriptExecution {
  if (source.length > MAX_SCRIPT_BRIDGE_BYTES) throw new Error('Script result exceeded the 16 MB host-bridge limit.')
  const value = JSON.parse(source) as Partial<ScriptExecution> | null
  if (!value || !Array.isArray(value.commands) || !Array.isArray(value.logs) || !value.properties || typeof value.properties !== 'object' || Array.isArray(value.properties)) throw new Error('Script result did not match the host-bridge contract.')
  const commandLimit = Math.min(MAX_SCRIPT_BRIDGE_COMMANDS, Math.max(1, Math.round(limits.commands)))
  const logLimit = Math.min(MAX_SCRIPT_BRIDGE_LOGS, Math.max(1, Math.round(limits.logs)))
  if (value.commands.length > commandLimit) throw new Error(`Script emitted more than its ${commandLimit}-command behavior budget in one invocation.`)
  if (value.logs.length > logLimit) throw new Error(`Script emitted more than its ${logLimit}-log behavior budget in one invocation.`)
  if (value.commands.some(command => !command || typeof command !== 'object' || typeof (command as { type?: unknown }).type !== 'string')) throw new Error('Script emitted a malformed host command.')
  if (value.logs.some(log => !log || typeof log !== 'object' || typeof (log as { level?: unknown }).level !== 'string' || typeof (log as { message?: unknown }).message !== 'string')) throw new Error('Script emitted a malformed log entry.')
  return value as ScriptExecution
}

export interface ExportedProperty {
  name: string
  value: ScriptPropertyValue
  valueType: string
  defaultValue: ScriptPropertyValue
  minimum: number | null
  maximum: number | null
  step: number | null
  enumValues: string[]
  resourceType: string | null
  group: string
  tooltip: string
  serialized: boolean
}

type ScriptCommand =
  | GraphTraceCommand
  | { type: 'applyForce'; x: number; y: number }
  | { type: 'applyImpulse'; x: number; y: number }
  | { type: 'setVelocity'; x: number; y: number }
  | { type: 'setPosition'; x: number; y: number }
  | { type: 'setRotation'; radians: number }
  | { type: 'setScale'; x: number; y: number }
  | { type: 'setAngularVelocity'; radiansPerSecond: number }
  | { type: 'moveCharacter'; x: number; y: number }
  | { type: 'animatorSetBool'; name: string; value: boolean }
  | { type: 'animatorSetFloat'; name: string; value: number }
  | { type: 'animatorSetInteger'; name: string; value: number }
  | { type: 'animatorTrigger'; name: string }
  | { type: 'animatorPlay'; state: string }
  | { type: 'audioPlay' }
  | { type: 'audioPause' }
  | { type: 'audioStop' }
  | { type: 'destroy' }
  | { type: 'despawn' }
  | { type: 'instantiate'; prefab: string }
  | { type: 'spawnAt'; pendingId: string; prefab: string; x: number; y: number; rotation: number; scaleX: number; scaleY: number }
  | { type: 'targetSetPosition'; target: string; generation: number; x: number; y: number }
  | { type: 'targetSetRotation'; target: string; generation: number; radians: number }
  | { type: 'targetSetScale'; target: string; generation: number; x: number; y: number }
  | { type: 'targetSetEnabled'; target: string; generation: number; enabled: boolean }
  | { type: 'targetSetComponentEnabled'; target: string; generation: number; component: string; enabled: boolean }
  | { type: 'targetSetUiText'; target: string; generation: number; text: string }
  | { type: 'targetSetUiValue'; target: string; generation: number; value: number }
  | { type: 'targetAddTag' | 'targetRemoveTag'; target: string; generation: number; tag: string }
  | { type: 'targetAddGroup' | 'targetRemoveGroup'; target: string; generation: number; group: string }
  | { type: 'targetDestroy'; target: string; generation: number }
  | { type: 'loadScene'; scene: string }
  | { type: 'reloadScene' }
  | { type: 'quit' }
  | { type: 'gamePause'; paused: boolean }
  | { type: 'checkpointSet' | 'checkpointRestore'; name: string }
  | { type: 'scoreSet' | 'scoreAdd'; value: number }
  | { type: 'sessionSet'; key: string; value: unknown }
  | { type: 'inputContextPush'; name: string; priority: number; consume: boolean }
  | { type: 'inputContextPop' | 'inputMapEnable' | 'inputMapDisable' | 'inputSchemeSet'; name: string }
  | { type: 'startTimer'; name: string; seconds: number; repeat: boolean }
  | { type: 'pauseTimer'; name: string }
  | { type: 'resumeTimer'; name: string }
  | { type: 'cancelTimer'; name: string }
  | { type: 'startTask'; name: string; seconds: number }
  | { type: 'cancelTask'; name: string }
  | { type: 'emitSignal'; name: string; target: string; payload: unknown }
  | { type: 'saveSet'; key: string; value: SaveValue }
  | { type: 'saveDelete'; key: string }
  | { type: 'saveClear' }
  | { type: 'saveLoad'; slot: string }
  | { type: 'saveCommit'; slot: string }
  | { type: 'uiSetText'; text: string }
  | { type: 'uiSetValue'; value: number }
  | { type: 'navigationSetTarget'; x: number; y: number }
  | { type: 'networkRpc'; name: string; payload: unknown }

interface ScriptContact {
  otherEntity: string
  point: [number, number]
  normal: [number, number]
  relativeVelocity: [number, number]
}

interface ScriptEvent { name: string; source: string; payload: unknown }
interface RuntimeSignal extends ScriptEvent { target: string; deliveredCallbacks?: string[] }
interface PendingDebugInvocation { entityUuid: string; scriptUuid: string; functionName: string; contact?: ScriptContact; event?: ScriptEvent; logicAsset?: string | null; callbackKind?: string }
interface PendingGraphExecution {
  entityUuid: string
  scriptUuid: string
  sourcePath: string
  functionName: string
  commands: ScriptCommand[]
  nextIndex: number
}

export interface RuntimeDiagnostics {
  scripts: number
  scriptErrors: number
  lifecycleCalls: number
  activeTimers: number
  sceneSwitches: number
  timings: { inputMs: number; physicsMs: number; scriptsMs: number; animationMs: number; audioMs: number; assetsMs: number }
}

const EMPTY_INPUT: InputSnapshot = {
  down: {}, pressed: {}, released: {}, performed: {}, cancelled: {}, phases: {}, durations: {}, tapCounts: {}, consumed: {}, axes: {}, vectors: {}, mousePosition: [0, 0], mouseWorldPosition: [0, 0], viewBounds: [0, 0, 0, 0], viewportSize: [0, 0], wheel: [0, 0], pointerDelta: [0, 0], touches: 0, devices: [], contexts: ['Gameplay'], maps: ['Default'], scheme: 'Any'
}

export const DEFAULT_SCRIPT_SOURCE = `@export(type="float", min=0, max=100, step=0.1, group="Movement", tooltip="Horizontal acceleration in newtons") let move_speed = 5.0;
@export(type="float", min=0, max=1000, step=0.1, group="Movement", tooltip="Instant vertical impulse in N·s") let jump_force = 10.0;

fn awake() {
    print(\`Awake: ${'${entity_name()}'}\`);
}

fn start() {
}

fn fixed_update(dt) {
    let horizontal = input_axis("Horizontal");
    if horizontal != 0.0 {
        apply_force(horizontal * move_speed, 0.0);
    }
    if input_pressed("Jump") {
        apply_impulse(0.0, jump_force);
    }
}

fn update(dt) {
}

fn late_update(dt) {
}

fn on_collision_enter(other, point_x, point_y, normal_x, normal_y, relative_x, relative_y) {
}
`

export class GameplayRuntime {
  readonly input = new InputManager()
  readonly time = new RuntimeTime()
  private readonly mediaClock=new MediaClock()
  readonly diagnostics: RuntimeDiagnostics = { scripts: 0, scriptErrors: 0, lifecycleCalls: 0, activeTimers: 0, sceneSwitches: 0, timings: { inputMs: 0, physicsMs: 0, scriptsMs: 0, animationMs: 0, audioMs: 0, assetsMs: 0 } }
  private scriptRuntime: WasmScriptRuntime | null = null
  private active = false
  private awakened = new Set<string>()
  private started = new Set<string>()
  private destroying = new Set<string>()
  private inputSnapshot: InputSnapshot = EMPTY_INPUT
  private fixedPressed: Record<string, boolean> = {}
  private fixedReleased: Record<string, boolean> = {}
  private pendingDestroy = new Map<number, number>()
  private pendingPrefabs: Array<{ sourceUuid: string; sourceGeneration: number; allowRetiredSource: boolean; reference: string; position: { x: number; y: number } }> = []
  private pendingDynamicCommands: Array<{ sourceUuid: string; sourceGeneration: number; allowRetiredSource: boolean; command: Exclude<ScriptCommand, GraphTraceCommand> }> = []
  private callbackWorld: Entity[] | null = null
  private authoredEntities = new Map<string, { origin: 'scene' | 'runtime-spawned'; data: Record<string, unknown> }>()
  private compiledExports = new Map<string, ExportedProperty[]>()
  private pendingHandleResolutions = new Map<string, PendingEntityResolution>()
  private invocationSerial = 0
  private sessionGeneration = 0
  private playSessionIdentity = 0
  private pendingDespawn = new Map<number, number>()
  private pendingScene: { type: 'load'; identifier: string } | { type: 'reload' } | null = null
  private quitRequested = false
  private compiledSources = new Map<string, string>()
  private compiledDocuments = new Map<string, string>()
  private compiledModuleDocuments = new Map<string, Map<string, string>>()
  private pendingRollbackHistory = new Map<string, string | null>()
  private behaviorProperties = new Map<string, Record<string, ScriptPropertyValue>>()
  private declaredFunctions = new Map<string, { source: string; names: Set<string>; contract: ScriptContractReport }>()
  private contractValidations = new Map<string, { signature: string; error: string | null }>()
  private pendingReloads = new Map<string, string>()
  private pendingSignals: RuntimeSignal[] = []
  private pendingDebugInvocation: PendingDebugInvocation | null = null
  private pendingGraphExecution: PendingGraphExecution | null = null
  private networkUnsubscribe: (() => void) | null = null

  get isActive(): boolean { return this.active }
  /** Stable through scene changes; increments only when a new Play session begins. */
  get sessionIdentity(): number { return this.playSessionIdentity }

  beginSession(): void {
    if (this.active) return
    this.playSessionIdentity++
    this.authoredEntities.clear(); this.compiledExports.clear()
    for (const entity of physicsState.world.entities) this.captureAuthoredEntity(entity, 'scene')
    this.active = true
    const sessionGeneration = ++this.sessionGeneration
    this.input.start()
    this.time.reset()
    this.mediaClock.seek(0)
    setTileAnimationTime(0); setRuntimeCaptionTime(null); setRuntimeCaptionTime(0)
    audioRuntime.stopAll();audioRuntime.begin(physicsState.audioSettings)
    audioRuntime.setTransportTime({seconds:0,playing:true,scale:physicsState.globalSettings.timeScale})
    for (const entity of physicsState.world.entities) beginEntityLifetime(entity)
    setPoolRuntimeHooks({ clock: () => this.time.value.elapsed, beforeRelease: entities => {
      for (const entity of entities) this.destroying.add(entity.uuid)
      for (const entity of entities) { this.runDestructionCallbacks(entity); this.clearEntityRuntimeState(entity) }
      for (const entity of entities) this.destroying.delete(entity.uuid)
    } })
    resetDeterministicSeed()
    resetGameFlow()
    beginGameplayComponents(physicsState.world.entities)
    this.awakened.clear()
    this.started.clear()
    this.compiledSources.clear()
    this.compiledDocuments.clear(); this.compiledModuleDocuments.clear(); this.pendingRollbackHistory.clear()
    this.declaredFunctions.clear()
    this.behaviorProperties.clear()
    beginDebugSession()
    beginGraphDebugSession()
    scriptDebugState.exceptionPolicy = scriptProjectSettings.exceptionPolicy
    this.fixedPressed = {}
    this.fixedReleased = {}
    this.ensureScriptRuntime()
    this.compileAttachedScripts()
    animationRuntime.onEvent = (entity, event) => {
      let payload: unknown = event.payload
      try { payload = event.payload ? JSON.parse(event.payload) : null } catch { /* Plain text payload. */ }
      this.emitSignal(event.signal, payload, entity.uuid, `animation:${entity.uuid}`)
    }
    animationRuntime.onCommand = (entity, track, command) => {
      const target = track.targetEntityUuid ? physicsState.world.entities.find(candidate => candidate.uuid === track.targetEntityUuid) ?? entity : entity
      let payload: unknown = command.payload
      try { payload = command.payload ? JSON.parse(command.payload) : null } catch { /* Plain text payload. */ }
      if (track.kind === 'Method') this.runEntityFunction(target, command.value.slice(0, 80))
      else if (track.kind === 'Audio') { const audio = target.getComponent<AudioSource>('AudioSource'); if (audio && command.value) audio.audioClip = command.value; audioRuntime.play(target, physicsState.world.entities) }
      else if (track.kind === 'NestedAnimation') { if (!animationRuntime.playClipOnce(target.uuid, command.value)) { const animator = target.getComponent<Animator>('Animator'); if (animator) animator.currentState = command.value.slice(0, 80) } }
      else if (track.kind === 'Timeline') { const player = target.getComponent<TimelinePlayer>('TimelinePlayer'); if (player) { if (command.value) player.timelineAsset = command.value; player.currentTime = 0; player.playing = true } }
      else this.emitSignal(track.kind === 'VisualGraph' ? `visual.${command.value}` : command.value || 'animation.command', payload, target.uuid, `animation:${entity.uuid}`)
    }
    timelineRuntime.onEvent = (entity, clip, type) => {
      if (type === 'Animation') {
        const animator = entity.getComponent<Animator>('Animator')
        if (animator && typeof clip.value === 'string') animator.currentState = clip.value.slice(0, 80)
        return
      }
      let payload: unknown = clip.payload
      try { payload = clip.payload ? JSON.parse(clip.payload) : null } catch { /* Plain text payload. */ }
      const name = typeof clip.value === 'string' && clip.value.trim() ? clip.value.trim().slice(0, 80) : 'timeline.event'
      this.emitSignal(type === 'ScriptCall' ? `timeline.${name}` : name, payload, entity.uuid, `timeline:${entity.uuid}`)
      if (type === 'ScriptCall') this.runEntityFunction(entity, name)
    }
    this.emitSignal('scene.started', { scene: sceneManager.activeSceneUuid }, '', 'runtime')
    useSaveProject()
    void pluginRuntime.start()
    void beginWorldGameplay((name, payload, target, source) => this.emitSignal(name, payload, target, source), () => this.active && this.sessionGeneration === sessionGeneration)
    beginProductionRuntime()
    this.networkUnsubscribe?.()
    const rpcCleanup = onProductionRpc((name, payload, context) => this.emitSignal(`network.${name}`, { payload, sender: context.sender, tick: context.tick }, '', context.sender))
    const sceneCleanup = onProductionSceneHandoff((sceneUuid, spawnTag, peerId) => { this.pendingScene = { type: 'load', identifier: sceneUuid }; this.emitSignal('network.scene_handoff', { scene: sceneUuid, spawnTag, peer: peerId }, '', peerId) })
    const remoteInputCleanup = onProductionRemoteInput(frame => {
      for (const entityUuid of frame.targetEntityUuids) this.emitSignal('network.input', { input: frame.input, sender: frame.peerId, tick: frame.tick, entity: entityUuid }, entityUuid, frame.peerId)
    })
    this.networkUnsubscribe = () => { rpcCleanup(); sceneCleanup(); remoteInputCleanup() }
    this.ensureLifecycle()
    this.flushStructuralCommands()
    addEditorLog('Gameplay runtime started', 'Runtime')
  }

  frame(frameDelta: number, viewport?: DOMRect): void {
    synchronizePerformanceWorld(physicsState.world.entities)
    if (this.active) this.flushHotReloads()
    if (physicsState.playMode !== 'playing') {
      const physicsStarted = performance.now()
      Object.assign(physicsState.engineDiagnostics, physicsState.world.update(frameDelta, false, physicsState.globalSettings))
      const physicsMs = performance.now() - physicsStarted
      const audioStarted = performance.now()
      audioRuntime.update(physicsState.world.entities, physicsState.audioSettings, false,{seconds:this.mediaClock.seconds,playing:false,scale:this.time.value.scale})
      const audioMs = performance.now() - audioStarted
      particleRuntime.update(physicsState.world.entities, frameDelta, false)
      pluginRuntime.update(frameDelta)
      Object.assign(this.diagnostics.timings, { inputMs: 0, physicsMs, scriptsMs: 0, animationMs: 0, audioMs, assetsMs: 0 })
      return
    }
    if (!this.active) this.beginSession()
    this.flushHotReloads()
    this.dispatchSignals()
    this.ensureLifecycle()
    const inputStarted = performance.now()
    const frameInput = this.decorateViewportInput(this.input.sample(physicsState.inputMap, viewport), viewport)
    const inputMs = performance.now() - inputStarted
    this.inputSnapshot = frameInput
    this.dispatchInputCallbacks(frameInput)
    this.latchFixedInput(frameInput)
    const expired = this.time.beginFrame(frameDelta, physicsState.globalSettings.tickRate, physicsState.globalSettings.timeScale)
    let scriptsMs = 0
    const timerScriptsStarted = performance.now()
    this.dispatchTimerExpirations(expired)
    scriptsMs += performance.now() - timerScriptsStarted

    let firstFixedStep = true
    let fixedScriptsMs = 0
    const physicsStarted = performance.now()
    Object.assign(physicsState.engineDiagnostics, physicsState.world.update(
      frameDelta,
      true,
      physicsState.globalSettings,
      fixedDelta => {
        const fixedScriptsStarted = performance.now()
        const fixedInput = firstFixedStep
          ? { ...frameInput, pressed: { ...this.fixedPressed }, released: { ...this.fixedReleased } }
          : { ...frameInput, pressed: {}, released: {}, performed: {}, cancelled: {} }
        this.inputSnapshot = replayFixedInput(fixedInput)
        if (firstFixedStep) {
          this.fixedPressed = {}
          this.fixedReleased = {}
        }
        firstFixedStep = false
        this.time.value.fixedDelta = fixedDelta
        this.runPhase('fixed_update')
        this.flushEntityCommands()
        updateGameplayComponents(physicsState.world.entities, this.inputSnapshot, fixedDelta, (name, payload, target, source) => this.emitSignal(name, payload, target, source), (prefab, owner) => {
          const transform = worldTransform(owner, physicsState.world.entities)
          return spawnRuntimePrefab(prefab, { position: transform.position, rotation: transform.rotation, scale: { x: 1, y: 1 } })
        }, (target, despawn) => this.queueEntityRemoval(target, despawn))
        beforeWorldPhysicsStep(fixedDelta, this.time.value.elapsed, this.time.value.frame, (name, payload, target, source) => this.emitSignal(name, payload, target, source), scene => { this.pendingScene = { type: 'load', identifier: scene } })
        this.mediaClock.advance(fixedDelta)
        setTileAnimationTime(this.mediaClock.seconds); setRuntimeCaptionTime(this.mediaClock.seconds)
        audioRuntime.setTransportTime({seconds:this.mediaClock.seconds,playing:true,scale:this.time.value.scale})
        animationRuntime.update(physicsState.world.entities, fixedDelta)
        timelineRuntime.update(physicsState.world.entities, fixedDelta)
        fixedScriptsMs += performance.now() - fixedScriptsStarted
      },
      () => { const checksum = physicsState.world.stateChecksum(); completeReplayFixedStep(checksum); updateProductionRuntime(physicsState.world.entities, this.time.value.fixedDelta, this.inputSnapshot, checksum) }
    ))
    const physicsAndFixedScriptsMs = performance.now() - physicsStarted
    scriptsMs += fixedScriptsMs
    this.inputSnapshot = frameInput
    const scriptsStarted = performance.now()
    this.dispatchPhysicsEvents(physicsState.world.events)
    this.runPhase('update')
    this.flushEntityCommands()
    this.runPhase('late_update')
    scriptsMs += performance.now() - scriptsStarted
    const animationStarted = performance.now()
    particleRuntime.update(physicsState.world.entities, this.time.value.delta, true)
    pluginRuntime.update(this.time.value.delta)
    const animationMs = performance.now() - animationStarted
    const audioStarted = performance.now()
    audioRuntime.update(physicsState.world.entities, physicsState.audioSettings, true,{seconds:this.mediaClock.seconds,playing:true,scale:this.time.value.scale})
    const audioMs = performance.now() - audioStarted
    this.flushStructuralCommands()
    Object.assign(this.diagnostics.timings, {
      inputMs, physicsMs: Math.max(0, physicsAndFixedScriptsMs - fixedScriptsMs), scriptsMs, animationMs, audioMs, assetsMs: 0
    })
    if (this.quitRequested) {
      this.quitRequested = false
      this.stopSession()
      stopPlayMode()
      editorState.statusText = 'Runtime requested quit'
      window.dispatchEvent(new CustomEvent('nova-player-quit'))
    }
  }

  stepOnce(viewport?: DOMRect): void {
    if (!this.active) this.beginSession()
    this.flushHotReloads()
    synchronizePerformanceWorld(physicsState.world.entities)
    this.dispatchSignals()
    this.ensureLifecycle()
    this.inputSnapshot = replayFixedInput(this.decorateViewportInput(this.input.sample(physicsState.inputMap, viewport), viewport))
    this.dispatchInputCallbacks(this.inputSnapshot)
    this.latchFixedInput(this.inputSnapshot)
    this.inputSnapshot = {
      ...this.inputSnapshot,
      pressed: { ...this.fixedPressed },
      released: { ...this.fixedReleased }
    }
    this.fixedPressed = {}
    this.fixedReleased = {}
    this.dispatchTimerExpirations(this.time.beginFrame(this.time.value.fixedDelta, physicsState.globalSettings.tickRate, physicsState.globalSettings.timeScale))
    this.runPhase('fixed_update')
    this.flushEntityCommands()
    updateGameplayComponents(physicsState.world.entities, this.inputSnapshot, this.time.value.fixedDelta, (name, payload, target, source) => this.emitSignal(name, payload, target, source), (prefab, owner) => {
      const transform = worldTransform(owner, physicsState.world.entities)
      return spawnRuntimePrefab(prefab, { position: transform.position, rotation: transform.rotation, scale: { x: 1, y: 1 } })
    }, (target, despawn) => this.queueEntityRemoval(target, despawn))
    beforeWorldPhysicsStep(this.time.value.fixedDelta, this.time.value.elapsed, this.time.value.frame, (name, payload, target, source) => this.emitSignal(name, payload, target, source), scene => { this.pendingScene = { type: 'load', identifier: scene } })
    Object.assign(physicsState.engineDiagnostics, physicsState.world.singleStep(physicsState.globalSettings))
    const checksum = physicsState.world.stateChecksum()
    completeReplayFixedStep(checksum)
    updateProductionRuntime(physicsState.world.entities, this.time.value.fixedDelta, this.inputSnapshot, checksum)
    this.dispatchPhysicsEvents(physicsState.world.events)
    this.runPhase('update')
    this.runPhase('late_update')
    this.mediaClock.advance(this.time.value.fixedDelta)
    setTileAnimationTime(this.mediaClock.seconds); setRuntimeCaptionTime(this.mediaClock.seconds)
    audioRuntime.setTransportTime({seconds:this.mediaClock.seconds,playing:false,scale:this.time.value.scale})
    animationRuntime.update(physicsState.world.entities, this.time.value.fixedDelta)
    timelineRuntime.update(physicsState.world.entities, this.time.value.fixedDelta)
    particleRuntime.update(physicsState.world.entities, this.time.value.fixedDelta, true)
    pluginRuntime.update(this.time.value.fixedDelta)
    audioRuntime.update(physicsState.world.entities, physicsState.audioSettings, false,{seconds:this.mediaClock.seconds,playing:false,scale:this.time.value.scale})
    this.flushStructuralCommands()
  }

  stopSession(log = true): void {
    if (!this.active) return
    this.sessionGeneration++
    const ending = [...physicsState.world.entities]
    for (const entity of ending) this.destroying.add(entity.uuid)
    for (const entity of ending) this.runDestructionCallbacks(entity)
    for (const entity of ending) retireEntityLifetime(entity)
    this.pendingDestroy.clear()
    this.pendingDespawn.clear()
    this.pendingPrefabs = []
    animationRuntime.reset()
    animationRuntime.onEvent = null
    animationRuntime.onCommand = null
    timelineRuntime.reset()
    timelineRuntime.onEvent = null
    particleRuntime.reset()
    resetWorldGameplay()
    resetGameFlow()
    stopProductionRuntime()
    this.networkUnsubscribe?.(); this.networkUnsubscribe = null
    pluginRuntime.stop()
    void audioRuntime.dispose()
    this.pendingScene = null
    this.active = false
    this.input.stop()
    this.time.reset()
    this.mediaClock.seek(0)
    setTileAnimationTime(null); setRuntimeCaptionTime(null)
    this.awakened.clear()
    this.started.clear()
    this.destroying.clear()
    this.fixedPressed = {}
    this.fixedReleased = {}
    this.pendingScene = null
    this.pendingDestroy.clear()
    this.pendingPrefabs = []
    this.pendingDynamicCommands = []
    this.pendingHandleResolutions.clear()
    this.pendingSignals = []
    this.pendingReloads.clear()
    setPoolRuntimeHooks()
    this.contractValidations.clear()
    this.behaviorProperties.clear()
    this.compiledSources.clear()
    this.authoredEntities.clear(); this.compiledExports.clear()
    this.compiledDocuments.clear(); this.compiledModuleDocuments.clear(); this.pendingRollbackHistory.clear()
    this.declaredFunctions.clear()
    this.pendingDebugInvocation = null
    this.pendingGraphExecution = null
    this.scriptRuntime?.free(); this.scriptRuntime = null
    clearScriptDebugger()
    clearGraphPause()
    if (log) addEditorLog('Gameplay runtime stopped', 'Runtime')
  }

  private decorateViewportInput(snapshot: InputSnapshot, viewport?: DOMRect): InputSnapshot {
    const width = Math.max(1, viewport?.width ?? 1), height = Math.max(1, viewport?.height ?? 1)
    const active = activeGameCamera(physicsState.world.entities, width, height)
    const view = active?.view ?? { scale: physicsState.camera.scale, offset: physicsState.camera.offset }
    const world = gameScreenToWorld({ x: snapshot.mousePosition[0], y: snapshot.mousePosition[1] }, view, width, height)
    const bounds = visibleWorldBounds(view, width, height)
    snapshot.mouseWorldPosition = [world.x, world.y]
    snapshot.viewBounds = [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]
    snapshot.viewportSize = [width, height]
    return snapshot
  }

  synchronizeExports(entity: Entity): string | null {
    const component = entity.script2D
    const asset = resolveAsset(component?.scriptAsset)
    const storedSource = readTextAsset(component?.scriptAsset)
    if (!component || !asset || !storedSource || (asset.assetType !== 'script' && asset.assetType !== 'visualScript')) return 'Select a valid Rhai or visual graph asset'
    let source: string
    try { const bundled = this.resolveScriptBundle(asset.uuid); if (bundled === null) throw new Error('Script module could not be resolved'); source = bundled } catch (error) { component.lastError = this.errorMessage(error); return component.lastError }
    this.ensureScriptRuntime()
    if (!this.scriptRuntime) return 'Script runtime is still loading'
    try {
      const exports = JSON.parse(this.scriptRuntime.validate(source)) as ExportedProperty[]
      const next: Record<string, ScriptPropertyValue> = {}
      component.propertyMetadata = Object.fromEntries(exports.map(exported => [exported.name, { ...exported, defaultValue: exported.defaultValue ?? exported.value }]))
      for (const exported of exports) next[exported.name] = this.exportValue(exported, component.properties[exported.name])
      component.properties = next
      component.lastError = null
      return null
    } catch (error) {
      component.lastError = this.errorMessage(error)
      return component.lastError
    }
  }

  validateSource(source: string): { error: string | null; exports: ExportedProperty[] } {
    this.ensureScriptRuntime()
    if (!this.scriptRuntime) return { error: 'Script runtime is still loading', exports: [] }
    try {
      return { error: null, exports: JSON.parse(this.scriptRuntime.validate(source)) as ExportedProperty[] }
    } catch (error) {
      return { error: this.errorMessage(error), exports: [] }
    }
  }

  /** Read the exact draft/module bundle for editor analysis without invoking the VM. */
  resolveModuleSource(scriptUuid: string, source: string, overrides = new Map<string, string>()): { source: string | null; error: string | null } {
    try {
      const next = new Map(overrides)
      next.set(scriptUuid, source)
      const bundled = this.resolveScriptBundle(scriptUuid, next)
      return { source: bundled, error: bundled === null ? 'Script module could not be resolved' : null }
    } catch (error) { return { source: null, error: this.errorMessage(error) } }
  }

  validateModuleSource(scriptUuid: string, source: string, overrides = new Map<string, string>()): { error: string | null; exports: ExportedProperty[] } {
    try {
      const next = new Map(overrides)
      next.set(scriptUuid, source)
      const bundled = this.resolveScriptBundle(scriptUuid, next)
      if (!bundled) return { error: 'Script module could not be resolved', exports: [] }
      return this.validateSource(bundled)
    } catch (error) {
      return { error: this.errorMessage(error), exports: [] }
    }
  }

  queueHotReload(scriptUuid: string, source: string): void {
    if (!scriptProjectSettings.hotReloadEnabled) {
      scriptDebugState.hotReload = { status: 'disabled', scriptUuid, message: 'Project hot reload is disabled', frame: this.time.value.frame }
      return
    }
    const validation = this.validateModuleSource(scriptUuid, source)
    if (validation.error) {
      scriptDebugState.hotReload = { status: 'rejected', scriptUuid, message: `Candidate rejected before apply: ${validation.error}`, frame: this.time.value.frame }
      return
    }
    this.pendingRollbackHistory.delete(scriptUuid)
    this.pendingReloads.set(scriptUuid, source)
    scriptDebugState.hotReload = { status: 'pending', scriptUuid, message: 'Analyzed candidate queued for a transactional frame-boundary swap', frame: this.time.value.frame }
  }

  queueGraphHotReload(scriptUuid: string, candidateSource: string, previousSource: string): void {
    if (!scriptProjectSettings.hotReloadEnabled) {
      scriptDebugState.hotReload = { status: 'disabled', scriptUuid, message: 'Project hot reload is disabled', frame: this.time.value.frame }
      return
    }
    try {
      const graphPlan = planGraphHotReload(previousSource, candidateSource, graphStateValues())
      if (!graphPlan.compatible) {
        const message = `Visual graph saved; runtime restart required: ${graphPlan.reasons.join(' ')}`
        scriptDebugState.hotReload = { status: 'rejected', scriptUuid, message, frame: this.time.value.frame }
        addEditorLog(message, 'Script', 'warning', scriptUuid)
        return
      }
      const validation = this.validateModuleSource(scriptUuid, candidateSource)
      if (validation.error) throw new Error(validation.error)
      this.pendingRollbackHistory.delete(scriptUuid)
      this.pendingReloads.set(scriptUuid, candidateSource)
      scriptDebugState.hotReload = { status: 'pending', scriptUuid, message: `Visual graph queued with ${Object.keys(graphPlan.preserved).length} compatible state values preserved`, frame: this.time.value.frame }
    } catch (error) {
      scriptDebugState.hotReload = { status: 'rejected', scriptUuid, message: `Visual graph hot reload rejected: ${this.errorMessage(error)}`, frame: this.time.value.frame }
    }
  }

  rollbackHotReload(scriptUuid: string): boolean {
    const rollback = peekHotReloadRollback(scriptUuid)
    if (!rollback || !scriptProjectSettings.hotReloadEnabled || resolveAsset(scriptUuid)?.script?.reloadPolicy === 'disabled') return false
    if (rollback.source === this.compiledDocuments.get(scriptUuid)) {
      scriptDebugState.hotReload = { status: 'rejected', scriptUuid, message: 'This root document did not change in that generation. Roll back the changed imported module to restore its dependent scripts together.', frame: this.time.value.frame }
      return false
    }
    const validation = this.validateModuleSource(scriptUuid, rollback.source)
    if (validation.error || !updateTextAsset(scriptUuid, rollback.source)) return false
    this.pendingRollbackHistory.set(scriptUuid, rollback.historyId)
    this.pendingReloads.set(scriptUuid, rollback.source)
    scriptDebugState.hotReload = { status: 'pending', scriptUuid, message: 'Rollback source queued for transactional apply', frame: this.time.value.frame }
    return true
  }

  emitSignal(name: string, payload: unknown = null, target = '', source = 'editor', deliveredCallbacks: string[] = []): void {
    const clean = name.trim().slice(0, 128)
    if (!clean) return
    this.pendingSignals.push({ name: clean, payload: this.serializable(payload), target: target.trim().slice(0, 128), source: source.trim().slice(0, 128), deliveredCallbacks: [...deliveredCallbacks] })
    if (this.pendingSignals.length > 1024) {
      this.pendingSignals.splice(0, this.pendingSignals.length - 1024)
      addEditorLog('Signal queue limit reached; oldest events were dropped.', 'Script', 'warning')
    }
  }

  debugContinue(): void {
    if (this.pendingGraphExecution) {
      const pending = this.pendingGraphExecution
      this.pendingGraphExecution = null
      clearScriptDebugger()
      requestDebugStep('continue')
      requestGraphStep('continue')
      const entity = physicsState.world.entities.find(candidate => candidate.uuid === pending.entityUuid)
      if (entity) this.processScriptCommands(entity, pending.scriptUuid, pending.sourcePath, pending.functionName, pending.commands, pending.nextIndex)
      if (!this.pendingGraphExecution && physicsState.playMode === 'paused') physicsState.playMode = 'playing'
      return
    }
    const pending = this.pendingDebugInvocation
    this.pendingDebugInvocation = null
    clearScriptDebugger()
    requestDebugStep('continue')
    if (pending) {
      const entity = physicsState.world.entities.find(candidate => candidate.uuid === pending.entityUuid)
      if (entity) this.runEntityFunction(entity, pending.functionName, pending.contact, pending.event, true, pending.logicAsset, false, pending.callbackKind)
    }
    if (physicsState.playMode === 'paused') physicsState.playMode = 'playing'
  }

  debugStep(mode: Exclude<DebugStepMode, 'continue'> = 'over'): void {
    if (this.pendingGraphExecution) {
      const pending = this.pendingGraphExecution
      this.pendingGraphExecution = null
      clearScriptDebugger()
      requestDebugStep(mode)
      requestGraphStep(mode)
      const entity = physicsState.world.entities.find(candidate => candidate.uuid === pending.entityUuid)
      if (entity) this.processScriptCommands(entity, pending.scriptUuid, pending.sourcePath, pending.functionName, pending.commands, pending.nextIndex)
      physicsState.playMode = 'paused'
      if (!this.pendingGraphExecution) {
        graphDebugState.paused = true
        graphDebugState.reason = `Step ${mode} completed at the visual callback boundary`
        scriptDebugState.paused = true
        scriptDebugState.reason = graphDebugState.reason
      }
      return
    }
    const pending = this.pendingDebugInvocation
    this.pendingDebugInvocation = null
    clearScriptDebugger()
    requestDebugStep(mode)
    if (pending) {
      const entity = physicsState.world.entities.find(candidate => candidate.uuid === pending.entityUuid)
      if (entity) this.runEntityFunction(entity, pending.functionName, pending.contact, pending.event, true, pending.logicAsset, false, pending.callbackKind)
    }
    physicsState.playMode = 'paused'
    scriptDebugState.paused = true
    scriptDebugState.reason = `Step ${mode} completed at a safe callback boundary`
  }

  debugRestart(): void {
    this.stopSession(false)
    this.beginSession()
    physicsState.playMode = 'paused'
    scriptDebugState.paused = true
    scriptDebugState.reason = 'Runtime restarted; continue to enter the next callback'
  }

  cancelDebugTask(taskId: string): boolean {
    const task = scriptDebugState.tasks.find(item => item.id === taskId)
    if (!task || !['queued', 'running', 'waiting'].includes(task.state)) return false
    this.time.cancelTask(task.entityUuid, task.name)
    updateDebugTask({ ...task, state: 'cancelled', detail: `Cancelled from Script Studio at frame ${this.time.value.frame}` })
    addEditorLog(`Cancelled script task ${task.name}`, 'Script', 'info', task.entityUuid)
    return true
  }

  runScriptTests(scriptUuid?: string, options: { tags?: string[]; includeSkipped?: boolean; testNames?: string[] } = {}): ScriptTestResult[] {
    if (scriptProjectSettings.testing.coverageEnabled) resetScriptCoverage()
    const references = scriptUuid ? [scriptUuid] : physicsState.world.entities.flatMap(entity => [entity.script2D?.scriptAsset, ...resolveEventHandlers(entity.script2D?.eventSheetAsset).map(handler => handler.logicAsset)])
    const assets = [...new Map(references.flatMap(reference => { const asset = resolveAsset(reference); return asset && (asset.assetType === 'script' || asset.assetType === 'visualScript') ? [[asset.uuid, asset] as const] : [] })).values()]
    const results: ScriptTestResult[] = []
    for (const asset of assets) {
      let source: string | null = null
      try { source = this.resolveScriptBundle(asset.uuid) } catch (error) { results.push({ script: asset.name, test: 'module resolution', passed: false, skipped: false, durationMs: 0, seed: 1, caseName: '', tags: [], message: this.errorMessage(error) }); continue }
      if (!source) continue
      const analysis = analyzeScript(source), selectedNames = new Set(options.testNames ?? [])
      const tests = analysis.tests.filter(test => (!options.tags?.length || options.tags.every(tag => test.tags.includes(tag))) && (!options.testNames || selectedNames.has(test.name)))
      results.push(...executeScriptTestSuite({
        scriptUuid: asset.uuid, scriptName: asset.name, source, functions: new Set(Object.keys(analysis.functions)), tests, includeSkipped: options.includeSkipped,
        createVm: () => new WasmScriptRuntime(), parseExecution: parseScriptExecution,
        onExecution: functionName => { if (scriptProjectSettings.testing.coverageEnabled) recordScriptCoverage(asset.uuid, source!, functionName) },
        context: {
          apiVersion: asset.script?.apiVersion ?? scriptProjectSettings.apiVersion, entity: 'test-entity', entityName: 'Script test', components: [], entities: {},
          time: { delta: 0, fixedDelta: 1 / 60, elapsed: 0, scale: 1, frame: 0 }, randomSeed: scriptProjectSettings.deterministicTestSeed, input: EMPTY_INPUT,
          properties: {}, save: {}, transform: { position: [0, 0], rotation: 0, scale: [1, 1] }, rigidBody: null
        }
      }))
    }
    if (!results.length && scriptProjectSettings.testing.failOnEmpty) results.push({ script: 'Selected scripts', test: 'discovery', passed: false, skipped: false, durationMs: 0, seed: 1, caseName: '', tags: [], message: 'No tests matched the selected scripts, tags and names.' })
    scriptDebugState.testResults.splice(0, scriptDebugState.testResults.length, ...results)
    addEditorLog(`Script tests: ${results.filter(result => result.passed && !result.skipped).length}/${results.filter(result => !result.skipped).length} passed, ${results.filter(result => result.skipped).length} skipped`, 'Script', results.every(result => result.passed) ? 'info' : 'error')
    return results
  }

  invokeUiCallback(entity: Entity, functionName: string): void {
    const requested = functionName.trim()
    if (!this.active || !entity.enabled || !entityLifetimeActive(entity) || this.isRemovalPending(entity)) return
    const timelineAction = dispatchTimelineUiAction(entity, requested, physicsState.world.entities)
    if (timelineAction.handled) { if (timelineAction.issue) addEditorLog(timelineAction.issue, 'Script', 'warning', entity.uuid); return }
    const callback = requested.slice(0, 80)
    if (!callback || !this.canRun(entity)) return
    const primary = resolveAsset(entity.script2D?.scriptAsset)?.uuid
    const sheetOwnsCallback = resolveEventHandlers(entity.script2D?.eventSheetAsset).some(handler => handler.kind === 'ui' && (!handler.selector || handler.selector === callback) && handler.callback === callback && resolveAsset(handler.logicAsset)?.uuid === primary)
    const direct = callback !== 'on_signal' && !sheetOwnsCallback
    const delivered = direct && primary ? [JSON.stringify([primary, callback])] : []
    this.emitSignal(`ui.${callback}`, { entity: entity.uuid }, entity.uuid, entity.uuid, delivered)
    // Event Sheets receive the complete event once at the signal boundary.
    // Keep legacy named button callbacks immediate and record their provenance
    // so a matching signal connection cannot invoke them a second time.
    if (direct) this.runEntityFunction(entity, callback)
    this.flushEntityCommands()
    this.flushStructuralCommands()
  }

  private ensureScriptRuntime(): void {
    if (!this.scriptRuntime && !physicsState.world.wasmError) {
      try { this.scriptRuntime = new WasmScriptRuntime() } catch { /* WASM is not initialized yet. */ }
    }
  }

  private ensureLifecycle(): void {
    for (const entity of physicsState.world.entities) this.captureAuthoredEntity(entity, 'runtime-spawned')
    const scripted = physicsState.world.entities.filter(entity => this.canRun(entity))
    this.diagnostics.scripts = scripted.length
    for (const entity of scripted) {
      if (!this.awakened.has(entity.uuid)) {
        this.awakened.add(entity.uuid)
        this.runEntityFunction(entity, 'awake')
        this.runEventSheetHandlers(entity, 'awake', '', 'awake')
      }
    }
    for (const entity of scripted) {
      if (!this.started.has(entity.uuid)) {
        this.started.add(entity.uuid)
        this.runEntityFunction(entity, 'start')
        this.runEventSheetHandlers(entity, 'start', '', 'start')
      }
    }
  }

  private dispatchInputCallbacks(snapshot: InputSnapshot): void {
    for (const action of physicsState.inputMap) {
      const phase = snapshot.performed[action.name] ? 'performed' : snapshot.cancelled[action.name] ? 'cancelled' : ''
      if (!phase) continue
      this.emitSignal(`input.${action.name}.${phase}`, { action: action.name, phase, axis: snapshot.axes[action.name] ?? 0, vector: snapshot.vectors[action.name] ?? [0, 0], duration: snapshot.durations[action.name] ?? 0 }, '', 'input')
      if (!action.callback) continue
      for (const entity of physicsState.world.entities.filter(candidate => this.canRun(candidate))) this.runEntityFunction(entity, action.callback)
    }
    for (const entity of physicsState.world.entities.filter(candidate => this.canRun(candidate))) for (const action of physicsState.inputMap) {
      if (snapshot.pressed[action.name]) this.runEventSheetHandlers(entity, 'input-pressed', action.name)
      if (snapshot.released[action.name]) this.runEventSheetHandlers(entity, 'input-released', action.name)
    }
  }

  private runPhase(functionName: LifecycleFunction): void {
    for (const entity of [...physicsState.world.entities]) {
      if (scriptDebugState.paused) break
      this.runEntityFunction(entity, functionName)
      if (functionName === 'update') this.runEventSheetHandlers(entity, 'update', '', 'update')
      else if (functionName === 'fixed_update') this.runEventSheetHandlers(entity, 'fixed-update', '', 'fixed_update')
    }
  }

  private runEventSheetHandlers(entity: Entity, kind: ObjectEventKind, selector = '', canonicalCallback = '', contact?: ScriptContact, event?: ScriptEvent, alreadyDispatched: readonly string[] = []): Set<string> {
    const reference = entity.script2D?.eventSheetAsset
    const primary = resolveAsset(entity.script2D?.scriptAsset)?.uuid
    const dispatched = new Set<string>([...alreadyDispatched, ...(canonicalCallback && primary ? [JSON.stringify([primary, canonicalCallback])] : [])])
    if (!reference || !this.canRun(entity)) return dispatched
    for (const handler of resolveEventHandlers(reference)) {
      if (handler.kind !== kind || (handler.selector && handler.selector !== selector)) continue
      const key = JSON.stringify([resolveAsset(handler.logicAsset)?.uuid ?? handler.sourceSheetAsset, handler.callback])
      if (dispatched.has(key)) continue
      dispatched.add(key)
      this.runEntityFunction(entity, handler.callback, contact, event, kind === 'destroy', handler.logicAsset, kind === 'destroy', eventCallbackFamily(kind))
    }
    return dispatched
  }

  private runDestructionCallbacks(entity: Entity, world?: Entity[]): void {
    const previous = this.callbackWorld
    if (world) this.callbackWorld = world
    try { this.runEntityFunction(entity, 'on_destroy', undefined, undefined, true, undefined, true); this.runEventSheetHandlers(entity, 'destroy', '', 'on_destroy') }
    finally { this.callbackWorld = previous }
  }

  private captureAuthoredEntity(entity: Entity, origin: 'scene' | 'runtime-spawned'): void {
    if (!this.authoredEntities.has(entity.uuid)) this.authoredEntities.set(entity.uuid, { origin, data: readEntityAuthoringData(entity) })
  }

  inspectObjectRuntime(entityUuid: string) {
    const entity = physicsState.world.entities.find(candidate => candidate.uuid === entityUuid), authored = this.authoredEntities.get(entityUuid)
    const primary = resolveAsset(entity?.script2D?.scriptAsset)?.uuid
    const behaviorIds = new Set([primary, ...(entity ? resolveEventHandlers(entity.script2D?.eventSheetAsset).map(handler => resolveAsset(handler.logicAsset)?.uuid) : [])].filter((uuid): uuid is string => !!uuid))
    const storedScript = (authored?.data.components as Array<{ kind: string; data: { properties?: Record<string, ScriptPropertyValue> } }> | undefined)?.find(component => component.kind === 'Script2D')
    const behaviors = [...behaviorIds].map(scriptUuid => ({ scriptUuid, sourcePath: resolveAsset(scriptUuid)?.path ?? '', primary: scriptUuid === primary,
      authoredProperties: { ...Object.fromEntries((this.compiledExports.get(scriptUuid) ?? []).map(item => [item.name, item.defaultValue ?? item.value])), ...(scriptUuid === primary ? storedScript?.data.properties ?? {} : {}) },
      properties: scriptUuid === primary ? entity?.script2D?.properties ?? {} : this.behaviorProperties.get(`${entityUuid}:${scriptUuid}`) ?? {}
    }))
    const subscriptions: Array<{ sourceSheetAsset: string | null; scriptUuid: string; signal: string; callback: string; source: string; target: string }> = []
    if (this.active && entity && this.canRun(entity)) {
      const seen = new Set<string>()
      for (const handler of resolveEventHandlers(entity.script2D?.eventSheetAsset)) {
        if (!['signal', 'ui', 'animation', 'network'].includes(handler.kind)) continue
        const scriptUuid = resolveAsset(handler.logicAsset)?.uuid
        if (!scriptUuid || !this.declaredFunctions.get(scriptUuid)?.names.has(handler.callback)) continue
        const signal = handler.kind === 'signal' ? handler.selector : `${handler.kind}.${handler.selector}`
        const key = JSON.stringify([scriptUuid, signal, handler.callback, '', entityUuid]); if (seen.has(key)) continue; seen.add(key)
        subscriptions.push({ sourceSheetAsset: handler.sourceSheetAsset, scriptUuid, signal, callback: handler.callback, source: '', target: entityUuid })
      }
      for (const connection of resolveAsset(entity.script2D?.scriptAsset)?.script?.signalConnections ?? []) {
        if (!connection.enabled || !primary || !this.declaredFunctions.get(primary)?.names.has(connection.callback) || (connection.target && connection.target !== entityUuid)) continue
        const key = JSON.stringify([primary, connection.signal, connection.callback, connection.source || '', entityUuid]); if (seen.has(key)) continue; seen.add(key)
        subscriptions.push({ sourceSheetAsset: null, scriptUuid: primary, signal: connection.signal, callback: connection.callback, source: connection.source || '', target: entityUuid })
      }
    }
    return JSON.parse(JSON.stringify({ active: this.active, entityUuid, generation: entity && this.active ? inspectEntityLifetimeGeneration(entity) : null, authoredOrigin: authored?.origin ?? null, authoredEntity: authored?.data ?? null, behaviors, subscriptions, timers: this.time.inspect(entityUuid) })) as {
      active: boolean; entityUuid: string; generation: number | null; authoredOrigin: 'scene' | 'runtime-spawned' | null; authoredEntity: Record<string, unknown> | null;
      behaviors: Array<{ scriptUuid: string; sourcePath: string; primary: boolean; authoredProperties: Record<string, ScriptPropertyValue>; properties: Record<string, ScriptPropertyValue> }>;
      subscriptions: typeof subscriptions; timers: ReturnType<RuntimeTime['inspect']>
    }
  }

  private runEntityFunction(entity: Entity, functionName: LifecycleFunction | string, contact?: ScriptContact, event?: ScriptEvent, bypassBreakpoint = false, logicAsset?: string | null, duringDestruction = false, callbackKind?: string): void {
    const component = entity.script2D
    if (!this.canRun(entity) || !component) return
    if (!duringDestruction && functionName !== 'on_destroy' && (this.isRemovalPending(entity) || this.destroying.has(entity.uuid))) return
    const reference = logicAsset === undefined ? component.scriptAsset : logicAsset
    const asset = resolveAsset(reference)
    let source: string | null = null
    try { source = (this.active && asset ? this.compiledSources.get(asset.uuid) : null) ?? this.resolveScriptBundle(asset?.uuid ?? '') } catch (error) { this.reportScriptError(entity, this.errorMessage(error)); return }
    if (!asset || (asset.assetType !== 'script' && asset.assetType !== 'visualScript') || !source) {
      this.reportScriptError(entity, `Missing script or visual graph asset: ${reference ?? 'none'}`)
      return
    }
    let declared = this.declaredFunctions.get(asset.uuid)
    if (!declared || declared.source !== source) {
      declared = { source, names: new Set(Object.keys(analyzeScript(source).functions)), contract: parseScriptContract(source) }
      this.declaredFunctions.set(asset.uuid, declared)
    }
    // A timer-only script must not cross the WASM boundary for three absent
    // per-frame callbacks. Besides avoiding wasted work, this keeps Play
    // responsive on projects with many narrowly scoped scripts.
    if (!declared.names.has(functionName)) return
    const enabledPackages = packageState.installed.filter(item => item.enabled && item.project).map(item => item.manifest.id)
    const contractSignature = `${JSON.stringify(declared.contract.contract)}:${declared.contract.apiUsage.map(value => value.name).join(',')}:${entity.components.map(value => value.kind).sort().join(',')}:${physicsState.inputMap.map(value => value.name).sort().join(',')}:${assetState.generation}:${enabledPackages.sort().join(',')}`
    const contractKey = `${entity.uuid}:${asset.uuid}`
    let contractValidation = this.contractValidations.get(contractKey)
    if (!contractValidation || contractValidation.signature !== contractSignature) {
      const availableAssets = assetState.records.flatMap(item => [item.uuid, item.path])
      const report = validateScriptContract(source, { components: entity.components.map(value => value.kind), inputActions: physicsState.inputMap.map(value => value.name), assets: availableAssets, packages: enabledPackages })
      contractValidation = { signature: contractSignature, error: report.diagnostics.filter(item => item.severity === 'error').map(item => `${item.code} line ${item.line}: ${item.message}`).join(' ') || null }
      this.contractValidations.set(contractKey, contractValidation)
    }
    if (contractValidation.error) { this.reportScriptError(entity, contractValidation.error); return }
    this.ensureScriptRuntime()
    if (!this.scriptRuntime) return
    const executionWorld = this.callbackWorld ?? physicsState.world.entities
    const runtimeTransform = worldTransform(entity, executionWorld)
    const primaryBehavior = resolveAsset(component.scriptAsset)?.uuid === asset.uuid
    const behaviorKey = `${entity.uuid}:${asset.uuid}`
    const context = {
      apiVersion: asset.script?.apiVersion ?? scriptProjectSettings.apiVersion,
      entity: entity.uuid,
      invocationId: ++this.invocationSerial,
      callbackKind: callbackKind ?? functionName,
      entityGenerations: Object.fromEntries(executionWorld.filter(entityLifetimeActive).map(value => [value.uuid, entityLifetimeGeneration(value)])),
      entityName: entity.name,
      components: entity.components.map(value => value.kind),
      entities: Object.fromEntries(executionWorld.filter(entityLifetimeActive).map(value => [value.name, value.uuid])),
      sceneEntities: runtimeSceneEntitySnapshots(executionWorld),
      time: { ...this.time.value },
      randomSeed: Math.floor(deterministicRandom() * 0x1_0000_0000),
      input: this.inputSnapshot,
      contact,
      event,
      properties: primaryBehavior ? component.properties : (this.behaviorProperties.get(behaviorKey) ?? {}),
      save: saveSnapshot(),
      transform: {
        position: [runtimeTransform.position.x, runtimeTransform.position.y],
        rotation: runtimeTransform.rotation,
        scale: [runtimeTransform.scale.x, runtimeTransform.scale.y]
      },
      rigidBody: entity.hasComponent('RigidBody2D') ? {
        velocity: (() => { const character = entity.getComponent<CharacterBody2D>('CharacterBody2D'); return character ? [character.motionVelocity.x, character.motionVelocity.y] : [entity.velocity.x, entity.velocity.y] })(),
        angularVelocity: entity.angularVelocity,
        mass: entity.mass,
        bodyType: entity.isStatic ? 'Static' : entity.isKinematic ? 'Kinematic' : 'Dynamic'
      } : null,
      character: (() => {
        const character = entity.getComponent<CharacterBody2D>('CharacterBody2D')
        return character ? {
          onFloor: character.onFloor, onWall: character.onWall, onCeiling: character.onCeiling,
          canCoyoteJump: canUseCoyoteTime(entity), floorNormal: [character.floorNormal.x, character.floorNormal.y],
          wallNormal: [character.wallNormal.x, character.wallNormal.y], platformVelocity: [character.platformVelocity.x, character.platformVelocity.y]
        } : null
      })(),
      gameFlow: gameFlowSnapshot(),
      networking: productionNetworkContext()
    }
    if (!bypassBreakpoint && scriptProjectSettings.debuggerEnabled && scriptDebugState.enabled && !scriptDebugState.paused) {
      const language = analyzeScript(source), fn = language.functions[functionName], rich = analyzeScript26(source)
      const legacy = (asset.script?.breakpoints ?? []).map((line, index): ScriptBreakpointMetadata => ({ id: `line-${line}-${index}`, line, functionName: '', condition: '', hitCondition: 0, logMessage: '', enabled: true, hitCount: 0 }))
      const details = asset.script?.breakpointDetails?.length ? asset.script.breakpointDetails : legacy
      const breakpoint = details.find(point => point.enabled && fn && point.line >= fn.line && point.line <= fn.endLine && Boolean(statementAtLine(rich, point.line, functionName)) && (!point.functionName || point.functionName === functionName))
      if (breakpoint) {
        breakpoint.hitCount = Math.min(1_000_000_000, breakpoint.hitCount + 1)
        let condition = true
        try { if (breakpoint.condition.trim()) condition = Boolean(evaluateDebugExpression(breakpoint.condition, context)) } catch (error) {
          addEditorLog(`Breakpoint condition error at ${asset.path}:${breakpoint.line}: ${this.errorMessage(error)}`, 'Script', 'error', asset.uuid); condition = false
        }
        if (breakpoint.hitCondition > 0 && breakpoint.hitCount < breakpoint.hitCondition) condition = false
        if (condition && breakpoint.logMessage.trim()) {
          addEditorLog(this.formatLogpoint(breakpoint.logMessage, context), 'Script', 'debug', asset.uuid)
          condition = false
        }
        if (condition) {
        this.pendingDebugInvocation = { entityUuid: entity.uuid, scriptUuid: asset.uuid, functionName, contact, event, logicAsset, callbackKind }
        physicsState.playMode = 'paused'
        pauseScriptDebugger({ entityUuid: entity.uuid, entityName: entity.name, scriptUuid: asset.uuid, sourcePath: asset.path, functionName, line: breakpoint.line, depth: 0 }, context, `Breakpoint at ${asset.path}:${breakpoint.line} · hit ${breakpoint.hitCount}`)
        addEditorLog(`Paused at ${asset.path}:${breakpoint.line}`, 'Script', 'debug', asset.uuid)
        return
        }
      }
    }
    const started = performance.now()
    try {
      this.ensureCompiled(asset.uuid, source)
      const runtime = this.scriptRuntime as unknown as { execute_cached_json(id: string, fn: string, context: string): string }
      const execution = parseScriptExecution(runtime.execute_cached_json(asset.uuid, functionName, JSON.stringify(context)), declared.contract.contract.budgets)
      if (scriptProjectSettings.testing.coverageEnabled) recordScriptCoverage(asset.uuid, source, functionName)
      if (primaryBehavior) component.properties = execution.properties
      else this.behaviorProperties.set(behaviorKey, execution.properties)
      component.lastError = null
      this.diagnostics.lifecycleCalls++
      for (const log of execution.logs) addEditorLog(`${entity.name}: ${log.message}`, 'Script', log.level === 'error' ? 'error' : log.level === 'warning' ? 'warning' : 'info')
      this.processScriptCommands(entity, asset.uuid, asset.path, functionName, execution.commands, 0, !duringDestruction)
    } catch (error) {
      const message = this.errorMessage(error)
      this.reportScriptError(entity, message)
      if (asset.assetType === 'visualScript') recordGraphError(graphDebugState.activeGraphUuid || asset.uuid, graphDebugState.activeNodeUuid, message)
      if (!duringDestruction && scriptProjectSettings.debuggerEnabled && scriptProjectSettings.breakOnRuntimeError && scriptProjectSettings.exceptionPolicy !== 'never') {
        physicsState.playMode = 'paused'
        pauseScriptDebugger({ entityUuid: entity.uuid, entityName: entity.name, scriptUuid: asset.uuid, sourcePath: asset.path, functionName, line: analyzeScript(source).functions[functionName]?.line ?? 1, depth: 0 }, context, `Runtime error: ${this.errorMessage(error)}`)
      }
    } finally {
      recordScriptFunction(asset.uuid, asset.name, functionName, performance.now() - started, source.length * 2 + JSON.stringify(context.properties).length)
    }
  }

  private processScriptCommands(entity: Entity, scriptUuid: string, sourcePath: string, functionName: string, commands: ScriptCommand[], startIndex = 0, allowPause = true): boolean {
    for (let index = Math.max(0, startIndex); index < commands.length; index++) {
      const command = commands[index]
      if (command.type !== 'graphTrace') {
        this.applyCommand(entity, command)
        continue
      }
      const decision = recordGraphTrace(command)
      if (decision.logMessage) addEditorLog(`${entity.name}: ${decision.logMessage}`, 'Script', 'debug', scriptUuid)
      if (decision.pause && (!allowPause || !scriptProjectSettings.debuggerEnabled || !scriptDebugState.enabled)) { clearGraphPause(); continue }
      if (!decision.pause) continue
      this.pendingGraphExecution = { entityUuid: entity.uuid, scriptUuid, sourcePath, functionName, commands, nextIndex: index + 1 }
      physicsState.playMode = 'paused'
      pauseScriptDebugger({ entityUuid: entity.uuid, entityName: entity.name, scriptUuid, sourcePath, functionName, line: 1, depth: command.depth }, command.values && typeof command.values === 'object' ? command.values as Record<string, unknown> : {}, decision.reason)
      addEditorLog(`Paused at visual node ${command.nodeUuid}`, 'Script', 'debug', scriptUuid)
      return false
    }
    return true
  }

  private applyCommand(entity: Entity, command: Exclude<ScriptCommand, GraphTraceCommand>): void {
    const finite = (value: number) => finiteNumber(value, 0)
    if (command.type === 'applyForce' && entity.hasComponent('RigidBody2D') && entity.mass > 0 && !entity.isStatic && !entity.isKinematic) {
      entity.velocity.x += finite(command.x) / entity.mass * this.time.value.fixedDelta
      entity.velocity.y += finite(command.y) / entity.mass * this.time.value.fixedDelta
    } else if (command.type === 'applyImpulse' && entity.hasComponent('RigidBody2D') && entity.mass > 0 && !entity.isStatic && !entity.isKinematic) {
      entity.velocity.x += finite(command.x) / entity.mass
      entity.velocity.y += finite(command.y) / entity.mass
    } else if (command.type === 'setVelocity' && entity.hasComponent('RigidBody2D')) {
      entity.velocity = { x: finite(command.x), y: finite(command.y) }
    } else if (command.type === 'setPosition') {
      const transform = worldTransform(entity, physicsState.world.entities)
      physicsState.world.teleport(entity, { x: finite(command.x), y: finite(command.y) }, transform.rotation)
    } else if (command.type === 'setRotation') {
      const transform = worldTransform(entity, physicsState.world.entities)
      physicsState.world.teleport(entity, transform.position, finite(command.radians))
    } else if (command.type === 'setScale') {
      const transform = worldTransform(entity, physicsState.world.entities)
      setWorldTransform(entity, { ...transform, scale: { x: finite(command.x), y: finite(command.y) } }, physicsState.world.entities)
    } else if (command.type === 'setAngularVelocity' && entity.hasComponent('RigidBody2D')) {
      entity.angularVelocity = finite(command.radiansPerSecond)
    } else if (command.type === 'moveCharacter') {
      queueCharacterMotion(entity, { x: finite(command.x), y: finite(command.y) })
    } else if (command.type === 'animatorSetBool') {
      const animator = entity.getComponent<Animator>('Animator'); if (animator) setAnimatorParameter(animator, command.name, command.value)
    } else if (command.type === 'animatorSetFloat') {
      const animator = entity.getComponent<Animator>('Animator'); if (animator) setAnimatorParameter(animator, command.name, finite(command.value))
    } else if (command.type === 'animatorSetInteger') {
      const animator = entity.getComponent<Animator>('Animator'); if (animator) setAnimatorParameter(animator, command.name, Math.round(finite(command.value)))
    } else if (command.type === 'animatorTrigger') {
      const animator = entity.getComponent<Animator>('Animator'); if (animator) setAnimatorParameter(animator, command.name, true)
    } else if (command.type === 'animatorPlay') {
      const animator = entity.getComponent<Animator>('Animator'); if (animator) animator.currentState = command.state.trim().slice(0, 80)
    } else if (command.type === 'audioPlay') audioRuntime.play(entity, physicsState.world.entities)
    else if (command.type === 'audioPause') audioRuntime.pause(entity)
    else if (command.type === 'audioStop') audioRuntime.stop(entity)
    else if (command.type === 'destroy') this.queueEntityRemoval(entity, false)
    else if (command.type === 'despawn') this.queueEntityRemoval(entity, true)
    else if (command.type === 'instantiate') {
      const transform = worldTransform(entity, physicsState.world.entities)
      this.pendingPrefabs.push({ ...this.commandSource(entity), reference: command.prefab, position: { ...transform.position } })
    } else if (command.type === 'spawnAt' || command.type === 'targetSetPosition' || command.type === 'targetSetRotation' || command.type === 'targetSetScale' || command.type === 'targetSetEnabled' || command.type === 'targetSetComponentEnabled' || command.type === 'targetSetUiText' || command.type === 'targetSetUiValue' || command.type === 'targetAddTag' || command.type === 'targetRemoveTag' || command.type === 'targetAddGroup' || command.type === 'targetRemoveGroup' || command.type === 'targetDestroy') this.pendingDynamicCommands.push({ ...this.commandSource(entity), command })
    else if (command.type === 'loadScene') this.pendingScene = { type: 'load', identifier: command.scene }
    else if (command.type === 'reloadScene') this.pendingScene = { type: 'reload' }
    else if (command.type === 'quit') this.quitRequested = true
    else if (command.type === 'gamePause') setGamePaused(command.paused)
    else if (command.type === 'checkpointSet') { if (!setRuntimeCheckpoint(command.name)) addEditorLog('Checkpoint requires a non-empty name', 'Runtime', 'error') }
    else if (command.type === 'checkpointRestore') { if (!restoreRuntimeCheckpoint(command.name)) addEditorLog(`Checkpoint restore failed: ${command.name}`, 'Runtime', 'error') }
    else if (command.type === 'scoreSet') setRuntimeScore(command.value)
    else if (command.type === 'scoreAdd') addRuntimeScore(command.value)
    else if (command.type === 'sessionSet') { if (!setSessionValue(command.key, command.value)) addEditorLog(`Session value rejected: ${command.key}`, 'Runtime', 'error') }
    else if (command.type === 'inputContextPush') { if (!this.input.pushContext(command.name, command.priority, command.consume)) addEditorLog(`Input context rejected: ${command.name}`, 'Input', 'error') }
    else if (command.type === 'inputContextPop') { if (!this.input.popContext(command.name)) addEditorLog(`Input context is not active: ${command.name}`, 'Input', 'warning') }
    else if (command.type === 'inputMapEnable') { if (!this.input.enableMap(command.name)) addEditorLog(`Input map rejected: ${command.name}`, 'Input', 'error') }
    else if (command.type === 'inputMapDisable') { if (!this.input.disableMap(command.name)) addEditorLog(`Input map cannot be disabled: ${command.name}`, 'Input', 'warning') }
    else if (command.type === 'inputSchemeSet') { if (!this.input.setScheme(command.name)) addEditorLog('Input scheme requires a name', 'Input', 'error') }
    else if (command.type === 'startTimer') { if (!this.time.start(entity.uuid, command.name, command.seconds, command.repeat)) addEditorLog(`${entity.name}: timer rejected by name, duration or queue limit`, 'Script', 'error') }
    else if (command.type === 'pauseTimer') this.time.pause(entity.uuid, command.name)
    else if (command.type === 'resumeTimer') this.time.resume(entity.uuid, command.name)
    else if (command.type === 'cancelTimer') this.time.cancel(entity.uuid, command.name)
    else if (command.type === 'startTask') { const accepted = this.time.startTask(entity.uuid, command.name, command.seconds); updateDebugTask({ id: `${entity.uuid}:${command.name}`, name: command.name, state: accepted ? 'waiting' : 'failed', entityUuid: entity.uuid, detail: accepted ? `Waiting ${command.seconds.toFixed(3)} s` : 'Task rejected by name, duration or queue limit' }) }
    else if (command.type === 'cancelTask') { this.time.cancelTask(entity.uuid, command.name); updateDebugTask({ id: `${entity.uuid}:${command.name}`, name: command.name, state: 'cancelled', entityUuid: entity.uuid, detail: 'Cancelled by script' }) }
    else if (command.type === 'emitSignal') this.emitSignal(command.name, command.payload, command.target, entity.uuid)
    else if (command.type === 'saveSet') setSaveValue(command.key, command.value)
    else if (command.type === 'saveDelete') deleteSaveValue(command.key)
    else if (command.type === 'saveClear') clearSaveValues()
    else if (command.type === 'saveLoad') loadSaveSlot(command.slot)
    else if (command.type === 'saveCommit' && !commitSaveSlot(command.slot)) addEditorLog('Save commit failed', 'Save', 'error')
    else if (command.type === 'uiSetText') {
      const text = entity.getComponent<UIText>('Text') ?? entity.getComponent<TextRenderer2D>('TextRenderer2D')
      if (text) text.text = command.text
      else addEditorLog(`${entity.name}: ui_set_text requires Text or TextRenderer2D`, 'Script', 'error', entity.script2D?.scriptAsset ?? undefined)
    } else if (command.type === 'uiSetValue') {
      const slider = entity.getComponent<Slider>('Slider'), progress = entity.getComponent<ProgressBar>('ProgressBar'), checkbox = entity.getComponent<Checkbox>('Checkbox')
      if (slider) slider.value = Math.min(slider.max, Math.max(slider.min, finite(command.value)))
      else if (progress) progress.value = Math.min(progress.max, Math.max(progress.min, finite(command.value)))
      else if (checkbox) checkbox.checked = finite(command.value) >= .5
      else addEditorLog(`${entity.name}: ui_set_value requires Slider, ProgressBar, or Checkbox`, 'Script', 'error', entity.script2D?.scriptAsset ?? undefined)
    } else if (command.type === 'navigationSetTarget') {
      const agent = entity.getComponent<NavigationAgent2D>('NavigationAgent2D')
      if (agent) { agent.targetPosition = { x: finite(command.x), y: finite(command.y) }; agent.targetEntityUuid = null; agent.pathStatus = 'Idle'; agent.path = []; agent.pathIndex = 0 }
      else addEditorLog(`${entity.name}: navigation_set_target requires NavigationAgent2D`, 'Script', 'error', entity.script2D?.scriptAsset ?? undefined)
    } else if (command.type === 'networkRpc' && !callProductionRpc(command.name, command.payload)) addEditorLog(`${entity.name}: network_rpc rejected by permission, connection, authority, schema, or rate policy`, 'Runtime', 'error', entity.script2D?.scriptAsset ?? undefined)
    normalizeEntity(entity)
  }

  private flushDynamicCommands(): void {
    let spawned = false
    const batch = this.pendingDynamicCommands.splice(0, MAX_SCRIPT_BRIDGE_COMMANDS)
    for (const entry of batch) {
      if (!this.commandSourceActive(entry)) continue
      const { sourceUuid, command } = entry
      if (command.type === 'spawnAt') {
        const root = spawnRuntimePrefab(command.prefab, { position: { x: command.x, y: command.y }, rotation: command.rotation, scale: { x: command.scaleX, y: command.scaleY } }, false)
        if (!root) { addEditorLog(`Spawn failed for ${command.prefab} (requested by ${sourceUuid})`, 'Runtime', 'error'); continue }
        spawned = true
        if (this.pendingHandleResolutions.size >= 10_000) { const oldest = this.pendingHandleResolutions.keys().next().value; if (oldest) this.pendingHandleResolutions.delete(oldest) }
        this.pendingHandleResolutions.set(command.pendingId, { uuid: root.uuid, generation: entityLifetimeGeneration(root) })
        this.emitSignal('entity.spawned', { entity: root.uuid, pending: command.pendingId }, root.uuid, sourceUuid)
        continue
      }
      if (!('target' in command) || !('generation' in command)) continue
      const handle: RuntimeEntityHandle = { id: command.target, generation: command.generation }
      const target = resolveRuntimeHandle(handle, this.pendingHandleResolutions); if (!target) continue
      if (this.isRemovalPending(target)) continue
      let mutation: TargetMutation | null = null
      if (command.type === 'targetSetPosition') mutation = { type: 'position', x: command.x, y: command.y }
      else if (command.type === 'targetSetRotation') mutation = { type: 'rotation', radians: command.radians }
      else if (command.type === 'targetSetScale') mutation = { type: 'scale', x: command.x, y: command.y }
      else if (command.type === 'targetSetEnabled') mutation = { type: 'enabled', enabled: command.enabled }
      else if (command.type === 'targetSetComponentEnabled') mutation = { type: 'componentEnabled', component: command.component, enabled: command.enabled }
      else if (command.type === 'targetSetUiText') mutation = { type: 'uiText', text: command.text }
      else if (command.type === 'targetSetUiValue') mutation = { type: 'uiValue', value: command.value }
      else if (command.type === 'targetAddTag' || command.type === 'targetRemoveTag') mutation = { type: command.type === 'targetAddTag' ? 'addTag' : 'removeTag', value: command.tag }
      else if (command.type === 'targetAddGroup' || command.type === 'targetRemoveGroup') mutation = { type: command.type === 'targetAddGroup' ? 'addGroup' : 'removeGroup', value: command.group }
      else if (command.type === 'targetDestroy') { this.queueEntityRemoval(target, false); continue }
      if (mutation) applyTargetMutation(target, mutation)
    }
    if (spawned) physicsState.world.invalidateRuntime()
    const living = new Set(physicsState.world.entities.map(entity => entity.uuid))
    for (const [pending, resolved] of this.pendingHandleResolutions) if (!living.has(resolved.uuid)) this.pendingHandleResolutions.delete(pending)
  }

  private commandSource(entity: Entity) { return { sourceUuid: entity.uuid, sourceGeneration: entityLifetimeGeneration(entity), allowRetiredSource: this.destroying.has(entity.uuid) } }
  private commandSourceActive(source: { sourceUuid: string; sourceGeneration: number; allowRetiredSource: boolean }): boolean {
    return source.allowRetiredSource || physicsState.world.entities.some(entity => entity.uuid === source.sourceUuid && inspectEntityLifetimeGeneration(entity) === source.sourceGeneration)
  }
  private queueEntityRemoval(entity: Entity, despawn: boolean): void { (despawn ? this.pendingDespawn : this.pendingDestroy).set(entity.id, entityLifetimeGeneration(entity)) }
  private isRemovalPending(entity: Entity): boolean { const generation = inspectEntityLifetimeGeneration(entity); return generation !== null && (this.pendingDestroy.get(entity.id) === generation || this.pendingDespawn.get(entity.id) === generation) }

  private flushEntityCommands(): void {
    this.flushDynamicCommands()
    for (const [id, generation] of [...this.pendingDespawn].slice(0, MAX_SCRIPT_BRIDGE_COMMANDS)) {
      this.pendingDespawn.delete(id)
      const entity = physicsState.world.entities.find(candidate => candidate.id === id)
      if (entity && inspectEntityLifetimeGeneration(entity) === generation && !releasePooled(entity)) this.queueEntityRemoval(entity, false)
    }
    const pending = [...this.pendingDestroy].slice(0, MAX_SCRIPT_BRIDGE_COMMANDS)
    for (const [id, generation] of pending) {
      this.pendingDestroy.delete(id)
      const entity = physicsState.world.entities.find(candidate => candidate.id === id)
      if (!entity || inspectEntityLifetimeGeneration(entity) !== generation || this.destroying.has(entity.uuid)) continue
      const doomed = subtreeEntities([id], physicsState.world.entities)
      for (const candidate of doomed) this.destroying.add(candidate.uuid)
      for (const candidate of doomed) {
        this.runDestructionCallbacks(candidate)
        this.clearEntityRuntimeState(candidate)
        retireEntityLifetime(candidate)
      }
      deleteEntity(id)
      for (const candidate of doomed) this.destroying.delete(candidate.uuid)
    }
    for (const request of this.pendingPrefabs.splice(0, MAX_SCRIPT_BRIDGE_COMMANDS)) if (this.commandSourceActive(request)) {
      if (!acquirePooled(request.reference, request.position)) {
        if (hasObjectPool(request.reference)) addEditorLog(`Object pool capacity unavailable for ${request.reference}; spawn was refused.`, 'Runtime', 'warning')
        else instantiatePrefab(request.reference, request.position, false)
      }
    }
    this.ensureLifecycle()
  }

  private flushStructuralCommands(): void {
    this.flushEntityCommands()
    const scene = this.pendingScene
    this.pendingScene = null
    if (!scene) return
    const before = [...physicsState.world.entities]
    let transaction: ReturnType<typeof prepareRuntimeSceneTransition>
    try { transaction = prepareRuntimeSceneTransition(scene.type === 'load' ? scene.identifier : undefined) }
    catch (error) { addEditorLog(`Runtime scene preparation failed: ${this.errorMessage(error)}`, 'Runtime', 'error'); return }
    if (!transaction.commit()) { addEditorLog(`Runtime scene transition failed: ${transaction.error ?? 'Commit rejected'}`, 'Runtime', 'error'); return }
    const retained = new Set(transaction.preservedEntityUuids), unloading = before.filter(entity => !retained.has(entity.uuid))
    this.pendingDestroy.clear()
    this.pendingDespawn.clear()
    this.pendingPrefabs = []
    this.pendingDynamicCommands = []
    // Accepted transitions run outgoing callbacks against their original context;
    // a failed installation never destroys instances or consumes their timers.
    this.callbackWorld = before
    try { this.emitSignal('scene.unloading', { type: scene.type }, '', 'runtime'); this.dispatchSignals() }
    finally { this.callbackWorld = null }
    for (const entity of unloading) this.destroying.add(entity.uuid)
    for (const entity of unloading) { this.runDestructionCallbacks(entity, before); this.clearEntityRuntimeState(entity); retireEntityLifetime(entity) }
    for (const entity of unloading) this.destroying.delete(entity.uuid)
    const living = new Set(physicsState.world.entities.map(entity => entity.uuid))
    for (const [pending, resolved] of this.pendingHandleResolutions) if (!living.has(resolved.uuid)) this.pendingHandleResolutions.delete(pending)
    for (const uuid of [...this.awakened]) if (!living.has(uuid)) this.awakened.delete(uuid)
    for (const uuid of [...this.started]) if (!living.has(uuid)) this.started.delete(uuid)
    beginGameplayComponents(physicsState.world.entities)
    const sessionGeneration = ++this.sessionGeneration
    void beginWorldGameplay((name, payload, target, source) => this.emitSignal(name, payload, target, source), () => this.active && this.sessionGeneration === sessionGeneration)
    this.diagnostics.sceneSwitches++
    this.ensureLifecycle()
    this.emitSignal('scene.loaded', { type: scene.type }, '', 'runtime')
    addEditorLog(`Runtime scene ${scene.type === 'reload' ? 'reloaded' : 'loaded'}`, 'Runtime')
  }

  private dispatchPhysicsEvents(events: RuntimePhysicsEvent[]): void {
    processGameplayContacts(events, physicsState.world.entities, (name, payload, target, source) => this.emitSignal(name, payload, target, source), (target, despawn) => this.queueEntityRemoval(target, despawn))
    for (const event of events) {
      if (!event.firstEntityUuid || !event.secondEntityUuid) continue
      const first = physicsState.world.entities.find(entity => entity.uuid === event.firstEntityUuid)
      const second = physicsState.world.entities.find(entity => entity.uuid === event.secondEntityUuid)
      if (!first || !second) continue
      const functionName = event.type === 'collisionStarted' ? 'on_collision_enter'
        : event.type === 'collisionStayed' ? 'on_collision_stay'
          : event.type === 'collisionEnded' ? 'on_collision_exit'
            : event.type === 'triggerEntered' ? 'on_trigger_enter'
              : event.type === 'triggerStayed' ? 'on_trigger_stay'
                : event.type === 'triggerExited' ? 'on_trigger_exit' : null
      if (!functionName) continue
      const point = event.point ?? [
        (worldTransform(first, physicsState.world.entities).position.x + worldTransform(second, physicsState.world.entities).position.x) * .5,
        (worldTransform(first, physicsState.world.entities).position.y + worldTransform(second, physicsState.world.entities).position.y) * .5
      ]
      const normal = event.normal ?? [0, 0]
      const relative = event.relativeVelocity ?? [0, 0]
      this.runEntityFunction(first, functionName, { otherEntity: second.uuid, point, normal, relativeVelocity: relative })
      const sheetKind = event.type === 'collisionStarted' ? 'collision-enter' : event.type === 'collisionStayed' ? 'collision-stay' : event.type === 'collisionEnded' ? 'collision-exit' : event.type === 'triggerEntered' ? 'trigger-enter' : event.type === 'triggerStayed' ? 'trigger-stay' : 'trigger-exit'
      this.runEventSheetHandlers(first, sheetKind, '', functionName, { otherEntity: second.uuid, point, normal, relativeVelocity: relative })
      this.runEntityFunction(second, functionName, {
        otherEntity: first.uuid,
        point,
        normal: [-normal[0], -normal[1]],
        relativeVelocity: [-relative[0], -relative[1]]
      })
      this.runEventSheetHandlers(second, sheetKind, '', functionName, { otherEntity: first.uuid, point, normal: [-normal[0], -normal[1]], relativeVelocity: [-relative[0], -relative[1]] })
      const signal = functionName.replace(/^on_/, 'physics.')
      this.emitSignal(signal, { other: second.uuid, point, normal, relativeVelocity: relative }, first.uuid, second.uuid)
      this.emitSignal(signal, { other: first.uuid, point, normal: [-normal[0], -normal[1]], relativeVelocity: [-relative[0], -relative[1]] }, second.uuid, first.uuid)
    }
    this.flushEntityCommands()
  }

  private canRun(entity: Entity): boolean {
    const script = entity.script2D
    return entity.enabled && entityLifetimeActive(entity) && !!script && script.enabled && !script.removed
  }

  private clearEntityRuntimeState(entity: Entity): void {
    this.time.removeEntity(entity.uuid); this.awakened.delete(entity.uuid); this.started.delete(entity.uuid)
    for (const key of this.behaviorProperties.keys()) if (key.startsWith(`${entity.uuid}:`)) this.behaviorProperties.delete(key)
    for (const key of this.contractValidations.keys()) if (key.startsWith(`${entity.uuid}:`)) this.contractValidations.delete(key)
    this.pendingSignals = this.pendingSignals.filter(signal => signal.target !== entity.uuid)
    if (this.pendingDebugInvocation?.entityUuid === entity.uuid) this.pendingDebugInvocation = null
    if (this.pendingGraphExecution?.entityUuid === entity.uuid) this.pendingGraphExecution = null
  }

  private latchFixedInput(snapshot: InputSnapshot): void {
    for (const [name, active] of Object.entries(snapshot.pressed)) if (active) this.fixedPressed[name] = true
    for (const [name, active] of Object.entries(snapshot.released)) if (active) this.fixedReleased[name] = true
  }

  private reportScriptError(entity: Entity, message: string): void {
    const component = entity.script2D
    if (!component) return
    if (component.lastError !== message) addEditorLog(`${entity.name}: ${message}`, 'Script', 'error', component.scriptAsset ?? undefined)
    component.lastError = message
    this.diagnostics.scriptErrors++
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    return String(error).replace(/^JsValue\((.*)\)$/s, '$1')
  }

  private compileAttachedScripts(): void {
    for (const entity of physicsState.world.entities) {
      const references = new Set([entity.script2D?.scriptAsset, ...resolveEventHandlers(entity.script2D?.eventSheetAsset).map(handler => handler.logicAsset)])
      for (const reference of references) {
      const uuid = resolveAsset(reference)?.uuid
      if (!uuid) continue
      try {
        const source = this.resolveScriptBundle(uuid)
        if (source) this.ensureCompiled(uuid, source)
      } catch (error) {
        this.reportScriptError(entity, this.errorMessage(error))
      }
      }
    }
  }

  private ensureCompiled(scriptUuid: string, source: string, candidateDocument?: string): ExportedProperty[] {
    const registerCompiledGraph = (): void => { const asset = resolveAsset(scriptUuid); if (asset?.assetType === 'visualScript') { const document = this.compiledDocuments.get(scriptUuid); if (document !== undefined) registerGraphDebugDocument(document) } }
    if (this.compiledSources.get(scriptUuid) === source) { registerCompiledGraph(); return [] }
    if (!this.scriptRuntime) throw new Error('Script runtime is unavailable')
    const documents = new Map<string, string>()
    if (this.resolveScriptBundle(scriptUuid, candidateDocument === undefined ? new Map() : new Map([[scriptUuid, candidateDocument]]), documents) !== source) throw Error('Script module source changed before compilation; retry the candidate.')
    const contract = parseScriptContract(source)
    if (!contract.valid) throw new Error(contract.diagnostics.filter(item => item.severity === 'error').map(item => `${item.code} line ${item.line}: ${item.message}`).join(' '))
    const runtime = this.scriptRuntime as unknown as { compile_cached(id: string, source: string): string }
    const exports = JSON.parse(runtime.compile_cached(scriptUuid, source)) as ExportedProperty[]
    this.compiledExports.set(scriptUuid, exports)
    this.compiledSources.set(scriptUuid, source)
    this.compiledModuleDocuments.set(scriptUuid, documents)
    const document = candidateDocument ?? readTextAsset(scriptUuid)
    if (document !== null && document !== undefined) this.compiledDocuments.set(scriptUuid, document)
    this.declaredFunctions.set(scriptUuid, { source, names: new Set(Object.keys(analyzeScript(source).functions)), contract })
    for (const key of this.contractValidations.keys()) if (key.endsWith(`:${scriptUuid}`)) this.contractValidations.delete(key)
    registerCompiledGraph()
    return exports
  }

  private flushHotReloads(): void {
    const queued = new Map(this.pendingReloads); this.pendingReloads.clear()
    const rollbackHistory = new Map(this.pendingRollbackHistory); this.pendingRollbackHistory.clear()
    if (!queued.size) return
    const requestedUuid = queued.keys().next().value!
    if (!scriptProjectSettings.hotReloadEnabled) {
      scriptDebugState.hotReload = { status: 'disabled', scriptUuid: requestedUuid, message: 'Project hot reload was disabled before the queued frame-boundary apply.', frame: this.time.value.frame }
      return
    }
    const plans: ReturnType<typeof prepareHotReload>[] = []
    let candidateRuntime: WasmScriptRuntime | null = null
    let replacedRuntime: WasmScriptRuntime | null = null
    let committed = false
    try {
      const affected = new Set(queued.keys())
      for (const [root, documents] of this.compiledModuleDocuments) if ([...queued.keys()].some(uuid => documents.has(uuid))) affected.add(root)
      const priorDocuments = new Map<string, string>()
      for (const documents of this.compiledModuleDocuments.values()) for (const [uuid, raw] of documents) if (!priorDocuments.has(uuid)) priorDocuments.set(uuid, raw)
      const candidates = new Map<string, { source: string; previousSource: string; previousDocument: string; documents: Map<string, string>; contract: ScriptContractReport; names: Set<string>; recreate: boolean; exports: ExportedProperty[] }>()
      for (const uuid of affected) {
        const asset = resolveAsset(uuid)
        if (!asset) throw Error(`Reload asset is missing: ${uuid}`)
        if (asset.script?.reloadPolicy === 'disabled') throw Error(`${asset.name} opted out of hot reload; the entire dependent transaction was retained.`)
        const overrides = new Map(this.compiledModuleDocuments.get(uuid) ?? priorDocuments)
        for (const [changed, raw] of queued) overrides.set(changed, raw)
        const documents = new Map<string, string>(), source = this.resolveScriptBundle(uuid, overrides, documents)
        if (!source) throw Error(`Reload module cannot be resolved: ${asset.name}`)
        const contract = parseScriptContract(source)
        if (!contract.valid) throw Error(contract.diagnostics.filter(item => item.severity === 'error').map(item => item.message).join(' '))
        const previousSource = this.compiledSources.get(uuid) ?? this.resolveScriptBundle(uuid, priorDocuments) ?? source
        candidates.set(uuid, { source, previousSource, previousDocument: this.compiledDocuments.get(uuid) ?? priorDocuments.get(uuid) ?? readTextAsset(uuid) ?? previousSource, documents, contract, names: new Set(Object.keys(analyzeScript(source).functions)), recreate: asset.script?.reloadPolicy === 'recreate', exports: [] })
      }
      // A separate complete cache is prepared; one failed compile cannot replace any live AST.
      const nextSources = new Map(this.compiledSources)
      for (const [uuid, candidate] of candidates) nextSources.set(uuid, candidate.source)
      candidateRuntime = new WasmScriptRuntime()
      for (const [uuid, source] of nextSources) {
        const exports = JSON.parse(candidateRuntime.compile_cached(uuid, source)) as ExportedProperty[]
        const candidate = candidates.get(uuid)
        if (candidate) candidate.exports = exports
      }
      for (const [uuid, candidate] of candidates) {
        const previous = this.validateSource(candidate.previousSource)
        if (previous.error) throw Error(previous.error)
        const plan = prepareHotReload(uuid, candidate.previousSource, candidate.source, previous.exports, candidate.exports, resolveAsset(uuid)?.script?.reloadPolicy ?? 'preserve')
        plans.push(plan)
        if (plan.classification === 'rejected' || plan.classification === 'restart-required') throw Error(`${plan.classification === 'restart-required' ? 'Restart required: ' : ''}${plan.reasons.join(' ')}`)
      }
      // Prepare all primary and inherited state transfers before publishing the candidate VM.
      const transfers = [...candidates].flatMap(([uuid, candidate]) => physicsState.world.entities.flatMap(entity => {
          const component = entity.script2D
          if (!component) return []
          const primary = resolveAsset(component.scriptAsset)?.uuid === uuid, key = `${entity.uuid}:${uuid}`
          if (!primary && !this.behaviorProperties.has(key)) return []
          const previous = primary ? component.properties : this.behaviorProperties.get(key)!
          const properties = Object.fromEntries(candidate.exports.map(exported => [exported.name, this.exportValue(exported, candidate.recreate ? undefined : previous[exported.name])]))
          const metadata = Object.fromEntries(candidate.exports.map(exported => [exported.name, { ...exported, defaultValue: exported.defaultValue ?? exported.value }]))
          return [{ entity, component, primary, key, properties, metadata, recreate: candidate.recreate }]
      }))
      replacedRuntime = this.scriptRuntime
      this.scriptRuntime = candidateRuntime; candidateRuntime = null; this.compiledSources = nextSources; committed = true
      for (const [uuid, candidate] of candidates) {
        this.compiledExports.set(uuid, candidate.exports)
        this.compiledModuleDocuments.set(uuid, candidate.documents)
        this.compiledDocuments.set(uuid, candidate.documents.get(uuid)!)
        this.declaredFunctions.set(uuid, { source: candidate.source, names: candidate.names, contract: candidate.contract })
        for (const key of this.contractValidations.keys()) if (key.endsWith(`:${uuid}`)) this.contractValidations.delete(key)
        if (this.pendingDebugInvocation?.scriptUuid === uuid) this.pendingDebugInvocation = null
        if (this.pendingGraphExecution?.scriptUuid === uuid) this.pendingGraphExecution = null
      }
      for (const transfer of transfers) {
        if (transfer.primary) { transfer.component.propertyMetadata = transfer.metadata; transfer.component.properties = transfer.properties }
        else this.behaviorProperties.set(transfer.key, transfer.properties)
        if (transfer.recreate) { this.awakened.delete(transfer.entity.uuid); this.started.delete(transfer.entity.uuid) }
      }
      for (const plan of plans) commitHotReload(plan, candidates.get(plan.scriptUuid)!.previousDocument)
      for (const historyId of rollbackHistory.values()) completeHotReloadRollback(historyId)
      for (const [uuid, candidate] of candidates) if (resolveAsset(uuid)?.assetType === 'visualScript') registerGraphDebugDocument(candidate.documents.get(uuid)!)
      const message = `Applied one VM transaction for ${candidates.size} affected scripts with compatible state retained.`
      scriptDebugState.hotReload = { status: 'applied', scriptUuid: requestedUuid, message, frame: this.time.value.frame }
      addEditorLog(message, 'Script', 'debug', requestedUuid)
    } catch (error) {
      const message = committed ? `Hot reload committed, but post-commit bookkeeping failed: ${this.errorMessage(error)}` : `Hot reload rejected; previous valid programs retained: ${this.errorMessage(error)}`
      if (!committed) for (const plan of plans) rejectHotReload(plan, message)
      scriptDebugState.hotReload = { status: committed ? 'applied' : 'rejected', scriptUuid: requestedUuid, message, frame: this.time.value.frame }
      addEditorLog(message, 'Script', 'error', requestedUuid)
    } finally {
      try { candidateRuntime?.free() } catch (error) { addEditorLog(`Rejected script VM cleanup failed: ${this.errorMessage(error)}`, 'Script', 'error') }
      try { replacedRuntime?.free() } catch (error) { addEditorLog(`Replaced script VM cleanup failed: ${this.errorMessage(error)}`, 'Script', 'error') }
    }
  }

  private dispatchSignals(): void {
    const batch = this.pendingSignals.splice(0)
    for (const signal of batch) {
      scriptDebugState.lastSignal = { name: signal.name, source: signal.source, target: signal.target }
      const signalWorld = this.callbackWorld ?? physicsState.world.entities
      const recipients = signal.target ? signalWorld.filter(entity => entity.uuid === signal.target) : signalWorld
      for (const entity of recipients) {
        this.runEntityFunction(entity, 'on_signal', undefined, signal)
        const eventKind: ObjectEventKind = signal.name.startsWith('ui.') ? 'ui' : signal.name.startsWith('animation.') ? 'animation' : signal.name.startsWith('network.') ? 'network' : 'signal'
        const dispatched = this.runEventSheetHandlers(entity, eventKind, signal.name.replace(/^(?:ui|animation|network)\./, ''), 'on_signal', undefined, signal, signal.deliveredCallbacks)
        const asset = resolveAsset(entity.script2D?.scriptAsset ?? '')
        for (const connection of asset?.script?.signalConnections ?? []) {
          if (!connection.enabled || connection.signal !== signal.name) continue
          if (connection.source && connection.source !== signal.source) continue
          if (connection.target && connection.target !== entity.uuid) continue
          const key = JSON.stringify([asset!.uuid, connection.callback])
          if (!dispatched.has(key)) { dispatched.add(key); this.runEntityFunction(entity, connection.callback, undefined, signal) }
        }
      }
    }
  }

  private dispatchTimerExpirations(expired: readonly TimerExpiration[]): void {
    for (const timer of expired) {
      if (!this.time.consumeExpiration(timer)) continue
      const entity = physicsState.world.entities.find(candidate => candidate.uuid === timer.entityUuid)
      if (entity && timer.kind === 'timer') { this.runEntityFunction(entity, 'on_timer', undefined, { name: timer.name, source: entity.uuid, payload: null }); this.runEventSheetHandlers(entity, 'timer', timer.name, 'on_timer', undefined, { name: timer.name, source: entity.uuid, payload: null }) }
      else if (entity) { updateDebugTask({ id: `${entity.uuid}:${timer.name}`, name: timer.name, state: 'completed', entityUuid: entity.uuid, detail: `Completed at frame ${this.time.value.frame}` }); this.runEntityFunction(entity, 'on_task', undefined, { name: timer.name, source: entity.uuid, payload: null }); this.runEventSheetHandlers(entity, 'task', timer.name, 'on_task', undefined, { name: timer.name, source: entity.uuid, payload: null }) }
    }
  }

  private resolveScriptBundle(scriptUuid: string, overrides = new Map<string, string>(), documents?: Map<string, string>): string | null {
    return resolveProjectScriptBundle(scriptUuid, {
      resolveAsset: reference => { const asset = resolveAsset(reference) ?? assetState.records.find(candidate => candidate.path === reference); return asset && (asset.assetType === 'script' || asset.assetType === 'visualScript') ? { uuid: asset.uuid, path: asset.path, assetType: asset.assetType } : null },
      readSource: uuid => { const raw = overrides.get(uuid) ?? readTextAsset(uuid); if (raw !== null) documents?.set(uuid, raw); return raw },
      compileVisual: executableGraphSource
    })
  }

  private serializable(value: unknown): unknown {
    try { return JSON.parse(JSON.stringify(value)) } catch { return null }
  }

  private exportValue(exported: ExportedProperty, previous: unknown): ScriptPropertyValue {
    const fallback = exported.defaultValue ?? exported.value
    const clone = (value: ScriptPropertyValue): ScriptPropertyValue => JSON.parse(JSON.stringify(value)) as ScriptPropertyValue
    if (previous === undefined || previous === null && fallback !== null || typeof previous !== typeof fallback || Array.isArray(previous) !== Array.isArray(fallback)) return clone(fallback)
    if (typeof previous === 'number') {
      if (!Number.isFinite(previous)) return Number(fallback)
      return Math.min(exported.maximum ?? Number.MAX_VALUE, Math.max(exported.minimum ?? -Number.MAX_VALUE, previous))
    }
    if (typeof previous === 'string' && exported.enumValues?.length && !exported.enumValues.includes(previous)) return String(fallback)
    try { return clone(previous as ScriptPropertyValue) } catch { return clone(fallback) }
  }

  private formatLogpoint(template: string, context: Record<string, unknown>): string {
    return template.slice(0, 1_024).replace(/\{([A-Za-z_][A-Za-z0-9_.]*)\}/g, (_match, path: string) => {
      try { const value = evaluateDebugExpression(path, context); return typeof value === 'string' ? value : JSON.stringify(value) } catch { return `<${path}: unavailable>` }
    })
  }
}

export const gameplayRuntime = new GameplayRuntime()

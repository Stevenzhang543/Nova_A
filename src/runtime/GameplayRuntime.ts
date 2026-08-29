import { readTextAsset, resolveAsset, updateTextAsset } from '../assets/AssetDatabase'
import { addEditorLog, editorState } from '../store/editor'
import {
  deleteEntity,
  physicsState,
  sceneManager,
  runtimeLoadScene,
  runtimeReloadScene,
  stopPlayMode
} from '../store/physics'
import { finiteNumber, normalizeEntity } from '../world/geometry'
import type { Entity } from '../world/Entity'
import type { Animator, AudioSource, Checkbox, NavigationAgent2D, ProgressBar, ScriptPropertyValue, Slider, Text as UIText, TextRenderer2D, TimelinePlayer } from '../world/components'
import { worldTransform, setWorldTransform } from '../world/hierarchy'
import type { RuntimePhysicsEvent } from '../world/World'
import { instantiatePrefab } from './prefabs'
import { InputManager, type InputSnapshot } from './input'
import { RuntimeTime } from './time'
import { WasmScriptRuntime } from '../../nova_core/pkg/nova_core.js'
import { subtreeEntities } from '../editor/selection'
import { animationRuntime, setAnimatorParameter } from './animation'
import { timelineRuntime } from './timeline'
import { audioRuntime } from './audio'
import { particleRuntime } from './particles'
import { clearSaveValues, commitSaveSlot, deleteSaveValue, loadSaveSlot, saveSnapshot, setSaveValue, useSaveProject, type SaveValue } from './saveGame'
import { pluginRuntime } from './plugins'
import { analyzeScript } from '../editor/scriptLanguage'
import { beginDebugSession, clearScriptDebugger, evaluateDebugExpression, pauseScriptDebugger, requestDebugStep, scriptDebugState, updateDebugTask, type DebugStepMode, type ScriptTestResult } from './scriptDebug'
import { scriptProjectSettings } from './scriptSettings'
import { beforeWorldPhysicsStep, beginWorldGameplay, canUseCoyoteTime, queueCharacterMotion, resetWorldGameplay } from './worldGameplay'
import { acquirePooled, releasePooled } from './objectPool'
import type { CharacterBody2D } from '../world/components'
import { completeReplayFixedStep, deterministicRandom, replayFixedInput, resetDeterministicSeed } from './replay'
import { beginProductionRuntime, callProductionRpc, onProductionRpc, productionNetworkContext, stopProductionRuntime, updateProductionRuntime } from './productionRuntime'
import { recordScriptFunction } from './profiler'
import type { ScriptBreakpointMetadata } from '../assets/types'
import { commitHotReload, prepareHotReload, rejectHotReload, rollbackHotReload as restoreHotReloadSource } from './scriptHotReload'
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
import { applyTargetMutation, resolveRuntimeHandle, runtimeSceneEntitySnapshots, spawnRuntimePrefab, type RuntimeEntityHandle, type TargetMutation } from './dynamicObjects'
import { addRuntimeScore, gameFlowSnapshot, resetGameFlow, restoreRuntimeCheckpoint, setGamePaused, setRuntimeCheckpoint, setRuntimeScore, setSessionValue } from './gameFlow'
import { beginGameplayComponents, processGameplayContacts, updateGameplayComponents } from './gameplayComponents'
import { activeGameCamera, gameScreenToWorld, visibleWorldBounds } from '../renderer/sceneRenderer'

type LifecycleFunction = 'awake' | 'start' | 'fixed_update' | 'update' | 'late_update' | 'on_destroy' | 'on_timer' | 'on_task' | 'on_signal'

interface ScriptExecution {
  commands: ScriptCommand[]
  logs: Array<{ level: string; message: string }>
  properties: Record<string, ScriptPropertyValue>
}

const MAX_SCRIPT_BRIDGE_BYTES = 16 * 1024 * 1024
const MAX_SCRIPT_BRIDGE_COMMANDS = 4_096
const MAX_SCRIPT_BRIDGE_LOGS = 512

function parseScriptExecution(source: string): ScriptExecution {
  if (source.length > MAX_SCRIPT_BRIDGE_BYTES) throw new Error('Script result exceeded the 16 MB host-bridge limit.')
  const value = JSON.parse(source) as Partial<ScriptExecution> | null
  if (!value || !Array.isArray(value.commands) || !Array.isArray(value.logs) || !value.properties || typeof value.properties !== 'object' || Array.isArray(value.properties)) throw new Error('Script result did not match the host-bridge contract.')
  if (value.commands.length > MAX_SCRIPT_BRIDGE_COMMANDS) throw new Error(`Script emitted more than ${MAX_SCRIPT_BRIDGE_COMMANDS} commands in one invocation.`)
  if (value.logs.length > MAX_SCRIPT_BRIDGE_LOGS) throw new Error(`Script emitted more than ${MAX_SCRIPT_BRIDGE_LOGS} log entries in one invocation.`)
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
interface RuntimeSignal extends ScriptEvent { target: string }
interface PendingDebugInvocation { entityUuid: string; functionName: string; contact?: ScriptContact; event?: ScriptEvent }
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
  readonly diagnostics: RuntimeDiagnostics = { scripts: 0, scriptErrors: 0, lifecycleCalls: 0, activeTimers: 0, sceneSwitches: 0, timings: { inputMs: 0, physicsMs: 0, scriptsMs: 0, animationMs: 0, audioMs: 0, assetsMs: 0 } }
  private scriptRuntime: WasmScriptRuntime | null = null
  private active = false
  private awakened = new Set<string>()
  private started = new Set<string>()
  private destroying = new Set<string>()
  private inputSnapshot: InputSnapshot = EMPTY_INPUT
  private fixedPressed: Record<string, boolean> = {}
  private fixedReleased: Record<string, boolean> = {}
  private pendingDestroy = new Set<number>()
  private pendingPrefabs: Array<{ reference: string; position: { x: number; y: number } }> = []
  private pendingDynamicCommands: Array<{ sourceUuid: string; command: Exclude<ScriptCommand, GraphTraceCommand> }> = []
  private pendingHandleResolutions = new Map<string, string>()
  private pendingScene: { type: 'load'; identifier: string } | { type: 'reload' } | null = null
  private quitRequested = false
  private compiledSources = new Map<string, string>()
  private declaredFunctions = new Map<string, { source: string; names: Set<string> }>()
  private pendingReloads = new Map<string, string>()
  private pendingSignals: RuntimeSignal[] = []
  private pendingDebugInvocation: PendingDebugInvocation | null = null
  private pendingGraphExecution: PendingGraphExecution | null = null
  private networkUnsubscribe: (() => void) | null = null

  get isActive(): boolean { return this.active }

  beginSession(): void {
    if (this.active) return
    this.active = true
    this.input.start()
    this.time.reset()
    resetDeterministicSeed()
    resetGameFlow()
    beginGameplayComponents(physicsState.world.entities)
    this.awakened.clear()
    this.started.clear()
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
    void beginWorldGameplay((name, payload, target, source) => this.emitSignal(name, payload, target, source))
    beginProductionRuntime()
    this.networkUnsubscribe?.()
    this.networkUnsubscribe = onProductionRpc((name, payload, context) => this.emitSignal(`network.${name}`, { payload, sender: context.sender, tick: context.tick }, '', context.sender))
    this.ensureLifecycle()
    this.flushStructuralCommands()
    addEditorLog('Gameplay runtime started', 'Runtime')
  }

  frame(frameDelta: number, viewport?: DOMRect): void {
    if (physicsState.playMode !== 'playing') {
      const physicsStarted = performance.now()
      Object.assign(physicsState.engineDiagnostics, physicsState.world.update(frameDelta, false, physicsState.globalSettings))
      const physicsMs = performance.now() - physicsStarted
      const audioStarted = performance.now()
      audioRuntime.update(physicsState.world.entities, physicsState.audioSettings, false)
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
    for (const timer of expired) {
      const entity = physicsState.world.entities.find(candidate => candidate.uuid === timer.entityUuid)
      if (entity && timer.kind === 'timer') this.runEntityFunction(entity, 'on_timer', undefined, { name: timer.name, source: entity.uuid, payload: null })
      else if (entity) { updateDebugTask({ id: `${entity.uuid}:${timer.name}`, name: timer.name, state: 'completed', entityUuid: entity.uuid, detail: `Completed at frame ${this.time.value.frame}` }); this.runEntityFunction(entity, 'on_task', undefined, { name: timer.name, source: entity.uuid, payload: null }) }
    }
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
        }, (target, despawn) => { if (!despawn || !releasePooled(target)) this.pendingDestroy.add(target.id) })
        beforeWorldPhysicsStep(fixedDelta, this.time.value.elapsed, this.time.value.frame, (name, payload, target, source) => this.emitSignal(name, payload, target, source), scene => { this.pendingScene = { type: 'load', identifier: scene } })
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
    audioRuntime.update(physicsState.world.entities, physicsState.audioSettings, true)
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
    this.time.beginFrame(this.time.value.fixedDelta, physicsState.globalSettings.tickRate, physicsState.globalSettings.timeScale)
    this.runPhase('fixed_update')
    this.flushEntityCommands()
    updateGameplayComponents(physicsState.world.entities, this.inputSnapshot, this.time.value.fixedDelta, (name, payload, target, source) => this.emitSignal(name, payload, target, source), (prefab, owner) => {
      const transform = worldTransform(owner, physicsState.world.entities)
      return spawnRuntimePrefab(prefab, { position: transform.position, rotation: transform.rotation, scale: { x: 1, y: 1 } })
    }, (target, despawn) => { if (!despawn || !releasePooled(target)) this.pendingDestroy.add(target.id) })
    beforeWorldPhysicsStep(this.time.value.fixedDelta, this.time.value.elapsed, this.time.value.frame, (name, payload, target, source) => this.emitSignal(name, payload, target, source), scene => { this.pendingScene = { type: 'load', identifier: scene } })
    Object.assign(physicsState.engineDiagnostics, physicsState.world.singleStep(physicsState.globalSettings))
    const checksum = physicsState.world.stateChecksum()
    completeReplayFixedStep(checksum)
    updateProductionRuntime(physicsState.world.entities, this.time.value.fixedDelta, this.inputSnapshot, checksum)
    this.dispatchPhysicsEvents(physicsState.world.events)
    this.runPhase('update')
    this.runPhase('late_update')
    animationRuntime.update(physicsState.world.entities, this.time.value.fixedDelta)
    timelineRuntime.update(physicsState.world.entities, this.time.value.fixedDelta)
    particleRuntime.update(physicsState.world.entities, this.time.value.fixedDelta, true)
    pluginRuntime.update(this.time.value.fixedDelta)
    audioRuntime.update(physicsState.world.entities, physicsState.audioSettings, true)
    this.flushStructuralCommands()
  }

  stopSession(log = true): void {
    if (!this.active) return
    const ending = [...physicsState.world.entities]
    for (const entity of ending) this.destroying.add(entity.uuid)
    for (const entity of ending) this.runEntityFunction(entity, 'on_destroy')
    this.pendingDestroy.clear()
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
    audioRuntime.stopAll()
    this.pendingScene = null
    this.active = false
    this.input.stop()
    this.time.reset()
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
    this.pendingDebugInvocation = null
    this.pendingGraphExecution = null
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
    try { source = asset.assetType === 'visualScript' ? executableGraphSource(storedSource) : storedSource } catch (error) { component.lastError = this.errorMessage(error); return component.lastError }
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
      this.pendingReloads.set(scriptUuid, candidateSource)
      scriptDebugState.hotReload = { status: 'pending', scriptUuid, message: `Visual graph queued with ${Object.keys(graphPlan.preserved).length} compatible state values preserved`, frame: this.time.value.frame }
    } catch (error) {
      scriptDebugState.hotReload = { status: 'rejected', scriptUuid, message: `Visual graph hot reload rejected: ${this.errorMessage(error)}`, frame: this.time.value.frame }
    }
  }

  rollbackHotReload(scriptUuid: string): boolean {
    const source = restoreHotReloadSource(scriptUuid)
    if (!source || !updateTextAsset(scriptUuid, source)) return false
    this.pendingReloads.set(scriptUuid, source)
    scriptDebugState.hotReload = { status: 'pending', scriptUuid, message: 'Rollback source queued for transactional apply', frame: this.time.value.frame }
    return true
  }

  emitSignal(name: string, payload: unknown = null, target = '', source = 'editor'): void {
    const clean = name.trim().slice(0, 128)
    if (!clean) return
    this.pendingSignals.push({ name: clean, payload: this.serializable(payload), target: target.trim().slice(0, 128), source: source.trim().slice(0, 128) })
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
      if (entity) this.runEntityFunction(entity, pending.functionName, pending.contact, pending.event, true)
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
      if (entity) this.runEntityFunction(entity, pending.functionName, pending.contact, pending.event, true)
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

  runScriptTests(scriptUuid?: string, options: { tags?: string[]; includeSkipped?: boolean; testNames?: string[] } = {}): ScriptTestResult[] {
    if (scriptProjectSettings.testing.coverageEnabled) resetScriptCoverage()
    const assets = scriptUuid ? [resolveAsset(scriptUuid)].filter(Boolean) : physicsState.world.entities.map(entity => resolveAsset(entity.script2D?.scriptAsset ?? '')).filter(Boolean)
    const unique = [...new Map(assets.map(asset => [asset!.uuid, asset!])).values()].filter(asset => asset.assetType === 'script')
    const results: ScriptTestResult[] = []
    for (const asset of unique) {
      let source: string | null = null
      try { source = this.resolveScriptBundle(asset.uuid) } catch (error) { results.push({ script: asset.name, test: 'module resolution', passed: false, skipped: false, durationMs: 0, seed: 1, caseName: '', tags: [], message: this.errorMessage(error) }); continue }
      if (!source) continue
      const scriptAnalysis = analyzeScript(source)
      const selectedNames = new Set(options.testNames ?? [])
      const tests = scriptAnalysis.tests.filter(test =>
        (!options.tags?.length || options.tags.every(tag => test.tags.includes(tag))) &&
        (!options.testNames || selectedNames.has(test.name))
      )
      for (const test of tests) {
        const cases = test.cases.length ? test.cases : ['']
        for (const caseName of cases) {
          const started = performance.now()
          if (test.skipped && !options.includeSkipped) {
            results.push({ script: asset.name, test: test.name, passed: true, skipped: true, durationMs: 0, seed: test.seed, caseName, tags: test.tags, message: 'Skipped by @test metadata' })
            continue
          }
        try {
          const isolated = new WasmScriptRuntime()
          const context = {
            apiVersion: asset.script?.apiVersion ?? scriptProjectSettings.apiVersion,
            entity: 'test-entity', entityName: 'Script test', components: [], entities: {},
            time: { delta: 0, fixedDelta: 1 / 60, elapsed: 0, scale: 1, frame: 0 }, randomSeed: test.seed || scriptProjectSettings.deterministicTestSeed, input: EMPTY_INPUT,
            event: { name: 'test.run', source: 'Script Studio', payload: { test: test.name, case: caseName, seed: test.seed } },
            properties: {} as Record<string, ScriptPropertyValue>, save: {},
            transform: { position: [0, 0], rotation: 0, scale: [1, 1] }, rigidBody: null
          }
          const logs: ScriptExecution['logs'] = []
          const callbacks = ['before_all', 'before_each', test.name, 'after_each', 'after_all'].filter(name => scriptAnalysis.functions[name])
          for (const functionName of callbacks) {
            const execution = parseScriptExecution(isolated.execute_json(source, functionName, JSON.stringify(context)))
            if (scriptProjectSettings.testing.coverageEnabled) recordScriptCoverage(asset.uuid, source, functionName)
            context.properties = execution.properties
            logs.push(...execution.logs)
            if (performance.now() - started > test.timeoutMs) throw new Error(`Timed out after ${test.timeoutMs} ms`)
          }
          const failure = logs.find(log => log.level === 'error')
          results.push({ script: asset.name, test: test.name, passed: !failure, skipped: false, durationMs: performance.now() - started, seed: test.seed, caseName, tags: test.tags, message: failure?.message ?? `Passed with deterministic seed ${test.seed}` })
        } catch (error) {
          results.push({ script: asset.name, test: test.name, passed: false, skipped: false, durationMs: performance.now() - started, seed: test.seed, caseName, tags: test.tags, message: this.errorMessage(error) })
        }
        }
      }
    }
    scriptDebugState.testResults.splice(0, scriptDebugState.testResults.length, ...results)
    addEditorLog(`Script tests: ${results.filter(result => result.passed && !result.skipped).length}/${results.filter(result => !result.skipped).length} passed, ${results.filter(result => result.skipped).length} skipped`, 'Script', results.every(result => result.passed) ? 'info' : 'error')
    return results
  }

  invokeUiCallback(entity: Entity, functionName: string): void {
    if (!this.active || !functionName.trim()) return
    this.emitSignal(`ui.${functionName.trim()}`, { entity: entity.uuid }, entity.uuid, entity.uuid)
    this.runEntityFunction(entity, functionName.trim().slice(0, 80))
    this.flushEntityCommands()
    this.flushStructuralCommands()
  }

  private ensureScriptRuntime(): void {
    if (!this.scriptRuntime && !physicsState.world.wasmError) {
      try { this.scriptRuntime = new WasmScriptRuntime() } catch { /* WASM is not initialized yet. */ }
    }
  }

  private ensureLifecycle(): void {
    const scripted = physicsState.world.entities.filter(entity => this.canRun(entity))
    this.diagnostics.scripts = scripted.length
    for (const entity of scripted) {
      if (!this.awakened.has(entity.uuid)) {
        this.awakened.add(entity.uuid)
        this.runEntityFunction(entity, 'awake')
      }
    }
    for (const entity of scripted) {
      if (!this.started.has(entity.uuid)) {
        this.started.add(entity.uuid)
        this.runEntityFunction(entity, 'start')
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
  }

  private runPhase(functionName: LifecycleFunction): void {
    for (const entity of [...physicsState.world.entities]) {
      if (scriptDebugState.paused) break
      this.runEntityFunction(entity, functionName)
    }
  }

  private runEntityFunction(entity: Entity, functionName: LifecycleFunction | string, contact?: ScriptContact, event?: ScriptEvent, bypassBreakpoint = false): void {
    const component = entity.script2D
    if (!this.canRun(entity) || !component) return
    const asset = resolveAsset(component.scriptAsset)
    let source: string | null = null
    try { source = this.resolveScriptBundle(asset?.uuid ?? '') } catch (error) { this.reportScriptError(entity, this.errorMessage(error)); return }
    if (!asset || (asset.assetType !== 'script' && asset.assetType !== 'visualScript') || !source) {
      this.reportScriptError(entity, `Missing script or visual graph asset: ${component.scriptAsset ?? 'none'}`)
      return
    }
    let declared = this.declaredFunctions.get(asset.uuid)
    if (!declared || declared.source !== source) {
      declared = { source, names: new Set(Object.keys(analyzeScript(source).functions)) }
      this.declaredFunctions.set(asset.uuid, declared)
    }
    // A timer-only script must not cross the WASM boundary for three absent
    // per-frame callbacks. Besides avoiding wasted work, this keeps Play
    // responsive on projects with many narrowly scoped scripts.
    if (!declared.names.has(functionName)) return
    this.ensureScriptRuntime()
    if (!this.scriptRuntime) return
    const runtimeTransform = worldTransform(entity, physicsState.world.entities)
    const context = {
      apiVersion: asset.script?.apiVersion ?? scriptProjectSettings.apiVersion,
      entity: entity.uuid,
      entityName: entity.name,
      components: entity.components.map(value => value.kind),
      entities: Object.fromEntries(physicsState.world.entities.map(value => [value.name, value.uuid])),
      sceneEntities: runtimeSceneEntitySnapshots(physicsState.world.entities),
      time: { ...this.time.value },
      randomSeed: Math.floor(deterministicRandom() * 0x1_0000_0000),
      input: this.inputSnapshot,
      contact,
      event,
      properties: component.properties,
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
      const fn = analyzeScript(source).functions[functionName]
      const legacy = (asset.script?.breakpoints ?? []).map((line, index): ScriptBreakpointMetadata => ({ id: `line-${line}-${index}`, line, functionName: '', condition: '', hitCondition: 0, logMessage: '', enabled: true, hitCount: 0 }))
      const details = asset.script?.breakpointDetails?.length ? asset.script.breakpointDetails : legacy
      const breakpoint = details.find(point => point.enabled && fn && point.line >= fn.line && point.line <= fn.endLine && (!point.functionName || point.functionName === functionName))
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
        this.pendingDebugInvocation = { entityUuid: entity.uuid, functionName, contact, event }
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
      const execution = parseScriptExecution(runtime.execute_cached_json(asset.uuid, functionName, JSON.stringify(context)))
      if (scriptProjectSettings.testing.coverageEnabled) recordScriptCoverage(asset.uuid, source, functionName)
      component.properties = execution.properties
      component.lastError = null
      this.diagnostics.lifecycleCalls++
      for (const log of execution.logs) addEditorLog(`${entity.name}: ${log.message}`, 'Script', log.level === 'error' ? 'error' : log.level === 'warning' ? 'warning' : 'info')
      this.processScriptCommands(entity, asset.uuid, asset.path, functionName, execution.commands)
    } catch (error) {
      const message = this.errorMessage(error)
      this.reportScriptError(entity, message)
      if (asset.assetType === 'visualScript') recordGraphError(graphDebugState.activeGraphUuid || asset.uuid, graphDebugState.activeNodeUuid, message)
      if (scriptProjectSettings.debuggerEnabled && scriptProjectSettings.breakOnRuntimeError && scriptProjectSettings.exceptionPolicy !== 'never') {
        physicsState.playMode = 'paused'
        pauseScriptDebugger({ entityUuid: entity.uuid, entityName: entity.name, scriptUuid: asset.uuid, sourcePath: asset.path, functionName, line: analyzeScript(source).functions[functionName]?.line ?? 1, depth: 0 }, context, `Runtime error: ${this.errorMessage(error)}`)
      }
    } finally {
      recordScriptFunction(asset.uuid, asset.name, functionName, performance.now() - started, source.length * 2 + JSON.stringify(context.properties).length)
    }
  }

  private processScriptCommands(entity: Entity, scriptUuid: string, sourcePath: string, functionName: string, commands: ScriptCommand[], startIndex = 0): boolean {
    for (let index = Math.max(0, startIndex); index < commands.length; index++) {
      const command = commands[index]
      if (command.type !== 'graphTrace') {
        this.applyCommand(entity, command)
        continue
      }
      const decision = recordGraphTrace(command)
      if (decision.logMessage) addEditorLog(`${entity.name}: ${decision.logMessage}`, 'Script', 'debug', scriptUuid)
      if (decision.pause && (!scriptProjectSettings.debuggerEnabled || !scriptDebugState.enabled)) { clearGraphPause(); continue }
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
    else if (command.type === 'destroy') this.pendingDestroy.add(entity.id)
    else if (command.type === 'despawn') { if (!releasePooled(entity)) this.pendingDestroy.add(entity.id) }
    else if (command.type === 'instantiate') {
      const transform = worldTransform(entity, physicsState.world.entities)
      this.pendingPrefabs.push({ reference: command.prefab, position: { ...transform.position } })
    } else if (command.type === 'spawnAt' || command.type === 'targetSetPosition' || command.type === 'targetSetRotation' || command.type === 'targetSetScale' || command.type === 'targetSetEnabled' || command.type === 'targetSetComponentEnabled' || command.type === 'targetSetUiText' || command.type === 'targetSetUiValue' || command.type === 'targetAddTag' || command.type === 'targetRemoveTag' || command.type === 'targetAddGroup' || command.type === 'targetRemoveGroup' || command.type === 'targetDestroy') this.pendingDynamicCommands.push({ sourceUuid: entity.uuid, command })
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
    else if (command.type === 'startTimer') this.time.start(entity.uuid, command.name, command.seconds, command.repeat)
    else if (command.type === 'pauseTimer') this.time.pause(entity.uuid, command.name)
    else if (command.type === 'resumeTimer') this.time.resume(entity.uuid, command.name)
    else if (command.type === 'cancelTimer') this.time.cancel(entity.uuid, command.name)
    else if (command.type === 'startTask') { this.time.startTask(entity.uuid, command.name, command.seconds); updateDebugTask({ id: `${entity.uuid}:${command.name}`, name: command.name, state: 'waiting', entityUuid: entity.uuid, detail: `Waiting ${command.seconds.toFixed(3)} s` }) }
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
    for (const { sourceUuid, command } of this.pendingDynamicCommands) {
      if (command.type === 'spawnAt') {
        const root = spawnRuntimePrefab(command.prefab, { position: { x: command.x, y: command.y }, rotation: command.rotation, scale: { x: command.scaleX, y: command.scaleY } }, false)
        if (!root) { addEditorLog(`Spawn failed for ${command.prefab} (requested by ${sourceUuid})`, 'Runtime', 'error'); continue }
        spawned = true
        if (this.pendingHandleResolutions.size >= 10_000) { const oldest = this.pendingHandleResolutions.keys().next().value; if (oldest) this.pendingHandleResolutions.delete(oldest) }
        this.pendingHandleResolutions.set(command.pendingId, root.uuid)
        this.emitSignal('entity.spawned', { entity: root.uuid, pending: command.pendingId }, root.uuid, sourceUuid)
        continue
      }
      if (!('target' in command) || !('generation' in command)) continue
      const handle: RuntimeEntityHandle = { id: command.target, generation: command.generation }
      const target = resolveRuntimeHandle(handle, this.pendingHandleResolutions); if (!target) continue
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
      else if (command.type === 'targetDestroy') { this.pendingDestroy.add(target.id); continue }
      if (mutation) applyTargetMutation(target, mutation)
    }
    if (spawned) physicsState.world.invalidateRuntime()
    this.pendingDynamicCommands = []
    const living = new Set(physicsState.world.entities.map(entity => entity.uuid))
    for (const [pending, resolved] of this.pendingHandleResolutions) if (!living.has(resolved)) this.pendingHandleResolutions.delete(pending)
  }

  private flushEntityCommands(): void {
    this.flushDynamicCommands()
    for (const id of this.pendingDestroy) {
      const entity = physicsState.world.entities.find(candidate => candidate.id === id)
      if (!entity || this.destroying.has(entity.uuid)) continue
      const doomed = subtreeEntities([id], physicsState.world.entities)
      for (const candidate of doomed) this.destroying.add(candidate.uuid)
      for (const candidate of doomed) {
        this.runEntityFunction(candidate, 'on_destroy')
        this.time.removeEntity(candidate.uuid)
        this.awakened.delete(candidate.uuid)
        this.started.delete(candidate.uuid)
      }
      deleteEntity(id)
      for (const candidate of doomed) this.destroying.delete(candidate.uuid)
    }
    this.pendingDestroy.clear()
    for (const request of this.pendingPrefabs) acquirePooled(request.reference, request.position) ?? instantiatePrefab(request.reference, request.position, false)
    this.pendingPrefabs = []
    this.ensureLifecycle()
  }

  private flushStructuralCommands(): void {
    this.flushEntityCommands()
    const scene = this.pendingScene
    this.pendingScene = null
    if (!scene) return
    this.emitSignal('scene.unloading', { type: scene.type }, '', 'runtime')
    this.dispatchSignals()
    const before = [...physicsState.world.entities]
    const unloading = before.filter(candidate => !candidate.persistentAcrossScenes)
    for (const entity of unloading) this.destroying.add(entity.uuid)
    for (const entity of unloading) {
      this.runEntityFunction(entity, 'on_destroy')
      this.time.removeEntity(entity.uuid)
    }
    this.pendingDestroy.clear()
    this.pendingPrefabs = []
    this.pendingDynamicCommands = []
    const switched = scene.type === 'reload' ? runtimeReloadScene() : runtimeLoadScene(scene.identifier)
    if (!switched) {
      for (const entity of unloading) this.destroying.delete(entity.uuid)
      addEditorLog(scene.type === 'reload' ? 'Runtime scene reload failed' : `Scene not found: ${scene.identifier}`, 'Runtime', 'error')
      return
    }
    for (const entity of unloading) this.destroying.delete(entity.uuid)
    const living = new Set(physicsState.world.entities.map(entity => entity.uuid))
    for (const [pending, resolved] of this.pendingHandleResolutions) if (!living.has(resolved)) this.pendingHandleResolutions.delete(pending)
    for (const uuid of [...this.awakened]) if (!living.has(uuid)) this.awakened.delete(uuid)
    for (const uuid of [...this.started]) if (!living.has(uuid)) this.started.delete(uuid)
    beginGameplayComponents(physicsState.world.entities)
    this.diagnostics.sceneSwitches++
    this.ensureLifecycle()
    this.emitSignal('scene.loaded', { type: scene.type }, '', 'runtime')
    addEditorLog(`Runtime scene ${scene.type === 'reload' ? 'reloaded' : 'loaded'}`, 'Runtime')
  }

  private dispatchPhysicsEvents(events: RuntimePhysicsEvent[]): void {
    processGameplayContacts(events, physicsState.world.entities, (name, payload, target, source) => this.emitSignal(name, payload, target, source), (target, despawn) => { if (!despawn || !releasePooled(target)) this.pendingDestroy.add(target.id) })
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
      this.runEntityFunction(second, functionName, {
        otherEntity: first.uuid,
        point,
        normal: [-normal[0], -normal[1]],
        relativeVelocity: [-relative[0], -relative[1]]
      })
      const signal = functionName.replace(/^on_/, 'physics.')
      this.emitSignal(signal, { other: second.uuid, point, normal, relativeVelocity: relative }, first.uuid, second.uuid)
      this.emitSignal(signal, { other: first.uuid, point, normal: [-normal[0], -normal[1]], relativeVelocity: [-relative[0], -relative[1]] }, second.uuid, first.uuid)
    }
    this.flushEntityCommands()
  }

  private canRun(entity: Entity): boolean {
    const script = entity.script2D
    return entity.enabled && !!script && script.enabled && !script.removed
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
      const uuid = resolveAsset(entity.script2D?.scriptAsset ?? '')?.uuid
      if (!uuid) continue
      try {
        const source = this.resolveScriptBundle(uuid)
        if (source) this.ensureCompiled(uuid, source)
      } catch (error) {
        this.reportScriptError(entity, this.errorMessage(error))
      }
    }
  }

  private ensureCompiled(scriptUuid: string, source: string): ExportedProperty[] {
    if (this.compiledSources.get(scriptUuid) === source) return []
    if (!this.scriptRuntime) throw new Error('Script runtime is unavailable')
    const runtime = this.scriptRuntime as unknown as { compile_cached(id: string, source: string): string }
    const exports = JSON.parse(runtime.compile_cached(scriptUuid, source)) as ExportedProperty[]
    this.compiledSources.set(scriptUuid, source)
    this.declaredFunctions.set(scriptUuid, { source, names: new Set(Object.keys(analyzeScript(source).functions)) })
    return exports
  }

  private flushHotReloads(): void {
    for (const [uuid] of this.pendingReloads) {
      const asset = resolveAsset(uuid)
      if (asset?.script?.reloadPolicy === 'disabled') {
        scriptDebugState.hotReload = { status: 'disabled', scriptUuid: uuid, message: 'This script opted out of hot reload', frame: this.time.value.frame }
        addEditorLog(`Hot reload disabled for ${asset.name}`, 'Script', 'debug', uuid)
        continue
      }
      let plan: ReturnType<typeof prepareHotReload> | null = null
      try {
        const source = this.resolveScriptBundle(uuid)
        if (!source) continue
        const previousSource = this.compiledSources.get(uuid) ?? source
        const previousValidation = this.validateSource(previousSource)
        const candidateValidation = this.validateSource(source)
        if (candidateValidation.error) throw new Error(candidateValidation.error)
        plan = prepareHotReload(uuid, previousSource, source, previousValidation.exports, candidateValidation.exports, asset?.script?.reloadPolicy ?? 'preserve')
        if (plan.classification === 'rejected' || plan.classification === 'restart-required') {
          const message = plan.classification === 'restart-required' ? `Restart required: ${plan.reasons.join(' ')}` : plan.reasons.join(' ')
          rejectHotReload(plan, message)
          scriptDebugState.hotReload = { status: 'rejected', scriptUuid: uuid, message, frame: this.time.value.frame }
          addEditorLog(message, 'Script', plan.classification === 'restart-required' ? 'warning' : 'error', uuid)
          continue
        }
        const exports = this.ensureCompiled(uuid, source)
        for (const entity of physicsState.world.entities.filter(candidate => resolveAsset(candidate.script2D?.scriptAsset ?? '')?.uuid === uuid)) {
          const component = entity.script2D
          if (!component) continue
          component.propertyMetadata = Object.fromEntries(exports.map(exported => [exported.name, { ...exported, defaultValue: exported.defaultValue ?? exported.value }]))
          const recreate = asset?.script?.reloadPolicy === 'recreate'
          component.properties = Object.fromEntries(exports.map(exported => [exported.name, this.exportValue(exported, recreate ? undefined : component.properties[exported.name])]))
          if (recreate) { this.awakened.delete(entity.uuid); this.started.delete(entity.uuid) }
        }
        commitHotReload(plan)
        scriptDebugState.hotReload = { status: 'applied', scriptUuid: uuid, message: asset?.script?.reloadPolicy === 'recreate' ? 'Applied and recreated instances' : 'Applied with compatible serialized state preserved', frame: this.time.value.frame }
        addEditorLog(`Hot reloaded ${resolveAsset(uuid)?.name ?? uuid} at frame ${this.time.value.frame}`, 'Script', 'debug', uuid)
      } catch (error) {
        const message = `Hot reload rejected; previous valid program retained: ${this.errorMessage(error)}`
        if (plan) rejectHotReload(plan, message)
        scriptDebugState.hotReload = { status: 'rejected', scriptUuid: uuid, message, frame: this.time.value.frame }
        addEditorLog(message, 'Script', 'error', uuid)
      }
    }
    this.pendingReloads.clear()
  }

  private dispatchSignals(): void {
    const batch = this.pendingSignals.splice(0)
    for (const signal of batch) {
      scriptDebugState.lastSignal = { name: signal.name, source: signal.source, target: signal.target }
      const recipients = signal.target
        ? physicsState.world.entities.filter(entity => entity.uuid === signal.target)
        : physicsState.world.entities
      for (const entity of recipients) {
        this.runEntityFunction(entity, 'on_signal', undefined, signal)
        const asset = resolveAsset(entity.script2D?.scriptAsset ?? '')
        for (const connection of asset?.script?.signalConnections ?? []) {
          if (!connection.enabled || connection.signal !== signal.name) continue
          if (connection.source && connection.source !== signal.source) continue
          if (connection.target && connection.target !== entity.uuid) continue
          if (connection.callback !== 'on_signal') this.runEntityFunction(entity, connection.callback, undefined, signal)
        }
      }
    }
  }

  private resolveScriptBundle(scriptUuid: string, overrides = new Map<string, string>()): string | null {
    const root = resolveAsset(scriptUuid)
    if (!root || (root.assetType !== 'script' && root.assetType !== 'visualScript')) return null
    if (root.assetType === 'visualScript') {
      const graphSource = overrides.get(root.uuid) ?? readTextAsset(root.uuid)
      if (graphSource === null) return null
      registerGraphDebugDocument(graphSource)
      return executableGraphSource(graphSource)
    }
    const visiting = new Set<string>()
    const resolved = new Set<string>()
    const chunks: string[] = []
    const visit = (uuid: string): void => {
      if (visiting.has(uuid)) throw new Error(`Circular script module dependency at ${resolveAsset(uuid)?.path ?? uuid}`)
      if (resolved.has(uuid)) return
      const asset = resolveAsset(uuid)
      const source = overrides.get(uuid) ?? readTextAsset(uuid)
      if (!asset || asset.assetType !== 'script' || source === null) throw new Error(`Missing script module: ${uuid}`)
      visiting.add(uuid)
      const dependencies = [...source.matchAll(/^\s*use\s+["'`]([^"'`]+)["'`]\s*;?\s*$/gm)].map(match => match[1])
      for (const reference of dependencies) {
        const normalized = reference.replace(/\\/g, '/').replace(/^\.\//, '')
        const path = normalized.startsWith('Assets/') ? normalized : `Assets/Scripts/${normalized}`
        const module = [path, path.endsWith('.rhai') ? path : `${path}.rhai`]
          .map(candidate => resolveAsset(candidate)).find(candidate => candidate?.assetType === 'script')
        if (!module) throw new Error(`Script module not found: ${reference}`)
        visit(module.uuid)
      }
      visiting.delete(uuid)
      resolved.add(uuid)
      chunks.push(`// module: ${asset.path}\n${source.replace(/^\s*use\s+["'`][^"'`]+["'`]\s*;?\s*$/gm, '')}`)
    }
    visit(root.uuid)
    return chunks.join('\n\n')
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

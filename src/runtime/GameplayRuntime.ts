import { readTextAsset, resolveAsset } from '../assets/AssetDatabase'
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
import type { Animator } from '../world/components'
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
import { clearScriptDebugger, pauseScriptDebugger, scriptDebugState } from './scriptDebug'
import { scriptProjectSettings } from './scriptSettings'

type LifecycleFunction = 'awake' | 'start' | 'fixed_update' | 'update' | 'late_update' | 'on_destroy' | 'on_timer' | 'on_task' | 'on_signal'

interface ScriptExecution {
  commands: ScriptCommand[]
  logs: Array<{ level: string; message: string }>
  properties: Record<string, number | string | boolean>
}

interface ExportedProperty { name: string; value: number | string | boolean }

type ScriptCommand =
  | { type: 'applyForce'; x: number; y: number }
  | { type: 'applyImpulse'; x: number; y: number }
  | { type: 'setVelocity'; x: number; y: number }
  | { type: 'setPosition'; x: number; y: number }
  | { type: 'setRotation'; radians: number }
  | { type: 'setScale'; x: number; y: number }
  | { type: 'setAngularVelocity'; radiansPerSecond: number }
  | { type: 'animatorSetBool'; name: string; value: boolean }
  | { type: 'animatorSetFloat'; name: string; value: number }
  | { type: 'animatorSetInteger'; name: string; value: number }
  | { type: 'animatorTrigger'; name: string }
  | { type: 'animatorPlay'; state: string }
  | { type: 'audioPlay' }
  | { type: 'audioPause' }
  | { type: 'audioStop' }
  | { type: 'destroy' }
  | { type: 'instantiate'; prefab: string }
  | { type: 'loadScene'; scene: string }
  | { type: 'reloadScene' }
  | { type: 'quit' }
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

interface ScriptContact {
  otherEntity: string
  point: [number, number]
  normal: [number, number]
  relativeVelocity: [number, number]
}

interface ScriptEvent { name: string; source: string; payload: unknown }
interface RuntimeSignal extends ScriptEvent { target: string }
interface PendingDebugInvocation { entityUuid: string; functionName: string; contact?: ScriptContact; event?: ScriptEvent }

export interface RuntimeDiagnostics {
  scripts: number
  scriptErrors: number
  lifecycleCalls: number
  activeTimers: number
  sceneSwitches: number
  timings: { physicsMs: number; scriptsMs: number; animationMs: number; audioMs: number; assetsMs: number }
}

const EMPTY_INPUT: InputSnapshot = {
  down: {}, pressed: {}, released: {}, axes: {}, vectors: {}, mousePosition: [0, 0], wheel: [0, 0]
}

export const DEFAULT_SCRIPT_SOURCE = `@export let move_speed = 5.0;
@export let jump_force = 10.0;

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

fn on_pressed() {
}

fn on_hover_enter() {
}

fn on_hover_exit() {
}
`

export class GameplayRuntime {
  readonly input = new InputManager()
  readonly time = new RuntimeTime()
  readonly diagnostics: RuntimeDiagnostics = { scripts: 0, scriptErrors: 0, lifecycleCalls: 0, activeTimers: 0, sceneSwitches: 0, timings: { physicsMs: 0, scriptsMs: 0, animationMs: 0, audioMs: 0, assetsMs: 0 } }
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
  private pendingScene: { type: 'load'; identifier: string } | { type: 'reload' } | null = null
  private quitRequested = false
  private compiledSources = new Map<string, string>()
  private pendingReloads = new Map<string, string>()
  private pendingSignals: RuntimeSignal[] = []
  private pendingDebugInvocation: PendingDebugInvocation | null = null

  get isActive(): boolean { return this.active }

  beginSession(): void {
    if (this.active) return
    this.active = true
    this.input.start()
    this.time.reset()
    this.awakened.clear()
    this.started.clear()
    this.fixedPressed = {}
    this.fixedReleased = {}
    this.ensureScriptRuntime()
    this.compileAttachedScripts()
    animationRuntime.onEvent = (entity, event) => {
      let payload: unknown = event.payload
      try { payload = event.payload ? JSON.parse(event.payload) : null } catch { /* Plain text payload. */ }
      this.emitSignal(event.signal, payload, entity.uuid, `animation:${entity.uuid}`)
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
      Object.assign(this.diagnostics.timings, { physicsMs, scriptsMs: 0, animationMs: 0, audioMs, assetsMs: 0 })
      return
    }
    if (!this.active) this.beginSession()
    this.flushHotReloads()
    this.dispatchSignals()
    this.ensureLifecycle()
    const frameInput = this.input.sample(physicsState.inputMap, viewport)
    this.inputSnapshot = frameInput
    this.latchFixedInput(frameInput)
    const expired = this.time.beginFrame(frameDelta, physicsState.globalSettings.tickRate, physicsState.globalSettings.timeScale)
    let scriptsMs = 0
    const timerScriptsStarted = performance.now()
    for (const timer of expired) {
      const entity = physicsState.world.entities.find(candidate => candidate.uuid === timer.entityUuid)
      if (entity && timer.kind === 'timer') this.runEntityFunction(entity, 'on_timer', { otherEntity: timer.name, point: [0, 0], normal: [0, 0], relativeVelocity: [0, 0] })
      else if (entity) this.runEntityFunction(entity, 'on_task', undefined, { name: timer.name, source: entity.uuid, payload: null })
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
        this.inputSnapshot = firstFixedStep
          ? { ...frameInput, pressed: { ...this.fixedPressed }, released: { ...this.fixedReleased } }
          : { ...frameInput, pressed: {}, released: {} }
        if (firstFixedStep) {
          this.fixedPressed = {}
          this.fixedReleased = {}
        }
        firstFixedStep = false
        this.time.value.fixedDelta = fixedDelta
        this.runPhase('fixed_update')
        this.flushEntityCommands()
        animationRuntime.update(physicsState.world.entities, fixedDelta)
        timelineRuntime.update(physicsState.world.entities, fixedDelta)
        fixedScriptsMs += performance.now() - fixedScriptsStarted
      }
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
      physicsMs: Math.max(0, physicsAndFixedScriptsMs - fixedScriptsMs), scriptsMs, animationMs, audioMs, assetsMs: 0
    })
    if (this.quitRequested) {
      this.quitRequested = false
      this.stopSession()
      stopPlayMode()
      editorState.statusText = 'Runtime requested quit'
    }
  }

  stepOnce(viewport?: DOMRect): void {
    if (!this.active) this.beginSession()
    this.ensureLifecycle()
    this.inputSnapshot = this.input.sample(physicsState.inputMap, viewport)
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
    Object.assign(physicsState.engineDiagnostics, physicsState.world.singleStep(physicsState.globalSettings))
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
    timelineRuntime.reset()
    timelineRuntime.onEvent = null
    particleRuntime.reset()
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
    this.pendingSignals = []
    this.pendingReloads.clear()
    this.pendingDebugInvocation = null
    clearScriptDebugger()
    if (log) addEditorLog('Gameplay runtime stopped', 'Runtime')
  }

  synchronizeExports(entity: Entity): string | null {
    const component = entity.script2D
    const source = readTextAsset(component?.scriptAsset)
    if (!component || !source) return 'Select a valid Rhai script asset'
    this.ensureScriptRuntime()
    if (!this.scriptRuntime) return 'Script runtime is still loading'
    try {
      const exports = JSON.parse(this.scriptRuntime.validate(source)) as ExportedProperty[]
      const next: Record<string, number | string | boolean> = {}
      for (const exported of exports) next[exported.name] = component.properties[exported.name] ?? exported.value
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
    this.pendingReloads.set(scriptUuid, source)
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
    const pending = this.pendingDebugInvocation
    this.pendingDebugInvocation = null
    clearScriptDebugger()
    if (pending) {
      const entity = physicsState.world.entities.find(candidate => candidate.uuid === pending.entityUuid)
      if (entity) this.runEntityFunction(entity, pending.functionName, pending.contact, pending.event, true)
    }
    if (physicsState.playMode === 'paused') physicsState.playMode = 'playing'
  }

  debugStep(): void {
    const pending = this.pendingDebugInvocation
    this.pendingDebugInvocation = null
    clearScriptDebugger()
    if (pending) {
      const entity = physicsState.world.entities.find(candidate => candidate.uuid === pending.entityUuid)
      if (entity) this.runEntityFunction(entity, pending.functionName, pending.contact, pending.event, true)
    }
    physicsState.playMode = 'paused'
    scriptDebugState.paused = true
    scriptDebugState.reason = 'Paused after one script callback'
  }

  runScriptTests(scriptUuid?: string): Array<{ script: string; test: string; passed: boolean; message: string }> {
    const assets = scriptUuid ? [resolveAsset(scriptUuid)].filter(Boolean) : physicsState.world.entities.map(entity => resolveAsset(entity.script2D?.scriptAsset ?? '')).filter(Boolean)
    const unique = [...new Map(assets.map(asset => [asset!.uuid, asset!])).values()].filter(asset => asset.assetType === 'script')
    const results: Array<{ script: string; test: string; passed: boolean; message: string }> = []
    for (const asset of unique) {
      let source: string | null = null
      try { source = this.resolveScriptBundle(asset.uuid) } catch (error) { results.push({ script: asset.name, test: 'module resolution', passed: false, message: this.errorMessage(error) }); continue }
      if (!source) continue
      const tests = analyzeScript(source).symbols.filter(symbol => symbol.kind === 'test')
      for (const symbol of tests) {
        try {
          const isolated = new WasmScriptRuntime()
          const context = {
            entity: 'test-entity', entityName: 'Script test', components: [], entities: {},
            time: { delta: 0, fixedDelta: 1 / 60, elapsed: 0, scale: 1, frame: 0 }, input: EMPTY_INPUT,
            event: { name: 'test.run', source: 'Script Studio', payload: { test: symbol.name } },
            properties: {} as Record<string, number | string | boolean>, save: {},
            transform: { position: [0, 0], rotation: 0, scale: [1, 1] }, rigidBody: null
          }
          const logs: ScriptExecution['logs'] = []
          for (const functionName of ['awake', 'start', symbol.name]) {
            const execution = JSON.parse(isolated.execute_json(source, functionName, JSON.stringify(context))) as ScriptExecution
            context.properties = execution.properties
            logs.push(...execution.logs)
          }
          const failure = logs.find(log => log.level === 'error')
          results.push({ script: asset.name, test: symbol.name, passed: !failure, message: failure?.message ?? 'Passed (awake, start, test)' })
        } catch (error) {
          results.push({ script: asset.name, test: symbol.name, passed: false, message: this.errorMessage(error) })
        }
      }
    }
    scriptDebugState.testResults.splice(0, scriptDebugState.testResults.length, ...results)
    addEditorLog(`Script tests: ${results.filter(result => result.passed).length}/${results.length} passed`, 'Script', results.every(result => result.passed) ? 'info' : 'error')
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
    if (!asset || asset.assetType !== 'script' || !source) {
      this.reportScriptError(entity, `Missing script asset: ${component.scriptAsset ?? 'none'}`)
      return
    }
    this.ensureScriptRuntime()
    if (!this.scriptRuntime) return
    const runtimeTransform = worldTransform(entity, physicsState.world.entities)
    const context = {
      entity: entity.uuid,
      entityName: entity.name,
      components: entity.components.map(value => value.kind),
      entities: Object.fromEntries(physicsState.world.entities.map(value => [value.name, value.uuid])),
      time: { ...this.time.value },
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
        velocity: [entity.velocity.x, entity.velocity.y],
        angularVelocity: entity.angularVelocity,
        mass: entity.mass,
        bodyType: entity.isStatic ? 'Static' : entity.isKinematic ? 'Kinematic' : 'Dynamic'
      } : null
    }
    if (!bypassBreakpoint && scriptProjectSettings.debuggerEnabled && scriptDebugState.enabled && !scriptDebugState.paused) {
      const fn = analyzeScript(source).functions[functionName]
      const breakpoint = asset.script?.breakpoints.find(line => fn && line >= fn.line && line <= fn.endLine)
      if (breakpoint) {
        this.pendingDebugInvocation = { entityUuid: entity.uuid, functionName, contact, event }
        physicsState.playMode = 'paused'
        pauseScriptDebugger({ entityUuid: entity.uuid, entityName: entity.name, scriptUuid: asset.uuid, functionName, line: breakpoint }, context, `Breakpoint at ${asset.path}:${breakpoint}`)
        addEditorLog(`Paused at ${asset.path}:${breakpoint}`, 'Script', 'debug', asset.uuid)
        return
      }
    }
    try {
      this.ensureCompiled(asset.uuid, source)
      const runtime = this.scriptRuntime as unknown as { execute_cached_json(id: string, fn: string, context: string): string }
      const execution = JSON.parse(runtime.execute_cached_json(asset.uuid, functionName, JSON.stringify(context))) as ScriptExecution
      component.properties = execution.properties
      component.lastError = null
      this.diagnostics.lifecycleCalls++
      for (const log of execution.logs) addEditorLog(`${entity.name}: ${log.message}`, 'Script', log.level === 'error' ? 'error' : log.level === 'warning' ? 'warning' : 'info')
      for (const command of execution.commands) this.applyCommand(entity, command)
    } catch (error) {
      this.reportScriptError(entity, this.errorMessage(error))
    }
  }

  private applyCommand(entity: Entity, command: ScriptCommand): void {
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
      setWorldTransform(entity, { ...transform, position: { x: finite(command.x), y: finite(command.y) } }, physicsState.world.entities)
    } else if (command.type === 'setRotation') {
      const transform = worldTransform(entity, physicsState.world.entities)
      setWorldTransform(entity, { ...transform, rotation: finite(command.radians) }, physicsState.world.entities)
    } else if (command.type === 'setScale') {
      const transform = worldTransform(entity, physicsState.world.entities)
      setWorldTransform(entity, { ...transform, scale: { x: finite(command.x), y: finite(command.y) } }, physicsState.world.entities)
    } else if (command.type === 'setAngularVelocity' && entity.hasComponent('RigidBody2D')) {
      entity.angularVelocity = finite(command.radiansPerSecond)
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
    else if (command.type === 'instantiate') {
      const transform = worldTransform(entity, physicsState.world.entities)
      this.pendingPrefabs.push({ reference: command.prefab, position: { ...transform.position } })
    } else if (command.type === 'loadScene') this.pendingScene = { type: 'load', identifier: command.scene }
    else if (command.type === 'reloadScene') this.pendingScene = { type: 'reload' }
    else if (command.type === 'quit') this.quitRequested = true
    else if (command.type === 'startTimer') this.time.start(entity.uuid, command.name, command.seconds, command.repeat)
    else if (command.type === 'pauseTimer') this.time.pause(entity.uuid, command.name)
    else if (command.type === 'resumeTimer') this.time.resume(entity.uuid, command.name)
    else if (command.type === 'cancelTimer') this.time.cancel(entity.uuid, command.name)
    else if (command.type === 'startTask') this.time.startTask(entity.uuid, command.name, command.seconds)
    else if (command.type === 'cancelTask') this.time.cancelTask(entity.uuid, command.name)
    else if (command.type === 'emitSignal') this.emitSignal(command.name, command.payload, command.target, entity.uuid)
    else if (command.type === 'saveSet') setSaveValue(command.key, command.value)
    else if (command.type === 'saveDelete') deleteSaveValue(command.key)
    else if (command.type === 'saveClear') clearSaveValues()
    else if (command.type === 'saveLoad') loadSaveSlot(command.slot)
    else if (command.type === 'saveCommit' && !commitSaveSlot(command.slot)) addEditorLog('Save commit failed', 'Save', 'error')
    normalizeEntity(entity)
  }

  private flushEntityCommands(): void {
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
    for (const request of this.pendingPrefabs) instantiatePrefab(request.reference, request.position, false)
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
    const switched = scene.type === 'reload' ? runtimeReloadScene() : runtimeLoadScene(scene.identifier)
    if (!switched) {
      for (const entity of unloading) this.destroying.delete(entity.uuid)
      addEditorLog(scene.type === 'reload' ? 'Runtime scene reload failed' : `Scene not found: ${scene.identifier}`, 'Runtime', 'error')
      return
    }
    for (const entity of unloading) this.destroying.delete(entity.uuid)
    const living = new Set(physicsState.world.entities.map(entity => entity.uuid))
    for (const uuid of [...this.awakened]) if (!living.has(uuid)) this.awakened.delete(uuid)
    for (const uuid of [...this.started]) if (!living.has(uuid)) this.started.delete(uuid)
    this.diagnostics.sceneSwitches++
    this.ensureLifecycle()
    this.emitSignal('scene.loaded', { type: scene.type }, '', 'runtime')
    addEditorLog(`Runtime scene ${scene.type === 'reload' ? 'reloaded' : 'loaded'}`, 'Runtime')
  }

  private dispatchPhysicsEvents(events: RuntimePhysicsEvent[]): void {
    for (const event of events) {
      if (!event.firstEntityUuid || !event.secondEntityUuid) continue
      const first = physicsState.world.entities.find(entity => entity.uuid === event.firstEntityUuid)
      const second = physicsState.world.entities.find(entity => entity.uuid === event.secondEntityUuid)
      if (!first || !second) continue
      const functionName = event.type === 'collisionStarted' ? 'on_collision_enter'
        : event.type === 'collisionStayed' ? 'on_collision_stay'
          : event.type === 'collisionEnded' ? 'on_collision_exit'
            : event.type === 'triggerEntered' ? 'on_trigger_enter'
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

  private ensureCompiled(scriptUuid: string, source: string): void {
    if (this.compiledSources.get(scriptUuid) === source) return
    if (!this.scriptRuntime) throw new Error('Script runtime is unavailable')
    const runtime = this.scriptRuntime as unknown as { compile_cached(id: string, source: string): string }
    runtime.compile_cached(scriptUuid, source)
    this.compiledSources.set(scriptUuid, source)
  }

  private flushHotReloads(): void {
    for (const [uuid] of this.pendingReloads) {
      try {
        const source = this.resolveScriptBundle(uuid)
        if (!source) continue
        this.ensureCompiled(uuid, source)
        addEditorLog(`Hot reloaded ${resolveAsset(uuid)?.name ?? uuid} at frame ${this.time.value.frame}`, 'Script', 'debug', uuid)
      } catch (error) {
        addEditorLog(`Hot reload rejected; previous valid program retained: ${this.errorMessage(error)}`, 'Script', 'error', uuid)
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
      for (const entity of recipients) this.runEntityFunction(entity, 'on_signal', undefined, signal)
    }
  }

  private resolveScriptBundle(scriptUuid: string, overrides = new Map<string, string>()): string | null {
    const root = resolveAsset(scriptUuid)
    if (!root || root.assetType !== 'script') return null
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
}

export const gameplayRuntime = new GameplayRuntime()

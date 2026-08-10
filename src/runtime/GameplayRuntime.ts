import { readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import { addEditorLog, editorState } from '../store/editor'
import {
  deleteEntity,
  physicsState,
  runtimeLoadScene,
  runtimeReloadScene,
  stopPlayMode
} from '../store/physics'
import { finiteNumber, normalizeEntity } from '../world/geometry'
import type { Entity } from '../world/Entity'
import { worldTransform, setWorldTransform } from '../world/hierarchy'
import type { RuntimePhysicsEvent } from '../world/World'
import { instantiatePrefab } from './prefabs'
import { InputManager, type InputSnapshot } from './input'
import { RuntimeTime } from './time'
import { WasmScriptRuntime } from '../../nova_core/pkg/nova_core.js'
import { subtreeEntities } from '../editor/selection'

type LifecycleFunction = 'awake' | 'start' | 'fixed_update' | 'update' | 'late_update' | 'on_destroy' | 'on_timer'

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
  | { type: 'destroy' }
  | { type: 'instantiate'; prefab: string }
  | { type: 'loadScene'; scene: string }
  | { type: 'reloadScene' }
  | { type: 'quit' }
  | { type: 'startTimer'; name: string; seconds: number; repeat: boolean }
  | { type: 'pauseTimer'; name: string }
  | { type: 'resumeTimer'; name: string }
  | { type: 'cancelTimer'; name: string }

interface ScriptContact {
  otherEntity: string
  point: [number, number]
  normal: [number, number]
  relativeVelocity: [number, number]
}

export interface RuntimeDiagnostics {
  scripts: number
  scriptErrors: number
  lifecycleCalls: number
  activeTimers: number
  sceneSwitches: number
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
`

export class GameplayRuntime {
  readonly input = new InputManager()
  readonly time = new RuntimeTime()
  readonly diagnostics: RuntimeDiagnostics = { scripts: 0, scriptErrors: 0, lifecycleCalls: 0, activeTimers: 0, sceneSwitches: 0 }
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
    this.ensureLifecycle()
    this.flushStructuralCommands()
    addEditorLog('Gameplay runtime started', 'Runtime')
  }

  frame(frameDelta: number, viewport?: DOMRect): void {
    if (physicsState.playMode !== 'playing') {
      Object.assign(physicsState.engineDiagnostics, physicsState.world.update(frameDelta, false, physicsState.globalSettings))
      return
    }
    if (!this.active) this.beginSession()
    this.ensureLifecycle()
    const frameInput = this.input.sample(physicsState.inputMap, viewport)
    this.inputSnapshot = frameInput
    this.latchFixedInput(frameInput)
    const expired = this.time.beginFrame(frameDelta, physicsState.globalSettings.tickRate, physicsState.globalSettings.timeScale)
    for (const timer of expired) {
      const entity = physicsState.world.entities.find(candidate => candidate.uuid === timer.entityUuid)
      if (entity) this.runEntityFunction(entity, 'on_timer', { otherEntity: timer.name, point: [0, 0], normal: [0, 0], relativeVelocity: [0, 0] })
    }

    let firstFixedStep = true
    Object.assign(physicsState.engineDiagnostics, physicsState.world.update(
      frameDelta,
      true,
      physicsState.globalSettings,
      fixedDelta => {
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
      }
    ))
    this.inputSnapshot = frameInput
    this.dispatchPhysicsEvents(physicsState.world.events)
    this.runPhase('update')
    this.flushEntityCommands()
    this.runPhase('late_update')
    this.flushStructuralCommands()
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
    this.flushStructuralCommands()
  }

  stopSession(log = true): void {
    if (!this.active) return
    const ending = [...physicsState.world.entities]
    for (const entity of ending) this.destroying.add(entity.uuid)
    for (const entity of ending) this.runEntityFunction(entity, 'on_destroy')
    this.pendingDestroy.clear()
    this.pendingPrefabs = []
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
    for (const entity of [...physicsState.world.entities]) this.runEntityFunction(entity, functionName)
  }

  private runEntityFunction(entity: Entity, functionName: LifecycleFunction | string, contact?: ScriptContact): void {
    const component = entity.script2D
    if (!this.canRun(entity) || !component) return
    const asset = resolveAsset(component.scriptAsset)
    const source = readTextAsset(component.scriptAsset)
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
      properties: component.properties,
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
    try {
      const execution = JSON.parse(this.scriptRuntime.execute_json(source, functionName, JSON.stringify(context))) as ScriptExecution
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
    } else if (command.type === 'destroy') this.pendingDestroy.add(entity.id)
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
    if (component.lastError !== message) addEditorLog(`${entity.name}: ${message}`, 'Script', 'error')
    component.lastError = message
    this.diagnostics.scriptErrors++
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    return String(error).replace(/^JsValue\((.*)\)$/s, '$1')
  }
}

export const gameplayRuntime = new GameplayRuntime()

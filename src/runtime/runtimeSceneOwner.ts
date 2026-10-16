/** Fixed-world composition of the existing two-phase scene transaction. */
import type { World, GlobalPhysicsSettings } from '../world/World'
import type { SceneManager } from '../world/SceneManager'
import type { EntityBuilder } from '../world/entityBuilder'
import type { Entity } from '../world/Entity'
import type { Vec2 } from '../world/types'
import { createRuntimeSceneData, type RuntimeSceneData } from './runtimeSceneData'
import { prepareRuntimeSceneTransition } from './runtimeSceneTransition'
import type { PreparedRuntimeSceneTransition } from './runtimeSceneContracts'

export interface RuntimeSceneOwnerHost<View> {
  readonly state: { world: World; globalSettings: GlobalPhysicsSettings }
  readonly scenes: SceneManager
  readonly builder: EntityBuilder
  origin(): Vec2
  captureView(): View
  restoreView(view: View): void
  applyView(scene: Record<string, unknown>, entities: Entity[]): void
}

export class RuntimeSceneOwner<View> {
  readonly world: World
  private readonly data: RuntimeSceneData
  private readonly state: RuntimeSceneOwnerHost<View>['state']
  private readonly scenes: SceneManager
  private readonly builder: EntityBuilder
  private generation = 0
  private disposed = false
  constructor(private readonly host: RuntimeSceneOwnerHost<View>) {
    if (!host?.state?.world || !Array.isArray(host.state.world.entities) || !Array.isArray(host.state.world.connections) || typeof host.state.world.allocateId !== 'function' || typeof host.state.world.allocateConnectionId !== 'function' || typeof host.state.world.invalidateRuntime !== 'function' || !host.state.globalSettings || !host.scenes || typeof host.scenes.setActive !== 'function' || typeof host.builder?.createEntityFromData !== 'function' || typeof host.builder.normalizeIdentifier !== 'function' || typeof host.origin !== 'function' || typeof host.captureView !== 'function' || typeof host.restoreView !== 'function' || typeof host.applyView !== 'function') throw new Error('RUNTIME_SCENE_OWNER_PORTS_REQUIRED: Supply a real World, SceneManager, builder and view capabilities.')
    this.state = host.state
    this.world = host.state.world
    this.scenes = host.scenes
    this.builder = host.builder
    const data = createRuntimeSceneData({ state: this.state, createEntityFromData: this.builder.createEntityFromData.bind(this.builder), normalizeIdentifier: this.builder.normalizeIdentifier.bind(this.builder) })
    this.data = {
      loadEntities: (...args) => { this.assertCurrent(); return data.loadEntities(...args) },
      loadConnections: (...args) => { this.assertCurrent(); return data.loadConnections(...args) },
      normalizeGlobalSettings: (...args) => { this.assertCurrent(); return data.normalizeGlobalSettings(...args) },
      loadGlobalSettings: (...args) => { this.assertCurrent(); return data.loadGlobalSettings(...args) },
      loadPhysicsProjectSettings: (...args) => { this.assertCurrent(); return data.loadPhysicsProjectSettings(...args) }
    }
  }
  get sceneData(): RuntimeSceneData { this.assertCurrent(); return this.data }
  private assertCurrent(): void {
    if (this.disposed) throw new Error('RUNTIME_SCENE_OWNER_DISPOSED')
    if (this.host.state !== this.state || this.state.world !== this.world || this.host.scenes !== this.scenes || this.host.builder !== this.builder) throw new Error('RUNTIME_SCENE_OWNER_WORLD_CHANGED')
  }
  prepareRuntimeSceneTransition(identifier?: string): PreparedRuntimeSceneTransition {
    this.assertCurrent()
    const generation = this.generation
    const transaction = prepareRuntimeSceneTransition({
      world: this.world, scenes: this.scenes,
      createEntity: this.builder.createEntityFromData.bind(this.builder),
      origin: this.host.origin.bind(this.host),
      captureView: this.host.captureView.bind(this.host),
      restoreView: this.host.restoreView.bind(this.host),
      applyView: this.host.applyView.bind(this.host)
    }, identifier)
    let attempted = false, guardError: string | null = null
    return {
      preservedEntityUuids: transaction.preservedEntityUuids,
      get error() { return guardError ?? transaction.error },
      commit: () => {
        if (attempted) { guardError = 'A runtime scene transaction can only be committed once.'; return false }
        attempted = true
        try { this.assertCurrent(); if (generation !== this.generation) throw new Error('RUNTIME_SCENE_TRANSITION_CANCELLED') }
        catch (error) { guardError = error instanceof Error ? error.message : String(error); return false }
        return transaction.commit()
      }
    }
  }
  cancelPendingTransitions(): void { this.generation++ }
  dispose(): void { if (this.disposed) return; this.disposed = true; this.generation++ }
}

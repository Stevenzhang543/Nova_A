/** Direct Gameplay host port. Subsystems still retain their existing global Owners.
 * This port alone does not make foreign Worlds or concurrent Play sessions safe. */
import type { Entity } from '../world/Entity'
import type { World, EngineDiagnostics, GlobalPhysicsSettings } from '../world/World'
import type { WorldGameplayOwner, WorldGameplayCamera } from './worldGameplayOwner'
import type { InputAction } from './input'
import type { AudioProjectSettings } from './audioSettingsContracts'
import type { PreparedRuntimeSceneTransition } from './runtimeSceneContracts'
import type { RuntimePluginController } from './pluginRuntimeOwner'
import type { AnimationTimelineOwner } from './animationTimelineOwner'
import type { AnimationResources } from './animationTimelineContracts'
import type { RuntimeSaveOwner } from './runtimeSaveOwner'
import type { RuntimeAudioOwner } from './audioOwner'
import type { AudioResources } from './audioRuntimeContracts'
import type { RuntimePresentationOwner } from './presentationOwner'
import type { GraphDebugOwner } from './graphDebugOwner'
import type { ScriptDebugOwner } from './scriptDebugOwner'
import type { ScriptHotReloadOwner } from './scriptHotReloadOwner'
import type { GameplayScriptServices } from './scriptServices'
import type { RuntimeParticleOwner } from './particleOwner'
import type { ReplayOwner } from './replayOwner'
import type { ProductionNetworkOwner } from './productionNetworkOwner'

export interface GameplayWorldState {
  world: World
  camera: WorldGameplayCamera
  globalSettings: GlobalPhysicsSettings
  playMode: 'editing' | 'playing' | 'paused'
  engineDiagnostics: EngineDiagnostics
  inputMap: InputAction[]
  audioSettings: AudioProjectSettings
}

export interface GameplayWorldHost {
  /** The actual plugin owner for this host; no Runtime fallback to the Editor singleton. */
  readonly plugins: Pick<RuntimePluginController, 'start' | 'update' | 'stop'>
  /** The live root, including field replacements; never a copied World/settings snapshot. */
  readonly state: GameplayWorldState
  readonly activeSceneUuid: string
  /** Fresh game-bound IDs for script requirements; no Editor package manager dependency. */
  readEnabledPackageIds(): string[]
  /** Explicit composition for this host; no Runtime fallback to the Editor root. */
  createScriptDebugOwner(scriptServices: GameplayScriptServices): ScriptDebugOwner
  createScriptHotReloadOwner(scriptServices: GameplayScriptServices): ScriptHotReloadOwner
  createGraphDebugOwner(scriptServices: GameplayScriptServices): GraphDebugOwner
  createWorldGameplayOwner(graphDebug: GraphDebugOwner): WorldGameplayOwner
  /** Fixed-World animation/timeline composition with this Core's bound resource catalog. */
  createAnimationTimelineOwner(resources: AnimationResources, audio: RuntimeAudioOwner): AnimationTimelineOwner
  createAudioOwner(resources: AudioResources): RuntimeAudioOwner
  createPresentationOwner():RuntimePresentationOwner
  /** Same fixed-World particle instance serves Core, origin and draw submission. */
  createParticleOwner():RuntimeParticleOwner
  /** Fixed World, captured game configuration or explicit Editor live configuration. */
  createReplayOwner(): ReplayOwner
  /** Required fixed-World network/session/replay composition; no singleton fallback. */
  createProductionNetworkOwner():ProductionNetworkOwner
  /** Explicit save composition; Runtime never falls back to the Editor singleton. */
  createSaveOwner(): RuntimeSaveOwner
  readEntityAuthoringData(entity: Entity): Record<string, unknown>
  deleteEntity(id: number): void
  prepareRuntimeSceneTransition(identifier?: string): PreparedRuntimeSceneTransition
  log(message: string, category: 'Runtime' | 'Script' | 'Save' | 'Input', level?: 'debug' | 'info' | 'warning' | 'error', source?: string): void
  /** Called after Core.stopSession; the host retains its existing stop/status/event order. */
  requestQuit(): void
}

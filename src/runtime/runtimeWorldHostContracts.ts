/** Fixed-world composition inputs. Real capabilities are required; no Editor defaults. */
import type { Entity } from '../world/Entity'
import type { SceneManager } from '../world/SceneManager'
import type { World, WorldHostServices } from '../world/World'
import type { EntityBuilder } from '../world/entityBuilder'
import type { GameplayWorldState } from './gameplayWorldHost'
import type { GameplayScriptServices } from './scriptServices'
import type { RuntimeProjectCatalog } from './runtimeProjectCatalog'
import type { AssetRecord } from './runtimeAssetRecordContracts'
import type { WorldGameplayState } from './worldGameplayOwner'
import type { RuntimePresentationState } from './presentationOwner'
import type { ReplaySettings } from './replayOwner'
import type { NetworkConfiguration } from './networkSessionContracts'
import type { NetworkPlatformPorts } from './networkSessionContracts'
import type { RuntimeSaveConfiguration, RuntimeSavePorts } from './runtimeSaveOwner'
import type { RuntimeAudioPlatform } from './audioRuntimeContracts'
import type { AnimationTimelinePorts } from './animationTimelineContracts'
import type { AiCapabilities } from './aiOwner'
import type { ProductionNetworkPorts } from './productionNetworkOwner'
import type { PluginManifest, PluginRuntimePorts } from './pluginRuntimeOwner'
import type { TileResourcePorts } from './tileMapOwner'
import type { RendererEnvironment, RendererAssetSource } from '../renderer/RendererEnvironment'
import type { SceneRendererEnvironment } from '../renderer/SceneRendererEnvironment'
import type { LightingEnvironment } from '../renderer/LightingEnvironment'

export interface RuntimeWorldResources {
 readonly catalog: RuntimeProjectCatalog<AssetRecord>
 readonly scriptServices: GameplayScriptServices
}
export interface RuntimeWorldConfiguration {
 readonly projectId: string
 readonly enabledPackageIds: readonly string[]
 readonly aiEnabled: boolean
 readonly objectPoolEnabled: boolean
 readonly networkPackageId: string
 readonly world: WorldGameplayState
 readonly presentation: RuntimePresentationState
 readonly replay: ReplaySettings
 readonly network: NetworkConfiguration
 readonly save: RuntimeSaveConfiguration
 readonly plugins: readonly PluginManifest[]
 readonly pluginSafeMode: boolean
 readonly pluginSafeModeRecommended: boolean
 readonly frameWorkBudgetMs: number
 readonly streamingBudgetMs: number
 readonly particleBudget: number
 readonly adaptiveParticleScale: number
}
export interface RuntimeWorldCapabilities {
 readonly tileResources: TileResourcePorts
 readonly rendererAssets: RendererAssetSource
 readonly audioPlatform: RuntimeAudioPlatform
 readonly networkPlatform: NetworkPlatformPorts
 readonly save: Pick<RuntimeSavePorts,'storage'|'origin'|'timestamp'|'abortError'>
 readonly pluginPlatform: Pick<PluginRuntimePorts,'clock'|'crypto'|'storage'|'atob'|'fetch'>
 readonly locale: AnimationTimelinePorts['locale']
 readonly camera: AnimationTimelinePorts['camera']
 readonly message: Parameters<typeof import('../world/entityBuilder').createEntityBuilder>[0]['message']
 unwrapEntity(entity: Entity): Entity
 nowMilliseconds(): number
 isoNow(): string
 scheduleMacrotask(callback: () => void, delayMs: number): unknown
 recordScriptFunction: AiCapabilities['recordScriptFunction']
 reportRecoverableError: ProductionNetworkPorts['reportRecoverableError']
 log(message: string, category: 'Runtime'|'Script'|'Save'|'Input'|'Plugin', level?: 'debug'|'info'|'warning'|'error', source?: string): void
 requestQuit(): void
}
export interface RuntimeWorldView {
 readonly state: GameplayWorldState
 readonly scenes: SceneManager
 readonly resources: RuntimeWorldResources
 readonly layers: number[]
 activeLayer: number
 renderLayer: number|'all'
}
export interface RuntimeWorldHostOptions {
 readonly state: GameplayWorldState
 readonly scenes: SceneManager
 readonly resources: RuntimeWorldResources
 readonly configuration: RuntimeWorldConfiguration
 readonly capabilities: RuntimeWorldCapabilities
}
export interface RuntimeWorldSurface {
 readonly renderer: RendererEnvironment
 readonly scene: SceneRendererEnvironment
 readonly lighting: LightingEnvironment
}
export type RuntimeWorldInitialState = Omit<GameplayWorldState,'world'>
export interface RuntimeWorldBootstrapOptions {
 readonly resources: RuntimeWorldResources
 readonly configuration: RuntimeWorldConfiguration
 readonly capabilities: RuntimeWorldCapabilities
 /** Actual normalized authoring scene documents, never another raw UUID pass. */
 readonly sceneRecords: readonly Record<string,unknown>[]
 readonly activeSceneUuid: string
 readonly initialState: RuntimeWorldInitialState
 readonly signal?: AbortSignal
 createWorld(services: WorldHostServices): Promise<World>
 /** The allocating platform owns final native-wrapper disposal, beyond World.clear. */
 releaseWorld(world: World): void | Promise<void>
}
export type RuntimeWorldBuilder = EntityBuilder

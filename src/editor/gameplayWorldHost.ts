/** Unique Editor composition of the original live physics/store Owner. */
import { addEditorLog, editorState } from '../store/editor'
import { deleteEntity, physicsState, sceneManager, prepareRuntimeSceneTransition, readEntityAuthoringData, stopPlayMode } from '../store/physics'
import type { GameplayWorldHost, GameplayWorldState } from '../runtime/gameplayWorldHost'
import { createEditorWorldGameplayOwner } from './worldGameplayAdapter'
import { deleteEntitySubtreeInWorld } from '../world/entityRemoval'
import { pluginRuntime } from '../runtime/plugins'
import { createEditorAnimationTimelineOwner } from './animationTimelineAdapter'
import { getEditorSaveOwner } from './saveGame'
import { createDetachedEditorSaveOwner } from './saveOwnerAdapter'
import { packageState } from '../runtime/packages'
import { createEditorRuntimeAudioOwner } from './audioAdapter'
import { createEditorPresentationOwner } from './presentationAdapter'
import { createEditorGraphDebugOwner } from './graphDebugAdapter'
import { createEditorScriptDebugOwner } from './scriptDebugAdapter'
import { createEditorScriptHotReloadOwner } from './scriptHotReloadAdapter'
import { createEditorParticleOwner } from './particleAdapter'
import { createEditorReplayOwner } from './replayOwnerAdapter'
import { productionSettings } from '../runtime/production'
import { createEditorProductionNetworkOwner } from './productionNetworkAdapter'
import { toRaw } from 'vue'

/** Factory reads/binds existing services only; it does not start Play or construct a World. */
export function createEditorGameplayWorldHost(options:{legacyAnimationRoot:boolean;legacySaveRoot?:boolean;legacyNetworkRoot?:boolean;legacyDebugRoot?:boolean}={legacyAnimationRoot:true}): GameplayWorldHost {
  // Keep the existing Editor live policy; a detached Runtime captures only its loaded game IDs.
  const readPackages = () => packageState.installed.filter(/* 先计算 item.enabled；仅当其为真值时求右侧 item.project，返回短路求值结果。 */ item => item.enabled && item.project).map(/* 返回 item.manifest.id 的当前值。 */ item => item.manifest.id)
  const capturedPackageIds = options.legacyAnimationRoot ? null : readPackages()
  const capturedReplaySettings = options.legacyAnimationRoot ? null : { ...productionSettings.replay }
  const legacyNetworkRoot=options.legacyNetworkRoot??options.legacyAnimationRoot
  const capturedNetworkConfiguration=legacyNetworkRoot?null:structuredClone({networking:toRaw(productionSettings.networking),replay:toRaw(productionSettings.replay)})
  return {
    plugins: pluginRuntime,
    // Vue UnwrapNestedRefs erases World's private nominal fields in the type.
    // The trusted store installs its actual World with markRaw; keep that same live proxy/root.
    get state() { return physicsState as unknown as GameplayWorldState },
    get activeSceneUuid() { return sceneManager.activeSceneUuid },
    readEnabledPackageIds() { return [...(capturedPackageIds ?? readPackages())] },
    createScriptDebugOwner(scriptServices) { return createEditorScriptDebugOwner(this.state.world,scriptServices,{legacyRoot:options.legacyDebugRoot===true,legacyState:this.state}) },
    createScriptHotReloadOwner(scriptServices) { return createEditorScriptHotReloadOwner(this,scriptServices,{legacyRoot:options.legacyDebugRoot===true}) },
    createGraphDebugOwner(scriptServices) {
      return createEditorGraphDebugOwner(this.state.world, scriptServices, {legacyRoot:(this.state as unknown)===physicsState})
    },
    createWorldGameplayOwner(graphDebug) {
      // Method receiver is the supplied host, including an explicit foreign/custom root.
      return createEditorWorldGameplayOwner(this, { legacyRoot: (this.state as unknown) === physicsState }, graphDebug)
    },
    createPresentationOwner() { return createEditorPresentationOwner(this,{legacyRoot:options.legacyAnimationRoot&&(this.state as unknown)===physicsState}) },
    createParticleOwner() { return createEditorParticleOwner(this.state.world,{legacyRoot:(this.state as unknown)===physicsState}) },
    createProductionNetworkOwner() {
      return createEditorProductionNetworkOwner(this,{legacyRoot:legacyNetworkRoot,readConfiguration(){return capturedNetworkConfiguration??productionSettings}})
    },
    createReplayOwner() {
      const suppliedHost = this, world = this.state.world
      return createEditorReplayOwner(world, { legacyRoot: options.legacyAnimationRoot, readReplaySettings() {
        if (suppliedHost.state.world !== world) throw new Error('REPLAY_WORLD_CHANGED: Recreate the Core after replacing its World.')
        return capturedReplaySettings ?? productionSettings.replay
      } })
    },
    createAudioOwner(resources) {
      return createEditorRuntimeAudioOwner(this.state.world, resources, {legacyRoot:options.legacyAnimationRoot})
    },
    createAnimationTimelineOwner(resources, audio) {
      return createEditorAnimationTimelineOwner(this.state.world, resources, {legacyRoot:options.legacyAnimationRoot}, audio)
    },
    createSaveOwner() {
      return (options.legacySaveRoot ?? options.legacyAnimationRoot) ? getEditorSaveOwner() : createDetachedEditorSaveOwner()
    },
    readEntityAuthoringData,
    deleteEntity(id) {
      const state = this.state
      if ((state as unknown) === physicsState) deleteEntity(id)
      else deleteEntitySubtreeInWorld(state.world, id)
    },
    prepareRuntimeSceneTransition,
    log: addEditorLog,
    requestQuit() {
      stopPlayMode()
      editorState.statusText = 'Runtime requested quit'
      window.dispatchEvent(new CustomEvent('nova-player-quit'))
    }
  }
}

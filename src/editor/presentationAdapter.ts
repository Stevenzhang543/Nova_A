/** Unique Editor composition: Vue wraps only the original presentation targets; no eager World access. */
import {reactive,toRaw} from 'vue'
import {physicsState} from '../store/physics'
import type {GameplayWorldHost} from '../runtime/gameplayWorldHost'
import {RuntimePresentationOwner,normalizeRuntimeAccessibilitySettings,normalizeUiAudioSettings} from '../runtime/presentationOwner'
import {getLegacyPresentationRawState,installLegacyPresentationPort,runtimeAccessibilitySettings,uiAudioSettings} from '../runtime/presentation'
const raw=getLegacyPresentationRawState(),accessibilityView=reactive(raw.accessibility),uiAudioView=reactive(raw.uiAudio),captionsView=reactive(raw.captions)
let legacy:RuntimePresentationOwner|null=null
const nowMilliseconds=()=>typeof performance==='undefined'?Date.now():performance.now()
export function createEditorPresentationOwner(host:Pick<GameplayWorldHost,'state'>,options:{legacyRoot:boolean}):RuntimePresentationOwner {
 const world=host.state.world
 if(options.legacyRoot){
  if((host.state as unknown)!==physicsState)throw new Error('PRESENTATION_LEGACY_ROOT_REQUIRED')
  if(legacy?.world===world)return legacy
  const nextHost={world,nowMilliseconds}
  legacy=legacy?legacy.rebindLegacySingleRootHost(nextHost):new RuntimePresentationOwner(nextHost,{accessibility:accessibilityView,uiAudio:uiAudioView,captions:captionsView})
  return legacy
 }
 return new RuntimePresentationOwner({world,nowMilliseconds},{accessibility:normalizeRuntimeAccessibilitySettings(runtimeAccessibilitySettings),uiAudio:normalizeUiAudioSettings(uiAudioSettings),captions:[]})
}
export function getEditorPresentationOwner():RuntimePresentationOwner {return createEditorPresentationOwner({get state(){return physicsState as unknown as GameplayWorldHost['state']}},{legacyRoot:true})}
const legacyPort={accessibilityView,uiAudioView,captionsView,unwrapState:toRaw,getOwner:getEditorPresentationOwner}
installLegacyPresentationPort(legacyPort)

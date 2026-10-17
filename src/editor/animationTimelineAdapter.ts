/** Actual Editor capabilities; no automatic World construction or Runtime defaults. */
import {reactive,toRaw} from 'vue'
import {assetState,createTextAsset,updateTextAsset,assetReference} from '../assets/AssetDatabase'
import {createEditorGameplayScriptServices} from './gameplayScriptServices'
import {StableComponentScheduler} from '../runtime/largeWorldPerformance'
import {audioRuntime} from '../runtime/audio'
import type {RuntimeAudioOwner} from '../runtime/audioOwner'
import {localizationSettings,localizeUiLabel} from '../runtime/localization'
import {setTimelineCameraBlend} from '../renderer/sceneRenderer'
import {AnimationTimelineOwner} from '../runtime/animationTimelineOwner'
import {AnimationTimelineDocumentReader} from '../runtime/animationTimelineDocumentReader'
import type {AnimationWorld,AnimationResources,AnimationTimelinePorts} from '../runtime/animationTimelineContracts'
import {getLegacyAnimationTimelineRawPresentation,getLegacyAnimationRecordingObservers,installLegacyAnimationTimelinePort} from '../runtime/animationTimelineLegacy'
const presentation=reactive(getLegacyAnimationTimelineRawPresentation())
const authoring={listRecords:()=>assetState.records,writeText:updateTextAsset,createText:createTextAsset,assetReference}
const editorDocuments=new AnimationTimelineDocumentReader(createEditorGameplayScriptServices())
let legacyOwner:AnimationTimelineOwner|null=null
const getOwner=()=>{if(!legacyOwner)throw new Error('EDITOR_ANIMATION_OWNER_NOT_COMPOSED: Construct the actual Editor Runtime first.');return legacyOwner}
const legacyPort={documents:editorDocuments,authoring,presentationView:presentation,unwrapState:toRaw,getOwner}
installLegacyAnimationTimelinePort(legacyPort)
export function createEditorAnimationTimelineOwner(world:AnimationWorld,resources:AnimationResources,options:{legacyRoot:boolean},audio:Pick<RuntimeAudioOwner,'reconcileTimelineVoices'>=audioRuntime):AnimationTimelineOwner{
 const scheduler=new StableComponentScheduler()
 const ports:AnimationTimelinePorts={resources,unwrapEntity:toRaw,animatorIndices(entities){scheduler.synchronize(entities);return scheduler.indices('Animator')},audio:{reconcileTimelineVoices:(requests,entities)=>audio.reconcileTimelineVoices(requests,entities)},locale:{currentLocale:()=>localizationSettings.previewLocale,localize:localizeUiLabel},camera:{publishBlend:setTimelineCameraBlend},trace:{nowMilliseconds:()=>performance.now()},...(options.legacyRoot?{authoring}:{})}
 const owner=options.legacyRoot?new AnimationTimelineOwner(world,ports,presentation,getLegacyAnimationRecordingObservers()):new AnimationTimelineOwner(world,ports)
 if(options.legacyRoot)legacyOwner=owner
 return owner
}
export function getEditorAnimationTimelineOwner():AnimationTimelineOwner{return getOwner()}

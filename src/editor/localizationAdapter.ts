/** One live Editor locale bridge; fixed Runtime owners never import this module. */
import {reactive} from 'vue'
import {assetState,resolveAsset,readTextAsset} from '../assets/AssetDatabase'
import {createInitialLocalizationSettings,type LocalizationProjectSettings} from '../runtime/localizationValues'
import {RuntimeLocalizationOwner} from '../runtime/runtimeLocalizationOwner'
const identity=Object.freeze({scope:'Editor-live-localization'})
const settings=reactive<LocalizationProjectSettings>(createInitialLocalizationSettings())
let owner:RuntimeLocalizationOwner|null=null
export function getEditorLocalizationSettings():LocalizationProjectSettings{return settings}
export function getEditorLocalizationOwner():RuntimeLocalizationOwner {
 if(!owner||owner.isDisposed)owner=new RuntimeLocalizationOwner({identity,projectId:'editor-live',revision:()=>assetState.generation,listRecords:()=>assetState.records,resolveAsset,readTextAsset},settings,{mutableEditorCatalog:true,settingsView:settings})
 return owner
}

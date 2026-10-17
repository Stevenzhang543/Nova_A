/** Unique live Editor HUD bridge. Explicit Runtime owners never import this module. */
import {resolveAsset,resolveTexture,readTextAsset} from '../assets/AssetDatabase'
import {activeFontFallbackFamilies,activeTextDirection,localizationSettings,localize,localizeUiLabel} from '../runtime/localization'
import {runtimeAccessibilitySettings,uiAudioSettings} from '../runtime/presentation'
import {audioRuntime} from '../runtime/audio'
import {formatInputPrompt,inputPromptForAction,setInputModality} from '../runtime/inputModality'
import {bindUiReadPorts,type UiReadPorts} from '../runtime/uiReadPorts'
import {createUiThemeReader} from '../runtime/uiThemeValues'
import {createUiTextPresenter} from '../runtime/uiTextPresentationValues'
const identity=Object.freeze({scope:'Editor-live-UI'})
let reads:UiReadPorts|null=null
export function getEditorUiReadPorts():UiReadPorts {
 if(!reads)reads=bindUiReadPorts({identity,projectId:'editor-live',resolveAsset,resolveTexture,readTextAsset,
 fontMetadata(reference){const asset=resolveAsset(reference);return asset?.assetType==='font'?{family:asset.fontFamily,fallbackFamilies:asset.settings.fontSettings.fallbackFamilies,outlineWidth:asset.settings.fontSettings.outlineWidth}:null},
 getPreviewLocale:()=>localizationSettings.previewLocale,activeFontFallbackFamilies,activeTextDirection,localize,localizeUiLabel,
 formatInputPrompt,inputPromptForAction,setInputModality,nowMilliseconds:()=>performance.now(),getGamepads:()=>typeof navigator==='undefined'||!navigator.getGamepads?null:navigator.getGamepads()})
 return reads
}
export function getEditorUiAudio(){return audioRuntime}
export function getEditorUiPresentation(){return {accessibility:runtimeAccessibilitySettings,uiAudio:uiAudioSettings}}
let themes:ReturnType<typeof createUiThemeReader>|null=null,text:ReturnType<typeof createUiTextPresenter>|null=null
export function getEditorUiThemeReader(){return themes??=createUiThemeReader(getEditorUiReadPorts())}
export function getEditorUiTextPresenter(){return text??=createUiTextPresenter(getEditorUiReadPorts(),()=>runtimeAccessibilitySettings)}

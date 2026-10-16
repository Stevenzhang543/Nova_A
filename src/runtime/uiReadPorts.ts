/** Explicit HUD reads. Owners require a fixed caller-owned bundle; no Editor default or media readiness claim. */
import type { InputAction } from './input'
import type { InputModality, InputPromptDescriptor, InputPromptStyle } from './inputModality'
import type { RuntimePresentationState } from './presentationOwner'
export interface UiTextureRead { readonly key:string;readonly revision?:string|number;readonly source:TexImageSource;readonly uv:{readonly x:number;readonly y:number;readonly width:number;readonly height:number} }
export interface UiFontMetadata {readonly family:string;readonly fallbackFamilies:readonly string[];readonly outlineWidth:number}
export interface UiReadPorts {
 readonly identity:object
 readonly projectId:string
 resolveTexture(reference:string|null|undefined):UiTextureRead|null
 fontMetadata(reference:string|null|undefined):UiFontMetadata|null
 resolveAsset(reference:string|null|undefined):{readonly uuid:string;readonly assetType:string}|null
 readTextAsset(reference:string|null|undefined):string|null
 getPreviewLocale():string
 activeTextDirection(locale?:string):'ltr'|'rtl'
 activeFontFallbackFamilies(locale?:string):readonly string[]
 localize(key:string,variables?:Record<string,string|number|boolean>,fallback?:string,locale?:string):string
 localizeUiLabel(value:string,locale?:string):string
 setInputModality(modality:InputModality,gamepadId?:string):void
 inputPromptForAction(action:string,actions:InputAction[]):InputPromptDescriptor
 formatInputPrompt(descriptor:InputPromptDescriptor,style?:InputPromptStyle):string
 nowMilliseconds():number
 getGamepads():ArrayLike<Gamepad|null>|null
}
export interface UiAudioRead {playUiClip(reference:string|null|undefined,bus?:string):boolean}
export type UiPresentationRead=()=>Pick<RuntimePresentationState,'accessibility'|'uiAudio'>
/** Bind receiver once, retain only the exact capabilities and caller identity. No second clock, world or registry. */
export function bindUiReadPorts(ports:UiReadPorts):UiReadPorts {
 if(!ports||!ports.identity||typeof ports.projectId!=='string'||!ports.projectId)throw new Error('UI_READ_PORTS_REQUIRED')
 const methods=['resolveTexture','fontMetadata','resolveAsset','readTextAsset','getPreviewLocale','activeTextDirection','activeFontFallbackFamilies','localize','localizeUiLabel','setInputModality','inputPromptForAction','formatInputPrompt','nowMilliseconds','getGamepads'] as const
 for(const name of methods)if(typeof ports[name]!=='function')throw new Error('UI_READ_PORT_REQUIRED: '+name)
 return Object.freeze({identity:ports.identity,projectId:ports.projectId,
 resolveTexture:ports.resolveTexture.bind(ports),fontMetadata:ports.fontMetadata.bind(ports),resolveAsset:ports.resolveAsset.bind(ports),readTextAsset:ports.readTextAsset.bind(ports),
 getPreviewLocale:ports.getPreviewLocale.bind(ports),activeTextDirection:ports.activeTextDirection.bind(ports),activeFontFallbackFamilies:ports.activeFontFallbackFamilies.bind(ports),localize:ports.localize.bind(ports),localizeUiLabel:ports.localizeUiLabel.bind(ports),
 setInputModality:ports.setInputModality.bind(ports),inputPromptForAction:ports.inputPromptForAction.bind(ports),formatInputPrompt:ports.formatInputPrompt.bind(ports),nowMilliseconds:ports.nowMilliseconds.bind(ports),getGamepads:ports.getGamepads.bind(ports)})
}

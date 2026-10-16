/** Pure compatibility presentation port. Project settings retain their original global public API. */
import {createInitialRuntimePresentationState,RuntimePresentationOwner,normalizeRuntimeAccessibilitySettings,normalizeUiAudioSettings,type RuntimeAccessibilitySettings,type UiAudioSettings,type RuntimeCaption} from './presentationOwner'
export type {RuntimeAccessibilitySettings,UiAudioSettings,RuntimeCaption} from './presentationOwner'
export {normalizeRuntimeAccessibilitySettings,normalizeUiAudioSettings} from './presentationOwner'
const rawState=createInitialRuntimePresentationState()
export let runtimeAccessibilitySettings:RuntimeAccessibilitySettings=rawState.accessibility
export let uiAudioSettings:UiAudioSettings=rawState.uiAudio
export let runtimeCaptions:RuntimeCaption[]=rawState.captions
export function getLegacyPresentationRawState(){return rawState}
export interface LegacyPresentationPort {accessibilityView:RuntimeAccessibilitySettings;uiAudioView:UiAudioSettings;captionsView:RuntimeCaption[];unwrapState<T>(value:T):T;getOwner():RuntimePresentationOwner}
let port:LegacyPresentationPort|null=null
export function installLegacyPresentationPort(next:LegacyPresentationPort):void {
 if(port){if(port===next)return;throw new Error('PRESENTATION_PORT_ALREADY_INSTALLED')}
 if(!next||typeof next.getOwner!=='function'||typeof next.unwrapState!=='function'||next.unwrapState(next.accessibilityView)!==rawState.accessibility||next.unwrapState(next.uiAudioView)!==rawState.uiAudio||next.unwrapState(next.captionsView)!==rawState.captions)throw new Error('PRESENTATION_PORT_SAME_RAW_REQUIRED')
 port=next;runtimeAccessibilitySettings=next.accessibilityView;uiAudioSettings=next.uiAudioView;runtimeCaptions=next.captionsView
}
function requireOwner():RuntimePresentationOwner {if(!port)throw new Error('PRESENTATION_LEGACY_PORT_REQUIRED');const owner=port.getOwner();if(!(owner instanceof RuntimePresentationOwner)||owner.state.accessibility!==runtimeAccessibilitySettings||owner.state.uiAudio!==uiAudioSettings||owner.state.captions!==runtimeCaptions)throw new Error('PRESENTATION_LEGACY_OWNER_VIEW_MISMATCH');return owner}
export function setRuntimeCaptionTime(seconds:number|null):void {requireOwner().setRuntimeCaptionTime(seconds)}
export function publishRuntimeCaption(caption:Omit<RuntimeCaption,'id'|'startedAt'>&{id?:string}):string{return requireOwner().publishRuntimeCaption(caption)}
export function dismissRuntimeCaption(id:string):void {requireOwner().dismissRuntimeCaption(id)}
export function activeRuntimeCaptions(now?:number):RuntimeCaption[]{return requireOwner().activeRuntimeCaptions(now)}
// Project document configuration remains global and may load before any World/Core exists.


/** 执行时调用 Object.assign(runtimeAccessibilitySettings, normalizeRuntimeAccessibilitySettings(source))；不显式返回调用结果。 */ export function loadRuntimeAccessibilitySettings(source: unknown): void {
  Object.assign(runtimeAccessibilitySettings, normalizeRuntimeAccessibilitySettings(source))
}

/* 调用 normalizeRuntimeAccessibilitySettings(runtimeAccessibilitySettings) 并返回调用结果。 */ export function serializeRuntimeAccessibilitySettings(): RuntimeAccessibilitySettings {
  return normalizeRuntimeAccessibilitySettings(runtimeAccessibilitySettings)
}
/** 执行时调用 Object.assign(uiAudioSettings, normalizeUiAudioSettings(source))；不显式返回调用结果。 */ export function loadUiAudioSettings(source: unknown): void { Object.assign(uiAudioSettings, normalizeUiAudioSettings(source)) }
/* 调用 normalizeUiAudioSettings(uiAudioSettings) 并返回调用结果。 */ export function serializeUiAudioSettings(): UiAudioSettings { return normalizeUiAudioSettings(uiAudioSettings) }

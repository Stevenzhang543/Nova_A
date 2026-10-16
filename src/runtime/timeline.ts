/** Pure temporary legacy facade; actual fixed-World execution is TimelineOwner. */
import type {AssetRecord} from './runtimeAssetRecordContracts'
import {defaultTimeline} from './timelineDocuments'
import type {TimelineOwner} from './timelineOwner'
import {legacyAnimationAuthoring,legacyAnimationDocuments,requireLegacyAnimationTimelineOwner} from './animationTimelineLegacy'
export * from './timelineDocuments'
export {timelinePresentationState} from './animationTimelineLegacy'
export function readTimeline(reference:string|null){return legacyAnimationDocuments().readTimeline(reference)}

/* 调用 legacyAnimationAuthoring().createText(name, 'timeline', JSON.stringify(defaultTimeline(name), null, 2), 'Assets/Timelines') 并返回调用结果。 */ export function createTimelineAsset(name = 'New Timeline'): AssetRecord { return legacyAnimationAuthoring().createText(name, 'timeline', JSON.stringify(defaultTimeline(name), null, 2), 'Assets/Timelines') }
/* 调用 legacyAnimationAuthoring().assetReference(asset.uuid) 并返回调用结果。 */ export function timelineAssetReference(asset: AssetRecord): string { return legacyAnimationAuthoring().assetReference(asset.uuid) }
export const timelineRuntime=new Proxy({} as TimelineOwner,{get(_target,key){const owner=requireLegacyAnimationTimelineOwner().timeline,value=Reflect.get(owner,key,owner);if(typeof value!=='function'||key==='onEvent'||key==='onCommand')return value;return value.bind(owner)},set(_target,key,value){const owner=requireLegacyAnimationTimelineOwner().timeline;return Reflect.set(owner,key,value,owner)}})

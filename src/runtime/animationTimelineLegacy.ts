/** Temporary single-root legacy bridge; pure registration never allocates a World or invokes the Owner getter. */
import type {AnimationTimelineOwner} from './animationTimelineOwner'
import type {AnimationTimelineDocumentReader} from './animationTimelineDocumentReader'
import {createInitialTimelinePresentation,type TimelinePresentation,type AnimationAuthoring,type AnimationRecordingObservers} from './animationTimelineContracts'
const rawPresentation=createInitialTimelinePresentation()
export let timelinePresentationState:TimelinePresentation=rawPresentation
const observers:AnimationRecordingObservers=new Set()
export interface LegacyAnimationTimelinePort{documents:AnimationTimelineDocumentReader;authoring:AnimationAuthoring;presentationView:TimelinePresentation;unwrapState(value:unknown):unknown;getOwner():AnimationTimelineOwner}
let installed:LegacyAnimationTimelinePort|null=null
export function getLegacyAnimationTimelineRawPresentation():TimelinePresentation{return rawPresentation}
export function getLegacyAnimationRecordingObservers():AnimationRecordingObservers{return observers}
export function installLegacyAnimationTimelinePort(port:LegacyAnimationTimelinePort):void{
 if(!port||typeof port.getOwner!=='function'||typeof port.unwrapState!=='function'||!port.documents||!port.authoring)throw new Error('ANIMATION_TIMELINE_LEGACY_PORT_REQUIRED')
 if(port.unwrapState(port.presentationView)!==rawPresentation)throw new Error('ANIMATION_TIMELINE_SAME_RAW_REQUIRED')
 if(installed){if(installed!==port)throw new Error('ANIMATION_TIMELINE_LEGACY_ALREADY_INSTALLED');return}
 installed=port;timelinePresentationState=port.presentationView
}
export function requireLegacyAnimationTimelineOwner():AnimationTimelineOwner{if(!installed)throw new Error('ANIMATION_TIMELINE_LEGACY_PORT_REQUIRED');const owner=installed.getOwner();if(!owner||owner.presentation!==timelinePresentationState)throw new Error('ANIMATION_TIMELINE_SAME_RAW_REQUIRED');return owner}
export function legacyAnimationDocuments():AnimationTimelineDocumentReader{if(!installed)throw new Error('ANIMATION_TIMELINE_LEGACY_PORT_REQUIRED');return installed.documents}
export function legacyAnimationAuthoring():AnimationAuthoring{if(!installed)throw new Error('ANIMATION_AUTHORING_PORT_REQUIRED');return installed.authoring}
export function legacyAnimationUnwrap(value:unknown):unknown{if(!installed)throw new Error('ANIMATION_TIMELINE_LEGACY_PORT_REQUIRED');return installed.unwrapState(value)}
export function observeLegacyAnimationRecordingReset(observer:AnimationRecordingObservers extends Set<infer T>?T:never):()=>void{observers.add(observer);return()=>observers.delete(observer)}

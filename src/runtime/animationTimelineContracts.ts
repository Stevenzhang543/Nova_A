/** Fixed animation-world ports. No Editor, DOM owner, default resource or simulation clock. */
import type { Entity } from '../world/Entity'
import type { AssetRecord } from './runtimeAssetRecordContracts'
import type { GameplayScriptServices } from './scriptServices'
import type { AnimationClipDocument } from './animationDocuments'
import type { ActiveTimelineSubtitle, ActiveTimelineCameraBlend } from './timelineDocuments'
export interface AnimationWorld { readonly entities: Entity[] }
export type AnimationResources = Pick<GameplayScriptServices, 'resolveAsset' | 'readSource' | 'revision'>
export interface TimelinePresentation { subtitles:ActiveTimelineSubtitle[];cameraBlends:ActiveTimelineCameraBlend[];processedClips:number;nestedDepth:number;lastUpdateMs:number;longTimelineWarning:string;diagnostics:string[];eventOrder:string[] }
export interface TimelineVoiceRequest {key:string;ownerUuid:string;entity:Entity;reference:string;time:number;playbackRate:number;gain:number;playing:boolean}
export interface AnimationAuthoring { listRecords(): readonly AssetRecord[];writeText(uuid:string,source:string):boolean;createText(name:string,type:'animation'|'controller'|'animationMask'|'timeline',source:string,folder:string):AssetRecord;assetReference(uuid:string):string }
export interface AnimationTimelinePorts {
 resources:AnimationResources
 unwrapEntity(value:unknown):unknown
 animatorIndices(entities:Entity[]):Uint32Array|null
 audio:{reconcileTimelineVoices(requests:readonly TimelineVoiceRequest[],entities:Entity[]):Array<{key:string;message:string}>}
 locale:{currentLocale():string;localize(text:string,locale:string):string}
 camera:{publishBlend(value:{fromEntityUuid:string|null;toEntityUuid:string;weight:number}|null):void}
 trace:{nowMilliseconds():number}
 authoring?:AnimationAuthoring
}
export function createInitialTimelinePresentation():TimelinePresentation{return{subtitles:[],cameraBlends:[],processedClips:0,nestedDepth:0,lastUpdateMs:0,longTimelineWarning:'',diagnostics:[],eventOrder:[]}}
export function validateAnimationTimelinePorts(world:AnimationWorld,ports:AnimationTimelinePorts):void{
 if(!world||!Array.isArray(world.entities)||!ports||typeof ports.unwrapEntity!=='function'||typeof ports.animatorIndices!=='function'||typeof ports.resources?.resolveAsset!=='function'||typeof ports.resources.readSource!=='function'||typeof ports.resources.revision!=='function'||typeof ports.audio?.reconcileTimelineVoices!=='function'||typeof ports.locale?.currentLocale!=='function'||typeof ports.locale.localize!=='function'||typeof ports.camera?.publishBlend!=='function'||typeof ports.trace?.nowMilliseconds!=='function')throw new Error('ANIMATION_TIMELINE_PORTS_REQUIRED: Supply fixed World and complete real capabilities.')
 if(ports.authoring&&[ports.authoring.listRecords,ports.authoring.writeText,ports.authoring.createText,ports.authoring.assetReference].some(value=>typeof value!=='function'))throw new Error('ANIMATION_AUTHORING_PORT_REQUIRED: Supply the complete optional authoring capability.')
}
export function assertAnimationWorldEntities(world:AnimationWorld,ports:AnimationTimelinePorts,entities:Entity[]):void{
 if(entities===world.entities)return
 const members=new Set(world.entities.map(value=>ports.unwrapEntity(value)))
 if(!Array.isArray(entities)||entities.some(value=>!members.has(ports.unwrapEntity(value))))throw new Error('ANIMATION_WORLD_ENTITIES_MISMATCH: Foreign or detached Entity input is not owned by this World.')
}
export type AnimationRecordingObservers = Set<(document:AnimationClipDocument)=>void>

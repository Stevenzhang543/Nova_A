/** Temporary single-root legacy API. All runtime hooks/state live in the composed pool Owner. */
import type {Entity} from '../world/Entity'
import type {Vec2} from '../world/types'
import {requireLegacyWorldGameplayOwner} from './worldGameplay'
function owner(){return requireLegacyWorldGameplayOwner().objectPoolOwner}
export let emitPoolSignal:(name:string,entity:Entity)=>void=(name,entity)=>owner().emitPoolSignal(name,entity)
export function setPoolSignalEmitter(emitter:typeof emitPoolSignal):void{owner().setPoolSignalEmitter(emitter)}
export function setPoolRuntimeHooks(hooks:{beforeRelease?:(entities:readonly Entity[])=>void;clock?:()=>number}={}):void{owner().setPoolRuntimeHooks(hooks)}
export function hasObjectPool(prefab:string):boolean{return owner().hasObjectPool(prefab)}
export function prepareObjectPools():void{owner().prepareObjectPools()}
export function acquirePooled(prefab:string,position:Vec2):Entity[]|null{return owner().acquirePooled(prefab,position)}
export function releasePooled(entity:Entity):boolean{return owner().releasePooled(entity)}
export function updateObjectPools(nowSeconds?:number):void{owner().updateObjectPools(nowSeconds)}
export function objectPoolDiagnostics(){return owner().objectPoolDiagnostics()}
export function resetObjectPools():void{owner().resetObjectPools()}

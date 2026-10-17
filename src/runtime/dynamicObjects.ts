/** Temporary single-root legacy API; explicit Core uses the fixed composed child. */
import type {Entity} from '../world/Entity'
import type {RuntimeEntityHandle,RuntimeEntitySnapshot,PendingEntityResolution,SpawnTransform,TargetMutation} from './dynamicObjectsOwner'
import {requireLegacyWorldGameplayOwner} from './worldGameplay'
export {runtimeHandleGeneration} from './dynamicObjectsOwner'
export type {RuntimeEntityHandle,RuntimeEntitySnapshot,PendingEntityResolution,SpawnTransform,TargetMutation} from './dynamicObjectsOwner'
function owner(){return requireLegacyWorldGameplayOwner().dynamicObjectsOwner}
export function runtimeSceneEntitySnapshots(entities:readonly Entity[]):RuntimeEntitySnapshot[]{return owner().runtimeSceneEntitySnapshots(entities)}
export function spawnRuntimePrefab(reference:string,transform:SpawnTransform,invalidateRuntime=true):Entity|null{return owner().spawnRuntimePrefab(reference,transform,invalidateRuntime)}
export function resolveRuntimeHandle(handle:RuntimeEntityHandle,pending:ReadonlyMap<string,PendingEntityResolution>):Entity|null{return owner().resolveRuntimeHandle(handle,pending)}
export function applyTargetMutation(entity:Entity,mutation:TargetMutation):boolean{return owner().applyTargetMutation(entity,mutation)}

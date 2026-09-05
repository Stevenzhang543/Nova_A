import { assetReference, resolveAsset } from '../assets/AssetDatabase'
import { beginHistoryTransaction,cancelHistoryTransaction,commitHistoryTransaction,physicsState } from '../store/physics'
import { createObjectBlueprintAsset,createObjectBlueprintFromEntity,defaultObjectBlueprint,instantiateObjectBlueprint,validateObjectBlueprint } from '../runtime/objectBlueprints'
import type { Entity } from '../world/Entity'

function transaction<T>(label:string,operation:()=>T):T {
  if(physicsState.playMode!=='editing'||!beginHistoryTransaction(label))throw Error('Object authoring requires the editor to be stopped.')
  try{const result=operation();commitHistoryTransaction();return result}catch(error){cancelHistoryTransaction();throw error}
}
export function authorBlueprintFromEntity(entity:Entity,eventSheetAsset?:string|null):string {
  if(!physicsState.world.entities.includes(entity))throw Error('The selected authoring object is no longer in this scene.')
  return transaction('Create Object Blueprint from selected object',()=>{const reference=createObjectBlueprintFromEntity(entity,eventSheetAsset),record=resolveAsset(reference);if(!record)throw Error('Object Blueprint creation failed.');return record.uuid})
}
export function authorDerivedBlueprint(uuid:string,name:string):string {
  const base=resolveAsset(uuid);if(!base||base.assetType!=='objectBlueprint')throw Error('The base blueprint is missing.')
  const reference=assetReference(base.uuid),issues=validateObjectBlueprint(reference).filter(issue=>issue.severity==='error');if(issues.length)throw Error(issues.map(issue=>issue.message).join('\n'))
  return transaction('Create derived Object Blueprint',()=>{const document=defaultObjectBlueprint(name);document.baseBlueprintAsset=reference;return createObjectBlueprintAsset(document).uuid})
}
export function authorBlueprintInstance(uuid:string):Entity[]{
  const record=resolveAsset(uuid);if(!record||record.assetType!=='objectBlueprint')throw Error('The Object Blueprint is missing.')
  return transaction('Instantiate Object Blueprint',()=>{const instances=instantiateObjectBlueprint(assetReference(record.uuid));if(!instances.length)throw Error('Object Blueprint instantiation failed.');return instances})
}

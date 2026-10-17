/** 对象蓝图编辑操作：将蓝图创建、派生和实例化纳入项目编辑事务。 */
import { assetReference, resolveAsset } from '../assets/AssetDatabase'
import { beginHistoryTransaction,cancelHistoryTransaction,commitHistoryTransaction,physicsState } from '../store/physics'
import { createObjectBlueprintAsset,createObjectBlueprintFromEntity,defaultObjectBlueprint,instantiateObjectBlueprint,validateObjectBlueprint } from '../runtime/objectBlueprints'
import type { Entity } from '../world/Entity'

/** 要求编辑模式且可开启历史事务，成功则提交，操作失败时撤销事务并重新抛错。 */ function transaction<T>(label:string,operation:()=>T):T {
  if(physicsState.playMode!=='editing'||!beginHistoryTransaction(label))throw Error('Object authoring requires the editor to be stopped.')
  try{const result=operation();commitHistoryTransaction();return result}catch(error){cancelHistoryTransaction();throw error}
}
/** 确认实体仍属于当前场景，再在历史事务中从其当前状态创建对象蓝图。 */ export function authorBlueprintFromEntity(entity:Entity,eventSheetAsset?:string|null):string {
  if(!physicsState.world.entities.includes(entity))throw Error('The selected authoring object is no longer in this scene.')
  return transaction('Create Object Blueprint from selected object',/** 创建实体蓝图并解析生成资源，无法获得资源记录时抛错以触发事务回滚。 */ ()=>{const reference=createObjectBlueprintFromEntity(entity,eventSheetAsset),record=resolveAsset(reference);if(!record)throw Error('Object Blueprint creation failed.');return record.uuid})
}
/** 验证基础蓝图存在且无错误，再创建指向基础资源的派生蓝图。 */ export function authorDerivedBlueprint(uuid:string,name:string):string {
  const base=resolveAsset(uuid);if(!base||base.assetType!=='objectBlueprint')throw Error('The base blueprint is missing.')
  const reference=assetReference(base.uuid),issues=validateObjectBlueprint(reference).filter(/* 比较 issue.severity 与 'error'，返回严格相等的判断结果。 */ issue=>issue.severity==='error');if(issues.length)throw Error(issues.map(/* 返回 issue.message 的当前值。 */ issue=>issue.message).join('\n'))
  return transaction('Create derived Object Blueprint',/** 建立默认派生蓝图并设置基础蓝图引用，返回新资源标识。 */ ()=>{const document=defaultObjectBlueprint(name);document.baseBlueprintAsset=reference;return createObjectBlueprintAsset(document).uuid})
}
/** 确认对象蓝图资源存在，在历史事务内实例化并拒绝空结果。 */ export function authorBlueprintInstance(uuid:string):Entity[]{
  const record=resolveAsset(uuid);if(!record||record.assetType!=='objectBlueprint')throw Error('The Object Blueprint is missing.')
  return transaction('Instantiate Object Blueprint',/** 生成蓝图实例，要求至少一个实体后返回实例集合。 */ ()=>{const instances=instantiateObjectBlueprint(assetReference(record.uuid));if(!instances.length)throw Error('Object Blueprint instantiation failed.');return instances})
}

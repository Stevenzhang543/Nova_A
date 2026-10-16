/** Editor rig/skin authoring facade; independent Runtime binds RuntimeRiggingOwner explicitly. */
import { assetReference, assetState, createTextAsset, readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import type { SpriteRenderer2D } from '../world/components'
import type { Entity } from '../world/Entity'
import { defaultRig, defaultSkin } from './riggingValues'
import { RuntimeRiggingOwner } from './runtimeRiggingOwner'
export {defaultRig,defaultSkin,normalizeRig,normalizeSkin,evaluateRigPose,retargetPose,autoWeightSkin,skinWeightHeat,retargetPreviewSummary,resolveRigAttachments} from './riggingValues'
export type {RigBone2D,RigIkChain2D,RigConstraint2D,RigAttachment2D,RigDocument,SkinWeight2D,SkinVertex2D,SkinDocument,SkinnedMesh2D,AutoWeightResult,BoneWorld} from './riggingValues'
let legacyRiggingOwner:RuntimeRiggingOwner|null=null
function editorRiggingOwner():RuntimeRiggingOwner {
 if(!legacyRiggingOwner)legacyRiggingOwner=new RuntimeRiggingOwner({identity:assetState,projectId:'editor-authoring-rigging',revision:()=>assetState.generation,resolveAsset,readTextAsset},{mutableEditorCatalog:true})
 return legacyRiggingOwner
}
export function readRig(reference:string|null){return editorRiggingOwner().readRig(reference)}
export function readSkin(reference:string|null){return editorRiggingOwner().readSkin(reference)}
export function deformSkin(entity:Entity,sprite:SpriteRenderer2D){return editorRiggingOwner().deformSkin(entity,sprite)}


/* 调用 createTextAsset(name, 'rig', JSON.stringify(defaultRig(name), null, 2), 'Assets/Rigs') 并返回调用结果。 */ export function createRigAsset(name = 'New Rig'): AssetRecord { return createTextAsset(name, 'rig', JSON.stringify(defaultRig(name), null, 2), 'Assets/Rigs') }
/* 调用 createTextAsset(name, 'skin', JSON.stringify(defaultSkin(name), null, 2), 'Assets/Skins') 并返回调用结果。 */ export function createSkinAsset(name = 'New Skin'): AssetRecord { return createTextAsset(name, 'skin', JSON.stringify(defaultSkin(name), null, 2), 'Assets/Skins') }
/* 调用 assetReference(asset.uuid) 并返回调用结果。 */ export function rigAssetReference(asset: AssetRecord): string { return assetReference(asset.uuid) }

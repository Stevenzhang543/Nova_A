/** One fixed resource namespace, retaining original cache and deformation algorithms. */
import { normalizeRig, normalizeSkin, buildWorld, poseWorld } from './riggingValues'
import type { RigDocument, SkinDocument, BoneWorld, SkinnedMesh2D } from './riggingValues'
import type { SpriteRenderer2D, Skeleton2D } from '../world/components'
import type { Entity } from '../world/Entity'
export interface RuntimeRiggingCatalog {
 readonly identity:object
 readonly projectId:string
 revision():number
 resolveAsset(reference:string|null|undefined):{readonly uuid:string;readonly assetType:string}|null
 readTextAsset(reference:string|null|undefined):string|null
}
export interface RuntimeRiggingOptions {readonly mutableEditorCatalog?:boolean}
function createRiggingAlgorithms(catalog:RuntimeRiggingCatalog,assertCurrent:()=>void) {
 const resolve=catalog.resolveAsset.bind(catalog),read=catalog.readTextAsset.bind(catalog),revision=catalog.revision.bind(catalog)
 const resolveAsset=(reference:string|null|undefined)=>{assertCurrent();const value=resolve(reference);assertCurrent();return value}
 const readTextAsset=(reference:string|null|undefined)=>{assertCurrent();const value=read(reference);assertCurrent();return value}
 const assetState={get generation(){assertCurrent();return revision()}}


/** 结构说明（自动提取）：parseAsset；输入 reference、type、normalize；直接调用 resolveAsset、readTextAsset、normalize、JSON.parse。 */ function parseAsset<T>(reference: string | null, type: 'rig' | 'skin', normalize: (source: unknown) => T): T | null {
  const asset = resolveAsset(reference); const source = readTextAsset(reference)
  if (!asset || asset.assetType !== type || !source) return null
  try { return normalize(JSON.parse(source)) } catch { return null }
}

const rigCache = new Map<string, { generation: number; value: RigDocument | null }>()
const skinCache = new Map<string, { generation: number; value: SkinDocument | null }>()
let rigCacheGeneration=-1
/** 结构说明（自动提取）：refreshRigCaches；无显式参数；直接调用 rigCache.clear、skinCache.clear、cache.delete、next、cache.keys；写入 rigCacheGeneration；包含循环处理。 */ function refreshRigCaches():void{if(rigCacheGeneration!==assetState.generation){rigCache.clear();skinCache.clear();rigCacheGeneration=assetState.generation}for(const cache of [rigCache,skinCache])while(cache.size>=128)cache.delete(cache.keys().next().value!)}

/** 结构说明（自动提取）：readRig；输入 reference；直接调用 refreshRigCaches、rigCache.get、parseAsset、rigCache.set；返回路径包含 cached.value、value。 */ function readRig(reference: string | null): RigDocument | null {
  if (!reference) return null
  refreshRigCaches()
  const cached = rigCache.get(reference); if (cached?.generation === assetState.generation) return cached.value
  const value = parseAsset(reference, 'rig', normalizeRig); rigCache.set(reference, { generation: assetState.generation, value }); return value
}

/** 结构说明（自动提取）：readSkin；输入 reference；直接调用 refreshRigCaches、skinCache.get、parseAsset、skinCache.set；返回路径包含 cached.value、value。 */ function readSkin(reference: string | null): SkinDocument | null {
  if (!reference) return null
  refreshRigCaches()
  const cached = skinCache.get(reference); if (cached?.generation === assetState.generation) return cached.value
  const value = parseAsset(reference, 'skin', normalizeSkin); skinCache.set(reference, { generation: assetState.generation, value }); return value
}

/** 结构说明（自动提取）：deformSkin；输入 entity、sprite；直接调用 entity.getComponent、readRig、readSkin、resolveAsset、poseWorld 等。 */ function deformSkin(entity: Entity, sprite: SpriteRenderer2D): SkinnedMesh2D | null {
  const skeleton = entity.getComponent<Skeleton2D>('Skeleton2D')
  if (!skeleton?.enabled || !skeleton.previewEnabled) return null
  const rig = readRig(skeleton.rigAsset); const skin = readSkin(skeleton.skinAsset)
  if (!rig || !skin || skin.rigAsset && resolveAsset(skin.rigAsset)?.uuid !== resolveAsset(skeleton.rigAsset)?.uuid) return null
  const bones = poseWorld(rig, skeleton)
  const bindLocals = new Map<string, BoneWorld>(rig.bones.map(/** 结构说明（自动提取）：rig.bones.map 回调；输入 bone；返回表达式求值结果。 */ bone => [bone.id, { position: { ...bone.position }, rotation: bone.rotation, scale: { ...bone.scale } }] as [string, BoneWorld]))
  const bindBones = buildWorld(rig, bindLocals)
  const positions = skin.vertices.map(/** 结构说明（自动提取）：skin.vertices.map 回调；输入 vertex；直接调用 bones.get、bindBones.get、Math.cos、Math.sin、Math.abs；写入 x、y、total；包含循环处理。 */ vertex => {
    const source = { x: vertex.position.x * sprite.size.x, y: vertex.position.y * sprite.size.y }
    let x = 0, y = 0, total = 0
    for (const weight of vertex.weights) {
      const bone = bones.get(weight.boneId), bind = bindBones.get(weight.boneId); if (!bone || !bind) continue
      const bindCosine = Math.cos(-bind.rotation), bindSine = Math.sin(-bind.rotation)
      const dx = source.x - bind.position.x, dy = source.y - bind.position.y
      const localX = (dx * bindCosine - dy * bindSine) / (Math.abs(bind.scale.x)<1e-9?(bind.scale.x<0?-1e-9:1e-9):bind.scale.x) * bone.scale.x
      const localY = (dx * bindSine + dy * bindCosine) / (Math.abs(bind.scale.y)<1e-9?(bind.scale.y<0?-1e-9:1e-9):bind.scale.y) * bone.scale.y
      const cosine = Math.cos(bone.rotation), sine = Math.sin(bone.rotation)
      x += (bone.position.x + localX * cosine - localY * sine) * weight.weight
      y += (bone.position.y + localX * sine + localY * cosine) * weight.weight
      total += weight.weight
    }
    return total > 0 ? { x: x / total, y: y / total } : source
  })
  return { positions, uvs: skin.vertices.map(/** 构造并返回记录 { ...vertex.uv }，字段按当前实参及捕获状态求值。 */ vertex => ({ ...vertex.uv })), indices: [...skin.triangles] }
}
 return {readRig,readSkin,deformSkin,clearCaches(){rigCache.clear();skinCache.clear();rigCacheGeneration=-1},cacheStats(){return{rigs:rigCache.size,skins:skinCache.size,generation:rigCacheGeneration,limit:128}}}
}
type RiggingAlgorithms=ReturnType<typeof createRiggingAlgorithms>
export class RuntimeRiggingOwner {
 readonly token:object=Object.freeze({})
 readonly identity:object
 readonly projectId:string
 readonly catalogRevision:number
 private closed=false
 private readonly algorithms:RiggingAlgorithms
 constructor(readonly catalog:RuntimeRiggingCatalog,private readonly options:RuntimeRiggingOptions={}) {
  if(!catalog||!catalog.identity||typeof catalog.projectId!=='string'||!catalog.projectId||[catalog.revision,catalog.resolveAsset,catalog.readTextAsset].some(v=>typeof v!=='function'))throw new Error('RUNTIME_RIGGING_CATALOG_REQUIRED')
  this.identity=catalog.identity;this.projectId=catalog.projectId;this.catalogRevision=catalog.revision()
  if(!Number.isSafeInteger(this.catalogRevision)||this.catalogRevision<0)throw new Error('RUNTIME_RIGGING_REVISION_INVALID')
  this.algorithms=createRiggingAlgorithms(catalog,()=>this.assertCurrent())
 }
 get isDisposed():boolean{return this.closed}
 assertCurrent():void {
  if(this.closed)throw new Error('RUNTIME_RIGGING_OWNER_DISPOSED')
  const revision=this.catalog.revision()
  if(this.catalog.identity!==this.identity||this.catalog.projectId!==this.projectId||!Number.isSafeInteger(revision)||revision<0||!this.options.mutableEditorCatalog&&revision!==this.catalogRevision)throw new Error('RUNTIME_RIGGING_CATALOG_CHANGED')
 }
 readRig(...args:Parameters<RiggingAlgorithms['readRig']>):ReturnType<RiggingAlgorithms['readRig']>{this.assertCurrent();const value=this.algorithms.readRig(...args);this.assertCurrent();return value}
 readSkin(...args:Parameters<RiggingAlgorithms['readSkin']>):ReturnType<RiggingAlgorithms['readSkin']>{this.assertCurrent();const value=this.algorithms.readSkin(...args);this.assertCurrent();return value}
 deformSkin(...args:Parameters<RiggingAlgorithms['deformSkin']>):ReturnType<RiggingAlgorithms['deformSkin']>{this.assertCurrent();const value=this.algorithms.deformSkin(...args);this.assertCurrent();return value}
 cacheStats(){this.assertCurrent();return this.algorithms.cacheStats()}
 dispose():void{if(this.closed)return;this.closed=true;this.algorithms.clearCaches()}
}

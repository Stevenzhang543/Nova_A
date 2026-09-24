/** 二维骨骼绑定：规范骨骼、约束和蒙皮权重，计算姿态及变形数据。 */
import { assetReference, assetState, createTextAsset, readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import type { SpriteRenderer2D, Skeleton2D } from '../world/components'
import type { Entity } from '../world/Entity'
import { finiteNumber } from '../world/geometry'
import type { Vec2 } from '../world/types'

export interface RigBone2D {
  id: string
  name: string
  parentId: string | null
  position: Vec2
  rotation: number
  scale: Vec2
  length: number
}

export interface RigIkChain2D {
  id: string
  name: string
  endBoneId: string
  chainLength: number
  target: Vec2
  weight: number
  iterations: number
}

export interface RigConstraint2D {
  id: string
  boneId: string
  type: 'RotationLimit' | 'CopyRotation' | 'PositionLimit'
  targetBoneId: string | null
  minimum: Vec2
  maximum: Vec2
  weight: number
}
export interface RigAttachment2D { id: string; name: string; boneId: string; position: Vec2; rotation: number; allowedAssetTypes: string[] }

export interface RigDocument {
  version: 2
  name: string
  bones: RigBone2D[]
  ikChains: RigIkChain2D[]
  constraints: RigConstraint2D[]
  attachments: RigAttachment2D[]
  retargetAliases: Record<string, string>
}

export interface SkinWeight2D { boneId: string; weight: number }
export interface SkinVertex2D { position: Vec2; uv: Vec2; weights: SkinWeight2D[] }
export interface SkinDocument {
  version: 1
  name: string
  rigAsset: string | null
  vertices: SkinVertex2D[]
  triangles: number[]
}

export interface SkinnedMesh2D { positions: Vec2[]; uvs: Vec2[]; indices: number[] }
export interface AutoWeightResult { vertices: number; bones: number; influences: number; operations: number }

/** 结构说明（自动提取）：safeId；输入 value、fallback；直接调用 slice、replace、value.trim。 */ function safeId(value: unknown, fallback: string): string {
  const normalized = typeof value === 'string' ? value.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) : ''
  return normalized || fallback
}

/** 结构说明（自动提取）：vector；输入 value、fallback；直接调用 finiteNumber。 */ function vector(value: unknown, fallback: Vec2): Vec2 {
  const source = value && typeof value === 'object' ? value as Partial<Vec2> : {}
  return { x: finiteNumber(source.x, fallback.x), y: finiteNumber(source.y, fallback.y) }
}

/** 结构说明（自动提取）：defaultRig；输入 name。 */ export function defaultRig(name = 'New Rig'): RigDocument {
  return {
    version: 2,
    name,
    bones: [{ id: 'root', name: 'Root', parentId: null, position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, length: 1 }],
    ikChains: [],
    constraints: [], attachments: [], retargetAliases: { root: 'root' }
  }
}

/** 结构说明（自动提取）：defaultSkin；输入 name。 */ export function defaultSkin(name = 'New Skin'): SkinDocument {
  return {
    version: 1,
    name,
    rigAsset: null,
    vertices: [
      { position: { x: -.5, y: -.5 }, uv: { x: 0, y: 1 }, weights: [{ boneId: 'root', weight: 1 }] },
      { position: { x: .5, y: -.5 }, uv: { x: 1, y: 1 }, weights: [{ boneId: 'root', weight: 1 }] },
      { position: { x: .5, y: .5 }, uv: { x: 1, y: 0 }, weights: [{ boneId: 'root', weight: 1 }] },
      { position: { x: -.5, y: .5 }, uv: { x: 0, y: 0 }, weights: [{ boneId: 'root', weight: 1 }] }
    ],
    triangles: [0, 1, 2, 0, 2, 3]
  }
}

/** 结构说明（自动提取）：normalizeRig；输入 source；直接调用 Set、map、slice、Array.isArray、bones.push 等；写入 bone.parentId、retargetAliases[…]；包含循环处理；包含显式抛错路径。 */ export function normalizeRig(source: unknown): RigDocument {
  const item = source && typeof source === 'object' ? source as Partial<RigDocument> : {}
  const used = new Set<string>()
  const bones = (Array.isArray(item.bones) ? item.bones : []).slice(0, 512).map(/** 结构说明（自动提取）：map 回调；输入 bone、index；直接调用 safeId、used.has、used.add、bone.name.slice、vector 等；写入 id；包含循环处理。 */ (bone, index) => {
    let id = safeId(bone?.id, `bone_${index + 1}`)
    while (used.has(id)) id = `${id}_${index + 1}`
    used.add(id)
    return {
      id, name: typeof bone?.name === 'string' ? bone.name.slice(0, 80) : `Bone ${index + 1}`,
      parentId: typeof bone?.parentId === 'string' ? bone.parentId : null,
      position: vector(bone?.position, { x: index ? 1 : 0, y: 0 }),
      rotation: finiteNumber(bone?.rotation), scale: vector(bone?.scale, { x: 1, y: 1 }),
      length: Math.min(1e6, Math.max(1e-6, finiteNumber(bone?.length, 1)))
    }
  })
  if (!bones.length) bones.push(defaultRig().bones[0])
  const byId=new Map(bones.map(/* 返回按声明顺序构造的数组 [bone.id,bone]。 */ bone=>[bone.id,bone])),ordered:RigBone2D[]=[],visited=new Set<string>(),visiting=new Set<string>()
  for(const bone of bones)if(bone.parentId&&!byId.has(bone.parentId))bone.parentId=null
  const visit=/** 结构说明（自动提取）：visit；输入 bone；直接调用 visited.has、visiting.has、Error、visiting.add、visit 等；包含显式抛错路径。 */ (bone:RigBone2D)=>{if(visited.has(bone.id))return;if(visiting.has(bone.id))throw new Error('RIG_HIERARCHY_CYCLE: Bone parents must form an acyclic hierarchy.');visiting.add(bone.id);if(bone.parentId)visit(byId.get(bone.parentId)!);visiting.delete(bone.id);visited.add(bone.id);ordered.push(bone)}
  for(const bone of bones)visit(bone)
  bones.splice(0,bones.length,...ordered)
  const ikChains = (Array.isArray(item.ikChains) ? item.ikChains : []).slice(0, 128).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 chain、index；直接调用 used.has、String、safeId、chain.name.slice、Math.min 等。 */ (chain, index) => {
    if (!chain || !used.has(String(chain.endBoneId))) return []
    return [{
      id: safeId(chain.id, `ik_${index + 1}`), name: typeof chain.name === 'string' ? chain.name.slice(0, 80) : `IK ${index + 1}`,
      endBoneId: String(chain.endBoneId), chainLength: Math.min(64, Math.max(1, Math.round(finiteNumber(chain.chainLength, 2)))),
      target: vector(chain.target, { x: 2, y: 0 }), weight: Math.min(1, Math.max(0, finiteNumber(chain.weight, 1))),
      iterations: Math.min(64, Math.max(1, Math.round(finiteNumber(chain.iterations, 8))))
    }]
  })
  const constraints = (Array.isArray(item.constraints) ? item.constraints : []).slice(0, 256).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 constraint、index；直接调用 used.has、String、includes、safeId、vector 等。 */ (constraint, index) => {
    if (!constraint || !used.has(String(constraint.boneId))) return []
    const type = ['RotationLimit', 'CopyRotation', 'PositionLimit'].includes(String(constraint.type)) ? constraint.type as RigConstraint2D['type'] : 'RotationLimit'
    return [{
      id: safeId(constraint.id, `constraint_${index + 1}`), boneId: String(constraint.boneId), type,
      targetBoneId: typeof constraint.targetBoneId === 'string' && used.has(constraint.targetBoneId) ? constraint.targetBoneId : null,
      minimum: vector(constraint.minimum, { x: -Math.PI, y: -1e6 }), maximum: vector(constraint.maximum, { x: Math.PI, y: 1e6 }),
      weight: Math.min(1, Math.max(0, finiteNumber(constraint.weight, 1)))
    }]
  })
  const work=ikChains.filter(/* 比较 chain.weight 与 0，返回大于的判断结果。 */ chain=>chain.weight>0).reduce(/** 结构说明（自动提取）：reduce 回调；输入 sum、chain；直接调用 byId.get；写入 next；包含循环处理。 */ (sum,chain)=>{let depth=0,next:string|null=chain.endBoneId;while(next&&depth<chain.chainLength){depth++;next=byId.get(next)?.parentId??null}return sum+depth*chain.iterations*(bones.length+constraints.length)},bones.length*constraints.length)
  if(work>2000000)throw new Error('RIG_EVALUATION_LIMIT: This rig exceeds 2,000,000 estimated pose operations; reduce IK iterations or split the rig.')
  const attachments = (Array.isArray(item.attachments) ? item.attachments : []).slice(0, 256).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 attachment、index；直接调用 used.has、String、safeId、attachment.name.slice、vector 等；返回表达式求值结果。 */ (attachment, index) => attachment && used.has(String(attachment.boneId)) ? [{ id: safeId(attachment.id, `attachment_${index + 1}`), name: typeof attachment.name === 'string' ? attachment.name.slice(0, 80) : `Attachment ${index + 1}`, boneId: String(attachment.boneId), position: vector(attachment.position, { x: 0, y: 0 }), rotation: finiteNumber(attachment.rotation), allowedAssetTypes: [...new Set((Array.isArray(attachment.allowedAssetTypes) ? attachment.allowedAssetTypes : ['image', 'prefab']).flatMap(/* 根据 typeof value === 'string' 的真假，分别返回 [value.slice(0, 40)] 或 []。 */ value => typeof value === 'string' ? [value.slice(0, 40)] : []))].slice(0, 16) }] : [])
  const retargetAliases: Record<string, string> = {}
  if (item.retargetAliases && typeof item.retargetAliases === 'object' && !Array.isArray(item.retargetAliases)) for (const [alias, boneId] of Object.entries(item.retargetAliases).slice(0, 512)) if (typeof boneId === 'string' && used.has(boneId)) retargetAliases[safeId(alias, '')] = boneId
  for (const bone of bones) if (!Object.values(retargetAliases).includes(bone.id)) retargetAliases[safeId(bone.name.toLowerCase(), bone.id)] = bone.id
  return { version: 2, name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Rig', bones, ikChains, constraints, attachments, retargetAliases }
}

/** 结构说明（自动提取）：normalizeSkin；输入 source；直接调用 map、slice、Array.isArray、defaultSkin、rawTriangles.slice 等；写入 index；包含循环处理。 */ export function normalizeSkin(source: unknown): SkinDocument {
  const item = source && typeof source === 'object' ? source as Partial<SkinDocument> : {}
  const vertices = (Array.isArray(item.vertices) ? item.vertices : []).slice(0, 65_000).map(/** 结构说明（自动提取）：map 回调；输入 vertex；直接调用 flatMap、slice、Array.isArray、weights.reduce、weights.push 等。 */ vertex => {
    const weights = (Array.isArray(vertex?.weights) ? vertex.weights : []).slice(0, 8).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 weight；直接调用 Math.max、finiteNumber、safeId。 */ weight => {
      if (!weight || typeof weight.boneId !== 'string') return []
      const value = Math.max(0, finiteNumber(weight.weight))
      return value > 0 ? [{ boneId: safeId(weight.boneId, 'root'), weight: value }] : []
    })
    const total = weights.reduce(/* 计算表达式 sum + weight.weight 并返回结果，沿用操作数的原有类型规则。 */ (sum, weight) => sum + weight.weight, 0)
    if (!total) weights.push({ boneId: 'root', weight: 1 })
    else weights.forEach(/** 结构说明（自动提取）：weights.forEach 回调；输入 weight；写入 weight.weight。 */ weight => { weight.weight /= total })
    return { position: vector(vertex?.position, { x: 0, y: 0 }), uv: vector(vertex?.uv, { x: 0, y: 0 }), weights }
  })
  const fallback = defaultSkin()
  const safeVertices = vertices.length >= 3 ? vertices : fallback.vertices
  const rawTriangles=(Array.isArray(item.triangles)?item.triangles:[]).slice(0,195_000),triangles:number[]=[]
  for(let index=0;index+2<rawTriangles.length;index+=3){const triangle=rawTriangles.slice(index,index+3).map(/* 调用 Math.round(finiteNumber(value,-1)) 并返回调用结果。 */ value=>Math.round(finiteNumber(value,-1)));if(triangle.every(/* 先计算 value>=0；仅当其为真值时求右侧 value<safeVertices.length，返回短路求值结果。 */ value=>value>=0&&value<safeVertices.length))triangles.push(...triangle)}
  return {
    version: 1, name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Skin',
    rigAsset: typeof item.rigAsset === 'string' ? item.rigAsset : null,
    vertices: safeVertices, triangles: triangles.length ? triangles : safeVertices.length>=4 ? fallback.triangles : [0,1,2]
  }
}

/** 结构说明（自动提取）：parseAsset；输入 reference、type、normalize；直接调用 resolveAsset、readTextAsset、normalize、JSON.parse。 */ function parseAsset<T>(reference: string | null, type: 'rig' | 'skin', normalize: (source: unknown) => T): T | null {
  const asset = resolveAsset(reference); const source = readTextAsset(reference)
  if (!asset || asset.assetType !== type || !source) return null
  try { return normalize(JSON.parse(source)) } catch { return null }
}

const rigCache = new Map<string, { generation: number; value: RigDocument | null }>()
const skinCache = new Map<string, { generation: number; value: SkinDocument | null }>()
let rigCacheGeneration=-1
/** 结构说明（自动提取）：refreshRigCaches；无显式参数；直接调用 rigCache.clear、skinCache.clear、cache.delete、next、cache.keys；写入 rigCacheGeneration；包含循环处理。 */ function refreshRigCaches():void{if(rigCacheGeneration!==assetState.generation){rigCache.clear();skinCache.clear();rigCacheGeneration=assetState.generation}for(const cache of [rigCache,skinCache])while(cache.size>=128)cache.delete(cache.keys().next().value!)}

/** 结构说明（自动提取）：readRig；输入 reference；直接调用 refreshRigCaches、rigCache.get、parseAsset、rigCache.set；返回路径包含 cached.value、value。 */ export function readRig(reference: string | null): RigDocument | null {
  if (!reference) return null
  refreshRigCaches()
  const cached = rigCache.get(reference); if (cached?.generation === assetState.generation) return cached.value
  const value = parseAsset(reference, 'rig', normalizeRig); rigCache.set(reference, { generation: assetState.generation, value }); return value
}

/** 结构说明（自动提取）：readSkin；输入 reference；直接调用 refreshRigCaches、skinCache.get、parseAsset、skinCache.set；返回路径包含 cached.value、value。 */ export function readSkin(reference: string | null): SkinDocument | null {
  if (!reference) return null
  refreshRigCaches()
  const cached = skinCache.get(reference); if (cached?.generation === assetState.generation) return cached.value
  const value = parseAsset(reference, 'skin', normalizeSkin); skinCache.set(reference, { generation: assetState.generation, value }); return value
}

/* 调用 createTextAsset(name, 'rig', JSON.stringify(defaultRig(name), null, 2), 'Assets/Rigs') 并返回调用结果。 */ export function createRigAsset(name = 'New Rig'): AssetRecord { return createTextAsset(name, 'rig', JSON.stringify(defaultRig(name), null, 2), 'Assets/Rigs') }
/* 调用 createTextAsset(name, 'skin', JSON.stringify(defaultSkin(name), null, 2), 'Assets/Skins') 并返回调用结果。 */ export function createSkinAsset(name = 'New Skin'): AssetRecord { return createTextAsset(name, 'skin', JSON.stringify(defaultSkin(name), null, 2), 'Assets/Skins') }
/* 调用 assetReference(asset.uuid) 并返回调用结果。 */ export function rigAssetReference(asset: AssetRecord): string { return assetReference(asset.uuid) }

export interface BoneWorld { position: Vec2; rotation: number; scale: Vec2 }

/** 结构说明（自动提取）：buildWorld；输入 rig、locals；直接调用 Map、locals.get、result.get、result.set、Math.cos 等；返回路径包含 result；包含循环处理。 */ function buildWorld(rig: RigDocument, locals: Map<string, BoneWorld>): Map<string, BoneWorld> {
  const result = new Map<string, BoneWorld>()
  for (const bone of rig.bones) {
    const local = locals.get(bone.id) ?? { position: bone.position, rotation: bone.rotation, scale: bone.scale }
    const parent = bone.parentId ? result.get(bone.parentId) : null
    if (!parent) { result.set(bone.id, { position: { ...local.position }, rotation: local.rotation, scale: { ...local.scale } }); continue }
    const cosine = Math.cos(parent.rotation), sine = Math.sin(parent.rotation)
    const x = local.position.x * parent.scale.x, y = local.position.y * parent.scale.y
    result.set(bone.id, {
      position: { x: parent.position.x + x * cosine - y * sine, y: parent.position.y + x * sine + y * cosine },
      rotation: parent.rotation + local.rotation,
      scale: { x: parent.scale.x * local.scale.x, y: parent.scale.y * local.scale.y }
    })
  }
  return result
}

/** 结构说明（自动提取）：poseWorld；输入 rig、skeleton；直接调用 Map、skeleton.pose.map、rig.bones.map、applyLimits、buildWorld 等；写入 delta、local.rotation、result、boneId；包含循环处理。 */ function poseWorld(rig: RigDocument, skeleton: Skeleton2D): Map<string, BoneWorld> {
  const pose = new Map(skeleton.pose.map(/* 返回按声明顺序构造的数组 [item.boneId, item]。 */ item => [item.boneId, item]))
  const locals = new Map<string, BoneWorld>(rig.bones.map(/** 结构说明（自动提取）：rig.bones.map 回调；输入 bone；直接调用 pose.get、vector、finiteNumber。 */ bone => {
    const override = pose.get(bone.id)
    return [bone.id, {
      position: override ? vector(override.position, bone.position) : { ...bone.position },
      rotation: override ? finiteNumber(override.rotation, bone.rotation) : bone.rotation,
      scale: override ? vector(override.scale, bone.scale) : { ...bone.scale }
    }] as [string, BoneWorld]
  }))
  const applyLimits=/** 结构说明（自动提取）：applyLimits；输入 boneId、hardOnly；直接调用 locals.get、bound；写入 local.rotation、local.position.x、local.position.y；包含循环处理。 */ (boneId?:string,hardOnly=false)=>{
    for(const constraint of rig.constraints){
      if(boneId&&constraint.boneId!==boneId||hardOnly&&constraint.weight<1||constraint.weight<=0)continue
      const local=locals.get(constraint.boneId);if(!local)continue
      const bound=/* 计算表达式 value+(Math.min(Math.max(first,second),Math.max(Math.min(first,second),value))-value)*constraint.weight 并返回结果，沿用操作数的原有类型规则。 */ (value:number,first:number,second:number)=>value+(Math.min(Math.max(first,second),Math.max(Math.min(first,second),value))-value)*constraint.weight
      if(constraint.type==='RotationLimit')local.rotation=bound(local.rotation,constraint.minimum.x,constraint.maximum.x)
      else if(constraint.type==='PositionLimit'){local.position.x=bound(local.position.x,constraint.minimum.x,constraint.maximum.x);local.position.y=bound(local.position.y,constraint.minimum.y,constraint.maximum.y)}
    }
  }
  applyLimits(undefined,true)
  let result=buildWorld(rig,locals)
  const definitions=new Map(rig.bones.map(/* 返回按声明顺序构造的数组 [bone.id,bone]。 */ bone=>[bone.id,bone]))
  for (const chain of rig.ikChains) {
    if(chain.weight<=0)continue
    const endDefinition = definitions.get(chain.endBoneId); if (!endDefinition) continue
    for (let iteration = 0; iteration < chain.iterations; iteration++) {
      let remaining = chain.chainLength
      let boneId: string | null = chain.endBoneId
      while (boneId && remaining-- > 0) {
        const bone = result.get(boneId), local = locals.get(boneId), definition = definitions.get(boneId)
        const end = result.get(chain.endBoneId)
        if (!bone || !local || !definition || !end) break
        const endLength = endDefinition.length * end.scale.x
        const endPoint = { x: end.position.x + Math.cos(end.rotation) * endLength, y: end.position.y + Math.sin(end.rotation) * endLength }
        const currentAngle = Math.atan2(endPoint.y - bone.position.y, endPoint.x - bone.position.x)
        const targetAngle = Math.atan2(chain.target.y - bone.position.y, chain.target.x - bone.position.x)
        let delta = targetAngle - currentAngle
        delta = Math.atan2(Math.sin(delta), Math.cos(delta))
        local.rotation += delta * chain.weight
        applyLimits(boneId,true)
        result = buildWorld(rig, locals)
        boneId = definition.parentId
      }
    }
  }
  // Copy constraints resolve sequentially; final limits retain priority over IK/copy results.
  for(const constraint of rig.constraints)if(constraint.type==='CopyRotation'&&constraint.targetBoneId&&constraint.weight>0){const local=locals.get(constraint.boneId),bone=result.get(constraint.boneId),target=result.get(constraint.targetBoneId);if(local&&bone&&target){local.rotation+=Math.atan2(Math.sin(target.rotation-bone.rotation),Math.cos(target.rotation-bone.rotation))*constraint.weight;result=buildWorld(rig,locals)}}
  applyLimits();return buildWorld(rig,locals)
}

/* 调用 poseWorld(normalizeRig(rig),skeleton) 并返回调用结果。 */ export function evaluateRigPose(rig:RigDocument,skeleton:Skeleton2D):Map<string,BoneWorld>{return poseWorld(normalizeRig(rig),skeleton)}

/** 结构说明（自动提取）：deformSkin；输入 entity、sprite；直接调用 entity.getComponent、readRig、readSkin、resolveAsset、poseWorld 等。 */ export function deformSkin(entity: Entity, sprite: SpriteRenderer2D): SkinnedMesh2D | null {
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

/** 结构说明（自动提取）：retargetPose；输入 sourceRig、targetRig、sourcePose、explicitMapping；直接调用 normalizeRig、Map、sourcePose.map、map、Object.entries 等；包含循环处理。 */ export function retargetPose(sourceRig: RigDocument, targetRig: RigDocument, sourcePose: Skeleton2D['pose'], explicitMapping: Record<string, string> = {}): Skeleton2D['pose'] {
  const source = normalizeRig(sourceRig), target = normalizeRig(targetRig), sourcePoseById = new Map(sourcePose.map(/* 返回按声明顺序构造的数组 [pose.boneId, pose]。 */ pose => [pose.boneId, pose]))
  const targetByAlias = new Map(Object.entries(target.retargetAliases).map(/* 返回按声明顺序构造的数组 [alias.toLowerCase(), id]。 */ ([alias, id]) => [alias.toLowerCase(), id]))
  const sourceAliases = new Map<string, string>(); for (const [alias, id] of Object.entries(source.retargetAliases)) sourceAliases.set(id, alias.toLowerCase())
  return source.bones.flatMap(/** 结构说明（自动提取）：source.bones.flatMap 回调；输入 sourceBone；直接调用 targetByAlias.get、sourceAliases.get、sourceBone.name.toLowerCase、target.bones.find、sourcePoseById.get 等。 */ sourceBone => {
    const mapped = explicitMapping[sourceBone.id] ?? targetByAlias.get(sourceAliases.get(sourceBone.id) ?? sourceBone.name.toLowerCase())
    const targetBone = target.bones.find(/* 比较 bone.id 与 mapped，返回严格相等的判断结果。 */ bone => bone.id === mapped); if (!targetBone) return []
    const pose = sourcePoseById.get(sourceBone.id), sourceLength = Math.max(1e-9, sourceBone.length), lengthScale = targetBone.length / sourceLength
    if(!pose)return [{boneId:targetBone.id,position:{...targetBone.position},rotation:targetBone.rotation,scale:{...targetBone.scale}}]
    const position=vector(pose.position,sourceBone.position),scale=vector(pose.scale,sourceBone.scale),rotation=finiteNumber(pose.rotation,sourceBone.rotation)
    const scaleDelta=/* 根据 Math.abs(rest)>1e-9 的真假，分别返回 target*value/rest 或 target+value-rest。 */ (value:number,rest:number,target:number)=>Math.abs(rest)>1e-9?target*value/rest:target+value-rest
    return [{boneId:targetBone.id,position:{x:targetBone.position.x+(position.x-sourceBone.position.x)*lengthScale,y:targetBone.position.y+(position.y-sourceBone.position.y)*lengthScale},rotation:targetBone.rotation+Math.atan2(Math.sin(rotation-sourceBone.rotation),Math.cos(rotation-sourceBone.rotation)),scale:{x:scaleDelta(scale.x,sourceBone.scale.x,targetBone.scale.x),y:scaleDelta(scale.y,sourceBone.scale.y,targetBone.scale.y)}}]
  })
}

/** 结构说明（自动提取）：pointSegmentDistanceSquared；输入 point、start、end；直接调用 Math.min、Math.max。 */ function pointSegmentDistanceSquared(point: Vec2, start: Vec2, end: Vec2): number {
  const dx = end.x - start.x, dy = end.y - start.y, length = dx * dx + dy * dy
  const t = length > 1e-12 ? Math.min(1, Math.max(0, ((point.x - start.x) * dx + (point.y - start.y) * dy) / length)) : 0
  const x = start.x + dx * t - point.x, y = start.y + dy * t - point.y
  return x * x + y * y
}

/** Deterministic bounded inverse-distance weighting; it refuses work that would stall the editor. */
/** 结构说明（自动提取）：autoWeightSkin；输入 rigValue、skinValue、maximumInfluences、falloff；直接调用 normalizeRig、normalizeSkin、Math.min、Math.max、Math.round 等；写入 vertex.weights、influences；包含循环处理；包含显式抛错路径。 */ export function autoWeightSkin(rigValue: RigDocument, skinValue: SkinDocument, maximumInfluences = 4, falloff = 2): AutoWeightResult {
  const rig = normalizeRig(rigValue), skin = normalizeSkin(skinValue), influenceLimit = Math.min(8, Math.max(1, Math.round(maximumInfluences)))
  if(skinValue.vertices.length>65_000)throw new Error('AUTO_WEIGHT_LIMIT: A skin supports at most 65,000 vertices; no weights were changed.')
  const operations = rig.bones.length * skin.vertices.length
  if (operations > 2_000_000) throw new Error(`AUTO_WEIGHT_LIMIT: ${operations.toLocaleString()} bone/vertex comparisons exceed the 2,000,000-operation editor limit. Split the skin or rig before auto-weighting.`)
  const bind = buildWorld(rig, new Map(rig.bones.map(/** 结构说明（自动提取）：rig.bones.map 回调；输入 bone；返回表达式求值结果。 */ bone => [bone.id, { position: { ...bone.position }, rotation: bone.rotation, scale: { ...bone.scale } }] as [string, BoneWorld])))
  const segments = rig.bones.map(/** 结构说明（自动提取）：rig.bones.map 回调；输入 bone；直接调用 bind.get、Math.cos、Math.sin。 */ bone => { const world = bind.get(bone.id)!; return { id: bone.id, start: world.position, end: { x: world.position.x + Math.cos(world.rotation) * bone.length * world.scale.x, y: world.position.y + Math.sin(world.rotation) * bone.length * world.scale.x } } })
  let influences = 0
  for (let index = 0; index < skinValue.vertices.length; index++) {
    const vertex = skinValue.vertices[index], position = skin.vertices[index]?.position ?? vector(vertex.position, { x: 0, y: 0 })
    const candidates = segments.map(/** 构造并返回记录 { boneId: segment.id, distance: pointSegmentDistanceSquared(position, segment.start, segment.end) }，字段按当前实参及捕获状态求值。 */ segment => ({ boneId: segment.id, distance: pointSegmentDistanceSquared(position, segment.start, segment.end) })).sort(/* 先计算 a.distance - b.distance；仅当其为假值时求右侧 a.boneId.localeCompare(b.boneId)，返回短路求值结果。 */ (a, b) => a.distance - b.distance || a.boneId.localeCompare(b.boneId)).slice(0, influenceLimit)
    if (candidates[0]?.distance < 1e-12) vertex.weights = [{ boneId: candidates[0].boneId, weight: 1 }]
    else {
      const weighted = candidates.map(/** 构造并返回记录 { boneId: candidate.boneId, weight: 1 / Math.pow(Math.max(1e-12, Math.sqrt(candidate.distance)), Math.min(8, Math.max(.25, finiteNumber(falloff, 2)))) }，字段按当前实参及捕获状态求值。 */ candidate => ({ boneId: candidate.boneId, weight: 1 / Math.pow(Math.max(1e-12, Math.sqrt(candidate.distance)), Math.min(8, Math.max(.25, finiteNumber(falloff, 2)))) }))
      const total = weighted.reduce(/* 计算表达式 sum + item.weight 并返回结果，沿用操作数的原有类型规则。 */ (sum, item) => sum + item.weight, 0)
      vertex.weights = weighted.map(/** 构造并返回记录 { boneId: item.boneId, weight: item.weight / total }，字段按当前实参及捕获状态求值。 */ item => ({ boneId: item.boneId, weight: item.weight / total }))
    }
    influences += vertex.weights.length
  }
  return { vertices: skinValue.vertices.length, bones: rig.bones.length, influences, operations }
}

/** 结构说明（自动提取）：skinWeightHeat；输入 skinValue、boneId；直接调用 vertices.map、normalizeSkin。 */ export function skinWeightHeat(skinValue: SkinDocument, boneId: string): Array<{ x: number; y: number; weight: number }> {
  return normalizeSkin(skinValue).vertices.map(/** 结构说明（自动提取）：vertices.map 回调；输入 vertex；直接调用 vertex.weights.find；返回表达式求值结果。 */ vertex => ({ x: vertex.position.x, y: vertex.position.y, weight: vertex.weights.find(/* 比较 weight.boneId 与 boneId，返回严格相等的判断结果。 */ weight => weight.boneId === boneId)?.weight ?? 0 }))
}

/** 结构说明（自动提取）：retargetPreviewSummary；输入 sourceRig、targetRig；直接调用 normalizeRig、source.bones.map、retargetPose、Set、mappedPose.map 等。 */ export function retargetPreviewSummary(sourceRig: RigDocument, targetRig: RigDocument): { mapped: number; sourceBones: number; targetBones: number; missing: string[] } {
  const source = normalizeRig(sourceRig), target = normalizeRig(targetRig)
  const pose = source.bones.map(/** 构造并返回记录 { boneId: bone.id, position: { ...bone.position }, rotation: bone.rotation, scale: { ...bone.scale } }，字段按当前实参及捕获状态求值。 */ bone => ({ boneId: bone.id, position: { ...bone.position }, rotation: bone.rotation, scale: { ...bone.scale } })), mappedPose = retargetPose(source, target, pose)
  const mapped = new Set(mappedPose.map(/* 返回 item.boneId 的当前值。 */ item => item.boneId))
  return { mapped: mapped.size, sourceBones: source.bones.length, targetBones: target.bones.length, missing: target.bones.filter(/* 返回 mapped.has(bone.id) 的逻辑取反结果。 */ bone => !mapped.has(bone.id)).map(/* 返回 bone.name 的当前值。 */ bone => bone.name) }
}

/** 结构说明（自动提取）：resolveRigAttachments；输入 rig、skeleton；直接调用 normalizeRig、poseWorld、normalized.attachments.flatMap。 */ export function resolveRigAttachments(rig: RigDocument, skeleton: Skeleton2D): Array<RigAttachment2D & { worldPosition: Vec2; worldRotation: number }> {
  const normalized = normalizeRig(rig), world = poseWorld(normalized, skeleton)
  return normalized.attachments.flatMap(/** 结构说明（自动提取）：normalized.attachments.flatMap 回调；输入 attachment；直接调用 world.get、Math.cos、Math.sin。 */ attachment => {
    const bone = world.get(attachment.boneId); if (!bone) return []
    const cosine = Math.cos(bone.rotation), sine = Math.sin(bone.rotation), x = attachment.position.x * bone.scale.x, y = attachment.position.y * bone.scale.y
    return [{ ...attachment, worldPosition: { x: bone.position.x + x * cosine - y * sine, y: bone.position.y + x * sine + y * cosine }, worldRotation: bone.rotation + attachment.rotation }]
  })
}

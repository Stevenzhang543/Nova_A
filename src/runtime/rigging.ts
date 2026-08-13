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

export interface RigDocument {
  version: 1
  name: string
  bones: RigBone2D[]
  ikChains: RigIkChain2D[]
  constraints: RigConstraint2D[]
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

function safeId(value: unknown, fallback: string): string {
  const normalized = typeof value === 'string' ? value.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) : ''
  return normalized || fallback
}

function vector(value: unknown, fallback: Vec2): Vec2 {
  const source = value && typeof value === 'object' ? value as Partial<Vec2> : {}
  return { x: finiteNumber(source.x, fallback.x), y: finiteNumber(source.y, fallback.y) }
}

export function defaultRig(name = 'New Rig'): RigDocument {
  return {
    version: 1,
    name,
    bones: [{ id: 'root', name: 'Root', parentId: null, position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, length: 1 }],
    ikChains: [],
    constraints: []
  }
}

export function defaultSkin(name = 'New Skin'): SkinDocument {
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

export function normalizeRig(source: unknown): RigDocument {
  const item = source && typeof source === 'object' ? source as Partial<RigDocument> : {}
  const used = new Set<string>()
  const bones = (Array.isArray(item.bones) ? item.bones : []).slice(0, 512).map((bone, index) => {
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
  const order = new Map(bones.map((bone, index) => [bone.id, index]))
  for (const bone of bones) if (!bone.parentId || !order.has(bone.parentId) || order.get(bone.parentId)! >= order.get(bone.id)!) bone.parentId = null
  const ikChains = (Array.isArray(item.ikChains) ? item.ikChains : []).slice(0, 128).flatMap((chain, index) => {
    if (!chain || !used.has(String(chain.endBoneId))) return []
    return [{
      id: safeId(chain.id, `ik_${index + 1}`), name: typeof chain.name === 'string' ? chain.name.slice(0, 80) : `IK ${index + 1}`,
      endBoneId: String(chain.endBoneId), chainLength: Math.min(64, Math.max(1, Math.round(finiteNumber(chain.chainLength, 2)))),
      target: vector(chain.target, { x: 2, y: 0 }), weight: Math.min(1, Math.max(0, finiteNumber(chain.weight, 1))),
      iterations: Math.min(64, Math.max(1, Math.round(finiteNumber(chain.iterations, 8))))
    }]
  })
  const constraints = (Array.isArray(item.constraints) ? item.constraints : []).slice(0, 256).flatMap((constraint, index) => {
    if (!constraint || !used.has(String(constraint.boneId))) return []
    const type = ['RotationLimit', 'CopyRotation', 'PositionLimit'].includes(String(constraint.type)) ? constraint.type as RigConstraint2D['type'] : 'RotationLimit'
    return [{
      id: safeId(constraint.id, `constraint_${index + 1}`), boneId: String(constraint.boneId), type,
      targetBoneId: typeof constraint.targetBoneId === 'string' && used.has(constraint.targetBoneId) ? constraint.targetBoneId : null,
      minimum: vector(constraint.minimum, { x: -Math.PI, y: -1e6 }), maximum: vector(constraint.maximum, { x: Math.PI, y: 1e6 }),
      weight: Math.min(1, Math.max(0, finiteNumber(constraint.weight, 1)))
    }]
  })
  return { version: 1, name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Rig', bones, ikChains, constraints }
}

export function normalizeSkin(source: unknown): SkinDocument {
  const item = source && typeof source === 'object' ? source as Partial<SkinDocument> : {}
  const vertices = (Array.isArray(item.vertices) ? item.vertices : []).slice(0, 65_000).map(vertex => {
    const weights = (Array.isArray(vertex?.weights) ? vertex.weights : []).slice(0, 8).flatMap(weight => {
      if (!weight || typeof weight.boneId !== 'string') return []
      const value = Math.max(0, finiteNumber(weight.weight))
      return value > 0 ? [{ boneId: safeId(weight.boneId, 'root'), weight: value }] : []
    })
    const total = weights.reduce((sum, weight) => sum + weight.weight, 0)
    if (!total) weights.push({ boneId: 'root', weight: 1 })
    else weights.forEach(weight => { weight.weight /= total })
    return { position: vector(vertex?.position, { x: 0, y: 0 }), uv: vector(vertex?.uv, { x: 0, y: 0 }), weights }
  })
  const fallback = defaultSkin()
  const safeVertices = vertices.length >= 3 ? vertices : fallback.vertices
  const triangles = (Array.isArray(item.triangles) ? item.triangles : []).slice(0, 195_000)
    .map(value => Math.round(finiteNumber(value, -1))).filter(value => value >= 0 && value < safeVertices.length)
  return {
    version: 1, name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Skin',
    rigAsset: typeof item.rigAsset === 'string' ? item.rigAsset : null,
    vertices: safeVertices, triangles: triangles.length >= 3 && triangles.length % 3 === 0 ? triangles : fallback.triangles
  }
}

function parseAsset<T>(reference: string | null, type: 'rig' | 'skin', normalize: (source: unknown) => T): T | null {
  const asset = resolveAsset(reference); const source = readTextAsset(reference)
  if (!asset || asset.assetType !== type || !source) return null
  try { return normalize(JSON.parse(source)) } catch { return null }
}

const rigCache = new Map<string, { generation: number; value: RigDocument | null }>()
const skinCache = new Map<string, { generation: number; value: SkinDocument | null }>()

export function readRig(reference: string | null): RigDocument | null {
  if (!reference) return null
  const cached = rigCache.get(reference); if (cached?.generation === assetState.generation) return cached.value
  const value = parseAsset(reference, 'rig', normalizeRig); rigCache.set(reference, { generation: assetState.generation, value }); return value
}

export function readSkin(reference: string | null): SkinDocument | null {
  if (!reference) return null
  const cached = skinCache.get(reference); if (cached?.generation === assetState.generation) return cached.value
  const value = parseAsset(reference, 'skin', normalizeSkin); skinCache.set(reference, { generation: assetState.generation, value }); return value
}

export function createRigAsset(name = 'New Rig'): AssetRecord { return createTextAsset(name, 'rig', JSON.stringify(defaultRig(name), null, 2), 'Assets/Rigs') }
export function createSkinAsset(name = 'New Skin'): AssetRecord { return createTextAsset(name, 'skin', JSON.stringify(defaultSkin(name), null, 2), 'Assets/Skins') }
export function rigAssetReference(asset: AssetRecord): string { return assetReference(asset.uuid) }

interface BoneWorld { position: Vec2; rotation: number; scale: Vec2 }

function buildWorld(rig: RigDocument, locals: Map<string, BoneWorld>): Map<string, BoneWorld> {
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

function poseWorld(rig: RigDocument, skeleton: Skeleton2D): Map<string, BoneWorld> {
  const pose = new Map(skeleton.pose.map(item => [item.boneId, item]))
  const locals = new Map<string, BoneWorld>(rig.bones.map(bone => {
    const override = pose.get(bone.id)
    return [bone.id, {
      position: override ? vector(override.position, bone.position) : { ...bone.position },
      rotation: override ? finiteNumber(override.rotation, bone.rotation) : bone.rotation,
      scale: override ? vector(override.scale, bone.scale) : { ...bone.scale }
    }] as [string, BoneWorld]
  }))
  let result = buildWorld(rig, locals)
  for (const constraint of rig.constraints) {
    const local = locals.get(constraint.boneId); if (!local) continue
    if (constraint.type === 'RotationLimit') local.rotation = Math.min(constraint.maximum.x, Math.max(constraint.minimum.x, local.rotation))
    else if (constraint.type === 'PositionLimit') {
      local.position.x = Math.min(constraint.maximum.x, Math.max(constraint.minimum.x, local.position.x))
      local.position.y = Math.min(constraint.maximum.y, Math.max(constraint.minimum.y, local.position.y))
    } else if (constraint.targetBoneId) {
      const bone = result.get(constraint.boneId), target = result.get(constraint.targetBoneId)
      if (bone && target) local.rotation += (target.rotation - bone.rotation) * constraint.weight
    }
  }
  result = buildWorld(rig, locals)
  for (const chain of rig.ikChains) {
    const endDefinition = rig.bones.find(bone => bone.id === chain.endBoneId); if (!endDefinition) continue
    for (let iteration = 0; iteration < chain.iterations; iteration++) {
      let remaining = chain.chainLength
      let boneId: string | null = chain.endBoneId
      while (boneId && remaining-- > 0) {
        const bone = result.get(boneId), local = locals.get(boneId), definition = rig.bones.find(candidate => candidate.id === boneId)
        const end = result.get(chain.endBoneId)
        if (!bone || !local || !definition || !end) break
        const endLength = endDefinition.length * end.scale.x
        const endPoint = { x: end.position.x + Math.cos(end.rotation) * endLength, y: end.position.y + Math.sin(end.rotation) * endLength }
        const currentAngle = Math.atan2(endPoint.y - bone.position.y, endPoint.x - bone.position.x)
        const targetAngle = Math.atan2(chain.target.y - bone.position.y, chain.target.x - bone.position.x)
        let delta = targetAngle - currentAngle
        delta = Math.atan2(Math.sin(delta), Math.cos(delta))
        local.rotation += delta * chain.weight
        result = buildWorld(rig, locals)
        boneId = definition.parentId
      }
    }
  }
  return result
}

export function deformSkin(entity: Entity, sprite: SpriteRenderer2D): SkinnedMesh2D | null {
  const skeleton = entity.getComponent<Skeleton2D>('Skeleton2D')
  if (!skeleton?.enabled || !skeleton.previewEnabled) return null
  const rig = readRig(skeleton.rigAsset); const skin = readSkin(skeleton.skinAsset)
  if (!rig || !skin || skin.rigAsset && skin.rigAsset !== skeleton.rigAsset) return null
  const bones = poseWorld(rig, skeleton)
  const bindLocals = new Map<string, BoneWorld>(rig.bones.map(bone => [bone.id, { position: { ...bone.position }, rotation: bone.rotation, scale: { ...bone.scale } }] as [string, BoneWorld]))
  const bindBones = buildWorld(rig, bindLocals)
  const positions = skin.vertices.map(vertex => {
    const source = { x: vertex.position.x * sprite.size.x, y: vertex.position.y * sprite.size.y }
    let x = 0, y = 0, total = 0
    for (const weight of vertex.weights) {
      const bone = bones.get(weight.boneId), bind = bindBones.get(weight.boneId); if (!bone || !bind) continue
      const bindCosine = Math.cos(-bind.rotation), bindSine = Math.sin(-bind.rotation)
      const dx = source.x - bind.position.x, dy = source.y - bind.position.y
      const localX = (dx * bindCosine - dy * bindSine) / Math.max(1e-9, Math.abs(bind.scale.x)) * bone.scale.x
      const localY = (dx * bindSine + dy * bindCosine) / Math.max(1e-9, Math.abs(bind.scale.y)) * bone.scale.y
      const cosine = Math.cos(bone.rotation), sine = Math.sin(bone.rotation)
      x += (bone.position.x + localX * cosine - localY * sine) * weight.weight
      y += (bone.position.y + localX * sine + localY * cosine) * weight.weight
      total += weight.weight
    }
    return total > 0 ? { x: x / total, y: y / total } : source
  })
  return { positions, uvs: skin.vertices.map(vertex => ({ ...vertex.uv })), indices: [...skin.triangles] }
}

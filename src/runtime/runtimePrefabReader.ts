/** Original v1/v2 Prefab read semantics bound to one explicit read-only resource source. */
import type {PrefabDocument} from '../world/sceneEntityData'
import {normalizeUuid} from '../world/identity'
import {canonicalProjectText} from '../projects/projectCanonicalValues'

export interface RuntimePrefabReadResources {
  resolveAsset(reference:string|null|undefined):{readonly uuid:string;readonly name:string;readonly assetType:string}|null
  readSource(reference:string|null|undefined):string|null
}


/** 结构说明（自动提取）：checksum；输入 value；直接调用 canonicalProjectText、Math.imul、source.charCodeAt、padStart、hash.toString；写入 hash；包含循环处理。 */ export function prefabChecksum(value: unknown): string { const source = canonicalProjectText(value); let hash = 0x811c9dc5; for (let index = 0; index < source.length; index++) hash = Math.imul(hash ^ source.charCodeAt(index), 0x01000193) >>> 0; return hash.toString(16).padStart(8, '0') }


/** 按模板 `asset://${normalizeUuid(uuid)}` 生成并返回字符串。 */ function assetReference(uuid: string): string { return `asset://${normalizeUuid(uuid)}` }

/** Bind method receivers once, never capture an Editor state or a second catalog. */
export function createRuntimePrefabReader(resources:RuntimePrefabReadResources):(reference:string|null|undefined)=>{reference:string;document:PrefabDocument}|null {
  if(!resources||typeof resources.resolveAsset!=='function'||typeof resources.readSource!=='function')throw new Error('RUNTIME_PREFAB_READER_REQUIRED: Supply the actual resource catalog.')
  const resolveAsset=resources.resolveAsset.bind(resources),readTextAsset=resources.readSource.bind(resources)
  const checksum=prefabChecksum
  return /** 结构说明（自动提取）：prefabRecord；输入 assetRef；直接调用 resolveAsset、readTextAsset、JSON.parse、includes、Array.isArray 等。 */ function prefabRecord(assetRef: string | null | undefined): { reference: string; document: PrefabDocument } | null {
  const asset = resolveAsset(assetRef)
  const source = readTextAsset(assetRef)
  if (!asset || asset.assetType !== 'prefab' || !source) return null
  try {
    const document = JSON.parse(source) as Partial<PrefabDocument> & { prefabVersion?: number }
    if (![1, 2].includes(document.prefabVersion ?? 0) || !document.bundle || !Array.isArray(document.bundle.entities) || !Array.isArray(document.bundle.rootUuids)) return null
    const normalized: PrefabDocument = { prefabVersion: 2, name: String(document.name ?? asset.name).slice(0, 80), bundle: document.bundle, variantOf: typeof document.variantOf === 'string' ? document.variantOf : null, sourceChecksum: typeof document.sourceChecksum === 'string' ? document.sourceChecksum : checksum(document.bundle), createdAt: typeof document.createdAt === 'string' ? document.createdAt : new Date(0).toISOString() }
    return { reference: assetReference(asset.uuid), document: normalized }
  } catch {
    return null
  }
}
}

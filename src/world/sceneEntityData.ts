/** Exact authoring/runtime entity record declarations and shared stored-component lookup. */
import type {Entity,AuthoringMetadata2D} from './Entity'
import type {Connection} from './Connection'
import type {ComponentKind} from './components'

export interface SceneEntityData {
  [key: string]: unknown
  id?: number
  uuid?: string
  name?: string
  entityType?: string
  shapeType?: string
  layer?: number
  transform?: {
    position?: { x?: number; y?: number }
    scale?: { x?: number; y?: number }
    rotation?: number
  }
  vertices?: Array<{ x?: number; y?: number }>
  radiusX?: number
  radiusY?: number
  enabled?: boolean
  editorVisible?: boolean
  editorLocked?: boolean
  tags?: string[]
  groups?: string[]
  namedLayer?: string
  ownerUuid?: string | null
  ownership?: 'Scene' | 'Prefab' | 'Runtime'
  editorOnly?: boolean
  runtimePersistence?: 'Scene' | 'Session' | 'SaveGame' | 'Transient'
  persistentAcrossScenes?: boolean
  objectBlueprintAsset?: string | null
  prefabAsset?: string | null
  prefabInstanceUuid?: string | null
  prefabSourceUuid?: string | null
  prefabOverrides?: Record<string, unknown>
  prefabLayers?: Array<{ asset?: string; instanceUuid?: string; sourceUuid?: string; overrides?: Record<string, unknown> }>
  sceneLayers?: Array<{ asset?: string; instanceUuid?: string; sourceUuid?: string }>
  authoring?: Partial<AuthoringMetadata2D>
  components?: SceneComponentData[]
}

export interface SceneComponentData {
  uuid?: string
  kind?: ComponentKind
  enabled?: boolean
  removed?: boolean
  data?: Record<string, unknown>
}

export interface EntityBundle {
  entities: SceneEntityData[]
  connections: Array<{ connection: Connection; anchorUuids: string[] }>
  rootUuids: string[]
}

export interface EntityBundleInstance {
  entities: Entity[]
  roots: Entity[]
  sourceToEntity: Map<string, Entity>
}

export interface PrefabDocument {
  prefabVersion: 2
  name: string
  bundle: EntityBundle
  variantOf: string | null
  sourceChecksum: string
  createdAt: string
}

export function storedComponent(item: SceneEntityData, kind: ComponentKind): SceneComponentData | undefined {
  return item.components?.find(/* 比较 component.kind 与 kind，返回严格相等的判断结果。 */ component => component.kind === kind)
}

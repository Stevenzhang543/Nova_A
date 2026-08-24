import { reactive } from 'vue'
import { assetState, deleteAsset, restoreAssetRecord } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'

export interface ProjectTrashItem {
  id: string
  kind: 'asset'
  resourceUuid: string
  name: string
  path: string
  deletedAt: string
  referenceCount: number
  payload: AssetRecord
}

const MAX_TRASH_ITEMS = 100
export const projectTrashState = reactive({ items: [] as ProjectTrashItem[], lastAction: '' })

export function moveAssetToProjectTrash(uuid: string, referenceCount = 0): ProjectTrashItem | null {
  const asset = assetState.records.find(record => record.uuid === uuid)
  if (!asset || asset.path.startsWith('.nova/')) return null
  const item: ProjectTrashItem = { id: crypto.randomUUID(), kind: 'asset', resourceUuid: asset.uuid, name: asset.name, path: asset.path, deletedAt: new Date().toISOString(), referenceCount: Math.max(0, Math.round(referenceCount)), payload: JSON.parse(JSON.stringify(asset)) as AssetRecord }
  if (!deleteAsset(uuid)) return null
  projectTrashState.items.unshift(item); projectTrashState.items.splice(MAX_TRASH_ITEMS)
  projectTrashState.lastAction = `trashed:${item.path}`; return item
}

export function restoreProjectTrashItem(id: string): boolean {
  const index = projectTrashState.items.findIndex(item => item.id === id), item = projectTrashState.items[index]
  if (!item || !restoreAssetRecord(item.payload)) return false
  projectTrashState.items.splice(index, 1); projectTrashState.lastAction = `restored:${item.path}`; return true
}

export function purgeProjectTrashItem(id: string): boolean {
  const index = projectTrashState.items.findIndex(item => item.id === id)
  if (index < 0) return false
  const [item] = projectTrashState.items.splice(index, 1); projectTrashState.lastAction = `purged:${item.path}`; return true
}

export function serializeProjectTrash(): ProjectTrashItem[] { return projectTrashState.items.map(item => JSON.parse(JSON.stringify(item)) as ProjectTrashItem) }

export function loadProjectTrash(value: unknown): void {
  const values = Array.isArray(value) ? value : [], restored: ProjectTrashItem[] = []
  for (const raw of values.slice(0, MAX_TRASH_ITEMS)) {
    if (!raw || typeof raw !== 'object') continue
    const item = raw as Partial<ProjectTrashItem>
    if (item.kind !== 'asset' || typeof item.id !== 'string' || typeof item.resourceUuid !== 'string' || typeof item.name !== 'string' || typeof item.path !== 'string' || !item.payload || typeof item.payload !== 'object') continue
    restored.push({ id: item.id.slice(0, 128), kind: 'asset', resourceUuid: item.resourceUuid.slice(0, 128), name: item.name.slice(0, 120), path: item.path.slice(0, 500), deletedAt: typeof item.deletedAt === 'string' ? item.deletedAt : '', referenceCount: Math.max(0, Math.round(Number(item.referenceCount) || 0)), payload: item.payload as AssetRecord })
  }
  projectTrashState.items.splice(0, projectTrashState.items.length, ...restored)
}

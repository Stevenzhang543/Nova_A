/** 项目回收区：记录可恢复的删除内容并支持恢复与清理。 */
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

/** 深复制可删除资源到回收站记录，实际删除成功后插入有数量上限的回收站。 */ export function moveAssetToProjectTrash(uuid: string, referenceCount = 0): ProjectTrashItem | null {
  const asset = assetState.records.find(/* 比较 record.uuid 与 uuid，返回严格相等的判断结果。 */ record => record.uuid === uuid)
  if (!asset || asset.path.startsWith('.nova/')) return null
  const item: ProjectTrashItem = { id: crypto.randomUUID(), kind: 'asset', resourceUuid: asset.uuid, name: asset.name, path: asset.path, deletedAt: new Date().toISOString(), referenceCount: Math.max(0, Math.round(referenceCount)), payload: JSON.parse(JSON.stringify(asset)) as AssetRecord }
  if (!deleteAsset(uuid)) return null
  projectTrashState.items.unshift(item); projectTrashState.items.splice(MAX_TRASH_ITEMS)
  projectTrashState.lastAction = `trashed:${item.path}`; return item
}

/** 尝试恢复回收站资源，成功后才移除回收记录并更新状态。 */ export function restoreProjectTrashItem(id: string): boolean {
  const index = projectTrashState.items.findIndex(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id), item = projectTrashState.items[index]
  if (!item || !restoreAssetRecord(item.payload)) return false
  projectTrashState.items.splice(index, 1); projectTrashState.lastAction = `restored:${item.path}`; return true
}

/** 按回收项身份永久移除该记录，未找到返回 false。 */ export function purgeProjectTrashItem(id: string): boolean {
  const index = projectTrashState.items.findIndex(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id)
  if (index < 0) return false
  const [item] = projectTrashState.items.splice(index, 1); projectTrashState.lastAction = `purged:${item.path}`; return true
}

/* 调用 projectTrashState.items.map(item => JSON.parse(JSON.stringify(item)) as ProjectTrashItem) 并返回调用结果。 */ export function serializeProjectTrash(): ProjectTrashItem[] { return projectTrashState.items.map(/** 深复制回收项以生成与活动回收站独立的持久化数据。 */ item => JSON.parse(JSON.stringify(item)) as ProjectTrashItem) }

/** 仅接受有效资源回收记录，限制数量和文本长度后替换当前回收站。 */ export function loadProjectTrash(value: unknown): void {
  const values = Array.isArray(value) ? value : [], restored: ProjectTrashItem[] = []
  for (const raw of values.slice(0, MAX_TRASH_ITEMS)) {
    if (!raw || typeof raw !== 'object') continue
    const item = raw as Partial<ProjectTrashItem>
    if (item.kind !== 'asset' || typeof item.id !== 'string' || typeof item.resourceUuid !== 'string' || typeof item.name !== 'string' || typeof item.path !== 'string' || !item.payload || typeof item.payload !== 'object') continue
    restored.push({ id: item.id.slice(0, 128), kind: 'asset', resourceUuid: item.resourceUuid.slice(0, 128), name: item.name.slice(0, 120), path: item.path.slice(0, 500), deletedAt: typeof item.deletedAt === 'string' ? item.deletedAt : '', referenceCount: Math.max(0, Math.round(Number(item.referenceCount) || 0)), payload: item.payload as AssetRecord })
  }
  projectTrashState.items.splice(0, projectTrashState.items.length, ...restored)
}

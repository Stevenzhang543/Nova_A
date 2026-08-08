import { reactive } from "vue"
import { cloneEntity, deleteEntity, duplicateConnections, physicsState, pushHistory } from "./physics"
import type { Vec2 } from '../world/types'
import { t } from '../i18n'
import type { PivotMode, TransformSpace } from '../editor/gizmo'

export type EditorPage = 'scene' | 'game' | 'settings'
type ContextMenuType = 'sidebar-entity' | 'layer' | 'grid-entity' | 'none'

export interface EditorLogEntry {
  id: number
  timestamp: string
  level: 'info' | 'warning' | 'error'
  category: 'Editor' | 'Physics' | 'Project'
  message: string
}

export const editorState = reactive({
  currentPage: "scene" as EditorPage,
  statusText: t('ready'),
  layoutVersion: 0,
  showGrid: true,
  showXAxis: true, // NEW
  showYAxis: true, // NEW
  layers: [1], 
  activeLayer: 1, 
  renderLayer: 'all' as number | 'all',
  transformSpace: 'world' as TransformSpace,
  pivotMode: 'center' as PivotMode,
  angleSnapEnabled: true,
  angleSnapDegrees: 15,
  bottomPanelOpen: true,
  bottomPanelHeight: 180,
  bottomPanelTab: 'console' as 'assets' | 'console' | 'animation' | 'profiler' | 'project' | 'build',
  renameRequestId: null as number | null,
  logs: [] as EditorLogEntry[],
  manualConnectionId: null as number | null,
  manualConnectionPoints: [] as Vec2[],
  
  contextMenu: {
    visible: false,
    x: 0, y: 0,
    type: 'none' as ContextMenuType,
    targetId: null as number | null
  }
})

let nextLogId = 1
export function addEditorLog(message: string, category: EditorLogEntry['category'] = 'Editor', level: EditorLogEntry['level'] = 'info'): void {
  editorState.logs.push({ id: nextLogId++, timestamp: new Date().toLocaleTimeString(), level, category, message })
  if (editorState.logs.length > 500) editorState.logs.splice(0, editorState.logs.length - 500)
}

export function reconfigureLayout() { editorState.layoutVersion++ }

export function addLayer() {
  const newLayer = Math.max(...editorState.layers, 0) + 1
  if (!Number.isSafeInteger(newLayer)) {
    editorState.statusText = t('layerIdExhausted')
    return
  }
  editorState.layers.push(newLayer)
  editorState.activeLayer = newLayer
  editorState.statusText = t('createdLayer', { layer: newLayer })
  pushHistory()
}

export function setActiveLayer(layer: number) {
  editorState.activeLayer = layer
  editorState.statusText = t('switchedLayer', { layer })
}

export function setRenderLayer(layer: number | 'all') {
  editorState.renderLayer = layer
  editorState.statusText = layer === 'all' ? t('renderAllLayers') : t('renderLayer', { layer })
}

export function openContextMenu(e: MouseEvent, type: ContextMenuType, targetId: number | null = null) {
  e.preventDefault()
  editorState.contextMenu.visible = true
  editorState.contextMenu.x = e.clientX
  editorState.contextMenu.y = e.clientY
  editorState.contextMenu.type = type
  editorState.contextMenu.targetId = targetId
}

export function closeContextMenu() {
  editorState.contextMenu.visible = false
}

export function deleteLayer(layerId: number) {
  if (editorState.layers.length <= 1) return 
  const layerIndex = editorState.layers.indexOf(layerId)
  if (layerIndex === -1) return
  editorState.layers.splice(layerIndex, 1)
  if (editorState.activeLayer === layerId) editorState.activeLayer = editorState.layers[0]
  if (editorState.renderLayer === layerId) editorState.renderLayer = 'all'
  const ids = physicsState.world.entities.filter(entity => entity.layer === layerId).map(entity => entity.id)
  ids.forEach(deleteEntity)
  editorState.statusText = t('deletedLayer', { layer: layerId })
  pushHistory()
}

export function duplicateLayer(layerId: number) {
  const newLayerId = Math.max(...editorState.layers, 0) + 1
  if (!Number.isSafeInteger(newLayerId)) {
    editorState.statusText = t('duplicateLayerIdExhausted')
    return
  }
  editorState.layers.push(newLayerId)
  const toClone = physicsState.world.entities.filter(e => e.layer === layerId)
  const entityIdMap = new Map<number, number>()
  const entityUuidMap = new Map<string, string>()
  toClone.forEach(original => {
    const clone = cloneEntity(original, newLayerId)
    entityIdMap.set(original.id, clone.id)
    entityUuidMap.set(original.uuid, clone.uuid)
    physicsState.world.entities.push(clone)
  })
  toClone.forEach(original => {
    const clone = physicsState.world.entities.find(entity => entity.id === entityIdMap.get(original.id))
    if (clone && original.parentUuid && entityUuidMap.has(original.parentUuid)) clone.parentUuid = entityUuidMap.get(original.parentUuid)!
  })
  duplicateConnections(entityIdMap)
  editorState.activeLayer = newLayerId
  editorState.statusText = t('duplicatedLayer', { source: layerId, target: newLayerId })
  pushHistory()
}

function moveLayer(layerId: number, destination: 'front' | 'back') {
  const layerEntities = physicsState.world.entities.filter(entity => entity.layer === layerId)
  for (let index = physicsState.world.entities.length - 1; index >= 0; index--) {
    if (physicsState.world.entities[index].layer === layerId) physicsState.world.entities.splice(index, 1)
  }
  if (destination === 'front') physicsState.world.entities.push(...layerEntities)
  else physicsState.world.entities.unshift(...layerEntities)
  editorState.statusText = t(destination === 'front' ? 'movedLayerFront' : 'movedLayerBack', { layer: layerId })
  pushHistory()
}

export function moveLayerToFront(layerId: number) {
  moveLayer(layerId, 'front')
}

export function moveLayerToBack(layerId: number) {
  moveLayer(layerId, 'back')
}

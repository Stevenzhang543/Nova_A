import { reactive } from "vue"
import { cloneEntity, deleteEntity, duplicateConnections, physicsState, pushHistory } from "./physics"
import type { Vec2 } from '../world/types'
import { t } from '../i18n'

export type EditorPage = "scene" | "render" | "settings"
type ContextMenuType = 'sidebar-entity' | 'layer' | 'grid-entity' | 'none'

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
  manualConnectionId: null as number | null,
  manualConnectionPoints: [] as Vec2[],
  
  contextMenu: {
    visible: false,
    x: 0, y: 0,
    type: 'none' as ContextMenuType,
    targetId: null as number | null
  }
})

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
  toClone.forEach(original => {
    const clone = cloneEntity(original, newLayerId)
    entityIdMap.set(original.id, clone.id)
    physicsState.world.entities.push(clone)
  })
  duplicateConnections(entityIdMap)
  editorState.activeLayer = newLayerId
  editorState.statusText = t('duplicatedLayer', { source: layerId, target: newLayerId })
  pushHistory()
}

export function moveLayerToFront(layerId: number) {
  const layerEntities = physicsState.world.entities.filter(entity => entity.layer === layerId)
  for (let index = physicsState.world.entities.length - 1; index >= 0; index--) {
    if (physicsState.world.entities[index].layer === layerId) physicsState.world.entities.splice(index, 1)
  }
  physicsState.world.entities.push(...layerEntities) 
  editorState.statusText = t('movedLayerFront', { layer: layerId })
  pushHistory()
}

export function moveLayerToBack(layerId: number) {
  const layerEntities = physicsState.world.entities.filter(entity => entity.layer === layerId)
  for (let index = physicsState.world.entities.length - 1; index >= 0; index--) {
    if (physicsState.world.entities[index].layer === layerId) physicsState.world.entities.splice(index, 1)
  }
  physicsState.world.entities.unshift(...layerEntities) 
  editorState.statusText = t('movedLayerBack', { layer: layerId })
  pushHistory()
}

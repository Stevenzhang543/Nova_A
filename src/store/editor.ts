import { reactive } from "vue"
import { cloneEntity, deleteEntity, duplicateConnections, physicsState, pushHistory, sceneManager } from "./physics"
import type { Vec2 } from '../world/types'
import { t } from '../i18n'
import type { PivotMode, TransformSpace } from '../editor/gizmo'
import { scriptProjectSettings } from '../runtime/scriptSettings'

export type EditorPage = 'scene' | 'game' | 'script' | 'settings' | 'manage'
export type EditorWorkspace = 'design' | 'script' | 'animation' | 'ui' | 'debug' | 'manage' | 'custom'
export type BottomPanelTab = 'assets' | 'packages' | 'console' | 'animation' | 'audio' | 'worldProduction' | 'networkStudio' | 'ecosystem' | 'tilemap' | 'presentation' | 'profiler' | 'rendering' | 'project' | 'build'
export type ManageSection = 'learn' | 'settings' | 'automation' | 'packages' | 'project' | 'rendering' | 'build'
export type InspectorCategory = 'all' | 'general' | 'transform' | 'render' | 'physics' | 'gameplay' | 'ui'
type ContextMenuType = 'sidebar-entity' | 'layer' | 'grid-entity' | 'none'
export type EditorLogLevel = 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'fatal'
export type EditorLogCategory = 'Editor' | 'Physics' | 'Project' | 'Renderer' | 'Assets' | 'Audio' | 'Engine' | 'Runtime' | 'Script' | 'Save' | 'Plugin' | 'Input'

export interface EditorLogEntry {
  id: number
  timestamp: string
  level: EditorLogLevel
  category: EditorLogCategory
  message: string
  source?: string
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
  activeWorkspace: 'design' as EditorWorkspace,
  manageSection: 'settings' as ManageSection,
  hierarchyVisible: true,
  inspectorVisible: true,
  bottomPanelVisible: true,
  distractionFree: false,
  commandPaletteOpen: false,
  commandPaletteMode: 'commands' as 'commands' | 'quick' | 'global' | 'context',
  workspaceManagerOpen: false,
  shortcutEditorOpen: false,
  undoHistoryOpen: false,
  statusCenterOpen: false,
  hierarchyWidth: 236,
  inspectorWidth: 292,
  hierarchyDock: 'left' as 'left' | 'right',
  inspectorDock: 'right' as 'left' | 'right',
  inspectorSearch: '',
  settingsSearch: '',
  settingsScope: 'all' as 'all' | 'editor' | 'project' | 'runtime',
  inspectorCategory: 'all' as InspectorCategory,
  inspectorModifiedOnly: false,
  inspectorPinnedOnly: false,
  pinnedInspectorProperties: [] as string[],
  componentPickerOpen: false,
  createObjectPaletteOpen: false,
  lastCanvasWorldPoint: { x: 0, y: 0 } as Vec2,
  bottomPanelOpen: false,
  bottomPanelHeight: 240,
  bottomPanelTab: 'assets' as BottomPanelTab,
  bottomPanelPinned: true,
  physicsMonitorOpen: false,
  renameRequestId: null as number | null,
  logs: [] as EditorLogEntry[],
  rendererStats: {
    backend: 'Canvas2D' as 'WebGL2' | 'Canvas2D',
    drawCalls: 0,
    batches: 0,
    triangles: 0,
    sprites: 0,
    shapes: 0,
    text: 0,
    textures: 0,
    gpuMs: null as number | null,
    passes: 1,
    renderTargets: 0,
    overdraw: 0,
    batchBreaks: 0,
    atlasPages: 0,
    textureMemoryBytes: 0,
    textureUploads: 0,
    textureEvictions: 0,
    textureBudgetBytes: 0,
    textureBudgetExceeded: false,
    streamingMisses: 0,
    shaderCompiles: 0,
    shaderFallbacks: 0,
    contextLosses: 0,
    batchBreakReasons: {}
  },
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
export function addEditorLog(message: string, category: EditorLogCategory = 'Editor', level: EditorLogLevel = 'info', source?: string): void {
  editorState.logs.push({ id: nextLogId++, timestamp: new Date().toLocaleTimeString(), level, category, message, source })
  const limit = Math.min(10_000, Math.max(100, scriptProjectSettings.maxConsoleEntries))
  if (editorState.logs.length > limit) editorState.logs.splice(0, editorState.logs.length - limit)
}

export function reconfigureLayout() { editorState.layoutVersion++ }

export function addLayer() {
  const newLayer = Math.max(...editorState.layers, 0) + 1
  if (!Number.isSafeInteger(newLayer)) {
    editorState.statusText = t('layerIdExhausted')
    return
  }
  editorState.layers.push(newLayer)
  sceneManager.activeScene.settings.namedLayers.push({ id: newLayer, name: `Layer ${newLayer}`, visible: true, locked: false })
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
  sceneManager.activeScene.settings.namedLayers = sceneManager.activeScene.settings.namedLayers.filter(layer => layer.id !== layerId)
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
  const sourceLayer = sceneManager.activeScene.settings.namedLayers.find(layer => layer.id === layerId)
  sceneManager.activeScene.settings.namedLayers.push({ id: newLayerId, name: `${sourceLayer?.name ?? `Layer ${layerId}`} copy`, visible: sourceLayer?.visible !== false, locked: false })
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

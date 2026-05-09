import { reactive } from "vue"
import { physicsState } from "./physics"

export type EditorPage = "scene" | "render" | "settings"

export const editorState = reactive({
  currentPage: "scene" as EditorPage,
  statusText: "Ready",
  layoutVersion: 0,
  showGrid: true,
  layers: [1], 
  activeLayer: 1, 
  renderLayer: 'all' as number | 'all', // NEW: Renderer specific layer
  
  // NEW: Context Menu State
  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
    type: 'none' as 'sidebar-entity' | 'layer' | 'grid-entity' | 'none',
    targetId: null as number | null
  }
})

export function reconfigureLayout() { editorState.layoutVersion++ }

export function addLayer() {
  const newLayer = Math.max(...editorState.layers, 0) + 1
  editorState.layers.push(newLayer)
  editorState.activeLayer = newLayer
  editorState.statusText = `Created Layer ${newLayer}`
}

export function setActiveLayer(layer: number) {
  editorState.activeLayer = layer
  editorState.statusText = `Switched to Layer ${layer}`
}

export function setRenderLayer(layer: number | 'all') {
  editorState.renderLayer = layer
  editorState.statusText = layer === 'all' ? `Rendering All Layers` : `Rendering Layer ${layer}`
}

// --- CONTEXT MENU ACTIONS ---
export function openContextMenu(e: MouseEvent, type: string, targetId: number | null = null) {
  e.preventDefault()
  editorState.contextMenu.visible = true
  editorState.contextMenu.x = e.clientX
  editorState.contextMenu.y = e.clientY
  editorState.contextMenu.type = type as any
  editorState.contextMenu.targetId = targetId
}

export function closeContextMenu() {
  editorState.contextMenu.visible = false
}

// --- LAYER MANIPULATION ---
export function deleteLayer(layerId: number) {
  if (editorState.layers.length <= 1) return // Prevent deleting last layer
  editorState.layers = editorState.layers.filter(l => l !== layerId)
  if (editorState.activeLayer === layerId) editorState.activeLayer = editorState.layers[0]
  if (editorState.renderLayer === layerId) editorState.renderLayer = 'all'
  physicsState.world.entities = physicsState.world.entities.filter(e => e.layer !== layerId)
}

export function duplicateLayer(layerId: number) {
  const newLayerId = Math.max(...editorState.layers, 0) + 1
  editorState.layers.push(newLayerId)
  
  // Get entities on this layer
  const toClone = physicsState.world.entities.filter(e => e.layer === layerId)
  toClone.forEach(original => {
    const cloneData = JSON.parse(JSON.stringify(original))
    cloneData.id = (physicsState.world as any).nextId++
    cloneData.layer = newLayerId
    // Push raw clone, Vue reactivity maps it via the physics store loaders conceptually, 
    // but a direct push works for pure data cloning.
    physicsState.world.entities.push(cloneData)
  })
  editorState.activeLayer = newLayerId
}

export function moveLayerToFront(layerId: number) {
  const layerEntities = physicsState.world.entities.filter(e => e.layer === layerId)
  physicsState.world.entities = physicsState.world.entities.filter(e => e.layer !== layerId)
  physicsState.world.entities.push(...layerEntities) // Draw last = front
}

export function moveLayerToBack(layerId: number) {
  const layerEntities = physicsState.world.entities.filter(e => e.layer === layerId)
  physicsState.world.entities = physicsState.world.entities.filter(e => e.layer !== layerId)
  physicsState.world.entities.unshift(...layerEntities) // Draw first = back
}
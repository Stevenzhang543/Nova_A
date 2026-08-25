<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { physicsState, pushHistory, selectEntities } from '../store/physics'
import { BoxEntity } from '../world/BoxEntity'
import { CircleEntity } from '../world/CircleEntity'
import { TriangleEntity } from '../world/TriangleEntity'
import type { Entity } from '../world/Entity'
import type { Vec2 } from '../world/types'
import { addEditorLog, editorState, openContextMenu } from '../store/editor'
import { isValidConvexPolygon, MIN_SIZE, normalizeEntity, syncMassFromDensity } from '../world/geometry'
import { preferencesState as prefs } from '../store/preferences'
import { boundCompoundEntityIds, connectionGeometrySignature, connectionSharesLayer, entityBoundaryPoints, repatchConnection, resolveAnchor, routePoints, setManualRoute } from '../world/Connection'
import { t } from '../i18n'
import { defaultColorForLayer } from '../world/layers'
import { compoundGeometries } from '../world/compoundGeometry'
import { localPointToWorld, worldPointToLocal, worldTransform } from '../world/hierarchy'
import { applyRotation, applyScale, applyTranslation, axisVector, captureTransforms, gizmoPivot, gizmoRotation, projectedDelta, type GizmoAxis, type TransformSnapshot } from '../editor/gizmo'
import { createRenderer2D, type Renderer2D } from '../renderer'
import { reportRendererReset } from '../renderer/capabilities'
import { renderWorld } from '../renderer/sceneRenderer'
import { assetReference, resolveAsset } from '../assets/AssetDatabase'
import { type CharacterBody2D, type Joint2D, type TextInput, type TileMap2D } from '../world/components'
import { gameplayRuntime } from '../runtime/GameplayRuntime'
import { gameUiRuntime, type UiAccessibilityNode } from '../runtime/gameUi'
import { rebindInputAction } from '../runtime/input'
import { instantiatePrefab } from '../runtime/prefabs'
import { beginTileStroke, continueTileStroke, endTileStroke, tilemapEditorState, worldToTile, type TileStroke } from '../runtime/tilemap'
import { profilerState, recordFrameProfile } from '../runtime/profiler'
import { samplePerformanceTools } from '../runtime/performanceTools'
import { reportFatalError, reportRecoverableError } from '../runtime/faultCenter'
import { physicsDebugState } from '../runtime/physicsDebug'
import { renderDebugView2D, renderLighting2D, renderPostProcessOverlay, worldPostProcessFilter } from '../renderer/lighting2d'
import { beginRenderGraph, captureRenderSurface, completeRenderGraph, recordRenderPass, renderGraphState } from '../renderer/renderGraph'
import { captureRenderTexture } from '../renderer/renderTextures'
import { activeGameCameras } from '../renderer/sceneRenderer'
import { renderingSettings } from '../renderer/renderSettings'
import { recordEntityProperties } from '../editor/animationStudioState'
import { navigationPaths, worldGameplayState } from '../runtime/worldGameplay'
import { worldStreamingState } from '../runtime/worldStreaming'
import { authoringState, createAuthoringObject } from '../editor/authoring2d'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const renderCanvasRef = ref<HTMLCanvasElement | null>(null)
const nativeInputRef = ref<HTMLInputElement | null>(null)
const focusedUiInput = ref<{ entity: Entity; rect: { x: number; y: number; width: number; height: number }; input: TextInput } | null>(null)
const accessibilityNodes = ref<UiAccessibilityNode[]>([])
let accessibilitySignature = ''
let ctx: CanvasRenderingContext2D | null = null
let renderer: Renderer2D | null = null
let canvasPixelRatio = 1
let isManualDrawing = false
const knownBrokenConnections = new Set<number>()
const connectionGeometrySignatures = new Map<number, string>()
let palette = {
  canvas: '#11151b', grid: '#202630', label: '#626c7c', xAxis: '#a9505b', yAxis: '#4e946d',
  selection: '#ffd166', selectionFill: 'rgba(255,209,102,.24)', handle: '#ff7a59', connection: '#8bb8ff', broken: '#ff6b6b'
}

const state = physicsState
const world = physicsState.world
const camera = physicsState.camera

let isDragging = false; let isPanning = false; let isVertexDragging = false; let dragButton = 0 
let dragStart: Vec2 | null = null; let dragNow: Vec2 | null = null; let lastMouseScreen: Vec2 | null = null
let raf = 0; let resizeRaf = 0; let lastTime = performance.now(); let resizeObserver: ResizeObserver | null = null

let hoveredVertex: { entityId: number, index: number, target: 'shape' | 'renderer' | 'collider', virtualPos?: Vec2 } | null = null
let dragMeta: { initialScaleX: number, initialScaleY: number, initialDist: number } | null = null
let dragEntityId: number | null = null; 
let canvasDragMode: 'none' | 'draw' | 'marquee' = 'none'
let marqueeSelectionMode: 'replace' | 'add' | 'toggle' = 'replace'
let gizmoDrag: {
  tool: 'move' | 'rotate' | 'scale'
  axis: GizmoAxis
  pivot: Vec2
  rotation: number
  startPointer: Vec2
  startAngle: number
  startLocal: Vec2
  snapshots: TransformSnapshot[]
} | null = null
let tileStroke: { entity: Entity; component: TileMap2D; stroke: TileStroke } | null = null
let tileHover: { x: number; y: number } | null = null

let savedCameraState: { scale: number, offset: Vec2 } | null = null;
let hasMovedEntity = false;

watch(() => authoringState.viewportRequest?.id, () => {
  const request = authoringState.viewportRequest
  if (!request || editorState.currentPage !== 'scene') return
  const selected = world.entities.filter(entity => state.selectedEntityIds.includes(entity.id))
  const cameraEntity = request.action === 'focus-camera'
    ? selected.find(entity => entity.camera2D) ?? world.entities.find(entity => entity.camera2D?.active)
    : null
  const targets = cameraEntity ? [cameraEntity] : selected
  if (!targets.length) return
  const points = targets.flatMap(entity => entityBoundaryPoints(entity, 64, world.entities))
  if (!points.length) points.push(...targets.map(entity => worldTransform(entity, world.entities).position))
  const minX = Math.min(...points.map(point => point.x)), maxX = Math.max(...points.map(point => point.x))
  const minY = Math.min(...points.map(point => point.y)), maxY = Math.max(...points.map(point => point.y))
  const width = canvasRef.value?.clientWidth ?? 800, height = canvasRef.value?.clientHeight ?? 600
  const scale = Math.min(width * .72 / Math.max(maxX - minX, 1), height * .72 / Math.max(maxY - minY, 1))
  camera.targetScale = Math.min(1000, Math.max(.05, scale))
  camera.targetOffset = { x: width / 2 - (minX + maxX) / 2 * camera.targetScale, y: height / 2 + (minY + maxY) / 2 * camera.targetScale }
})

watch(() => state.focusEntityID, (newId) => {
  if (editorState.currentPage !== 'scene') return;

  if (newId !== null) {
    if (!savedCameraState) {
      savedCameraState = { scale: camera.targetScale ?? camera.scale, offset: { x: camera.targetOffset?.x ?? camera.offset.x, y: camera.targetOffset?.y ?? camera.offset.y } };
    }
    
    const ent = world.entities.find(e => e.id === newId); if (!ent) return;
    
    const boundary = entityBoundaryPoints(ent, 64, world.entities)
    const xs = boundary.map(point => point.x); const ys = boundary.map(point => point.y)
    const maxDim = boundary.length ? Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1) : 1
    
    const canvasW = canvasRef.value?.clientWidth || 800; const canvasH = canvasRef.value?.clientHeight || 600; const usableW = canvasW - 300; 
    const targetScale = Math.min(usableW / maxDim, canvasH / maxDim) * 0.666;
    
    camera.targetScale = Math.min(Math.max(targetScale, 0.05), 1000);
    const position = worldTransform(ent, world.entities).position
    camera.targetOffset = { x: (usableW / 2) - (position.x * camera.targetScale), y: (canvasH / 2) + (position.y * camera.targetScale) };
  } else {
    if (savedCameraState) {
      camera.targetScale = savedCameraState.scale; camera.targetOffset = { x: savedCameraState.offset.x, y: savedCameraState.offset.y };
      savedCameraState = null;
    }
  }
});

function readPalette() {
  const styles = getComputedStyle(document.documentElement)
  const value = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback
  palette = {
    canvas: value('--bg-canvas', palette.canvas), grid: value('--canvas-grid', palette.grid), label: value('--canvas-grid-label', palette.label),
    xAxis: value('--canvas-x-axis', palette.xAxis), yAxis: value('--canvas-y-axis', palette.yAxis), selection: value('--canvas-selection', palette.selection),
    selectionFill: value('--canvas-selection-fill', palette.selectionFill), handle: value('--canvas-handle', palette.handle),
    connection: value('--connection', palette.connection), broken: value('--connection-broken', palette.broken)
  }
}

watch(() => [prefs.theme, prefs.highContrast, prefs.maxPixelRatio], () => { readPalette(); scheduleResize() })
watch(() => editorState.currentPage, page => {
  if (page !== 'game') {
    gameUiRuntime.blurTextInput()
    focusedUiInput.value = null
  }
})

function synchronizeNativeInput(focus = false) {
  const active = gameUiRuntime.focusedTextInput()
  focusedUiInput.value = active
  if (focus && active) void nextTick(() => { nativeInputRef.value?.focus(); nativeInputRef.value?.select() })
}

function nativeInputStyle() {
  const rect = focusedUiInput.value?.rect
  return rect ? { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` } : {}
}

function onNativeInput(event: Event) {
  const active = focusedUiInput.value
  if (!active) return
  active.input.value = (event.target as HTMLInputElement).value.slice(0, Math.max(0, active.input.maxLength))
}

function closeNativeInput() {
  gameUiRuntime.blurTextInput()
  focusedUiInput.value = null
}

function resize() {
  const canvas = canvasRef.value; if (!canvas) return
  canvasPixelRatio = Math.min(window.devicePixelRatio || 1, prefs.maxPixelRatio, renderingSettings.maximumPixelRatio)
  const dpr = canvasPixelRatio; const r = canvas.getBoundingClientRect()
  const oldWidth = canvas.width / dpr; const oldHeight = canvas.height / dpr
  const nextWidth = Math.max(1, Math.round(r.width * dpr)); const nextHeight = Math.max(1, Math.round(r.height * dpr))
  const backingStoreChanged = canvas.width !== nextWidth || canvas.height !== nextHeight
  if (backingStoreChanged) {
    canvas.width = nextWidth; canvas.height = nextHeight
  }
  // CSS dimensions can change without changing a rounded backing-store pixel.
  // The WebGL viewport still needs the latest logical size in that case.
  renderer?.resize(r.width, r.height, dpr)
  if (oldWidth > 0 && oldHeight > 0 && (oldWidth !== r.width || oldHeight !== r.height)) {
    camera.offset.x += (r.width - oldWidth) / 2; camera.offset.y += (r.height - oldHeight) / 2
  }
  if (!ctx) ctx = canvas.getContext('2d', { alpha: true })!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  render()
}

function scheduleResize() {
  if (resizeRaf) return
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = 0
    resize()
  })
}

function runFrame(time?: number) {
  const now = time || performance.now(); const dt = (now - lastTime) / 1000; lastTime = now
  const frameStarted = performance.now()

  if (camera.targetScale !== null && !prefs.reduceMotion) {
    camera.scale += (camera.targetScale - camera.scale) * (1 - Math.exp(-8 * dt));
    if (Math.abs(camera.scale - camera.targetScale) < 0.005) { camera.scale = camera.targetScale; camera.targetScale = null; }
  }
  if (camera.targetScale !== null && prefs.reduceMotion) { camera.scale = camera.targetScale; camera.targetScale = null }
  if (camera.targetOffset !== null && !prefs.reduceMotion) {
    const blend = 1 - Math.exp(-8 * dt)
    camera.offset.x += (camera.targetOffset.x - camera.offset.x) * blend;
    camera.offset.y += (camera.targetOffset.y - camera.offset.y) * blend;
    if (Math.abs(camera.offset.x - camera.targetOffset.x) < 0.5 && Math.abs(camera.offset.y - camera.targetOffset.y) < 0.5) {
      camera.offset.x = camera.targetOffset.x; camera.offset.y = camera.targetOffset.y; camera.targetOffset = null;
    }
  }
  if (camera.targetOffset !== null && prefs.reduceMotion) { camera.offset = { ...camera.targetOffset }; camera.targetOffset = null }

  if (editorState.currentPage === 'scene' && !state.simulationRunning) syncEditableConnections(true)
  gameplayRuntime.frame(Math.min(dt, 0.1), canvasRef.value?.getBoundingClientRect())
  if (editorState.currentPage === 'scene' && state.simulationRunning) syncEditableConnections(false)
  for (const connection of world.connections) {
    if (connection.breakState !== 'intact' && !knownBrokenConnections.has(connection.id)) {
      knownBrokenConnections.add(connection.id)
      editorState.statusText = t('connectionBroken', { name: connection.name })
      addEditorLog(t('connectionBroken', { name: connection.name }), 'Physics', 'warning')
    }
  }
  const renderingStarted = performance.now()
  render()
  const renderingMs = performance.now() - renderingStarted
  const timings = gameplayRuntime.diagnostics.timings
  const frameMs = Math.max(0, dt * 1000)
  const measured = timings.physicsMs + timings.scriptsMs + timings.animationMs + timings.audioMs + timings.assetsMs + renderingMs
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
  const performanceSample = samplePerformanceTools(profilerState.current.frame + 1, world.entities.map(entity => entity.uuid), editorState.rendererStats)
  recordFrameProfile({
    frameMs, physicsMs: timings.physicsMs, renderingMs, scriptsMs: timings.scriptsMs,
    animationMs: timings.animationMs, audioMs: timings.audioMs, assetsMs: timings.assetsMs,
    otherMs: Math.max(0, Math.min(performance.now() - frameStarted, frameMs || Number.POSITIVE_INFINITY) - measured),
    fps: dt > 0 ? 1 / dt : 0, memoryMb: memory ? memory.usedJSHeapSize / (1024 * 1024) : null,
    inputMs: timings.inputMs, allocations: performanceSample.allocations,
    gpuPasses: renderGraphState.passes.filter(pass => pass.enabled).length, assetJobs: performanceSample.assetJobs
  })
}

function loop(time?: number) {
  try { runFrame(time) }
  catch (error) { raf = 0; reportFatalError(error, 'Scene/Game frame', 'Renderer'); return }
  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  readPalette()
  gameUiRuntime.setCallback((entity, functionName) => gameplayRuntime.invokeUiCallback(entity, functionName))
  gameUiRuntime.setInputActions(physicsState.inputMap)
  gameUiRuntime.setRemapCallback((action, bindingIndex, binding) => {
    if (rebindInputAction(physicsState.inputMap, action, bindingIndex, binding)) pushHistory('Remap runtime input')
  })
  if (renderCanvasRef.value) renderer = createRenderer2D(renderCanvasRef.value)
  window.addEventListener('nova-renderer-reset-request', resetRenderer)
  world.connections.filter(connection => connection.breakState !== 'intact').forEach(connection => knownBrokenConnections.add(connection.id))
  resize()
  if (canvasRef.value) {
    const r = canvasRef.value.getBoundingClientRect(); camera.offset.x = r.width / 2; camera.offset.y = r.height / 2
    resizeObserver = new ResizeObserver(scheduleResize); resizeObserver.observe(canvasRef.value.parentElement!)
  }
  lastTime = performance.now(); loop(); window.addEventListener('resize', scheduleResize); window.addEventListener('mouseup', onMouseUp); window.addEventListener('keydown', onKeyDown)
  void world.wasmReady.then(() => {
    if (world.wasmError) editorState.statusText = t('physicsUnavailable', { message: world.wasmError.message })
  }).catch(error => { editorState.statusText = t('physicsUnavailable', { message: error instanceof Error ? error.message : String(error) }); reportRecoverableError(error, 'Physics WebAssembly initialization', 'Physics') })
})
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf); if (resizeRaf) cancelAnimationFrame(resizeRaf); window.removeEventListener('resize', scheduleResize); window.removeEventListener('mouseup', onMouseUp); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('nova-renderer-reset-request', resetRenderer); if (resizeObserver) resizeObserver.disconnect(); gameUiRuntime.reset(); renderer?.destroy(); renderer = null })

function resetRenderer() {
  if (!renderCanvasRef.value) return
  renderer?.destroy()
  renderer = createRenderer2D(renderCanvasRef.value)
  renderer.resize(renderCanvasRef.value.clientWidth, renderCanvasRef.value.clientHeight, canvasPixelRatio)
  reportRendererReset()
}

function screenPos(e: MouseEvent): Vec2 { const r = canvasRef.value!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
function onWheel(e: WheelEvent) { e.preventDefault(); if (editorState.currentPage === 'game') { gameUiRuntime.wheel(screenPos(e), e.deltaX, e.deltaY); return } const factor = Math.pow(1.1, prefs.zoomSensitivity); camera.zoomAt(screenPos(e), e.deltaY < 0 ? factor : 1 / factor) }
function onAssetDragOver(event: DragEvent) { if (state.playMode === 'editing' && event.dataTransfer?.types.includes('application/x-nova-asset-guid')) event.preventDefault() }
function onAssetDrop(event: DragEvent) {
  if (state.playMode !== 'editing') return
  const guid = event.dataTransfer?.getData('application/x-nova-asset-guid')
  const asset = resolveAsset(guid)
  if (!asset || (asset.assetType !== 'image' && asset.assetType !== 'prefab')) return
  event.preventDefault()
  const point = camera.screenToWorld(screenPos(event))
  if (asset.assetType === 'prefab') {
    const entities = instantiatePrefab(assetReference(asset.uuid), point)
    if (!entities.length) return
    pushHistory('Instantiate prefab')
    addEditorLog(t('prefabInstantiated', { name: asset.name }), 'Assets')
    return
  }
  const pixelsPerUnit = Math.max(.000001, asset.settings.pixelsPerUnit)
  const importedWidth = asset.settings.spriteRegion?.width || asset.width
  const importedHeight = asset.settings.spriteRegion?.height || asset.height
  const width = Math.max(.1, (importedWidth || pixelsPerUnit) / pixelsPerUnit)
  const height = Math.max(.1, (importedHeight || pixelsPerUnit) / pixelsPerUnit)
  const entity = createAuthoringObject('Sprite', point, false)
  entity.name = asset.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Sprite'
  const sprite = entity.spriteRenderer!
  sprite.spriteAsset = assetReference(asset.uuid)
  sprite.size = { x: width, y: height }
  sprite.pivot = { ...asset.settings.pivot }
  sprite.filterMode = asset.settings.filterMode
  sprite.nineSlice = { enabled: Object.values(asset.settings.borders).some(value => value > 0), ...asset.settings.borders }
  sprite.sortingLayer = editorState.activeLayer
  entity.layer = editorState.activeLayer
  selectEntities([entity.id], 'replace')
  pushHistory('Create sprite from asset')
  addEditorLog(t('assetDropped', { name: asset.name }), 'Assets')
}
function snapPoint(point: Vec2): Vec2 {
  let result = { ...point }
  if (prefs.snapToGrid && authoringState.snap.grid) {
    const step = Math.max(0.000001, prefs.gridSize)
    result = { x: Math.round(result.x / step) * step, y: Math.round(result.y / step) * step }
  }
  if (authoringState.snap.pixel) result = { x: Math.round(result.x * 100) / 100, y: Math.round(result.y * 100) / 100 }
  if (!authoringState.snap.vertex && !authoringState.snap.edge && !authoringState.snap.center && !authoringState.snap.object) return result
  const threshold = 10 / Math.max(camera.scale, 1e-9)
  const selected = new Set(state.selectedEntityIds)
  const candidates = (authoringState.performanceMode ? world.entities.slice(0, 5_000) : world.entities).filter(entity => !selected.has(entity.id) && entity.editorVisible && entity.layer === editorState.activeLayer)
  let nearest = threshold
  const consider = (candidate: Vec2) => { const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y); if (distance < nearest) { nearest = distance; result = { ...candidate } } }
  for (const entity of candidates) {
    const center = worldTransform(entity, world.entities).position
    if (authoringState.snap.center) consider(center)
    const boundary = entityBoundaryPoints(entity, authoringState.performanceMode ? 8 : 32, world.entities)
    if (authoringState.snap.vertex) boundary.forEach(consider)
    if (authoringState.snap.edge) for (let index = 0; index < boundary.length; index++) {
      const start = boundary[index], end = boundary[(index + 1) % boundary.length]
      const dx = end.x - start.x, dy = end.y - start.y, lengthSquared = dx * dx + dy * dy
      const amount = lengthSquared ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)) : 0
      consider({ x: start.x + dx * amount, y: start.y + dy * amount })
    }
    if (authoringState.snap.object) {
      if (Math.abs(center.x - point.x) < nearest) { nearest = Math.abs(center.x - point.x); result.x = center.x }
      if (Math.abs(center.y - point.y) < nearest) { nearest = Math.abs(center.y - point.y); result.y = center.y }
    }
  }
  return result
}

function editorBoundaryPoints(entity: Entity, samples = 48): Vec2[] {
  const sprite = entity.spriteRenderer
  if (sprite) {
    const left = -sprite.pivot.x * sprite.size.x, right = (1 - sprite.pivot.x) * sprite.size.x
    const bottom = -(1 - sprite.pivot.y) * sprite.size.y, top = sprite.pivot.y * sprite.size.y
    return [{ x: left, y: bottom }, { x: right, y: bottom }, { x: right, y: top }, { x: left, y: top }].map(point => localPointToWorld(entity, point, world.entities))
  }
  if ((entity.renderer.shape === 'Line' || entity.authoring.kind === 'Path' || entity.authoring.kind === 'Polygon') && entity.hasComponent('ShapeRenderer2D')) return entity.renderer.vertices.map(point => localPointToWorld(entity, point, world.entities))
  if (entity.textRenderer) {
    const width = Math.max(entity.textRenderer.maxWidth || entity.textRenderer.text.length * entity.textRenderer.fontSize * .58, .2), height = entity.textRenderer.fontSize * entity.textRenderer.lineHeight
    return [{ x: -width / 2, y: -height / 2 }, { x: width / 2, y: -height / 2 }, { x: width / 2, y: height / 2 }, { x: -width / 2, y: height / 2 }].map(point => localPointToWorld(entity, point, world.entities))
  }
  return entityBoundaryPoints(entity, samples, world.entities)
}

function onKeyDown(event: KeyboardEvent) {
  if (focusedUiInput.value && (document.activeElement === nativeInputRef.value || event.isComposing)) return
  if (editorState.currentPage === 'game' && gameUiRuntime.keyDown(event)) { event.preventDefault(); return }
  if ((event.key === 'Delete' || event.key === 'Backspace') && hoveredVertex && (hoveredVertex.target === 'renderer')) {
    const entity = world.entities.find(candidate => candidate.id === hoveredVertex!.entityId), minimum = entity?.renderer.shape === 'Line' ? 2 : 3
    if (entity && entity.renderer.vertices.length > minimum) { entity.renderer.vertices.splice(hoveredVertex.index, 1); entity.authoring.path.points = entity.renderer.vertices.map(point => ({ ...point })); pushHistory('Delete shape point', `vertices:${entity.uuid}`); hoveredVertex = null; event.preventDefault() }
    return
  }
  if (event.key !== 'Escape') return
  if (editorState.manualConnectionId !== null) {
    editorState.manualConnectionId = null
    editorState.manualConnectionPoints.splice(0)
    isManualDrawing = false
    editorState.statusText = t('ready')
  }
  gizmoDrag = null
  canvasDragMode = 'none'
}

function syncEditableConnections(repatchChanged: boolean) {
  const currentIds = new Set<number>()
  for (const connection of world.connections) {
    currentIds.add(connection.id)
    const signature = connectionGeometrySignature(connection, world.entities)
    const previous = connectionGeometrySignatures.get(connection.id)
    if (repatchChanged && previous !== undefined && previous !== signature) repatchConnection(connection, world.entities)
    connectionGeometrySignatures.set(connection.id, connectionGeometrySignature(connection, world.entities))
  }
  for (const id of connectionGeometrySignatures.keys()) {
    if (!currentIds.has(id)) connectionGeometrySignatures.delete(id)
  }
}

function strokeSmoothPath(context: CanvasRenderingContext2D, points: Vec2[]) {
  context.beginPath()
  context.moveTo(points[0].x, points[0].y)
  if (points.length === 2) {
    context.lineTo(points[1].x, points[1].y)
  } else {
    for (let index = 1; index < points.length - 1; index++) {
      const midpoint = {
        x: (points[index].x + points[index + 1].x) * 0.5,
        y: (points[index].y + points[index + 1].y) * 0.5
      }
      context.quadraticCurveTo(points[index].x, points[index].y, midpoint.x, midpoint.y)
    }
    const penultimate = points[points.length - 2]
    const last = points[points.length - 1]
    context.quadraticCurveTo(penultimate.x, penultimate.y, last.x, last.y)
  }
  context.stroke()
}

const drawTools = new Set(['rectangle', 'circle', 'triangle'])
function isDrawTool(): boolean { return drawTools.has(state.activeTool) }
function selectionMode(event: MouseEvent): 'replace' | 'add' | 'toggle' { return event.ctrlKey || event.metaKey ? 'toggle' : event.shiftKey ? 'add' : 'replace' }
function rotateVector(vector: Vec2, angle: number): Vec2 { const cosine = Math.cos(angle); const sine = Math.sin(angle); return { x: vector.x * cosine - vector.y * sine, y: vector.x * sine + vector.y * cosine } }
function distanceToSegment(point: Vec2, start: Vec2, end: Vec2): number {
  const dx = end.x - start.x; const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  const amount = lengthSquared > 0 ? Math.min(1, Math.max(0, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)) : 0
  return Math.hypot(point.x - start.x - dx * amount, point.y - start.y - dy * amount)
}
function transformSelectionIds(): number[] {
  const ids = new Set<number>()
  for (const id of state.selectedEntityIds) for (const member of boundCompoundEntityIds(id, world.connections, world.entities)) ids.add(member)
  return [...ids].filter(id => !world.entities.find(entity => entity.id === id)?.editorLocked)
}
function currentGizmo() {
  const ids = transformSelectionIds()
  if (!ids.length) return null
  const primaryId = ids.includes(state.selectedEntityId ?? -1) ? state.selectedEntityId : ids[ids.length - 1] ?? null
  return {
    ids,
    primaryId,
    pivot: gizmoPivot(ids, primaryId, editorState.pivotMode, world.entities),
    rotation: gizmoRotation(primaryId, editorState.transformSpace, world.entities)
  }
}
function hitGizmo(point: Vec2): GizmoAxis | null {
  const gizmo = currentGizmo()
  if (!gizmo || state.activeTool === 'select' || isDrawTool() || ['pivot', 'path', 'polygon', 'collider', 'measure'].includes(state.activeTool)) return null
  const unit = 1 / camera.scale
  const x = axisVector('x', gizmo.rotation); const y = axisVector('y', gizmo.rotation)
  const xEnd = { x: gizmo.pivot.x + x.x * 72 * unit, y: gizmo.pivot.y + x.y * 72 * unit }
  const yEnd = { x: gizmo.pivot.x + y.x * 72 * unit, y: gizmo.pivot.y + y.y * 72 * unit }
  if (state.activeTool === 'rotate') return Math.abs(Math.hypot(point.x - gizmo.pivot.x, point.y - gizmo.pivot.y) - 52 * unit) <= 9 * unit ? 'xy' : null
  if (state.activeTool === 'scale' || state.activeTool === 'rect') {
    if (Math.hypot(point.x - xEnd.x, point.y - xEnd.y) <= 10 * unit) return 'x'
    if (Math.hypot(point.x - yEnd.x, point.y - yEnd.y) <= 10 * unit) return 'y'
    if (Math.hypot(point.x - gizmo.pivot.x, point.y - gizmo.pivot.y) <= 10 * unit) return 'xy'
    return null
  }
  if (Math.hypot(point.x - gizmo.pivot.x, point.y - gizmo.pivot.y) <= 10 * unit) return 'xy'
  if (distanceToSegment(point, gizmo.pivot, xEnd) <= 7 * unit) return 'x'
  if (distanceToSegment(point, gizmo.pivot, yEnd) <= 7 * unit) return 'y'
  return null
}
function beginGizmoDrag(axis: GizmoAxis, point: Vec2) {
  const gizmo = currentGizmo()
  const tool = state.activeTool
  if (!gizmo || (tool !== 'move' && tool !== 'rotate' && tool !== 'scale' && tool !== 'rect')) return
  const local = rotateVector({ x: point.x - gizmo.pivot.x, y: point.y - gizmo.pivot.y }, -gizmo.rotation)
  gizmoDrag = {
    tool: tool === 'rect' ? 'scale' : tool,
    axis,
    pivot: gizmo.pivot,
    rotation: gizmo.rotation,
    startPointer: { ...point },
    startAngle: Math.atan2(point.y - gizmo.pivot.y, point.x - gizmo.pivot.x),
    startLocal: local,
    snapshots: captureTransforms(gizmo.ids, world.entities)
  }
  hasMovedEntity = false
}

function beginVertexDrag(entityId: number, point: Vec2, button: number): boolean {
  const entity = world.entities.find(candidate => candidate.id === entityId)
  if (!entity || entity.editorLocked || state.playMode !== 'editing') return false
  dragEntityId = entityId
  dragButton = button
  isVertexDragging = true
  const position = worldTransform(entity, world.entities).position
  dragMeta = {
    initialScaleX: entity.transform.scale.x,
    initialScaleY: entity.transform.scale.y,
    initialDist: Math.max(0.1, Math.hypot(point.x - position.x, point.y - position.y))
  }
  return true
}

function onMouseDown(e: MouseEvent) {
  const sPos = screenPos(e); const wPos = camera.screenToWorld(sPos); dragButton = e.button; hasMovedEntity = false
  if (editorState.currentPage === 'game') {
    if (e.button === 0) { gameUiRuntime.pointerDown(sPos); synchronizeNativeInput(true) }
    return
  }
  const tileEntity = tilemapEditorState.active ? world.entities.find(entity => entity.uuid === tilemapEditorState.selectedEntityUuid) ?? null : null
  const tileMap = tileEntity?.getComponent<TileMap2D>('TileMap2D') ?? null
  if (e.button === 0 && tileEntity && tileMap && state.playMode === 'editing') {
    const cell = worldToTile(tileEntity, tileMap, wPos, world.entities)
    if (cell) { tileStroke = { entity: tileEntity, component: tileMap, stroke: beginTileStroke(tileMap, cell) }; tileHover = cell; return }
  }
  if (editorState.manualConnectionId !== null && e.button === 0 && state.playMode === 'editing') { isManualDrawing = true; editorState.manualConnectionPoints.splice(0, editorState.manualConnectionPoints.length, wPos); return }
  if (e.button === 0 && state.activeTool === 'select' && state.playMode === 'editing') {
    const uiEntity = gameUiRuntime.entityAt(sPos)
    if (uiEntity && !uiEntity.hasComponent('Canvas')) {
      selectEntities([uiEntity.id], selectionMode(e), uiEntity.id)
      return
    }
  }
  if (state.activeTool === 'measure' && e.button === 0 && state.playMode === 'editing') {
    const point = snapPoint(wPos); authoringState.measurement = { active: true, start: point, end: point }; return
  }
  if (state.activeTool === 'pivot' && e.button === 0 && state.playMode === 'editing') {
    const entity = world.entities.find(candidate => candidate.id === state.selectedEntityId)
    if (entity && !entity.editorLocked) {
      const local = worldPointToLocal(entity, snapPoint(wPos), world.entities)
      const sprite = entity.spriteRenderer
      if (sprite) {
        const pivot = { x: Math.max(0, Math.min(1, local.x / Math.max(sprite.size.x, 1e-9) + .5)), y: Math.max(0, Math.min(1, local.y / Math.max(sprite.size.y, 1e-9) + .5)) }
        sprite.pivot = pivot; entity.authoring.origin = { ...pivot }
      } else entity.authoring.origin = { ...local }
      pushHistory('Set object pivot', `pivot:${entity.uuid}`)
    }
    return
  }
  if (vertexToolActive()) checkHoverVertex(wPos)
  if (e.button === 2 && hoveredVertex && beginVertexDrag(hoveredVertex.entityId, wPos, e.button)) return
  if (e.button === 2) { const hitId = hitTest(wPos); if (hitId !== null) openContextMenu(e, 'grid-entity', hitId); else { isPanning = true; lastMouseScreen = sPos } return }
  if (e.button === 1) { isPanning = true; lastMouseScreen = sPos; return }
  if (e.button !== 0) return

  if (isDrawTool()) {
    if (state.playMode !== 'editing') return
    canvasDragMode = 'draw'; isDragging = true; dragStart = wPos; dragNow = wPos
    return
  }

  if (vertexToolActive() && state.playMode === 'editing' && hoveredVertex) {
    if (beginVertexDrag(hoveredVertex.entityId, wPos, e.button)) return
  }

  if (state.playMode === 'editing') {
    const axis = hitGizmo(wPos)
    if (axis) { beginGizmoDrag(axis, wPos); return }
  }

  const hitId = hitTest(wPos)
  if (hitId !== null) {
    const entity = world.entities.find(candidate => candidate.id === hitId)
    if (!state.selectedEntityIds.includes(hitId) || e.ctrlKey || e.metaKey || e.shiftKey) selectEntities([hitId], selectionMode(e), hitId)
    if (state.playMode === 'editing' && state.activeTool === 'move' && entity && !entity.editorLocked && state.selectedEntityIds.includes(hitId)) beginGizmoDrag('xy', wPos)
    return
  }

  marqueeSelectionMode = selectionMode(e)
  if (marqueeSelectionMode === 'replace') selectEntities([], 'replace')
  canvasDragMode = 'marquee'; isDragging = true; dragStart = wPos; dragNow = wPos
}

function onDoubleClick(event: MouseEvent) {
  if (!['path', 'polygon'].includes(state.activeTool) || state.selectedEntityId === null || state.playMode !== 'editing') return
  const entity = world.entities.find(candidate => candidate.id === state.selectedEntityId)
  if (!entity?.hasComponent('ShapeRenderer2D') || entity.editorLocked) return
  const point = worldPointToLocal(entity, snapPoint(camera.screenToWorld(screenPos(event))), world.entities), vertices = entity.renderer.vertices
  let insertion = vertices.length
  if (vertices.length > 1) {
    let nearest = Number.POSITIVE_INFINITY, segmentCount = entity.renderer.shape === 'Line' ? vertices.length - 1 : vertices.length
    for (let index = 0; index < segmentCount; index++) { const distance = distanceToSegment(point, vertices[index], vertices[(index + 1) % vertices.length]); if (distance < nearest) { nearest = distance; insertion = index + 1 } }
  }
  vertices.splice(insertion, 0, point); entity.authoring.path.points = vertices.map(vertex => ({ ...vertex })); pushHistory('Add shape point', `vertices:${entity.uuid}`)
}

function onMouseMove(e: MouseEvent) {
  const sPos = screenPos(e); const wPos = camera.screenToWorld(sPos)
  editorState.lastCanvasWorldPoint = { ...wPos }
  if (editorState.currentPage === 'game') { gameUiRuntime.pointerMove(sPos); return }
  if (tilemapEditorState.active) {
    const tileEntity = tileStroke?.entity ?? world.entities.find(entity => entity.uuid === tilemapEditorState.selectedEntityUuid) ?? null
    const tileMap = tileStroke?.component ?? tileEntity?.getComponent<TileMap2D>('TileMap2D') ?? null
    const cell = tileEntity && tileMap ? worldToTile(tileEntity, tileMap, wPos, world.entities) : null
    tileHover = cell
    if (tileStroke && cell) continueTileStroke(tileStroke.component, tileStroke.stroke, cell)
    if (tileStroke) return
  }
  if (isManualDrawing) { const points = editorState.manualConnectionPoints; const previous = points[points.length - 1]; if (!previous || Math.hypot(previous.x - wPos.x, previous.y - wPos.y) > 3 / camera.scale) points.push(wPos); return }
  if (authoringState.measurement.active && authoringState.measurement.start) { authoringState.measurement.end = snapPoint(wPos); return }
  if (isPanning && lastMouseScreen) { camera.targetScale = null; camera.targetOffset = null; camera.offset.x += sPos.x - lastMouseScreen.x; camera.offset.y += sPos.y - lastMouseScreen.y; lastMouseScreen = sPos; return }

  if (gizmoDrag) {
    hasMovedEntity = true
    if (gizmoDrag.tool === 'move') {
      let delta = projectedDelta({ x: wPos.x - gizmoDrag.startPointer.x, y: wPos.y - gizmoDrag.startPointer.y }, gizmoDrag.axis, gizmoDrag.rotation)
      if (prefs.snapToGrid) {
        const target = snapPoint({ x: gizmoDrag.pivot.x + delta.x, y: gizmoDrag.pivot.y + delta.y })
        delta = projectedDelta({ x: target.x - gizmoDrag.pivot.x, y: target.y - gizmoDrag.pivot.y }, gizmoDrag.axis, gizmoDrag.rotation)
      }
      applyTranslation(gizmoDrag.snapshots, delta, world.entities)
    } else if (gizmoDrag.tool === 'rotate') {
      let delta = Math.atan2(wPos.y - gizmoDrag.pivot.y, wPos.x - gizmoDrag.pivot.x) - gizmoDrag.startAngle
      if (editorState.angleSnapEnabled) { const step = Math.max(0.1, editorState.angleSnapDegrees) * Math.PI / 180; delta = Math.round(delta / step) * step }
      applyRotation(gizmoDrag.snapshots, gizmoDrag.pivot, delta, world.entities)
    } else {
      const current = rotateVector({ x: wPos.x - gizmoDrag.pivot.x, y: wPos.y - gizmoDrag.pivot.y }, -gizmoDrag.rotation)
      let factor = { x: 1, y: 1 }
      if (gizmoDrag.axis === 'x') factor.x = Math.max(0.01, Math.abs(current.x) / Math.max(Math.abs(gizmoDrag.startLocal.x), 1e-6))
      else if (gizmoDrag.axis === 'y') factor.y = Math.max(0.01, Math.abs(current.y) / Math.max(Math.abs(gizmoDrag.startLocal.y), 1e-6))
      else { const uniform = Math.max(0.01, Math.hypot(current.x, current.y) / Math.max(Math.hypot(gizmoDrag.startLocal.x, gizmoDrag.startLocal.y), 1e-6)); factor = { x: uniform, y: uniform } }
      applyScale(gizmoDrag.snapshots, gizmoDrag.pivot, factor, world.entities)
    }
    return
  }

  if (!isDragging && !isVertexDragging && vertexToolActive()) checkHoverVertex(wPos)
  if (isVertexDragging && dragEntityId && dragMeta) {
    hasMovedEntity = true
    const entity = world.entities.find(candidate => candidate.id === dragEntityId); if (!entity || !hoveredVertex || entity.editorLocked) return
    const transform = worldTransform(entity, world.entities)
    if (dragButton === 2) { const scaleFactor = Math.hypot(wPos.x - transform.position.x, wPos.y - transform.position.y) / dragMeta.initialDist; entity.transform.scale.x = Math.max(MIN_SIZE, dragMeta.initialScaleX * scaleFactor); entity.transform.scale.y = Math.max(MIN_SIZE, dragMeta.initialScaleY * scaleFactor) }
    else {
      const local = worldPointToLocal(entity, snapPoint(wPos), world.entities)
      if (hoveredVertex.target === 'renderer') {
        const candidate = entity.renderer.vertices.map(vertex => ({ ...vertex })); candidate[hoveredVertex.index] = local
        if (entity.renderer.shape === 'Line' || isValidConvexPolygon(candidate)) { entity.renderer.vertices = candidate; entity.authoring.path.points = candidate.map(point => ({ ...point })) }
      } else if (hoveredVertex.target === 'collider') {
        const collider = entity.getCollider(); if (!collider) return
        if (collider.kind === 'EllipseCollider2D') { collider.radiusX = Math.max(.01, Math.abs(local.x - collider.offset.x)); collider.radiusY = Math.max(.01, Math.abs(local.y - collider.offset.y)) }
        else { const candidate = collider.vertices.map(vertex => ({ ...vertex })); candidate[hoveredVertex.index] = { x: local.x - collider.offset.x, y: local.y - collider.offset.y }; if (isValidConvexPolygon(candidate)) collider.vertices = candidate }
      } else if (entity instanceof BoxEntity || entity instanceof TriangleEntity) {
        const candidate = entity.vertices.map(vertex => ({ ...vertex })); candidate[hoveredVertex.index] = local; if (isValidConvexPolygon(candidate)) entity.vertices = candidate
      } else if (entity instanceof CircleEntity) { entity.radiusX = Math.max(0.1, Math.abs(local.x)); entity.radiusY = Math.max(0.1, Math.abs(local.y)) }
    }
    return
  }
  if (isDragging && dragStart) dragNow = wPos
}

function selectMarqueeEntities(start: Vec2, end: Vec2) {
  const left = Math.min(start.x, end.x); const right = Math.max(start.x, end.x); const bottom = Math.min(start.y, end.y); const top = Math.max(start.y, end.y)
  const ids = world.entities.flatMap(entity => {
    if (!entity.enabled || !entity.editorVisible || entity.editorLocked || entity.layer !== editorState.activeLayer || entity.hasComponent('RectTransform') || !matchesSelectionFilter(entity)) return []
    const boundary = editorBoundaryPoints(entity, 48)
    if (!boundary.length) return []
    const xs = boundary.map(point => point.x); const ys = boundary.map(point => point.y)
    return Math.max(...xs) >= left && Math.min(...xs) <= right && Math.max(...ys) >= bottom && Math.min(...ys) <= top ? [entity.id] : []
  })
  selectEntities(ids, marqueeSelectionMode)
}

function finishCanvasDrag() {
  isDragging = isPanning = isVertexDragging = false
  canvasDragMode = 'none'; dragStart = dragNow = lastMouseScreen = null; dragMeta = null; dragEntityId = null; gizmoDrag = null
}

function onMouseUp(event?: MouseEvent) {
  if (editorState.currentPage === 'game') {
    if (event && canvasRef.value) gameUiRuntime.pointerUp(screenPos(event))
    return
  }
  if (authoringState.measurement.active) { authoringState.measurement.active = false; return }
  if (tileStroke) {
    const point = event && canvasRef.value ? camera.screenToWorld(screenPos(event)) : null
    const cell = point ? worldToTile(tileStroke.entity, tileStroke.component, point, world.entities) : tileStroke.stroke.previous
    const changed = cell ? endTileStroke(tileStroke.component, tileStroke.stroke, cell) : tileStroke.stroke.changed
    if (changed) pushHistory('Paint TileMap', `tilemap:${tileStroke.entity.uuid}`)
    tileStroke = null
    return
  }
  if (isManualDrawing) { const connection = world.connections.find(candidate => candidate.id === editorState.manualConnectionId); if (connection && editorState.manualConnectionPoints.length >= 2) { setManualRoute(connection, editorState.manualConnectionPoints, world.entities); pushHistory('Draw connection'); editorState.statusText = t('connectionUpdated') } editorState.manualConnectionId = null; editorState.manualConnectionPoints.splice(0); isManualDrawing = false; return }

  if (gizmoDrag) {
    if (hasMovedEntity) {
      for (const snapshot of gizmoDrag.snapshots) { normalizeEntity(snapshot.entity); if (snapshot.entity.rigidBody.massMode === 'Automatic') syncMassFromDensity(snapshot.entity) }
      recordEntityProperties(gizmoDrag.snapshots.map(snapshot => snapshot.entity))
      pushHistory(`${gizmoDrag.tool[0].toUpperCase()}${gizmoDrag.tool.slice(1)} entities`, `transform:${gizmoDrag.tool}`)
    }
    finishCanvasDrag(); return
  }

  if (isVertexDragging && dragEntityId !== null) {
    const entity = world.entities.find(candidate => candidate.id === dragEntityId)
    if (entity && hasMovedEntity) { normalizeEntity(entity); if (entity.rigidBody.massMode === 'Automatic') syncMassFromDensity(entity); pushHistory('Edit shape vertices', `vertices:${entity.uuid}`) }
    finishCanvasDrag(); return
  }

  if (isDragging && dragStart && dragNow) {
    const dragDistX = Math.abs(dragStart.x - dragNow.x); const dragDistY = Math.abs(dragStart.y - dragNow.y)
    if (canvasDragMode === 'marquee') {
      if (dragDistX > 0.2 || dragDistY > 0.2) selectMarqueeEntities(dragStart, dragNow)
    } else if (canvasDragMode === 'draw' && (dragDistX > 0.5 || dragDistY > 0.5)) {
      const width = Math.max(dragDistX, 0.1); const height = Math.max(dragDistY, 0.1)
      const center = snapPoint({ x: Math.min(dragStart.x, dragNow.x) + width / 2, y: Math.min(dragStart.y, dragNow.y) + height / 2 })
      let created: Entity | null = null
      if (state.activeTool === 'rectangle') created = world.addBox(center, { x: width, y: height })
      else if (state.activeTool === 'circle') created = world.addCircle(center, width / 2, height / 2)
      else if (state.activeTool === 'triangle') created = world.addTriangle(center, { x: width, y: height })
      if (created) { created.layer = editorState.activeLayer; created.color = defaultColorForLayer(created.layer); created.density = prefs.defaultDensity; created.restitution = prefs.defaultRestitution; created.staticFriction = prefs.defaultFriction; created.dynamicFriction = prefs.defaultFriction; syncMassFromDensity(created); selectEntities([created.id], 'replace', created.id); pushHistory('Create entity') }
    }
  }
  finishCanvasDrag()
}

function vertexToolActive(): boolean { return state.activeTool === 'select' || state.activeTool === 'path' || state.activeTool === 'polygon' || state.activeTool === 'collider' }
function checkHoverVertex(p: Vec2) {
  if (!state.selectedEntityId) { hoveredVertex = null; document.body.style.cursor = 'default'; return }
  const ent = world.entities.find(e => e.id === state.selectedEntityId)
  if (!ent || ent.editorLocked || ent.hasComponent('RectTransform')) { hoveredVertex = null; document.body.style.cursor = 'default'; return }
  const threshold = 12 / camera.scale 
  
  if ((state.activeTool === 'path' || state.activeTool === 'polygon') && ent.hasComponent('ShapeRenderer2D')) {
    const vertices = ent.renderer.vertices
    let minDist = threshold; let foundIndex = -1
    for (let index = 0; index < vertices.length; index++) {
      const point = localPointToWorld(ent, vertices[index], world.entities), distance = Math.hypot(p.x - point.x, p.y - point.y)
      if (distance < minDist) { minDist = distance; foundIndex = index }
    }
    if (foundIndex !== -1) { hoveredVertex = { entityId: ent.id, index: foundIndex, target: 'renderer' }; document.body.style.cursor = 'crosshair'; return }
  } else if (state.activeTool === 'collider') {
    const collider = ent.getCollider()
    if (collider) {
      if (collider.kind === 'EllipseCollider2D') {
        const local = worldPointToLocal(ent, p, world.entities), relative = { x: local.x - collider.offset.x, y: local.y - collider.offset.y }
        const magnitude = Math.hypot(relative.x / Math.max(collider.radiusX, 1e-9), relative.y / Math.max(collider.radiusY, 1e-9))
        if (magnitude > 0) {
          const virtualPos = { x: collider.offset.x + relative.x / magnitude, y: collider.offset.y + relative.y / magnitude }
          const point = localPointToWorld(ent, virtualPos, world.entities)
          if (Math.hypot(p.x - point.x, p.y - point.y) < threshold) { hoveredVertex = { entityId: ent.id, index: -1, target: 'collider', virtualPos }; document.body.style.cursor = 'crosshair'; return }
        }
      } else {
        let minDist = threshold; let foundIndex = -1
        for (let index = 0; index < collider.vertices.length; index++) {
          const point = localPointToWorld(ent, { x: collider.vertices[index].x + collider.offset.x, y: collider.vertices[index].y + collider.offset.y }, world.entities), distance = Math.hypot(p.x - point.x, p.y - point.y)
          if (distance < minDist) { minDist = distance; foundIndex = index }
        }
        if (foundIndex !== -1) { hoveredVertex = { entityId: ent.id, index: foundIndex, target: 'collider' }; document.body.style.cursor = 'crosshair'; return }
      }
    }
  } else if (ent instanceof BoxEntity || ent instanceof TriangleEntity) {
    let minDist = threshold; let foundIndex = -1
    for (let i = 0; i < ent.vertices.length; i++) {
      const point = localPointToWorld(ent, ent.vertices[i], world.entities)
      const vx = point.x; const vy = point.y
      const dist = Math.sqrt((p.x - vx)**2 + (p.y - vy)**2)
      if (dist < minDist) { minDist = dist; foundIndex = i }
    }
    if (foundIndex !== -1) { hoveredVertex = { entityId: ent.id, index: foundIndex, target: 'shape' }; document.body.style.cursor = 'crosshair'; return }
  } 
  else if (ent instanceof CircleEntity) {
    const local = worldPointToLocal(ent, p, world.entities)
    const localX = local.x; const localY = local.y
    const nx = localX / ent.radiusX; const ny = localY / ent.radiusY; const mag = Math.sqrt(nx * nx + ny * ny)
    if (mag > 0) {
      const ex = (nx / mag) * ent.radiusX; const ey = (ny / mag) * ent.radiusY
      const point = localPointToWorld(ent, { x: ex, y: ey }, world.entities)
      const wx = point.x; const wy = point.y
      const dist = Math.sqrt((p.x - wx)**2 + (p.y - wy)**2)
      if (dist < threshold) { hoveredVertex = { entityId: ent.id, index: -1, target: 'shape', virtualPos: { x: ex, y: ey } }; document.body.style.cursor = 'crosshair'; return }
    }
  }
  hoveredVertex = null; document.body.style.cursor = 'default'
}

function hitTest(p: Vec2): number | null {
  const ordered = [...world.entities].sort((a, b) => a.layer - b.layer || a.renderer.orderInLayer - b.renderer.orderInLayer || world.entities.indexOf(a) - world.entities.indexOf(b))
  for (let i = ordered.length - 1; i >= 0; i--) {
    const e = ordered[i]
    const selectable = e.spriteRenderer || e.textRenderer || e.camera2D || e.hasComponent('ShapeRenderer2D') && e.renderer.enabled
    if (!e.enabled || e.hasComponent('RectTransform') || !selectable || !matchesSelectionFilter(e)) continue
    if (editorState.currentPage === 'scene' && (!e.editorVisible || e.editorLocked)) continue
    if (editorState.currentPage === 'scene' && e.layer !== editorState.activeLayer) continue;
    const polygon = editorBoundaryPoints(e, 64)
    if (e.renderer.shape === 'Line' && polygon.some((point, index) => index > 0 && distanceToSegment(p, polygon[index - 1], point) < 7 / camera.scale)) return e.id
    let inside = false
    for (let j = 0, k = polygon.length - 1; j < polygon.length; k = j++) {
      const a = polygon[j]; const b = polygon[k]
      if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside
    }
    if (inside) return e.id
  }
  return null
}

function matchesSelectionFilter(entity: Entity): boolean {
  const filter = authoringState.selectionFilter
  return filter === 'All' || filter === 'Visible' && entity.editorVisible || filter === 'Unlocked' && !entity.editorLocked || filter === 'Sprites' && Boolean(entity.spriteRenderer) || filter === 'Cameras' && Boolean(entity.camera2D) || filter === 'Physics' && entity.hasComponent('RigidBody2D')
}

function renderTransformGizmo(context: CanvasRenderingContext2D) {
  if (editorState.currentPage !== 'scene' || state.playMode !== 'editing' || state.activeTool === 'select' || isDrawTool()) return
  const gizmo = currentGizmo()
  if (!gizmo) return
  const unit = 1 / camera.scale
  const xAxis = axisVector('x', gizmo.rotation)
  const yAxis = axisVector('y', gizmo.rotation)
  const endpoint = (axis: Vec2, length: number) => ({ x: gizmo.pivot.x + axis.x * length * unit, y: gizmo.pivot.y + axis.y * length * unit })
  const drawAxis = (axis: Vec2, color: string) => {
    const start = endpoint(axis, 8); const end = endpoint(axis, 72)
    context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y)
    context.lineWidth = 2.4 * unit; context.strokeStyle = color; context.stroke()
    if (state.activeTool === 'move') {
      const perpendicular = { x: -axis.y, y: axis.x }
      context.beginPath(); context.moveTo(end.x, end.y)
      context.lineTo(end.x - axis.x * 11 * unit + perpendicular.x * 5 * unit, end.y - axis.y * 11 * unit + perpendicular.y * 5 * unit)
      context.lineTo(end.x - axis.x * 11 * unit - perpendicular.x * 5 * unit, end.y - axis.y * 11 * unit - perpendicular.y * 5 * unit)
      context.closePath(); context.fillStyle = color; context.fill()
    } else {
      context.fillStyle = color; context.fillRect(end.x - 5 * unit, end.y - 5 * unit, 10 * unit, 10 * unit)
    }
  }
  context.save(); context.lineCap = 'round'; context.lineJoin = 'round'
  if (state.activeTool === 'rotate') {
    context.beginPath(); context.arc(gizmo.pivot.x, gizmo.pivot.y, 52 * unit, 0, Math.PI * 2)
    context.lineWidth = 3 * unit; context.strokeStyle = palette.selection; context.stroke()
    const handle = endpoint(xAxis, 52)
    context.beginPath(); context.arc(handle.x, handle.y, 5 * unit, 0, Math.PI * 2); context.fillStyle = palette.selection; context.fill()
  } else {
    drawAxis(xAxis, palette.xAxis)
    drawAxis(yAxis, palette.yAxis)
    context.fillStyle = state.activeTool === 'scale' ? palette.selection : palette.canvas
    context.strokeStyle = palette.selection; context.lineWidth = 2 * unit
    context.fillRect(gizmo.pivot.x - 6 * unit, gizmo.pivot.y - 6 * unit, 12 * unit, 12 * unit)
    context.strokeRect(gizmo.pivot.x - 6 * unit, gizmo.pivot.y - 6 * unit, 12 * unit, 12 * unit)
  }
  context.restore()
}

function renderPointGizmo(context: CanvasRenderingContext2D) {
  if (!['path', 'polygon', 'collider', 'pivot'].includes(state.activeTool) || state.selectedEntityId === null) return
  const entity = world.entities.find(candidate => candidate.id === state.selectedEntityId)
  if (!entity) return
  const unit = 1 / camera.scale
  let points: Vec2[] = []
  if (state.activeTool === 'path' || state.activeTool === 'polygon') points = entity.renderer.vertices.map(point => localPointToWorld(entity, point, world.entities))
  else if (state.activeTool === 'collider') {
    const collider = entity.getCollider()
    if (collider?.kind === 'EllipseCollider2D') points = [{ x: collider.offset.x + collider.radiusX, y: collider.offset.y }, { x: collider.offset.x, y: collider.offset.y + collider.radiusY }, { x: collider.offset.x - collider.radiusX, y: collider.offset.y }, { x: collider.offset.x, y: collider.offset.y - collider.radiusY }].map(point => localPointToWorld(entity, point, world.entities))
    else points = (collider?.vertices ?? []).map(point => localPointToWorld(entity, { x: point.x + (collider?.offset.x ?? 0), y: point.y + (collider?.offset.y ?? 0) }, world.entities))
  }
  else {
    const sprite = entity.spriteRenderer
    const local = sprite ? { x: (sprite.pivot.x - .5) * sprite.size.x, y: (sprite.pivot.y - .5) * sprite.size.y } : entity.authoring.origin
    points = [localPointToWorld(entity, local, world.entities)]
  }
  context.save()
  for (let index = 0; index < points.length; index++) {
    const point = points[index], active = hoveredVertex?.entityId === entity.id && hoveredVertex.index === index
    context.beginPath(); context.arc(point.x, point.y, (active ? 6 : 4.5) * unit, 0, Math.PI * 2)
    context.fillStyle = active ? palette.handle : '#ffffff'; context.fill()
    context.lineWidth = 2 * unit; context.strokeStyle = palette.selection; context.stroke()
  }
  context.restore()
}

function cameraAspectRatio(): number | null {
  if (authoringState.cameraOverlay === 'Off') return null
  if (authoringState.cameraOverlay === 'Custom') return Math.max(1, authoringState.cameraResolution.width) / Math.max(1, authoringState.cameraResolution.height)
  const [width, height] = authoringState.cameraOverlay.split(':').map(Number)
  return width / height
}

function renderAuthoringOverlays(context: CanvasRenderingContext2D, width: number, height: number) {
  const unit = 1 / camera.scale
  if (authoringState.guidesVisible) {
    const left = -camera.offset.x / camera.scale, right = left + width / camera.scale
    const top = camera.offset.y / camera.scale, bottom = top - height / camera.scale
    context.save(); context.strokeStyle = 'rgba(70, 171, 255, .9)'; context.lineWidth = unit; context.setLineDash([5 * unit, 3 * unit])
    for (const x of authoringState.guides.vertical) { context.beginPath(); context.moveTo(x, bottom); context.lineTo(x, top); context.stroke() }
    for (const y of authoringState.guides.horizontal) { context.beginPath(); context.moveTo(left, y); context.lineTo(right, y); context.stroke() }
    context.restore()
  }
  const aspect = cameraAspectRatio()
  if (aspect) {
    const availableWidth = Math.max(80, width - 56), availableHeight = Math.max(80, height - 56)
    const frameWidth = Math.min(availableWidth, availableHeight * aspect), frameHeight = frameWidth / aspect
    const left = (width - frameWidth) / 2, top = (height - frameHeight) / 2
    const first = camera.screenToWorld({ x: left, y: top }), second = camera.screenToWorld({ x: left + frameWidth, y: top + frameHeight })
    context.save(); context.strokeStyle = 'rgba(126,180,255,.82)'; context.lineWidth = 1.5 * unit; context.setLineDash([7 * unit, 5 * unit]); context.strokeRect(first.x, second.y, second.x - first.x, first.y - second.y); context.setLineDash([]); context.restore()
  }
  for (const entity of world.entities) {
    const cameraComponent = entity.camera2D
    if (!cameraComponent?.previewInEditor || entity.layer !== editorState.activeLayer) continue
    const transform = worldTransform(entity, world.entities), frameHeight = cameraComponent.orthographicSize * 2 / Math.max(cameraComponent.zoom, .0001), frameWidth = frameHeight * (aspect ?? 16 / 9)
    context.save(); context.strokeStyle = state.selectedEntityIds.includes(entity.id) ? palette.selection : 'rgba(111,170,255,.46)'; context.lineWidth = (state.selectedEntityIds.includes(entity.id) ? 2 : 1) * unit; context.strokeRect(transform.position.x - frameWidth / 2, transform.position.y - frameHeight / 2, frameWidth, frameHeight); context.restore()
  }
  const measurement = authoringState.measurement
  if (measurement.start && measurement.end) {
    const dx = measurement.end.x - measurement.start.x, dy = measurement.end.y - measurement.start.y, distance = Math.hypot(dx, dy)
    const middle = { x: (measurement.start.x + measurement.end.x) / 2, y: (measurement.start.y + measurement.end.y) / 2 }
    context.save(); context.strokeStyle = '#66d4b0'; context.fillStyle = '#66d4b0'; context.lineWidth = 2 * unit
    context.beginPath(); context.moveTo(measurement.start.x, measurement.start.y); context.lineTo(measurement.end.x, measurement.end.y); context.stroke()
    for (const point of [measurement.start, measurement.end]) { context.beginPath(); context.arc(point.x, point.y, 4 * unit, 0, Math.PI * 2); context.fill() }
    context.translate(middle.x, middle.y); context.scale(unit, -unit); context.font = '600 12px "JetBrains Mono Variable", "Noto Sans SC Variable", monospace'; context.textAlign = 'center'; context.fillText(`${distance.toFixed(3)} m  Δ ${dx.toFixed(3)}, ${dy.toFixed(3)}`, 0, -8); context.restore()
  }
}

function renderScreenRulers(context: CanvasRenderingContext2D, width: number, height: number): void {
  if (!authoringState.rulersVisible || editorState.currentPage === 'game') return
  const size = 18, step = Math.max(.000001, prefs.gridSize), worldLeft = -camera.offset.x / camera.scale, worldTop = camera.offset.y / camera.scale
  let tick = step
  while (tick * camera.scale < 42) tick *= 10
  context.save(); context.fillStyle = 'rgba(21, 27, 37, .9)'; context.fillRect(0, 0, width, size); context.fillRect(0, 0, size, height)
  context.strokeStyle = 'rgba(132, 151, 178, .5)'; context.fillStyle = 'rgba(214, 225, 240, .78)'; context.font = '9px "JetBrains Mono Variable", monospace'; context.lineWidth = 1
  for (let value = Math.floor(worldLeft / tick) * tick; value <= worldLeft + width / camera.scale; value += tick) { const x = camera.offset.x + value * camera.scale; context.beginPath(); context.moveTo(x, size - 5); context.lineTo(x, size); context.stroke(); context.fillText(Number(value.toFixed(4)).toString(), x + 2, 9) }
  for (let value = Math.ceil((worldTop - height / camera.scale) / tick) * tick; value <= worldTop; value += tick) { const y = camera.offset.y - value * camera.scale; context.beginPath(); context.moveTo(size - 5, y); context.lineTo(size, y); context.stroke(); context.save(); context.translate(8, y - 2); context.rotate(-Math.PI / 2); context.fillText(Number(value.toFixed(4)).toString(), 0, 0); context.restore() }
  context.restore()
}

function rotateLocal(point: Vec2, angle: number): Vec2 {
  const cosine = Math.cos(angle), sine = Math.sin(angle)
  return { x: point.x * cosine - point.y * sine, y: point.x * sine + point.y * cosine }
}

function colliderOutline(entity: Entity): Vec2[] {
  const collider = entity.getCollider()
  if (!collider?.enabled) return []
  const local = collider.kind === 'EllipseCollider2D'
    ? Array.from({ length: 49 }, (_, index) => {
      const angle = index / 48 * Math.PI * 2
      const point = rotateLocal({ x: Math.cos(angle) * collider.radiusX, y: Math.sin(angle) * collider.radiusY }, collider.rotation)
      return { x: collider.offset.x + point.x, y: collider.offset.y + point.y }
    })
    : [...collider.vertices, collider.vertices[0]].filter(Boolean).map(vertex => {
      const point = rotateLocal(vertex, collider.rotation)
      return { x: collider.offset.x + point.x, y: collider.offset.y + point.y }
    })
  return local.map(point => localPointToWorld(entity, point, world.entities))
}

function drawPhysicsDebug(context: CanvasRenderingContext2D) {
  if (!physicsDebugState.enabled) return
  context.save()
  context.lineWidth = 1.5 / camera.scale
  for (const entity of world.entities) {
    if (!entity.enabled || (editorState.currentPage === 'scene' && entity.layer !== editorState.activeLayer)) continue
    const points = colliderOutline(entity)
    if (points.length < 2) continue
    if (physicsDebugState.showSleepingBodies && entity.rigidBody.sleeping) {
      context.beginPath(); context.moveTo(points[0].x, points[0].y); points.slice(1).forEach(point => context.lineTo(point.x, point.y)); context.closePath()
      context.fillStyle = 'rgba(92,156,255,.13)'; context.fill()
    }
    if (physicsDebugState.showColliders) {
      context.beginPath(); context.moveTo(points[0].x, points[0].y); points.slice(1).forEach(point => context.lineTo(point.x, point.y))
      context.strokeStyle = physicsDebugState.colorByPhysicsLayer ? (state.globalSettings.layers[entity.collider.physicsLayer]?.color ?? '#62d8a0') : entity.collider.sensor ? '#f2b45f' : entity.rigidBody.sleeping ? '#669ce8' : '#62d8a0'; context.stroke()
    }
    if (physicsDebugState.showAabbs) {
      const xs = points.map(point => point.x), ys = points.map(point => point.y)
      const left = Math.min(...xs), right = Math.max(...xs), bottom = Math.min(...ys), top = Math.max(...ys)
      context.setLineDash([4 / camera.scale, 4 / camera.scale]); context.strokeStyle = '#b786f5'; context.strokeRect(left, bottom, right - left, top - bottom); context.setLineDash([])
    }
    const center = worldTransform(entity, world.entities).position
    if (physicsDebugState.showCentersOfMass) {
      const radius = 5 / camera.scale
      context.beginPath(); context.arc(center.x, center.y, radius, 0, Math.PI * 2); context.strokeStyle = '#ffffff'; context.stroke()
      context.beginPath(); context.moveTo(center.x - radius, center.y); context.lineTo(center.x + radius, center.y); context.moveTo(center.x, center.y - radius); context.lineTo(center.x, center.y + radius); context.strokeStyle = '#ff9f57'; context.stroke()
    }
    if (physicsDebugState.showVelocities && Math.hypot(entity.velocity.x, entity.velocity.y) > 1e-9) {
      const scale = Math.min(80 / camera.scale, 12 / camera.scale * Math.log2(2 + Math.hypot(entity.velocity.x, entity.velocity.y)))
      const length = Math.hypot(entity.velocity.x, entity.velocity.y), dx = entity.velocity.x / length * scale, dy = entity.velocity.y / length * scale
      context.beginPath(); context.moveTo(center.x, center.y); context.lineTo(center.x + dx, center.y + dy); context.strokeStyle = '#55c8ff'; context.stroke()
    }
    if (physicsDebugState.showForces && Math.hypot(entity.force.x, entity.force.y) > 1e-9) {
      const scale = Math.min(80 / camera.scale, 10 / camera.scale * Math.log2(2 + Math.hypot(entity.force.x, entity.force.y)))
      const length = Math.hypot(entity.force.x, entity.force.y), dx = entity.force.x / length * scale, dy = entity.force.y / length * scale
      context.beginPath(); context.moveTo(center.x, center.y); context.lineTo(center.x + dx, center.y + dy); context.strokeStyle = '#ff7f8a'; context.stroke()
    }
  }
  if (physicsDebugState.showJointConstraints) {
    const jointKinds = ['FixedJoint2D', 'WeldJoint2D', 'DistanceJoint2D', 'RopeJoint2D', 'RevoluteJoint2D', 'MotorJoint2D', 'PrismaticJoint2D', 'SpringJoint2D'] as const
    context.strokeStyle = '#e6b35a'; context.setLineDash([5 / camera.scale, 3 / camera.scale])
    for (const entity of world.entities) for (const kind of jointKinds) {
      const joint = entity.getComponent<Joint2D>(kind)
      const target = joint?.targetEntityUuid ? world.entities.find(candidate => candidate.uuid === joint.targetEntityUuid) : null
      if (!joint?.enabled || !target) continue
      const first = localPointToWorld(entity, joint.anchor, world.entities), second = localPointToWorld(target, joint.connectedAnchor, world.entities)
      context.beginPath(); context.moveTo(first.x, first.y); context.lineTo(second.x, second.y); context.stroke()
    }
    context.setLineDash([])
  }
  if (physicsDebugState.showCharacterContacts) {
    for (const entity of world.entities) {
      const character = entity.getComponent<CharacterBody2D>('CharacterBody2D')
      if (!character?.enabled) continue
      const position = worldTransform(entity, world.entities).position
      const states = [[character.onFloor, character.floorNormal, '#70df9d'], [character.onWall, character.wallNormal, '#6cb5ff'], [character.onCeiling, character.ceilingNormal, '#ffbc68']] as const
      for (const [active, normal, color] of states) {
        if (!active) continue
        context.beginPath(); context.moveTo(position.x, position.y); context.lineTo(position.x + normal.x * 30 / camera.scale, position.y + normal.y * 30 / camera.scale); context.strokeStyle = color; context.stroke()
      }
    }
  }
  if (physicsDebugState.showRopeNodes) {
    context.fillStyle = '#8bb8ff'
    for (const connection of world.connections) for (const node of connection.ropeNodes) { context.beginPath(); context.arc(node.position.x, node.position.y, 2.5 / camera.scale, 0, Math.PI * 2); context.fill() }
  }
  if (physicsDebugState.showContactPoints || physicsDebugState.showNormals) {
    for (const event of world.events) {
      if (!Array.isArray(event.point)) continue
      const point = { x: Number(event.point[0]), y: Number(event.point[1]) }
      if (physicsDebugState.showContactPoints) { context.beginPath(); context.arc(point.x, point.y, 4 / camera.scale, 0, Math.PI * 2); context.fillStyle = '#ff6b78'; context.fill() }
      if (physicsDebugState.showNormals && Array.isArray(event.normal)) {
        context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(point.x + Number(event.normal[0]) * 24 / camera.scale, point.y + Number(event.normal[1]) * 24 / camera.scale); context.strokeStyle = '#ffdf73'; context.stroke()
      }
    }
  }
  context.restore()
}

function render() {
  if (!ctx || !canvasRef.value) return
  const cvs = canvasRef.value; const width = cvs.width / canvasPixelRatio; const height = cvs.height / canvasPixelRatio
  const graphStarted = beginRenderGraph()
  let passStarted = graphStarted
  if (renderer) {
    Object.assign(editorState.rendererStats, renderWorld(renderer, world.entities, {
      width, height, pixelRatio: canvasPixelRatio,
      editorCamera: { scale: camera.scale, offset: { ...camera.offset } },
      gameView: editorState.currentPage === 'game', activeLayer: editorState.activeLayer,
      renderLayer: editorState.currentPage === 'game' ? editorState.renderLayer : editorState.activeLayer,
      canvasColor: palette.canvas,
      connections: world.connections,
      editorGrid: { enabled: editorState.showGrid, step: prefs.gridSize, color: palette.grid },
      performanceMode: authoringState.performanceMode
    }))
  }
  passStarted = recordRenderPass('World', passStarted, true, editorState.rendererStats.drawCalls)
  // Reset and clear in backing-store pixels. This prevents retained overlay
  // fragments when DPR, axes, scenes, or panel dimensions change together.
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, cvs.width, cvs.height)
  ctx.setTransform(canvasPixelRatio, 0, 0, canvasPixelRatio, 0, 0)
  const isGameView = editorState.currentPage === 'game'
  renderLighting2D(ctx, world.entities, {
    width, height, editorCamera: { scale: camera.scale, offset: { ...camera.offset } },
    gameView: isGameView, activeLayer: editorState.activeLayer
  })
  passStarted = recordRenderPass('Lighting', passStarted, renderingSettings.lightingEnabled)
  renderPostProcessOverlay(ctx, width, height)
  renderDebugView2D(ctx, world.entities, {
    width, height, editorCamera: { scale: camera.scale, offset: { ...camera.offset } },
    gameView: isGameView, activeLayer: editorState.activeLayer
  })
  passStarted = recordRenderPass('PostProcess', passStarted, renderingSettings.postProcessing.enabled || renderingSettings.debugView !== 'None')
  ctx.save(); ctx.translate(camera.offset.x, camera.offset.y); ctx.scale(camera.scale, -camera.scale) 
  const viewL = -camera.offset.x / camera.scale; const viewR = viewL + width / camera.scale
  const viewT = camera.offset.y / camera.scale; const viewB = viewT - height / camera.scale   

  const selectedIds = new Set(state.selectedEntityIds)

  if (!isGameView && tilemapEditorState.active) drawTilemapOverlay(ctx, { minX: viewL, maxX: viewR, minY: viewB, maxY: viewT })

  if (!isGameView && editorState.showGrid) {
    let step = Math.max(0.000001, prefs.gridSize)
    while (camera.scale * step < 8) step *= 10
    while ((viewR - viewL) / step + (viewT - viewB) / step > 1_024) step *= 10
    const startX = Math.floor(viewL / step) * step; const startY = Math.floor(viewB / step) * step
    const textStep = step * 10
    ctx.save(); ctx.scale(1, -1); ctx.fillStyle = palette.label; ctx.font = `${10 / camera.scale}px sans-serif`
    for (let x = startX; x < viewR; x += step) { if (editorState.showXAxis && x % textStep === 0 && x !== 0) ctx.fillText(x.toString(), x + 2, 12 / camera.scale) }
    for (let y = startY; y < viewT; y += step) { if (editorState.showYAxis && y % textStep === 0 && y !== 0) ctx.fillText(y.toString(), 4 / camera.scale, -y + 4 / camera.scale) }
    ctx.restore()
  }

  const lwNormal = 1 / camera.scale; const lwSelected = 3 / camera.scale
  const compounds = compoundGeometries(world.entities, world.connections)
  const compoundByMember = new Map<number, (typeof compounds)[number]>()
  for (const compound of compounds) for (const member of compound.members) compoundByMember.set(member.id, compound)
  const renderEntities = [...world.entities].sort((a, b) => a.layer - b.layer || a.renderer.orderInLayer - b.renderer.orderInLayer || world.entities.indexOf(a) - world.entities.indexOf(b))
  for (const e of renderEntities) {
    if (!e.enabled || !e.authoring.visible) continue
    if (e.hasComponent('RectTransform')) continue
    if (!isGameView && !e.editorVisible) continue
    if (editorState.currentPage === 'scene' && e.layer !== editorState.activeLayer) continue;
    const compound = compoundByMember.get(e.id)
    const transform = worldTransform(e, world.entities)
    const pos = transform.position; const isSelected = !isGameView && (compound ? [...compound.memberIds].some(id => selectedIds.has(id)) : selectedIds.has(e.id))
    const selectionBoundary = editorBoundaryPoints(e, 48)
    const maxRadius = selectionBoundary.length ? Math.max(...selectionBoundary.map(point => Math.hypot(point.x - pos.x, point.y - pos.y)), MIN_SIZE) : MIN_SIZE
    if (pos.x + maxRadius < viewL || pos.x - maxRadius > viewR || pos.y + maxRadius < viewB || pos.y - maxRadius > viewT) continue; 
    if (!isSelected) continue
    
    ctx.lineWidth = isSelected ? lwSelected : lwNormal
    ctx.fillStyle = palette.selectionFill
    ctx.strokeStyle = palette.selection
    
    ctx.beginPath()
    if (selectionBoundary.length) { ctx.moveTo(selectionBoundary[0].x, selectionBoundary[0].y); for (const point of selectionBoundary.slice(1)) ctx.lineTo(point.x, point.y); if (e.renderer.shape !== 'Line') ctx.closePath() }
    
    // Sprite selection stays as an outside-only outline so pixel art remains unobscured.
    if (!e.spriteRenderer) ctx.fill()
    if (!compound || compound.members.length === 1) ctx.stroke()

    if (prefs.showDiagnostics && isSelected && !isVertexDragging && !isDragging && hoveredVertex && hoveredVertex.entityId === e.id) {
      let vx = 0, vy = 0; const cosR = Math.cos(transform.rotation); const sinR = Math.sin(transform.rotation)
      if (e instanceof CircleEntity && hoveredVertex.virtualPos) {
        const localX = hoveredVertex.virtualPos.x * transform.scale.x; const localY = hoveredVertex.virtualPos.y * transform.scale.y
        vx = pos.x + (localX * cosR - localY * sinR); vy = pos.y + (localX * sinR + localY * cosR)
      } else if (e instanceof BoxEntity || e instanceof TriangleEntity) {
        const v = e.vertices[hoveredVertex.index]
        const localX = v.x * transform.scale.x; const localY = v.y * transform.scale.y
        vx = pos.x + (localX * cosR - localY * sinR); vy = pos.y + (localX * sinR + localY * cosR)
      }
      ctx.beginPath(); ctx.fillStyle = palette.handle; ctx.arc(vx, vy, 6 / camera.scale, 0, Math.PI * 2); ctx.fill()
    }
  }

  ctx.lineWidth = 2 / camera.scale
  if (!isGameView && editorState.showXAxis) { ctx.beginPath(); ctx.strokeStyle = palette.xAxis; ctx.moveTo(viewL, 0); ctx.lineTo(viewR, 0); ctx.stroke() }
  if (!isGameView && editorState.showYAxis) { ctx.beginPath(); ctx.strokeStyle = palette.yAxis; ctx.moveTo(0, viewT); ctx.lineTo(0, viewB); ctx.stroke() }
  if (!isGameView && prefs.showConnections) {
    for (const connection of world.connections) {
      if (connection.binding || !connectionSharesLayer(connection, world.entities)) continue
      const connectedLayer = world.entities.find(entity => entity.id === connection.anchors[0]?.entityId)?.layer
      const visible = connectedLayer !== undefined && connectedLayer === editorState.activeLayer
      if (!visible) continue
      ctx.save()
      ctx.strokeStyle = connection.breakState === 'intact' ? palette.connection : palette.broken
      // A physical string is rendered at its collision diameter, so the grid and
      // canvas communicate the same real-world size used by the solver.
      ctx.lineWidth = connection.collisionEnabled
        ? Math.max(Math.max(2.5, prefs.connectionThickness) / camera.scale, connection.collisionRadius * 2)
        : Math.max(2.5, prefs.connectionThickness) / camera.scale
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.shadowColor = connection.breakState === 'intact' ? palette.connection : palette.broken
      ctx.shadowBlur = 5 / camera.scale
      if (connection.breakState !== 'intact') ctx.setLineDash([8 / camera.scale, 6 / camera.scale])
      for (const points of routePoints(connection, world.entities)) {
        if (points.length < 2) continue
        if (connection.collisionEnabled) strokeSmoothPath(ctx, points)
        else {
          ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y)
          if (connection.style === 'curved' && points.length === 3) ctx.quadraticCurveTo(points[1].x, points[1].y, points[2].x, points[2].y)
          else for (let index = 1; index < points.length; index++) ctx.lineTo(points[index].x, points[index].y)
          ctx.stroke()
        }
      }
      ctx.setLineDash([]); ctx.shadowBlur = 0
      for (const anchor of connection.anchors) {
        const point = resolveAnchor(anchor, world.entities)
        if (!point) continue
        ctx.beginPath(); ctx.arc(point.x, point.y, 6 / camera.scale, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'; ctx.fill()
        ctx.lineWidth = 2.5 / camera.scale; ctx.strokeStyle = palette.connection; ctx.stroke()
        ctx.beginPath(); ctx.arc(point.x, point.y, 1.8 / camera.scale, 0, Math.PI * 2)
        ctx.fillStyle = palette.connection; ctx.fill()
      }
      ctx.restore()
    }
  }

  for (const compound of compounds) {
    if (compound.members.length < 2 || compound.boundary.length === 0) continue
    const styleEntity = compound.members[0]
    const isSelected = !isGameView && [...compound.memberIds].some(id => selectedIds.has(id))
    const visible = isSelected && styleEntity.layer === editorState.activeLayer
    if (!visible) continue
    ctx.beginPath()
    for (const segment of compound.boundary) {
      ctx.moveTo(segment.start.x, segment.start.y)
      ctx.lineTo(segment.end.x, segment.end.y)
    }
    ctx.lineWidth = isSelected ? lwSelected : lwNormal
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.strokeStyle = palette.selection
    ctx.stroke()
  }
  renderTransformGizmo(ctx)
  renderPointGizmo(ctx)
  if (!isGameView) renderAuthoringOverlays(ctx, width, height)
  if (!isGameView && isDragging && canvasDragMode !== 'none' && dragStart && dragNow) {
    ctx.strokeStyle = palette.selection; ctx.lineWidth = 1 / camera.scale; ctx.setLineDash([5/camera.scale, 5/camera.scale])
    const x = Math.min(dragStart.x, dragNow.x), y = Math.min(dragStart.y, dragNow.y)
    const w = Math.abs(dragStart.x - dragNow.x), h = Math.abs(dragStart.y - dragNow.y)
    ctx.beginPath()
    if (canvasDragMode === 'marquee') { ctx.rect(x, y, w, h); ctx.fillStyle = palette.selectionFill; ctx.fill(); ctx.stroke() }
    else if (state.activeTool === 'rectangle') ctx.rect(x, y, w, h)
    else if (state.activeTool === 'circle') ctx.ellipse(x+w/2, y+h/2, w/2, h/2, 0, 0, Math.PI*2) 
    else if (state.activeTool === 'triangle') { 
      ctx.save(); ctx.translate(x + w / 2, y + h / 2)
      ctx.moveTo(0, h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(-w / 2, -h / 2); ctx.closePath(); ctx.stroke(); ctx.restore()
    }
    if (canvasDragMode === 'draw' && state.activeTool !== 'triangle') ctx.stroke()
    ctx.setLineDash([])
  }
  if (!isGameView && editorState.manualConnectionId !== null && editorState.manualConnectionPoints.length > 1) {
    ctx.beginPath(); ctx.moveTo(editorState.manualConnectionPoints[0].x, editorState.manualConnectionPoints[0].y)
    for (let index = 1; index < editorState.manualConnectionPoints.length; index++) ctx.lineTo(editorState.manualConnectionPoints[index].x, editorState.manualConnectionPoints[index].y)
    ctx.strokeStyle = palette.connection; ctx.lineWidth = prefs.connectionThickness / camera.scale; ctx.lineCap = 'round'; ctx.stroke()
  }
  drawPhysicsDebug(ctx)
  drawWorldGameplayDebug(ctx)
  ctx.restore()
  passStarted = recordRenderPass('EditorOverlay', passStarted, !isGameView, 1)
  const uiEntities = isGameView ? world.entities : world.entities.filter(entity => entity.layer === editorState.activeLayer)
  gameUiRuntime.render(ctx, width, height, uiEntities, { editor: !isGameView, selectedEntityIds: selectedIds })
  renderScreenRulers(ctx, width, height)
  const nodes = isGameView ? gameUiRuntime.accessibilityNodes() : []
  const nextAccessibilitySignature = nodes.map(node => `${node.uuid}:${node.rect.x.toFixed(1)}:${node.rect.y.toFixed(1)}:${node.rect.width.toFixed(1)}:${node.rect.height.toFixed(1)}:${node.label}:${node.focused}:${node.disabled}`).join('|')
  if (nextAccessibilitySignature !== accessibilitySignature) { accessibilitySignature = nextAccessibilitySignature; accessibilityNodes.value = nodes }
  recordRenderPass('UI', passStarted, true, uiEntities.length ? 1 : 0)
  completeRenderGraph(graphStarted, editorState.rendererStats, passStarted, passStarted)
  editorState.rendererStats.passes = 5
  if (renderCanvasRef.value) {
    captureRenderSurface(renderCanvasRef.value, canvasRef.value, worldPostProcessFilter())
    const renderTextureCameras = isGameView ? activeGameCameras(world.entities, width, height).filter(camera => camera.component.renderTexture) : []
    editorState.rendererStats.renderTargets += new Set(renderTextureCameras.map(camera => camera.component.renderTexture)).size
    for (const activeCamera of renderTextureCameras) {
      if (activeCamera.component.renderTexture) captureRenderTexture(activeCamera.component.renderTexture, renderCanvasRef.value, activeCamera.component.viewport, renderGraphState.frame)
    }
  }
  if (isGameView && focusedUiInput.value) synchronizeNativeInput()
}

function drawWorldGameplayDebug(context: CanvasRenderingContext2D): void {
  context.save(); context.lineWidth = 2 / camera.scale
  if (worldGameplayState.navigationDebug) {
    context.strokeStyle = '#5ea6ff'; context.fillStyle = '#5ea6ff'
    for (const path of navigationPaths()) {
      if (!path.points.length) continue
      context.beginPath(); context.moveTo(path.points[0].x, path.points[0].y); path.points.slice(1).forEach(point => context.lineTo(point.x, point.y)); context.stroke()
      for (const point of path.points) { context.beginPath(); context.arc(point.x, point.y, 2.5 / camera.scale, 0, Math.PI * 2); context.fill() }
    }
  }
  for (const entity of world.entities) {
    const transform = worldTransform(entity, world.entities)
    const area = entity.getComponent<import('../world/components').Area2D>('Area2D')
    if (worldGameplayState.areaDebug && area?.enabled) {
      context.setLineDash([6 / camera.scale, 4 / camera.scale]); context.strokeStyle = '#65d6b4'
      context.beginPath()
      if (area.shape === 'Circle') context.arc(transform.position.x, transform.position.y, area.radius, 0, Math.PI * 2)
      else context.rect(transform.position.x - area.size.x / 2, transform.position.y - area.size.y / 2, area.size.x, area.size.y)
      context.stroke(); context.setLineDash([])
    }
    const chunk = entity.getComponent<import('../world/components').WorldChunk2D>('WorldChunk2D')
    if (worldGameplayState.chunkDebug && chunk?.enabled) {
      const snapshot = worldStreamingState.cells.find(cell => cell.entityUuid === entity.uuid), status = snapshot?.status ?? (chunk.initiallyLoaded ? 'Active' : 'Unloaded')
      const active = status === 'Active', pending = ['Loading', 'Activating', 'Deactivating', 'Unloading'].includes(status)
      context.strokeStyle = active ? '#63d6a3' : pending ? '#ffd166' : '#c28cff'; context.fillStyle = active ? 'rgba(99,214,163,.08)' : pending ? 'rgba(255,209,102,.08)' : 'rgba(194,140,255,.06)'
      context.setLineDash(pending ? [5 / camera.scale, 4 / camera.scale] : []); context.fillRect(transform.position.x - chunk.size.x / 2, transform.position.y - chunk.size.y / 2, chunk.size.x, chunk.size.y); context.strokeRect(transform.position.x - chunk.size.x / 2, transform.position.y - chunk.size.y / 2, chunk.size.x, chunk.size.y); context.setLineDash([])
      context.font = `${11 / camera.scale}px ui-rounded, system-ui`; context.fillStyle = context.strokeStyle; context.fillText(`${chunk.ownership || entity.name} · ${status}`, transform.position.x - chunk.size.x / 2 + 5 / camera.scale, transform.position.y - chunk.size.y / 2 + 14 / camera.scale)
    }
  }
  context.restore()
}

function drawTilemapOverlay(context: CanvasRenderingContext2D, view: { minX: number; maxX: number; minY: number; maxY: number }) {
  const entity = world.entities.find(candidate => candidate.uuid === tilemapEditorState.selectedEntityUuid)
  const component = entity?.getComponent<TileMap2D>('TileMap2D')
  if (!entity || !component) return
  const halfWidth = component.width * component.tileSize.x * .5
  const halfHeight = component.height * component.tileSize.y * .5
  context.save()
  context.strokeStyle = palette.selection
  context.globalAlpha = .34
  context.lineWidth = 1 / camera.scale
  const localView = [
    worldPointToLocal(entity, { x: view.minX, y: view.minY }, world.entities),
    worldPointToLocal(entity, { x: view.maxX, y: view.minY }, world.entities),
    worldPointToLocal(entity, { x: view.maxX, y: view.maxY }, world.entities),
    worldPointToLocal(entity, { x: view.minX, y: view.maxY }, world.entities)
  ]
  const minimumLocalX = Math.min(...localView.map(point => point.x)), maximumLocalX = Math.max(...localView.map(point => point.x))
  const minimumLocalY = Math.min(...localView.map(point => point.y)), maximumLocalY = Math.max(...localView.map(point => point.y))
  const firstX = Math.max(0, Math.floor((minimumLocalX + halfWidth) / component.tileSize.x))
  const lastX = Math.min(component.width, Math.ceil((maximumLocalX + halfWidth) / component.tileSize.x))
  const firstY = Math.max(0, Math.floor((minimumLocalY + halfHeight) / component.tileSize.y))
  const lastY = Math.min(component.height, Math.ceil((maximumLocalY + halfHeight) / component.tileSize.y))
  const transform = worldTransform(entity, world.entities)
  const stepX = Math.max(1, Math.ceil(7 / Math.max(1e-9, camera.scale * component.tileSize.x * Math.abs(transform.scale.x))))
  const stepY = Math.max(1, Math.ceil(7 / Math.max(1e-9, camera.scale * component.tileSize.y * Math.abs(transform.scale.y))))
  for (let x = firstX; x <= lastX; x += stepX) {
    const localX = x * component.tileSize.x - halfWidth
    const start = localPointToWorld(entity, { x: localX, y: -halfHeight }, world.entities)
    const end = localPointToWorld(entity, { x: localX, y: halfHeight }, world.entities)
    context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke()
  }
  for (let y = firstY; y <= lastY; y += stepY) {
    const localY = y * component.tileSize.y - halfHeight
    const start = localPointToWorld(entity, { x: -halfWidth, y: localY }, world.entities)
    const end = localPointToWorld(entity, { x: halfWidth, y: localY }, world.entities)
    context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke()
  }
  const selection = tilemapEditorState.selection
  const cells = selection ? [selection.start, selection.end] : tileHover ? [tileHover, tileHover] : null
  if (cells) {
    const left = Math.min(cells[0].x, cells[1].x), right = Math.max(cells[0].x, cells[1].x) + 1
    const bottom = Math.min(cells[0].y, cells[1].y), top = Math.max(cells[0].y, cells[1].y) + 1
    const corners = [
      { x: left * component.tileSize.x - halfWidth, y: bottom * component.tileSize.y - halfHeight },
      { x: right * component.tileSize.x - halfWidth, y: bottom * component.tileSize.y - halfHeight },
      { x: right * component.tileSize.x - halfWidth, y: top * component.tileSize.y - halfHeight },
      { x: left * component.tileSize.x - halfWidth, y: top * component.tileSize.y - halfHeight }
    ].map(point => localPointToWorld(entity, point, world.entities))
    context.beginPath(); context.moveTo(corners[0].x, corners[0].y); corners.slice(1).forEach(point => context.lineTo(point.x, point.y)); context.closePath()
    context.globalAlpha = .22; context.fillStyle = palette.selection; context.fill()
    context.globalAlpha = 1; context.lineWidth = 2 / camera.scale; context.stroke()
  }
  context.restore()
}
</script>

<template>
  <div class="canvas-container" @dragover="onAssetDragOver" @drop="onAssetDrop">
    <canvas ref="renderCanvasRef" class="render-canvas" :style="{ filter: worldPostProcessFilter() }" aria-hidden="true" />
    <canvas ref="canvasRef" class="overlay-canvas" @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @dblclick="onDoubleClick" @wheel="onWheel" @contextmenu.prevent />
    <div v-if="editorState.currentPage === 'game' && accessibilityNodes.length" class="game-ui-a11y" aria-label="Game UI">
      <div
        v-for="node in accessibilityNodes"
        :key="node.uuid"
        class="game-ui-a11y-node"
        :style="{ left: `${node.rect.x}px`, top: `${node.rect.y}px`, width: `${node.rect.width}px`, height: `${node.rect.height}px` }"
        :role="node.role"
        :aria-label="node.label"
        :aria-description="node.description || undefined"
        :aria-valuetext="node.value || undefined"
        :aria-live="node.live"
        :data-accessibility-state="node.state || undefined"
        :aria-disabled="node.disabled"
        :aria-current="node.focused ? 'true' : undefined"
        :tabindex="node.disabled ? -1 : node.tabIndex"
        @focus="gameUiRuntime.focusByUuid(node.uuid)"
      ></div>
    </div>
    <input
      v-if="focusedUiInput && editorState.currentPage === 'game'"
      ref="nativeInputRef"
      class="native-ui-input"
      :style="nativeInputStyle()"
      :type="focusedUiInput.input.password ? 'password' : 'text'"
      :value="focusedUiInput.input.value"
      :placeholder="focusedUiInput.input.placeholder"
      :maxlength="Math.max(0, focusedUiInput.input.maxLength)"
      @input="onNativeInput"
      @keydown.enter.prevent="closeNativeInput"
      @keydown.esc.prevent="closeNativeInput"
      @blur="closeNativeInput"
    >
  </div>
</template>

<style scoped>
.canvas-container { position: relative; width: 100%; height: 100%; overflow: hidden; contain: strict; isolation: isolate; }
canvas { position: absolute; inset: 0; display: block; width: 100%; height: 100%; touch-action: none; }
.render-canvas { z-index: 0; pointer-events: none; image-rendering: auto; }
.overlay-canvas { z-index: 1; image-rendering: auto; }
.native-ui-input { position: absolute; z-index: 8; min-width: 0; min-height: 0; padding: 0 12px; border: 2px solid #4f96ff; border-radius: 8px; outline: 0; color: #f5f7fb; background: #151b24; box-shadow: 0 0 0 3px rgba(79,150,255,.18); font: 500 16px/1.2 var(--font-ui); }
.game-ui-a11y { position: absolute; inset: 0; z-index: 7; pointer-events: none; }
.game-ui-a11y-node { position: absolute; overflow: hidden; opacity: .001; pointer-events: none; }
</style>

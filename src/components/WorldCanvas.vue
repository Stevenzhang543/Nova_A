<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { physicsState, enterEditMode, pushHistory } from '../store/physics'
import { BoxEntity } from '../world/BoxEntity'
import { CircleEntity } from '../world/CircleEntity'
import { TriangleEntity } from '../world/TriangleEntity'
import type { Entity } from '../world/Entity'
import type { Vec2 } from '../world/types'
import { editorState, openContextMenu } from '../store/editor'
import { isValidConvexPolygon, MIN_SIZE, normalizeEntity, syncMassFromDensity } from '../world/geometry'
import { preferencesState as prefs } from '../store/preferences'
import { connectionGeometrySignature, connectionSharesLayer, repatchConnection, resolveAnchor, routePoints, setManualRoute } from '../world/Connection'
import { t } from '../i18n'
import { defaultColorForLayer } from '../world/layers'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
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
let raf = 0; let lastTime = performance.now(); let resizeObserver: ResizeObserver | null = null 

let hoveredVertex: { entityId: number, index: number, virtualPos?: Vec2 } | null = null
let dragMeta: { initialScaleX: number, initialScaleY: number, initialDist: number } | null = null
let dragEntityId: number | null = null; 

let savedCameraState: { scale: number, offset: Vec2 } | null = null;
let hasMovedEntity = false;
const DRAW_GUARD_MS = 260
let drawingBlockedUntil = 0

watch(() => state.focusEntityID, (newId) => {
  if (editorState.currentPage !== 'scene') return;

  if (newId !== null) {
    if (!savedCameraState) {
      savedCameraState = { scale: camera.targetScale ?? camera.scale, offset: { x: camera.targetOffset?.x ?? camera.offset.x, y: camera.targetOffset?.y ?? camera.offset.y } };
    }
    
    const ent = world.entities.find(e => e.id === newId); if (!ent) return;
    
    let maxDim = 1;
    if (ent instanceof BoxEntity || ent instanceof TriangleEntity) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const v of ent.vertices) {
            if (v.x < minX) minX = v.x; if (v.y < minY) minY = v.y;
            if (v.x > maxX) maxX = v.x; if (v.y > maxY) maxY = v.y;
        }
        maxDim = Math.max((maxX - minX) * ent.transform.scale.x, (maxY - minY) * ent.transform.scale.y);
    } else if (ent instanceof CircleEntity) {
        maxDim = Math.max(ent.radiusX * ent.transform.scale.x, ent.radiusY * ent.transform.scale.y) * 2;
    }
    if (maxDim <= 0.1) maxDim = 1;
    
    const canvasW = canvasRef.value?.clientWidth || 800; const canvasH = canvasRef.value?.clientHeight || 600; const usableW = canvasW - 300; 
    const targetScale = Math.min(usableW / maxDim, canvasH / maxDim) * 0.666;
    
    camera.targetScale = Math.min(Math.max(targetScale, 0.05), 10);
    camera.targetOffset = { x: (usableW / 2) - (ent.transform.position.x * camera.targetScale), y: (canvasH / 2) + (ent.transform.position.y * camera.targetScale) };
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

watch(() => [prefs.theme, prefs.highContrast, prefs.maxPixelRatio], () => { readPalette(); resize() })

function resize() {
  const canvas = canvasRef.value; if (!canvas) return
  canvasPixelRatio = Math.min(window.devicePixelRatio || 1, prefs.maxPixelRatio)
  const dpr = canvasPixelRatio; const r = canvas.getBoundingClientRect()
  const oldWidth = canvas.width / dpr; const oldHeight = canvas.height / dpr
  canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr))
  if (oldWidth > 0 && oldHeight > 0 && (oldWidth !== r.width || oldHeight !== r.height)) {
    camera.offset.x += (r.width - oldWidth) / 2; camera.offset.y += (r.height - oldHeight) / 2
  }
  if (!ctx) ctx = canvas.getContext('2d', { alpha: false })!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); render()
}

function loop(time?: number) {
  const now = time || performance.now(); const dt = (now - lastTime) / 1000; lastTime = now

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
  Object.assign(state.engineDiagnostics, world.update(Math.min(dt, 0.1), state.simulationRunning, state.globalSettings))
  if (editorState.currentPage === 'scene' && state.simulationRunning) syncEditableConnections(false)
  for (const connection of world.connections) {
    if (connection.breakState !== 'intact' && !knownBrokenConnections.has(connection.id)) {
      knownBrokenConnections.add(connection.id)
      editorState.statusText = t('connectionBroken', { name: connection.name })
    }
  }
  render(); raf = requestAnimationFrame(loop)
}

onMounted(() => {
  readPalette()
  world.connections.filter(connection => connection.breakState !== 'intact').forEach(connection => knownBrokenConnections.add(connection.id))
  resize()
  if (canvasRef.value) {
    const r = canvasRef.value.getBoundingClientRect(); camera.offset.x = r.width / 2; camera.offset.y = r.height / 2
    resizeObserver = new ResizeObserver(() => resize()); resizeObserver.observe(canvasRef.value.parentElement!)
  }
  lastTime = performance.now(); loop(); window.addEventListener('resize', resize); window.addEventListener('mouseup', onMouseUp); window.addEventListener('keydown', onKeyDown)
  void world.wasmReady.then(() => {
    if (world.wasmError) editorState.statusText = t('physicsUnavailable', { message: world.wasmError.message })
  })
})
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('mouseup', onMouseUp); window.removeEventListener('keydown', onKeyDown); if (resizeObserver) resizeObserver.disconnect() })

function screenPos(e: MouseEvent): Vec2 { const r = canvasRef.value!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
function onWheel(e: WheelEvent) { e.preventDefault(); const factor = Math.pow(1.1, prefs.zoomSensitivity); camera.zoomAt(screenPos(e), e.deltaY < 0 ? factor : 1 / factor) }
function snapPoint(point: Vec2): Vec2 { if (!prefs.snapToGrid) return point; const step = Math.max(0.000001, prefs.gridSize); return { x: Math.round(point.x / step) * step, y: Math.round(point.y / step) * step } }

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || editorState.manualConnectionId === null) return
  editorState.manualConnectionId = null
  editorState.manualConnectionPoints.splice(0)
  isManualDrawing = false
  editorState.statusText = t('ready')
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

function onMouseDown(e: MouseEvent) {
  const sPos = screenPos(e); const wPos = camera.screenToWorld(sPos); dragButton = e.button
  if (editorState.manualConnectionId !== null && e.button === 0) {
    isManualDrawing = true
    editorState.manualConnectionPoints.splice(0, editorState.manualConnectionPoints.length, wPos)
    return
  }
  checkHoverVertex(wPos); hasMovedEntity = false; 

  if (editorState.currentPage === 'render') { isPanning = true; lastMouseScreen = sPos; return }
  
  // BUGFIX: Right-click purely opens the menu. No editing mode. No zooming.
  if (e.button === 2 && !hoveredVertex) {
    const hitId = hitTest(wPos); 
    if (hitId !== null) { 
      openContextMenu(e, 'grid-entity', hitId); 
      return; 
    } else { 
      isPanning = true; lastMouseScreen = sPos; return; 
    }
  }
  
  if (e.button === 1) { isPanning = true; lastMouseScreen = sPos; return }

  if (e.button === 0 || e.button === 2) {
    if (hoveredVertex) {
      dragEntityId = hoveredVertex.entityId; isVertexDragging = true 
      const ent = world.entities.find(e => e.id === dragEntityId)
      if (ent) {
        const dx = wPos.x - ent.transform.position.x; const dy = wPos.y - ent.transform.position.y
        dragMeta = { initialScaleX: ent.transform.scale.x, initialScaleY: ent.transform.scale.y, initialDist: Math.max(0.1, Math.sqrt(dx*dx + dy*dy)) }
      }
      return 
    }
    if (e.button === 0) {
      const hitId = hitTest(wPos)
      if (hitId !== null) { dragEntityId = hitId; isDragging = true; dragStart = wPos } 
      else { 
        if (state.selectedEntityId !== null) {
          enterEditMode(null)
          drawingBlockedUntil = performance.now() + DRAW_GUARD_MS
          return
        }
        if (performance.now() < drawingBlockedUntil) return
        isDragging = true; dragStart = wPos; dragNow = wPos; dragEntityId = null 
      }
    }
  }
}

function onMouseMove(e: MouseEvent) {
  const sPos = screenPos(e); const wPos = camera.screenToWorld(sPos)
  if (isManualDrawing) {
    const points = editorState.manualConnectionPoints
    const previous = points[points.length - 1]
    if (!previous || Math.hypot(previous.x - wPos.x, previous.y - wPos.y) > 3 / camera.scale) points.push(wPos)
    return
  }
  
  if (isPanning && lastMouseScreen) {
    camera.targetScale = null; camera.targetOffset = null; 
    camera.offset.x += sPos.x - lastMouseScreen.x; camera.offset.y += sPos.y - lastMouseScreen.y
    lastMouseScreen = sPos; return
  }

  if (!isDragging && !isVertexDragging) checkHoverVertex(wPos)

  if (isVertexDragging && dragEntityId && dragMeta) {
    hasMovedEntity = true; 
    const ent = world.entities.find(e => e.id === dragEntityId); if (!ent || !hoveredVertex) return

    if (dragButton === 2) {
      const dx = wPos.x - ent.transform.position.x; const dy = wPos.y - ent.transform.position.y
      const distNow = Math.sqrt(dx*dx + dy*dy); const scaleFactor = distNow / dragMeta.initialDist
      ent.transform.scale.x = Math.max(MIN_SIZE, dragMeta.initialScaleX * scaleFactor); ent.transform.scale.y = Math.max(MIN_SIZE, dragMeta.initialScaleY * scaleFactor)
    } 
    else if (dragButton === 0) {
      const dx = wPos.x - ent.transform.position.x; const dy = wPos.y - ent.transform.position.y
      const cosR = Math.cos(-ent.transform.rotation); const sinR = Math.sin(-ent.transform.rotation)
      const localX = (dx * cosR - dy * sinR) / ent.transform.scale.x; const localY = (dx * sinR + dy * cosR) / ent.transform.scale.y

      if (ent instanceof BoxEntity || ent instanceof TriangleEntity) {
        const candidate = ent.vertices.map(vertex => ({ ...vertex }))
        candidate[hoveredVertex.index] = { x: localX, y: localY }
        if (isValidConvexPolygon(candidate)) ent.vertices = candidate
      } else if (ent instanceof CircleEntity) {
        ent.radiusX = Math.max(0.1, Math.abs(localX)); ent.radiusY = Math.max(0.1, Math.abs(localY))
      }
    }
    return
  }

  if (isDragging && dragStart) {
    if (dragEntityId !== null) {
      hasMovedEntity = true; 
      const entity = world.entities.find(ent => ent.id === dragEntityId)
      if (entity) {
        const next = snapPoint({ x: entity.transform.position.x + wPos.x - dragStart.x, y: entity.transform.position.y + wPos.y - dragStart.y })
        entity.transform.position.x = next.x; entity.transform.position.y = next.y
        dragStart = wPos
      }
    } else { dragNow = wPos }
  }
}

function onMouseUp() {
  if (isManualDrawing) {
    const connection = world.connections.find(candidate => candidate.id === editorState.manualConnectionId)
    if (connection && editorState.manualConnectionPoints.length >= 2) {
      setManualRoute(connection, editorState.manualConnectionPoints, world.entities)
      pushHistory()
      editorState.statusText = t('connectionUpdated')
    }
    editorState.manualConnectionId = null
    editorState.manualConnectionPoints.splice(0)
    isManualDrawing = false
    return
  }
  if (isDragging && dragEntityId === null && dragStart && dragNow) {
    const dragDistX = Math.abs(dragStart.x - dragNow.x); const dragDistY = Math.abs(dragStart.y - dragNow.y)
    if (dragDistX > 0.5 || dragDistY > 0.5) {
      const w = Math.max(dragDistX, 0.1); const h = Math.max(dragDistY, 0.1)
      const center = snapPoint({ x: Math.min(dragStart.x, dragNow.x) + w / 2, y: Math.min(dragStart.y, dragNow.y) + h / 2 }); const cx = center.x; const cy = center.y
      let created: Entity | null = null
      if (state.activeTool === 'rectangle') created = world.addBox({ x: cx, y: cy }, { x: w, y: h })
      else if (state.activeTool === 'circle') created = world.addCircle({ x: cx, y: cy }, w / 2, h / 2)
      else if (state.activeTool === 'triangle') created = world.addTriangle({ x: cx, y: cy }, { x: w, y: h })
      if (created) {
        created.layer = editorState.activeLayer
        created.color = defaultColorForLayer(created.layer)
        created.density = prefs.defaultDensity
        created.restitution = prefs.defaultRestitution
        created.staticFriction = prefs.defaultFriction
        created.dynamicFriction = prefs.defaultFriction
        syncMassFromDensity(created)
      }
    }
  }

  // BUGFIX: Resizing prevents camera zoom-out desync.
  if (dragEntityId !== null) {
      const changedEntity = world.entities.find(entity => entity.id === dragEntityId)
      if (changedEntity && hasMovedEntity) {
        normalizeEntity(changedEntity)
        syncMassFromDensity(changedEntity)
      }
      if (hasMovedEntity && state.selectedEntityId !== dragEntityId) {
          // Dragged unselected object: Don't enter edit mode
      } else if (!hasMovedEntity && !isVertexDragging) {
          // Pure click: Enter editing mode
          enterEditMode(dragEntityId);
      }
      // If isVertexDragging is true, we simply do nothing!
      // The object is ALREADY selected. focusEntityID stays identical. Camera stays perfectly still.
  }
  
  if (isDragging || isVertexDragging) pushHistory()
  isDragging = isPanning = isVertexDragging = false; dragStart = dragNow = lastMouseScreen = null; dragMeta = null; dragEntityId = null
}

function checkHoverVertex(p: Vec2) {
  if (!state.selectedEntityId) { hoveredVertex = null; document.body.style.cursor = 'default'; return }
  const ent = world.entities.find(e => e.id === state.selectedEntityId); if (!ent) return
  const threshold = 12 / camera.scale 
  
  if (ent instanceof BoxEntity || ent instanceof TriangleEntity) {
    let minDist = threshold; let foundIndex = -1
    for (let i = 0; i < ent.vertices.length; i++) {
      const v = ent.vertices[i]; const localX = v.x * ent.transform.scale.x; const localY = v.y * ent.transform.scale.y
      const cosR = Math.cos(ent.transform.rotation); const sinR = Math.sin(ent.transform.rotation)
      const vx = ent.transform.position.x + (localX * cosR - localY * sinR); const vy = ent.transform.position.y + (localX * sinR + localY * cosR)
      const dist = Math.sqrt((p.x - vx)**2 + (p.y - vy)**2)
      if (dist < minDist) { minDist = dist; foundIndex = i }
    }
    if (foundIndex !== -1) { hoveredVertex = { entityId: ent.id, index: foundIndex }; document.body.style.cursor = 'crosshair'; return }
  } 
  else if (ent instanceof CircleEntity) {
    const dx = p.x - ent.transform.position.x; const dy = p.y - ent.transform.position.y
    const cosR = Math.cos(-ent.transform.rotation); const sinR = Math.sin(-ent.transform.rotation)
    const localX = (dx * cosR - dy * sinR) / ent.transform.scale.x; const localY = (dx * sinR + dy * cosR) / ent.transform.scale.y
    const nx = localX / ent.radiusX; const ny = localY / ent.radiusY; const mag = Math.sqrt(nx * nx + ny * ny)
    if (mag > 0) {
      const ex = (nx / mag) * ent.radiusX; const ey = (ny / mag) * ent.radiusY
      const worldCos = Math.cos(ent.transform.rotation); const worldSin = Math.sin(ent.transform.rotation)
      const wx = ent.transform.position.x + (ex * ent.transform.scale.x * worldCos - ey * ent.transform.scale.y * worldSin)
      const wy = ent.transform.position.y + (ex * ent.transform.scale.x * worldSin + ey * ent.transform.scale.y * worldCos)
      const dist = Math.sqrt((p.x - wx)**2 + (p.y - wy)**2)
      if (dist < threshold) { hoveredVertex = { entityId: ent.id, index: -1, virtualPos: { x: ex, y: ey } }; document.body.style.cursor = 'crosshair'; return }
    }
  }
  hoveredVertex = null; document.body.style.cursor = 'default'
}

function hitTest(p: Vec2): number | null {
  for (let i = world.entities.length - 1; i >= 0; i--) {
    const e = world.entities[i]
    if (editorState.currentPage === 'scene' && e.layer !== editorState.activeLayer) continue;
    if (editorState.currentPage === 'render' && editorState.renderLayer !== 'all' && e.layer !== editorState.renderLayer) continue;
    const dx = p.x - e.transform.position.x; const dy = p.y - e.transform.position.y
    const cosR = Math.cos(-e.transform.rotation); const sinR = Math.sin(-e.transform.rotation)
    const localX = (dx * cosR - dy * sinR) / e.transform.scale.x; const localY = (dx * sinR + dy * cosR) / e.transform.scale.y
    if (e instanceof BoxEntity || e instanceof TriangleEntity) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const v of e.vertices) { if (v.x < minX) minX = v.x; if (v.y < minY) minY = v.y; if (v.x > maxX) maxX = v.x; if (v.y > maxY) maxY = v.y }
      if (localX < minX || localX > maxX || localY < minY || localY > maxY) continue 
      let inside = false; const vs = e.vertices
      for (let j = 0, k = vs.length - 1; j < vs.length; k = j++) {
        const intersect = ((vs[j].y > localY) !== (vs[k].y > localY)) && (localX < (vs[k].x - vs[j].x) * (localY - vs[j].y) / (vs[k].y - vs[j].y) + vs[j].x)
        if (intersect) inside = !inside
      }
      if (inside) return e.id
    } else if (e instanceof CircleEntity) {
      if (e.radiusX > 0 && e.radiusY > 0) { if ((localX * localX) / (e.radiusX * e.radiusX) + (localY * localY) / (e.radiusY * e.radiusY) <= 1) return e.id }
    } 
  }
  return null
}

function render() {
  if (!ctx || !canvasRef.value) return
  const cvs = canvasRef.value; const width = cvs.width / canvasPixelRatio; const height = cvs.height / canvasPixelRatio
  ctx.fillStyle = palette.canvas; ctx.fillRect(0, 0, width, height)
  ctx.save(); ctx.translate(camera.offset.x, camera.offset.y); ctx.scale(camera.scale, -camera.scale) 
  const viewL = -camera.offset.x / camera.scale; const viewR = viewL + width / camera.scale
  const viewT = camera.offset.y / camera.scale; const viewB = viewT - height / camera.scale   

  if (editorState.showGrid) {
    const step = Math.max(0.000001, prefs.gridSize); const startX = Math.floor(viewL / step) * step; const startY = Math.floor(viewB / step) * step
    ctx.beginPath(); ctx.strokeStyle = palette.grid; ctx.lineWidth = 1 / camera.scale
    for (let x = startX; x < viewR; x += step) { ctx.moveTo(x, viewB); ctx.lineTo(x, viewT) }
    for (let y = startY; y < viewT; y += step) { ctx.moveTo(viewL, y); ctx.lineTo(viewR, y) }
    ctx.stroke()
    let textStep = step * 10; if (camera.scale * step < 3) textStep = step * 50; if (camera.scale * step < 1) textStep = step * 100
    ctx.save(); ctx.scale(1, -1); ctx.fillStyle = palette.label; ctx.font = `${10 / camera.scale}px sans-serif`
    for (let x = startX; x < viewR; x += step) { if (editorState.showXAxis && x % textStep === 0 && x !== 0) ctx.fillText(x.toString(), x + 2, 12 / camera.scale) }
    for (let y = startY; y < viewT; y += step) { if (editorState.showYAxis && y % textStep === 0 && y !== 0) ctx.fillText(y.toString(), 4 / camera.scale, -y + 4 / camera.scale) }
    ctx.restore()
  }

  const lwNormal = 1 / camera.scale; const lwSelected = 3 / camera.scale
  for (const e of world.entities) {
    if (editorState.currentPage === 'scene' && e.layer !== editorState.activeLayer) continue;
    if (editorState.currentPage === 'render' && editorState.renderLayer !== 'all' && e.layer !== editorState.renderLayer) continue;
    const pos = e.transform.position; const isSelected = e.id === state.selectedEntityId
    const maxRadius = e instanceof CircleEntity
      ? Math.max(e.radiusX * e.transform.scale.x, e.radiusY * e.transform.scale.y)
      : e instanceof BoxEntity || e instanceof TriangleEntity
        ? Math.max(...e.vertices.map(vertex => Math.hypot(
          vertex.x * e.transform.scale.x,
          vertex.y * e.transform.scale.y
        )), MIN_SIZE)
        : MIN_SIZE
    if (pos.x + maxRadius < viewL || pos.x - maxRadius > viewR || pos.y + maxRadius < viewB || pos.y - maxRadius > viewT) continue; 
    
    ctx.lineWidth = isSelected ? lwSelected : lwNormal
    const alpha = (e.transparency !== undefined ? e.transparency : 100) / 100
    ctx.fillStyle = isSelected ? palette.selectionFill : `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, ${alpha})`
    ctx.strokeStyle = isSelected ? palette.selection : `rgba(${Math.max(0, e.color.r - 50)}, ${Math.max(0, e.color.g - 50)}, ${Math.max(0, e.color.b - 50)}, ${alpha})`
    
    ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(e.transform.rotation)
    ctx.beginPath()

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    if (e instanceof BoxEntity || e instanceof TriangleEntity) {
      const v = e.vertices
      if (v.length > 0) {
        ctx.moveTo(v[0].x * e.transform.scale.x, v[0].y * e.transform.scale.y) 
        for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x * e.transform.scale.x, v[i].y * e.transform.scale.y)
        ctx.closePath()
        for (const pt of v) {
            if (pt.x < minX) minX = pt.x; if (pt.y < minY) minY = pt.y;
            if (pt.x > maxX) maxX = pt.x; if (pt.y > maxY) maxY = pt.y;
        }
      }
    } else if (e instanceof CircleEntity) {
      const safeRx = Math.max(0.1, e.radiusX) * e.transform.scale.x; const safeRy = Math.max(0.1, e.radiusY) * e.transform.scale.y
      ctx.ellipse(0, 0, safeRx, safeRy, 0, 0, Math.PI * 2)
      minX = -Math.max(0.1, e.radiusX); maxX = Math.max(0.1, e.radiusX);
      minY = -Math.max(0.1, e.radiusY); maxY = Math.max(0.1, e.radiusY);
    }
    
    ctx.fill(); ctx.stroke(); 

    if (e.texture) {
      if (!e.textureImage) { e.textureImage = new Image(); e.textureImage.src = e.texture; }
      if (e.textureImage.complete && e.textureImage.naturalWidth > 0) {
          ctx.save(); ctx.clip(); ctx.scale(1, -1); 
          minX *= e.transform.scale.x; maxX *= e.transform.scale.x;
          minY *= e.transform.scale.y; maxY *= e.transform.scale.y;
          ctx.drawImage(e.textureImage, minX, -maxY, maxX - minX, maxY - minY);
          ctx.restore();
      }
    }
    ctx.restore() 

    if (prefs.showDiagnostics && isSelected && !isVertexDragging && !isDragging && hoveredVertex && hoveredVertex.entityId === e.id) {
      let vx = 0, vy = 0; const cosR = Math.cos(e.transform.rotation); const sinR = Math.sin(e.transform.rotation)
      if (e instanceof CircleEntity && hoveredVertex.virtualPos) {
        const localX = hoveredVertex.virtualPos.x * e.transform.scale.x; const localY = hoveredVertex.virtualPos.y * e.transform.scale.y
        vx = pos.x + (localX * cosR - localY * sinR); vy = pos.y + (localX * sinR + localY * cosR)
      } else if (e instanceof BoxEntity || e instanceof TriangleEntity) {
        const v = e.vertices[hoveredVertex.index]
        const localX = v.x * e.transform.scale.x; const localY = v.y * e.transform.scale.y
        vx = pos.x + (localX * cosR - localY * sinR); vy = pos.y + (localX * sinR + localY * cosR)
      }
      ctx.beginPath(); ctx.fillStyle = palette.handle; ctx.arc(vx, vy, 6 / camera.scale, 0, Math.PI * 2); ctx.fill()
    }
  }

  ctx.lineWidth = 2 / camera.scale
  if (editorState.showXAxis) { ctx.beginPath(); ctx.strokeStyle = palette.xAxis; ctx.moveTo(viewL, 0); ctx.lineTo(viewR, 0); ctx.stroke() }
  if (editorState.showYAxis) { ctx.beginPath(); ctx.strokeStyle = palette.yAxis; ctx.moveTo(0, viewT); ctx.lineTo(0, viewB); ctx.stroke() }
  if (prefs.showConnections) {
    for (const connection of world.connections) {
      if (connection.binding || !connectionSharesLayer(connection, world.entities)) continue
      const connectedLayer = world.entities.find(entity => entity.id === connection.anchors[0]?.entityId)?.layer
      const visible = connectedLayer !== undefined && (editorState.currentPage === 'render'
        ? editorState.renderLayer === 'all' || connectedLayer === editorState.renderLayer
        : connectedLayer === editorState.activeLayer)
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
  if (isDragging && dragEntityId === null && dragStart && dragNow) {
    ctx.strokeStyle = palette.selection; ctx.lineWidth = 1 / camera.scale; ctx.setLineDash([5/camera.scale, 5/camera.scale])
    const x = Math.min(dragStart.x, dragNow.x), y = Math.min(dragStart.y, dragNow.y)
    const w = Math.abs(dragStart.x - dragNow.x), h = Math.abs(dragStart.y - dragNow.y)
    ctx.beginPath()
    if (state.activeTool === 'rectangle') ctx.rect(x, y, w, h)
    else if (state.activeTool === 'circle') ctx.ellipse(x+w/2, y+h/2, w/2, h/2, 0, 0, Math.PI*2) 
    else if (state.activeTool === 'triangle') { 
      ctx.save(); ctx.translate(x + w / 2, y + h / 2)
      ctx.moveTo(0, h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(-w / 2, -h / 2); ctx.closePath(); ctx.stroke(); ctx.restore()
    }
    if (state.activeTool !== 'triangle') ctx.stroke()
    ctx.setLineDash([])
  }
  if (editorState.manualConnectionId !== null && editorState.manualConnectionPoints.length > 1) {
    ctx.beginPath(); ctx.moveTo(editorState.manualConnectionPoints[0].x, editorState.manualConnectionPoints[0].y)
    for (let index = 1; index < editorState.manualConnectionPoints.length; index++) ctx.lineTo(editorState.manualConnectionPoints[index].x, editorState.manualConnectionPoints[index].y)
    ctx.strokeStyle = palette.connection; ctx.lineWidth = prefs.connectionThickness / camera.scale; ctx.lineCap = 'round'; ctx.stroke()
  }
  ctx.restore()
}
</script>

<template>
  <div class="canvas-container">
    <canvas ref="canvasRef" @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @wheel="onWheel" @contextmenu.prevent />
  </div>
</template>

<style scoped>
.canvas-container { width: 100%; height: 100%; overflow: hidden; }
canvas { display: block; width: 100%; height: 100%; touch-action: none; }
</style>

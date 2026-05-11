<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { physicsState, enterEditMode, pushHistory } from '../store/physics'
import { BoxEntity } from '../world/BoxEntity'
import { CircleEntity } from '../world/CircleEntity'
import { TriangleEntity } from '../world/TriangleEntity'
import type { Vec2 } from '../world/types'
import { editorState, openContextMenu } from '../store/editor'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

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

function resize() {
  const canvas = canvasRef.value; if (!canvas) return
  const dpr = window.devicePixelRatio || 1; const r = canvas.getBoundingClientRect()
  const oldWidth = canvas.width / dpr; const oldHeight = canvas.height / dpr
  canvas.width = r.width * dpr; canvas.height = r.height * dpr
  if (oldWidth > 0 && oldHeight > 0 && (oldWidth !== r.width || oldHeight !== r.height)) {
    camera.offset.x += (r.width - oldWidth) / 2; camera.offset.y += (r.height - oldHeight) / 2
  }
  if (!ctx) ctx = canvas.getContext('2d', { alpha: false })!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); render()
}

function loop(time?: number) {
  const now = time || performance.now(); const dt = (now - lastTime) / 1000; lastTime = now

  if (camera.targetScale !== null) {
    camera.scale += (camera.targetScale - camera.scale) * 8 * dt;
    if (Math.abs(camera.scale - camera.targetScale) < 0.005) { camera.scale = camera.targetScale; camera.targetScale = null; }
  }
  if (camera.targetOffset !== null) {
    camera.offset.x += (camera.targetOffset.x - camera.offset.x) * 8 * dt;
    camera.offset.y += (camera.targetOffset.y - camera.offset.y) * 8 * dt;
    if (Math.abs(camera.offset.x - camera.targetOffset.x) < 0.5 && Math.abs(camera.offset.y - camera.targetOffset.y) < 0.5) {
      camera.offset.x = camera.targetOffset.x; camera.offset.y = camera.targetOffset.y; camera.targetOffset = null;
    }
  }

  world.update(Math.min(dt, 0.1), state.simulationRunning, state.globalSettings) 
  render(); raf = requestAnimationFrame(loop)
}

onMounted(() => {
  resize()
  if (canvasRef.value) {
    const r = canvasRef.value.getBoundingClientRect(); camera.offset.x = r.width / 2; camera.offset.y = r.height / 2
    resizeObserver = new ResizeObserver(() => resize()); resizeObserver.observe(canvasRef.value.parentElement!)
  }
  lastTime = performance.now(); loop(); window.addEventListener('resize', resize)
})
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf); window.removeEventListener('resize', resize); if (resizeObserver) resizeObserver.disconnect() })

function screenPos(e: MouseEvent): Vec2 { const r = canvasRef.value!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
function onWheel(e: WheelEvent) { e.preventDefault(); camera.zoomAt(screenPos(e), e.deltaY < 0 ? 1.1 : 0.9) }

function onMouseDown(e: MouseEvent) {
  const sPos = screenPos(e); const wPos = camera.screenToWorld(sPos); dragButton = e.button
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
        enterEditMode(null); // Clicked empty space: Deselect and return camera
        isDragging = true; dragStart = wPos; dragNow = wPos; dragEntityId = null 
      }
    }
  }
}

function onMouseMove(e: MouseEvent) {
  const sPos = screenPos(e); const wPos = camera.screenToWorld(sPos)
  
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
      ent.transform.scale.x = dragMeta.initialScaleX * scaleFactor; ent.transform.scale.y = dragMeta.initialScaleY * scaleFactor
    } 
    else if (dragButton === 0) {
      const dx = wPos.x - ent.transform.position.x; const dy = wPos.y - ent.transform.position.y
      const cosR = Math.cos(-ent.transform.rotation); const sinR = Math.sin(-ent.transform.rotation)
      const localX = (dx * cosR - dy * sinR) / ent.transform.scale.x; const localY = (dx * sinR + dy * cosR) / ent.transform.scale.y

      if (ent instanceof BoxEntity || ent instanceof TriangleEntity) {
        const v = ent.vertices[hoveredVertex.index]; v.x = localX; v.y = localY
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
        entity.transform.position.x += wPos.x - dragStart.x; entity.transform.position.y += wPos.y - dragStart.y
        dragStart = wPos
      }
    } else { dragNow = wPos }
  }
}

function onMouseUp() {
  if (isDragging && dragEntityId === null && dragStart && dragNow) {
    const dragDistX = Math.abs(dragStart.x - dragNow.x); const dragDistY = Math.abs(dragStart.y - dragNow.y)
    if (dragDistX > 0.5 || dragDistY > 0.5) {
      const w = Math.max(dragDistX, 0.1); const h = Math.max(dragDistY, 0.1)
      const cx = Math.min(dragStart.x, dragNow.x) + w / 2; const cy = Math.min(dragStart.y, dragNow.y) + h / 2
      if (state.activeTool === 'rectangle') world.addBox({ x: cx, y: cy }, { x: w, y: h })
      else if (state.activeTool === 'circle') world.addCircle({ x: cx, y: cy }, w / 2, h / 2)
      else if (state.activeTool === 'triangle') world.addTriangle({ x: cx, y: cy }, { x: w, y: h })
    }
  }

  // BUGFIX: Resizing prevents camera zoom-out desync.
  if (dragEntityId !== null) {
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
    if (ent.radiusX < 1 || ent.radiusY < 1) return
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
  const cvs = canvasRef.value; const width = cvs.width / window.devicePixelRatio; const height = cvs.height / window.devicePixelRatio
  ctx.fillStyle = '#1e1e1e'; ctx.fillRect(0, 0, width, height)
  ctx.save(); ctx.translate(camera.offset.x, camera.offset.y); ctx.scale(camera.scale, -camera.scale) 
  const viewL = -camera.offset.x / camera.scale; const viewR = viewL + width / camera.scale
  const viewT = camera.offset.y / camera.scale; const viewB = viewT - height / camera.scale   

  if (editorState.showGrid) {
    const step = 10; const startX = Math.floor(viewL / step) * step; const startY = Math.floor(viewB / step) * step
    ctx.beginPath(); ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1 / camera.scale
    if (editorState.showYAxis) for (let x = startX; x < viewR; x += step) { ctx.moveTo(x, viewB); ctx.lineTo(x, viewT) }
    if (editorState.showXAxis) for (let y = startY; y < viewT; y += step) { ctx.moveTo(viewL, y); ctx.lineTo(viewR, y) }
    ctx.stroke()
    let textStep = 100; if (camera.scale < 0.3) textStep = 500; if (camera.scale < 0.1) textStep = 1000
    ctx.save(); ctx.scale(1, -1); ctx.fillStyle = '#666'; ctx.font = `${10 / camera.scale}px sans-serif`
    if (editorState.showYAxis) { for (let x = startX; x < viewR; x += step) { if (x % textStep === 0 && x !== 0) ctx.fillText(x.toString(), x + 2, 12 / camera.scale) } }
    if (editorState.showXAxis) { for (let y = startY; y < viewT; y += step) { if (y % textStep === 0 && y !== 0) ctx.fillText(y.toString(), 4 / camera.scale, -y + 4 / camera.scale) } }
    ctx.restore()
  }

  const lwNormal = 1 / camera.scale; const lwSelected = 3 / camera.scale
  for (const e of world.entities) {
    if (editorState.currentPage === 'scene' && e.layer !== editorState.activeLayer) continue;
    if (editorState.currentPage === 'render' && editorState.renderLayer !== 'all' && e.layer !== editorState.renderLayer) continue;
    const pos = e.transform.position; const isSelected = e.id === state.selectedEntityId
    const maxRadius = Math.max(e.transform.scale.x, e.transform.scale.y) * (e instanceof CircleEntity ? Math.max(e.radiusX, e.radiusY) : 200); 
    if (pos.x + maxRadius < viewL || pos.x - maxRadius > viewR || pos.y + maxRadius < viewB || pos.y - maxRadius > viewT) continue; 
    
    ctx.lineWidth = isSelected ? lwSelected : lwNormal
    const alpha = (e.transparency !== undefined ? e.transparency : 100) / 100
    ctx.fillStyle = isSelected ? `rgba(255, 200, 0, ${alpha * 0.5})` : `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, ${alpha})`
    ctx.strokeStyle = isSelected ? `rgba(255, 238, 0, ${alpha})` : `rgba(${Math.max(0, e.color.r - 50)}, ${Math.max(0, e.color.g - 50)}, ${Math.max(0, e.color.b - 50)}, ${alpha})`
    
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
      if (e.textureImage.complete) {
          ctx.save(); ctx.clip(); ctx.scale(1, -1); 
          minX *= e.transform.scale.x; maxX *= e.transform.scale.x;
          minY *= e.transform.scale.y; maxY *= e.transform.scale.y;
          ctx.drawImage(e.textureImage, minX, -maxY, maxX - minX, maxY - minY);
          ctx.restore();
      }
    }
    ctx.restore() 

    if (isSelected && !isVertexDragging && !isDragging && hoveredVertex && hoveredVertex.entityId === e.id) {
      let vx = 0, vy = 0; const cosR = Math.cos(e.transform.rotation); const sinR = Math.sin(e.transform.rotation)
      if (e instanceof CircleEntity && hoveredVertex.virtualPos) {
        const localX = hoveredVertex.virtualPos.x * e.transform.scale.x; const localY = hoveredVertex.virtualPos.y * e.transform.scale.y
        vx = pos.x + (localX * cosR - localY * sinR); vy = pos.y + (localX * sinR + localY * cosR)
      } else if ('vertices' in e) {
        const v = (e as any).vertices[hoveredVertex.index]
        const localX = v.x * e.transform.scale.x; const localY = v.y * e.transform.scale.y
        vx = pos.x + (localX * cosR - localY * sinR); vy = pos.y + (localX * sinR + localY * cosR)
      }
      ctx.beginPath(); ctx.fillStyle = '#ff4500'; ctx.arc(vx, vy, 6 / camera.scale, 0, Math.PI * 2); ctx.fill()
    }
  }

  ctx.lineWidth = 2 / camera.scale
  if (editorState.showXAxis) { ctx.beginPath(); ctx.strokeStyle = '#772222'; ctx.moveTo(viewL, 0); ctx.lineTo(viewR, 0); ctx.stroke() }
  if (editorState.showYAxis) { ctx.beginPath(); ctx.strokeStyle = '#227722'; ctx.moveTo(0, viewT); ctx.lineTo(0, viewB); ctx.stroke() }
  if (isDragging && dragEntityId === null && dragStart && dragNow) {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1 / camera.scale; ctx.setLineDash([5/camera.scale, 5/camera.scale])
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
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { physicsState, selectEntity } from '../store/physics'
import { BoxEntity } from '../world/BoxEntity'
import { CircleEntity } from '../world/CircleEntity'
import { TriangleEntity } from '../world/TriangleEntity'
import type { Vec2 } from '../world/types'
import { editorState } from '../store/editor'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

const state = physicsState
const world = physicsState.world
const camera = physicsState.camera

// Interaction State
let isDragging = false
let isPanning = false
let isVertexDragging = false
let dragButton = 0 // Track which button: 0 for Left, 2 for Right

let dragStart: Vec2 | null = null
let dragNow: Vec2 | null = null
let lastMouseScreen: Vec2 | null = null
let raf = 0
let lastTime = performance.now() // OPTIMIZATION: Track real time
let resizeObserver: ResizeObserver | null = null // NEW: For detecting panel resize

// Vertex Manipulation State
let hoveredVertex: { entityId: number, index: number, virtualPos?: Vec2 } | null = null

// Specialized drag state for relative ratios and proportional scaling
let dragMeta: { 
  initialRx?: number, 
  initialRy?: number,
  initialVertices?: Vec2[],
  ratioX: number, 
  ratioY: number,
  initialDist?: number
} | null = null

/* ---------------- CORE ---------------- */
function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const r = canvas.getBoundingClientRect()
  
  // Keep track of old dimensions to keep camera dynamically centered
  const oldWidth = canvas.width / dpr
  const oldHeight = canvas.height / dpr

  canvas.width = r.width * dpr
  canvas.height = r.height * dpr
  
  // Shift the camera offset by half the size difference so the grid stays centered
  if (oldWidth > 0 && oldHeight > 0 && (oldWidth !== r.width || oldHeight !== r.height)) {
    camera.offset.x += (r.width - oldWidth) / 2
    camera.offset.y += (r.height - oldHeight) / 2
  }
  
  // OPTIMIZATION: Only fetch context if it doesn't exist
  if (!ctx) ctx = canvas.getContext('2d', { alpha: false })!
  
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  
  // NEW: Force an immediate render in the exact same synchronous execution block!
  // This completely eliminates blinking and black frames when the browser clears the buffer.
  render()
}

function loop(time?: number) {
  const now = time || performance.now()
  const dt = (now - lastTime) / 1000
  lastTime = now
  
  // FIX: Pass the simulation state and global settings into the physics engine!
  world.update(Math.min(dt, 0.1), state.simulationRunning, state.globalSettings) 
  
  render()
  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  resize()
  if (canvasRef.value) {
    const r = canvasRef.value.getBoundingClientRect()
    camera.offset.x = r.width / 2
    camera.offset.y = r.height / 2
    
    // NEW: Setup ResizeObserver to catch flexbox changes when the sidebar drags
    resizeObserver = new ResizeObserver(() => {
      resize()
    })
    resizeObserver.observe(canvasRef.value.parentElement!)
  }
  lastTime = performance.now()
  loop()
  window.addEventListener('resize', resize)
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
  window.removeEventListener('keydown', onKeyDown)
  if (resizeObserver) resizeObserver.disconnect() // NEW: Cleanup observer
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
})

/* ---------------- INPUTS ---------------- */
function screenPos(e: MouseEvent): Vec2 {
  const r = canvasRef.value!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  camera.zoomAt(screenPos(e), e.deltaY < 0 ? 1.1 : 0.9)
}

function onMouseDown(e: MouseEvent) {
  const sPos = screenPos(e)
  const wPos = camera.screenToWorld(sPos)
  dragButton = e.button

  checkHoverVertex(wPos) 

  if (editorState.currentPage === 'render') {
    // FIX: In Render mode, ANY mouse down behaves as a Camera Pan. 
    // It skips all vertex dragging and object selection.
    isPanning = true
    lastMouseScreen = sPos
    return
  }

  if (e.button === 1 || (e.button === 2 && !hoveredVertex)) {
    isPanning = true
    lastMouseScreen = sPos
    return
  }

  if (e.button === 0 || e.button === 2) {
    if (hoveredVertex) {
      selectEntity(hoveredVertex.entityId)
      isVertexDragging = true
      dragStart = wPos
      
      const ent = world.entities.find(e => e.id === hoveredVertex!.entityId)
      if (ent) {
        if (ent instanceof CircleEntity) {
          const dx = wPos.x - ent.transform.position.x
          const dy = wPos.y - ent.transform.position.y
          const rx = Math.max(0.1, ent.radiusX)
          const ry = Math.max(0.1, ent.radiusY)
          
          dragMeta = {
            initialRx: ent.radiusX,
            initialRy: ent.radiusY,
            ratioX: dx / rx,
            ratioY: dy / ry,
            initialDist: Math.sqrt(dx*dx + dy*dy)
          }
        } 
        else if (ent instanceof BoxEntity || ent instanceof TriangleEntity) {
          const v = ent.vertices[hoveredVertex.index]
          dragMeta = {
            initialVertices: ent.vertices.map(vert => ({ ...vert })),
            ratioX: v.x,
            ratioY: v.y,
            initialDist: Math.sqrt(v.x*v.x + v.y*v.y)
          }
        }
      }
      return
    }

    if (e.button === 0) {
      const hitId = hitTest(wPos)
      if (hitId !== null) {
        selectEntity(hitId)
        isDragging = true
        dragStart = wPos
      } else {
        selectEntity(null)
        isDragging = true 
        dragStart = wPos
        dragNow = wPos
      }
    }
  }
}

function onMouseMove(e: MouseEvent) {
  const sPos = screenPos(e)
  const wPos = camera.screenToWorld(sPos)
  
  if (isPanning && lastMouseScreen) {
    camera.offset.x += sPos.x - lastMouseScreen.x
    camera.offset.y += sPos.y - lastMouseScreen.y
    lastMouseScreen = sPos
    return
  }

  if (!isDragging && !isVertexDragging) {
    checkHoverVertex(wPos)
  }

  if (isVertexDragging && hoveredVertex && dragMeta) {
    const ent = world.entities.find(e => e.id === hoveredVertex!.entityId)
    if (!ent) return

    const dx = wPos.x - ent.transform.position.x
    const dy = wPos.y - ent.transform.position.y

    if (dragButton === 2) {
      const distNow = Math.sqrt(dx*dx + dy*dy)
      const scale = distNow / Math.max(0.1, dragMeta.initialDist || 1)

      if (ent instanceof CircleEntity && dragMeta.initialRx !== undefined && dragMeta.initialRy !== undefined) {
        ent.radiusX = Math.max(5, dragMeta.initialRx * scale)
        ent.radiusY = Math.max(5, dragMeta.initialRy * scale)
      } 
      else if ((ent instanceof BoxEntity || ent instanceof TriangleEntity) && dragMeta.initialVertices) {
        for (let i = 0; i < ent.vertices.length; i++) {
          ent.vertices[i].x = dragMeta.initialVertices[i].x * scale
          ent.vertices[i].y = dragMeta.initialVertices[i].y * scale
        }
      }
    } 
    else {
      if (ent instanceof CircleEntity) {
        const axisThreshold = 0.2
        if (Math.abs(dragMeta.ratioX) > axisThreshold) {
          ent.radiusX = Math.max(5, Math.abs(dx / dragMeta.ratioX))
        }
        if (Math.abs(dragMeta.ratioY) > axisThreshold) {
          ent.radiusY = Math.max(5, Math.abs(dy / dragMeta.ratioY))
        }
      } 
      else if (ent instanceof BoxEntity || ent instanceof TriangleEntity) {
        const v = ent.vertices[hoveredVertex.index]
        if (dragStart) {
          v.x += wPos.x - dragStart.x
          v.y += wPos.y - dragStart.y
          dragStart = wPos
        }
      }
    }
    return
  }

  if (isDragging && dragStart) {
    if (state.selectedEntityId) {
      const entity = world.entities.find(ent => ent.id === state.selectedEntityId)
      if (entity) {
        entity.transform.position.x += wPos.x - dragStart.x
        entity.transform.position.y += wPos.y - dragStart.y
        dragStart = wPos
      }
    } else {
      dragNow = wPos
    }
  }
}

function onMouseUp() {
  if (isDragging && !state.selectedEntityId && dragStart && dragNow) {
    // FIX: Changed from 10 to 0.1 for precise drawing
    const w = Math.max(Math.abs(dragStart.x - dragNow.x), 0.1)
    const h = Math.max(Math.abs(dragStart.y - dragNow.y), 0.1)
    
    const cx = Math.min(dragStart.x, dragNow.x) + w / 2
    const cy = Math.min(dragStart.y, dragNow.y) + h / 2

    if (state.activeTool === 'rectangle') world.addBox({ x: cx, y: cy }, { x: w, y: h })
    else if (state.activeTool === 'circle') world.addCircle({ x: cx, y: cy }, w / 2, h / 2)
    else if (state.activeTool === 'triangle') world.addTriangle({ x: cx, y: cy }, { x: w, y: h })
  }
  isDragging = isPanning = isVertexDragging = false
  dragStart = dragNow = lastMouseScreen = null
  dragMeta = null
}

function onKeyDown(e: KeyboardEvent) {
  // ✅ ADD THIS LINE (the advice you received)
  if (document.activeElement?.tagName === 'INPUT') return;

  // your delete logic
  if (e.key === 'Backspace' || e.key === 'Delete') {
    // TODO: delete selected entity
    console.log("Delete pressed")
  }
}

/* ---------------- HELPER: Vertex Detection ---------------- */
function checkHoverVertex(p: Vec2) {
  if (!state.selectedEntityId) {
    hoveredVertex = null
    document.body.style.cursor = 'default'
    return
  }
  
  const ent = world.entities.find(e => e.id === state.selectedEntityId)
  if (!ent) return

  const threshold = 12 / camera.scale 
  
  if (ent instanceof BoxEntity || ent instanceof TriangleEntity) {
    let minDist = threshold
    let foundIndex = -1

    for (let i = 0; i < ent.vertices.length; i++) {
      const v = ent.vertices[i]
      const vx = ent.transform.position.x + v.x
      const vy = ent.transform.position.y + v.y
      const dist = Math.sqrt((p.x - vx)**2 + (p.y - vy)**2)
      if (dist < minDist) {
        minDist = dist
        foundIndex = i
      }
    }

    if (foundIndex !== -1) {
      hoveredVertex = { entityId: ent.id, index: foundIndex }
      document.body.style.cursor = 'crosshair'
      return
    }
  } 
  else if (ent instanceof CircleEntity) {
    const dx = p.x - ent.transform.position.x
    const dy = p.y - ent.transform.position.y
    
    if (ent.radiusX < 1 || ent.radiusY < 1) return

    const nx = dx / ent.radiusX
    const ny = dy / ent.radiusY
    const mag = Math.sqrt(nx * nx + ny * ny)

    if (mag > 0) {
      const ex = (nx / mag) * ent.radiusX
      const ey = (ny / mag) * ent.radiusY
      
      const wx = ent.transform.position.x + ex
      const wy = ent.transform.position.y + ey
      
      const dist = Math.sqrt((p.x - wx)**2 + (p.y - wy)**2)
      
      if (dist < threshold) {
        hoveredVertex = { 
          entityId: ent.id, 
          index: -1, 
          virtualPos: { x: ex, y: ey } 
        }
        document.body.style.cursor = 'crosshair'
        return
      }
    }
  }

  hoveredVertex = null
  document.body.style.cursor = 'default'
}

/* ---------------- HITBOX LOGIC ---------------- */
function hitTest(p: Vec2): number | null {
  for (let i = world.entities.length - 1; i >= 0; i--) {
    const e = world.entities[i]
    const pos = e.transform.position

    if (e instanceof BoxEntity || e instanceof TriangleEntity) {
      // OPTIMIZATION: AABB Pre-check
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const v of e.vertices) {
        if (v.x < minX) minX = v.x
        if (v.y < minY) minY = v.y
        if (v.x > maxX) maxX = v.x
        if (v.y > maxY) maxY = v.y
      }
      // Skip if mouse is outside the bounding box
      if (p.x < pos.x + minX || p.x > pos.x + maxX || p.y < pos.y + minY || p.y > pos.y + maxY) {
        continue 
      }

      // Complex Polygon Check
      let inside = false
      const vs = e.vertices
      for (let j = 0, k = vs.length - 1; j < vs.length; k = j++) {
        const xi = vs[j].x + pos.x, yi = vs[j].y + pos.y
        const xj = vs[k].x + pos.x, yj = vs[k].y + pos.y
        const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi)
        if (intersect) inside = !inside
      }
      if (inside) return e.id
    } 
    else if (e instanceof CircleEntity) {
      // OPTIMIZATION: AABB Pre-check for circles/ellipses
      if (p.x < pos.x - e.radiusX || p.x > pos.x + e.radiusX || p.y < pos.y - e.radiusY || p.y > pos.y + e.radiusY) {
        continue 
      }

      const dx = p.x - pos.x
      const dy = p.y - pos.y
      if (e.radiusX > 0 && e.radiusY > 0) {
        if ((dx*dx)/(e.radiusX*e.radiusX) + (dy*dy)/(e.radiusY*e.radiusY) <= 1) return e.id
      }
    } 
  }
  return null
}

/* ---------------- RENDERING ---------------- */
function render() {
  if (!ctx || !canvasRef.value) return
  const cvs = canvasRef.value
  const width = cvs.width / window.devicePixelRatio
  const height = cvs.height / window.devicePixelRatio

  ctx.fillStyle = '#1e1e1e'
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.translate(camera.offset.x, camera.offset.y)
  ctx.scale(camera.scale, -camera.scale) // FIX: Flips canvas so +Y is UP

  const viewL = -camera.offset.x / camera.scale
  const viewR = viewL + width / camera.scale
  const viewT = camera.offset.y / camera.scale  // Top is +Y
  const viewB = viewT - height / camera.scale   // Bottom is -Y

  // Grid
  if (editorState.showGrid) {
    const step = 10 // FIX: Base 10 blocks
    const startX = Math.floor(viewL / step) * step
    const startY = Math.floor(viewB / step) * step

    ctx.beginPath(); ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1 / camera.scale
    for (let x = startX; x < viewR; x += step) { ctx.moveTo(x, viewB); ctx.lineTo(x, viewT) }
    for (let y = startY; y < viewT; y += step) { ctx.moveTo(viewL, y); ctx.lineTo(viewR, y) }
    ctx.stroke()

    // FIX: Axis Indicators (100, 200, 300...)
    ctx.save()
    ctx.scale(1, -1) // Flip context back just for text so it isn't upside down
    ctx.fillStyle = '#666'
    ctx.font = `${10 / camera.scale}px sans-serif`
    for (let x = startX; x < viewR; x += step) {
      if (x % 100 === 0 && x !== 0) ctx.fillText(x.toString(), x + 2, 12 / camera.scale)
    }
    for (let y = startY; y < viewT; y += step) {
      if (y % 100 === 0 && y !== 0) ctx.fillText(y.toString(), 4 / camera.scale, -y + 4 / camera.scale)
    }
    ctx.restore()
  }

  // Entities
  const lwNormal = 1 / camera.scale
  const lwSelected = 3 / camera.scale

  for (const e of world.entities) {
    const pos = e.transform.position
    const isSelected = e.id === state.selectedEntityId
    
    // SAFE CULLING: Use radius approximation to avoid breaking Canvas paths
    const maxRadius = Math.max(e.transform.scale.x, e.transform.scale.y) * (e instanceof CircleEntity ? Math.max(e.radiusX, e.radiusY) : 200); 
    
    if (pos.x + maxRadius < viewL || pos.x - maxRadius > viewR || 
        pos.y + maxRadius < viewB || pos.y - maxRadius > viewT) {
      continue; 
    }

    ctx.lineWidth = isSelected ? lwSelected : lwNormal
    const alpha = (e.transparency !== undefined ? e.transparency : 100) / 100
    
    ctx.fillStyle = isSelected 
      ? `rgba(255, 200, 0, ${alpha * 0.5})` 
      : `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, ${alpha})`
      
    ctx.strokeStyle = isSelected 
      ? `rgba(255, 238, 0, ${alpha})` 
      : `rgba(${Math.max(0, e.color.r - 50)}, ${Math.max(0, e.color.g - 50)}, ${Math.max(0, e.color.b - 50)}, ${alpha})`

    // FIX: Apply proper Transformation Matrix (Position -> Rotation -> Scale)
    ctx.save()
    ctx.translate(pos.x, pos.y)
    ctx.rotate(e.transform.rotation)
    ctx.scale(e.transform.scale.x, e.transform.scale.y)

    ctx.beginPath()

    if (e instanceof BoxEntity || e instanceof TriangleEntity) {
      const v = e.vertices
      if (v.length > 0) {
        ctx.moveTo(v[0].x, v[0].y) // Draw relative to center (0,0)
        for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y)
        ctx.closePath()
      }
    } 
    else if (e instanceof CircleEntity) {
      const safeRx = Math.max(0.1, e.radiusX)
      const safeRy = Math.max(0.1, e.radiusY)
      ctx.ellipse(0, 0, safeRx, safeRy, 0, 0, Math.PI * 2)
    }
    
    ctx.fill()
    ctx.stroke()
    ctx.restore() // Undo the matrix so Vertex Highlights draw in world-space correctly

    // Render Vertex Highlight
    if (isSelected && !isVertexDragging && !isDragging && hoveredVertex && hoveredVertex.entityId === e.id) {
      let vx = 0, vy = 0
      
      const cosR = Math.cos(e.transform.rotation)
      const sinR = Math.sin(e.transform.rotation)

      if (e instanceof CircleEntity && hoveredVertex.virtualPos) {
        // Account for rotation and scale in highlight
        const localX = hoveredVertex.virtualPos.x * e.transform.scale.x
        const localY = hoveredVertex.virtualPos.y * e.transform.scale.y
        vx = pos.x + (localX * cosR - localY * sinR)
        vy = pos.y + (localX * sinR + localY * cosR)
      } else if ('vertices' in e) {
        const v = (e as any).vertices[hoveredVertex.index]
        const localX = v.x * e.transform.scale.x
        const localY = v.y * e.transform.scale.y
        vx = pos.x + (localX * cosR - localY * sinR)
        vy = pos.y + (localX * sinR + localY * cosR)
      }
      
      ctx.beginPath()
      ctx.fillStyle = '#ff4500' 
      ctx.arc(vx, vy, 6 / camera.scale, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Axes
  ctx.lineWidth = 2 / camera.scale
  ctx.beginPath(); ctx.strokeStyle = '#772222'; ctx.moveTo(viewL, 0); ctx.lineTo(viewR, 0); ctx.stroke()
  ctx.beginPath(); ctx.strokeStyle = '#227722'; ctx.moveTo(0, viewT); ctx.lineTo(0, viewB); ctx.stroke()

  // Drag Preview
  if (isDragging && !state.selectedEntityId && dragStart && dragNow) {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1 / camera.scale; ctx.setLineDash([5/camera.scale, 5/camera.scale])
    const x = Math.min(dragStart.x, dragNow.x), y = Math.min(dragStart.y, dragNow.y)
    const w = Math.abs(dragStart.x - dragNow.x), h = Math.abs(dragStart.y - dragNow.y)
    ctx.beginPath()
    if (state.activeTool === 'rectangle') ctx.rect(x, y, w, h)
    else if (state.activeTool === 'circle') ctx.ellipse(x+w/2, y+h/2, w/2, h/2, 0, 0, Math.PI*2) 
    else { ctx.moveTo(x+w/2, y); ctx.lineTo(x+w, y+h); ctx.lineTo(x, y+h); ctx.closePath() }
    ctx.stroke(); ctx.setLineDash([])
  }

  ctx.restore()
}
</script>

<template>
  <div class="canvas-container">
    <canvas 
      ref="canvasRef" 
      @mousedown="onMouseDown" 
      @mousemove="onMouseMove" 
      @mouseup="onMouseUp" 
      @wheel="onWheel" 
      @contextmenu.prevent 
    />
  </div>
</template>

<style scoped>
.canvas-container { width: 100%; height: 100%; overflow: hidden; }
canvas { display: block; width: 100%; height: 100%; touch-action: none; }
</style>
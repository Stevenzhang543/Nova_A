<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { physicsState, selectEntity } from '../store/physics'
import { BoxEntity } from '../world/BoxEntity'
import { CircleEntity } from '../world/CircleEntity'
import { TriangleEntity } from '../world/TriangleEntity'
import type { Vec2 } from '../world/types'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

const state = physicsState
const world = physicsState.world
const camera = physicsState.camera
const showGrid = ref(true)

// Interaction State
let isDragging = false
let isPanning = false
let isVertexDragging = false

let dragStart: Vec2 | null = null
let dragNow: Vec2 | null = null
let lastMouseScreen: Vec2 | null = null
let raf = 0

// Vertex Manipulation State
let hoveredVertex: { entityId: number, index: number, virtualPos?: Vec2 } | null = null

// Specialized drag state for circles to maintain relative ratios
let circleDragInfo: { 
  ratioX: number, 
  ratioY: number 
} | null = null

/* ---------------- CORE ---------------- */
function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const r = canvas.getBoundingClientRect()
  canvas.width = r.width * dpr
  canvas.height = r.height * dpr
  ctx = canvas.getContext('2d', { alpha: false })!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function loop() {
  world.update(1 / 60)
  render()
  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  resize()
  if (canvasRef.value) {
    const r = canvasRef.value.getBoundingClientRect()
    camera.offset.x = r.width / 2
    camera.offset.y = r.height / 2
  }
  loop()
  window.addEventListener('resize', resize)
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

  if (e.button === 1 || e.button === 2) {
    isPanning = true
    lastMouseScreen = sPos
    return
  }

  if (e.button === 0) {
    // 1. Check Vertex Hit
    checkHoverVertex(wPos) 
    if (hoveredVertex) {
      selectEntity(hoveredVertex.entityId)
      isVertexDragging = true
      dragStart = wPos
      
      // Initialize Circle Drag Math
      const ent = world.entities.find(e => e.id === hoveredVertex!.entityId)
      if (ent instanceof CircleEntity) {
        // Calculate the ratio of the click position relative to the radius.
        // e.g. if I clicked at x=50 and radius is 100, ratio is 0.5.
        // We lock this ratio so dragging to x=200 sets radius to 400.
        const dx = wPos.x - ent.transform.position.x
        const dy = wPos.y - ent.transform.position.y
        
        // Handle nearly-zero cases to prevent division by zero or infinite sensitivity
        const rx = ent.radiusX < 1 ? 1 : ent.radiusX
        const ry = ent.radiusY < 1 ? 1 : ent.radiusY
        
        circleDragInfo = {
          ratioX: dx / rx,
          ratioY: dy / ry
        }
      }
      return
    }

    // 2. Check Entity Hit
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

function onMouseMove(e: MouseEvent) {
  const sPos = screenPos(e)
  const wPos = camera.screenToWorld(sPos)
  
  if (isPanning && lastMouseScreen) {
    camera.offset.x += sPos.x - lastMouseScreen.x
    camera.offset.y += sPos.y - lastMouseScreen.y
    lastMouseScreen = sPos
    return
  }

  // Update hover only if not dragging
  if (!isDragging && !isVertexDragging) {
    checkHoverVertex(wPos)
  }

  // Vertex Dragging
  if (isVertexDragging && hoveredVertex) {
    const ent = world.entities.find(e => e.id === hoveredVertex!.entityId)
    if (ent) {
      if (ent instanceof BoxEntity || ent instanceof TriangleEntity) {
        // Standard Vertex Drag
        const v = ent.vertices[hoveredVertex.index]
        if (dragStart) {
          v.x += wPos.x - dragStart.x
          v.y += wPos.y - dragStart.y
          dragStart = wPos
        }
      } 
      else if (ent instanceof CircleEntity && circleDragInfo) {
        // FIX 2: Stable Ellipse Resizing
        const dx = wPos.x - ent.transform.position.x
        const dy = wPos.y - ent.transform.position.y
        
        // Only resize the axis if the user originally grabbed that axis (ratio > threshold).
        // If I grabbed the Top (ratioX ~ 0), dragging sideways shouldn't snap radiusX to infinity.
        const axisThreshold = 0.15 

        if (Math.abs(circleDragInfo.ratioX) > axisThreshold) {
          // New Radius = Current Mouse Dist / Original Ratio
          const newRx = Math.abs(dx / circleDragInfo.ratioX)
          ent.radiusX = Math.max(5, newRx) // Clamp to min size
        }

        if (Math.abs(circleDragInfo.ratioY) > axisThreshold) {
          const newRy = Math.abs(dy / circleDragInfo.ratioY)
          ent.radiusY = Math.max(5, newRy)
        }
      }
    }
    return
  }

  // Entity Dragging
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
    const w = Math.abs(dragStart.x - dragNow.x)
    const h = Math.abs(dragStart.y - dragNow.y)
    const cx = Math.min(dragStart.x, dragNow.x)
    const cy = Math.min(dragStart.y, dragNow.y)

    if (w > 5 || h > 5) { 
      if (state.activeTool === 'rectangle') world.addBox({ x: cx, y: cy }, { x: w, y: h })
      else if (state.activeTool === 'circle') world.addCircle({ x: cx + w / 2, y: cy + h / 2 }, w / 2, h / 2)
      else if (state.activeTool === 'triangle') world.addTriangle({ x: cx, y: cy }, { x: w, y: h })
    }
  }
  isDragging = isPanning = isVertexDragging = false
  dragStart = dragNow = lastMouseScreen = null
  circleDragInfo = null
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

  const threshold = 12 / camera.scale // Slightly larger threshold for ease of use
  
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
    // FIX 2.3 & 2.4: Robust Radial Detection
    const dx = p.x - ent.transform.position.x
    const dy = p.y - ent.transform.position.y
    
    // Safety check for degenerate circles
    if (ent.radiusX < 1 || ent.radiusY < 1) return

    const angle = Math.atan2(dy, dx)
    
    // Project angle onto ellipse surface
    const ex = Math.cos(angle) * ent.radiusX
    const ey = Math.sin(angle) * ent.radiusY
    
    // World space vertex position
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

  hoveredVertex = null
  document.body.style.cursor = 'default'
}

/* ---------------- HITBOX LOGIC ---------------- */
function hitTest(p: Vec2): number | null {
  for (let i = world.entities.length - 1; i >= 0; i--) {
    const e = world.entities[i]
    const pos = e.transform.position

    if (e instanceof BoxEntity || e instanceof TriangleEntity) {
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
  ctx.scale(camera.scale, camera.scale)

  const viewL = -camera.offset.x / camera.scale
  const viewT = -camera.offset.y / camera.scale
  const viewR = viewL + width / camera.scale
  const viewB = viewT + height / camera.scale

  // Grid
  if (showGrid.value) {
    ctx.beginPath(); ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1 / camera.scale
    const step = 50
    const startX = Math.floor(viewL / step) * step
    const startY = Math.floor(viewT / step) * step
    for (let x = startX; x < viewR; x += step) { ctx.moveTo(x, viewT); ctx.lineTo(x, viewB) }
    for (let y = startY; y < viewB; y += step) { ctx.moveTo(viewL, y); ctx.lineTo(viewR, y) }
    ctx.stroke()
  }

  // Entities
  const lwNormal = 1 / camera.scale
  const lwSelected = 3 / camera.scale

  for (const e of world.entities) {
    const pos = e.transform.position
    const isSelected = e.id === state.selectedEntityId
    
    ctx.lineWidth = isSelected ? lwSelected : lwNormal
    ctx.fillStyle = isSelected ? 'rgba(255, 200, 0, 0.3)' : 'rgba(0, 180, 255, 0.4)'
    ctx.strokeStyle = isSelected ? '#ffee00' : '#4cc9ff'

    ctx.beginPath()

    if (e instanceof BoxEntity || e instanceof TriangleEntity) {
      const v = e.vertices
      if (v.length > 0) {
        ctx.moveTo(pos.x + v[0].x, pos.y + v[0].y)
        for (let i = 1; i < v.length; i++) ctx.lineTo(pos.x + v[i].x, pos.y + v[i].y)
        ctx.closePath()
      }
    } 
    else if (e instanceof CircleEntity) {
      ctx.ellipse(pos.x, pos.y, e.radiusX, e.radiusY, 0, 0, Math.PI * 2)
    }
    
    ctx.fill()
    ctx.stroke()

    // Render Vertex Highlight
    // FIX 1: Hide red dot when dragging
    if (isSelected && !isVertexDragging && !isDragging && hoveredVertex && hoveredVertex.entityId === e.id) {
      let vx = 0, vy = 0
      
      if (e instanceof CircleEntity && hoveredVertex.virtualPos) {
        vx = pos.x + hoveredVertex.virtualPos.x
        vy = pos.y + hoveredVertex.virtualPos.y
      } else if ('vertices' in e) {
        const v = (e as any).vertices[hoveredVertex.index]
        vx = pos.x + v.x
        vy = pos.y + v.y
      }
      
      ctx.beginPath()
      ctx.fillStyle = '#ff4500' // OrangeRed
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
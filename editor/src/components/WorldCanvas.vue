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

let isDragging = false
let isPanning = false
let dragStart: Vec2 | null = null
let dragNow: Vec2 | null = null
let lastMouseScreen: Vec2 | null = null
let raf = 0

/* ---------------- CORE ---------------- */
function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const r = canvas.getBoundingClientRect()
  canvas.width = r.width * dpr
  canvas.height = r.height * dpr
  ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function loop() {
  world.update(1 / 60)
  render()
  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  resize()
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

  if (e.button === 2) {
    isPanning = true
    lastMouseScreen = sPos
    return
  }

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

function onMouseMove(e: MouseEvent) {
  const sPos = screenPos(e)
  const wPos = camera.screenToWorld(sPos)

  if (isPanning && lastMouseScreen) {
    camera.offset.x += sPos.x - lastMouseScreen.x
    camera.offset.y += sPos.y - lastMouseScreen.y
    lastMouseScreen = sPos
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
    const w = Math.abs(dragStart.x - dragNow.x)
    const h = Math.abs(dragStart.y - dragNow.y)
    const cx = Math.min(dragStart.x, dragNow.x)
    const cy = Math.min(dragStart.y, dragNow.y)

    if (w > 0.1 && h > 0.1) {
      if (state.activeTool === 'rectangle') world.addBox({ x: cx, y: cy }, { x: w, y: h })
      else if (state.activeTool === 'circle') world.addCircle({ x: cx + w / 2, y: cy + h / 2 }, Math.max(w, h) / 2)
      else if (state.activeTool === 'triangle') world.addTriangle({ x: cx, y: cy }, { x: w, y: h })
    }
  }
  isDragging = isPanning = false
  dragStart = dragNow = lastMouseScreen = null
}

/* ---------------- HITBOX LOGIC (ISSUE 1) ---------------- */
function hitTest(p: Vec2): number | null {
  for (let i = world.entities.length - 1; i >= 0; i--) {
    const e = world.entities[i]
    const pos = e.transform.position

    if (e instanceof BoxEntity) {
      if (p.x >= pos.x && p.x <= pos.x + e.size.x && p.y >= pos.y && p.y <= pos.y + e.size.y) return e.id
    } 
    else if (e instanceof CircleEntity) {
      const dx = p.x - pos.x, dy = p.y - pos.y
      if (Math.sqrt(dx * dx + dy * dy) <= e.radius) return e.id
    } 
    else if (e instanceof TriangleEntity) {
      // Precision Triangle Hitbox: Barycentric coordinate check
      const x1 = pos.x + e.size.x / 2, y1 = pos.y
      const x2 = pos.x + e.size.x,     y2 = pos.y + e.size.y
      const x3 = pos.x,                 y3 = pos.y + e.size.y
      
      const area = 0.5 * (-y2 * x3 + y1 * (-x2 + x3) + x1 * (y2 - y3) + x2 * y3)
      const s = 1 / (2 * area) * (y1 * x3 - x1 * y3 + (y3 - y1) * p.x + (x1 - x3) * p.y)
      const t = 1 / (2 * area) * (x1 * y2 - y1 * x2 + (y1 - y2) * p.x + (x2 - x1) * p.y)
      if (s > 0 && t > 0 && 1 - s - t > 0) return e.id
    }
  }
  return null
}

/* ---------------- RENDERING (ISSUE 3) ---------------- */
function render() {
  if (!ctx || !canvasRef.value) return
  const width = canvasRef.value.width / window.devicePixelRatio
  const height = canvasRef.value.height / window.devicePixelRatio

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.translate(camera.offset.x, camera.offset.y)
  ctx.scale(camera.scale, camera.scale)

  const viewL = -camera.offset.x / camera.scale, viewT = -camera.offset.y / camera.scale
  const viewR = viewL + width / camera.scale,    viewB = viewT + height / camera.scale

  // 1. Bottom Layer: Grid
  if (showGrid.value) {
    ctx.beginPath(); ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1 / camera.scale
    const step = 50
    for (let x = Math.floor(viewL/step)*step; x < viewR; x += step) { ctx.moveTo(x, viewT); ctx.lineTo(x, viewB) }
    for (let y = Math.floor(viewT/step)*step; y < viewB; y += step) { ctx.moveTo(viewL, y); ctx.lineTo(viewR, y) }
    ctx.stroke()
  }

  // 2. Middle Layer: Entities
  for (const e of world.entities) {
    const isSelected = e.id === state.selectedEntityId
    ctx.fillStyle = isSelected ? 'rgba(255, 200, 0, 0.3)' : 'rgba(0, 180, 255, 0.4)'
    ctx.strokeStyle = isSelected ? '#ffee00' : '#4cc9ff'
    ctx.lineWidth = (isSelected ? 3 : 1) / camera.scale

    if (e instanceof BoxEntity) {
      ctx.fillRect(e.transform.position.x, e.transform.position.y, e.size.x, e.size.y)
      ctx.strokeRect(e.transform.position.x, e.transform.position.y, e.size.x, e.size.y)
    } else if (e instanceof CircleEntity) {
      ctx.beginPath(); ctx.arc(e.transform.position.x, e.transform.position.y, e.radius, 0, Math.PI*2); ctx.fill(); ctx.stroke()
    } else if (e instanceof TriangleEntity) {
      const p = e.transform.position
      ctx.beginPath(); ctx.moveTo(p.x + e.size.x/2, p.y); ctx.lineTo(p.x + e.size.x, p.y + e.size.y); ctx.lineTo(p.x, p.y + e.size.y); ctx.closePath(); ctx.fill(); ctx.stroke()
    }
  }

  // 3. Top Layer: Axes (Restored to top)
  ctx.lineWidth = 2 / camera.scale
  ctx.beginPath(); ctx.strokeStyle = '#772222'; ctx.moveTo(viewL, 0); ctx.lineTo(viewR, 0); ctx.stroke()
  ctx.beginPath(); ctx.strokeStyle = '#227722'; ctx.moveTo(0, viewT); ctx.lineTo(0, viewB); ctx.stroke()

  // 4. Overlay: Preview
  if (isDragging && !state.selectedEntityId && dragStart && dragNow) {
    ctx.strokeStyle = '#fff'; ctx.setLineDash([5/camera.scale, 5/camera.scale])
    const x = Math.min(dragStart.x, dragNow.x), y = Math.min(dragStart.y, dragNow.y)
    const w = Math.abs(dragStart.x - dragNow.x), h = Math.abs(dragStart.y - dragNow.y)
    if (state.activeTool === 'rectangle') ctx.strokeRect(x, y, w, h)
    else if (state.activeTool === 'circle') { ctx.beginPath(); ctx.arc(x+w/2, y+h/2, Math.max(w,h)/2, 0, Math.PI*2); ctx.stroke() }
    else { ctx.beginPath(); ctx.moveTo(x+w/2, y); ctx.lineTo(x+w, y+h); ctx.lineTo(x, y+h); ctx.closePath(); ctx.stroke() }
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
.canvas-container { width: 100%; height: 100%; background: #1e1e1e; }
canvas { display: block; width: 100%; height: 100%; }
</style>
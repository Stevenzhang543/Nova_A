<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { World } from '../world/World'
import { Camera } from '../world/Camera'
import type { Vec2 } from '../world/types'

// ===== Refs =====
const canvasRef = ref<HTMLCanvasElement>()
const world = reactive(new World())
const camera = reactive(new Camera())

// ===== Drawing state =====
let dragging = false
let dragStartWorld: Vec2 | null = null
let dragCurrentWorld: Vec2 | null = null

// ===== Panning state =====
let panning = false
let lastMouse: Vec2 = { x: 0, y: 0 }

// ===== Grid toggle =====
const showGrid = ref(true)

// ===== Helpers =====
function getMousePos(e: MouseEvent): Vec2 {
  const rect = canvasRef.value!.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

// ===== Zoom =====
function onWheel(e: WheelEvent) {
  e.preventDefault()
  const mouse = getMousePos(e)
  const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
  zoomAtMouse(mouse, zoomFactor)
  drawCanvas()
}

// Zoom at mouse
function zoomAtMouse(mouse: Vec2, factor: number) {
  const worldBefore = camera.screenToWorld(mouse)
  camera.scale *= factor
  camera.scale = Math.min(Math.max(camera.scale, 0.1), 10)
  const worldAfter = camera.screenToWorld(mouse)
  camera.offset.x += (worldAfter.x - worldBefore.x) * camera.scale
  camera.offset.y += (worldAfter.y - worldBefore.y) * camera.scale
}

// ===== Mouse events =====
function onMouseDown(e: MouseEvent) {
  if (e.button === 0) {
    // Left click: draw
    dragging = true
    dragStartWorld = camera.screenToWorld(getMousePos(e))
    dragCurrentWorld = dragStartWorld
    drawCanvas()
  } else if (e.button === 2) {
    // Right click: pan
    panning = true
    lastMouse = { x: e.clientX, y: e.clientY }
  }
}

function onMouseMove(e: MouseEvent) {
  if (dragging) {
    dragCurrentWorld = camera.screenToWorld(getMousePos(e))
    drawCanvas()
  } else if (panning) {
    const dx = e.clientX - lastMouse.x
    const dy = e.clientY - lastMouse.y
    camera.offset.x += dx
    camera.offset.y += dy
    lastMouse = { x: e.clientX, y: e.clientY }
    drawCanvas()
  }
}

function onMouseUp(e: MouseEvent) {
  if (e.button === 0 && dragging) {
    // Finish drawing box
    if (!dragStartWorld || !dragCurrentWorld) return
    const x = Math.min(dragStartWorld.x, dragCurrentWorld.x)
    const y = Math.min(dragStartWorld.y, dragCurrentWorld.y)
    const w = Math.abs(dragStartWorld.x - dragCurrentWorld.x)
    const h = Math.abs(dragStartWorld.y - dragCurrentWorld.y)
    if (w > 0.01 && h > 0.01) world.addBox({ x, y }, { x: w, y: h })
    dragging = false
    dragStartWorld = null
    dragCurrentWorld = null
    drawCanvas()
  } else if (e.button === 2 && panning) {
    panning = false
  }
}

// ===== Draw everything =====
function drawCanvas() {
  if (!canvasRef.value) return
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  const canvas = canvasRef.value
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // ===== Grid =====
  if (showGrid.value) {
    ctx.save()
    ctx.translate(camera.offset.x, camera.offset.y)
    ctx.scale(camera.scale, camera.scale)
    const step = 50
    ctx.strokeStyle = 'rgba(100,100,100,0.3)'
    ctx.lineWidth = 0.5 / camera.scale

    const startX = -camera.offset.x / camera.scale - step * 2
    const startY = -camera.offset.y / camera.scale - step * 2
    const width = canvas.width / camera.scale + step * 4
    const height = canvas.height / camera.scale + step * 4

    for (let x = Math.floor(startX / step) * step; x < startX + width; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, startY)
      ctx.lineTo(x, startY + height)
      ctx.stroke()
    }
    for (let y = Math.floor(startY / step) * step; y < startY + height; y += step) {
      ctx.beginPath()
      ctx.moveTo(startX, y)
      ctx.lineTo(startX + width, y)
      ctx.stroke()
    }
    ctx.restore()
  }

  // ===== Boxes =====
  world.boxes.forEach(box => {
    const pos = camera.worldToScreen(box.pos)
    ctx.fillStyle = 'rgba(0,180,255,0.5)'
    ctx.fillRect(pos.x, pos.y, box.size.x * camera.scale, box.size.y * camera.scale)
    ctx.strokeStyle = '#4cc9ff'
    ctx.strokeRect(pos.x, pos.y, box.size.x * camera.scale, box.size.y * camera.scale)
  })

  // ===== Drag preview =====
  if (dragging && dragStartWorld && dragCurrentWorld) {
    const x = Math.min(dragStartWorld.x, dragCurrentWorld.x)
    const y = Math.min(dragStartWorld.y, dragCurrentWorld.y)
    const w = Math.abs(dragStartWorld.x - dragCurrentWorld.x)
    const h = Math.abs(dragStartWorld.y - dragCurrentWorld.y)
    const pos = camera.worldToScreen({ x, y })

    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.fillRect(pos.x, pos.y, w * camera.scale, h * camera.scale)
    ctx.strokeStyle = 'white'
    ctx.setLineDash([4, 4])
    ctx.strokeRect(pos.x, pos.y, w * camera.scale, h * camera.scale)
    ctx.setLineDash([])
  }
}

// ===== Mounted =====
onMounted(() => {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight

  // disable right-click menu
  canvas.addEventListener('contextmenu', e => e.preventDefault())

  drawCanvas()
})

// ===== Watch =====
watch(() => camera.scale, drawCanvas)
watch(() => [camera.offset.x, camera.offset.y], drawCanvas)
watch(showGrid, drawCanvas) // <-- FIX: watch grid toggle
</script>

<template>
  <canvas
    ref="canvasRef"
    class="world-canvas"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
    @wheel="onWheel"
  />
  <button class="grid-toggle" @click="showGrid = !showGrid">
    {{ showGrid ? 'Hide' : 'Show' }} Grid
  </button>
</template>

<style scoped>
.world-canvas {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  background: #1e1e1e;
  display: block;
}

.grid-toggle {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  padding: 6px 10px;
  background: #252526;
  color: white;
  border: none;
  cursor: pointer;
}
</style>

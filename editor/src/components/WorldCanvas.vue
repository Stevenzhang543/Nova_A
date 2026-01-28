<script setup lang="ts">
import { ref, shallowReactive, onMounted, watch } from 'vue'
import { World } from '../world/World'
import { Camera } from '../world/Camera'
import type { Vec2 } from '../world/types'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const ctxRef = ref<CanvasRenderingContext2D | null>(null)

const world = shallowReactive(new World())
const camera = shallowReactive(new Camera())
const showGrid = ref(true)

let isDrawing = false
let isPanning = false
let drawStartWorld: Vec2 | null = null
let drawCurrentWorld: Vec2 | null = null
let lastMouseScreen: Vec2 | null = null

function resizeCanvas() {
  const canvas = canvasRef.value!
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctxRef.value = ctx
  render()
}

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
})

function getMouseScreen(e: MouseEvent): Vec2 {
  const rect = canvasRef.value!.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  camera.zoomAt(getMouseScreen(e), e.deltaY < 0 ? 1.1 : 0.9)
  render()
}

function onMouseDown(e: MouseEvent) {
  const mouse = getMouseScreen(e)
  if (e.button === 0) {
    isDrawing = true
    drawStartWorld = camera.screenToWorld(mouse)
    drawCurrentWorld = drawStartWorld
  }
  if (e.button === 2) {
    isPanning = true
    lastMouseScreen = mouse
  }
}

function onMouseMove(e: MouseEvent) {
  const mouse = getMouseScreen(e)
  if (isDrawing && drawStartWorld) {
    drawCurrentWorld = camera.screenToWorld(mouse)
    render()
  }
  if (isPanning && lastMouseScreen) {
    camera.offset.x += mouse.x - lastMouseScreen.x
    camera.offset.y += mouse.y - lastMouseScreen.y
    lastMouseScreen = mouse
    render()
  }
}

function onMouseUp(e: MouseEvent) {
  if (e.button === 0 && isDrawing && drawStartWorld && drawCurrentWorld) {
    const x = Math.min(drawStartWorld.x, drawCurrentWorld.x)
    const y = Math.min(drawStartWorld.y, drawCurrentWorld.y)
    const w = Math.abs(drawStartWorld.x - drawCurrentWorld.x)
    const h = Math.abs(drawStartWorld.y - drawCurrentWorld.y)
    if (w > 0.01 && h > 0.01) world.addBox({ x, y }, { x: w, y: h })
    isDrawing = false
    drawStartWorld = null
    drawCurrentWorld = null
    render()
  }
  if (e.button === 2) {
    isPanning = false
    lastMouseScreen = null
  }
}

function onContextMenu(e: MouseEvent) { e.preventDefault() }

function render() {
  const ctx = ctxRef.value
  const canvas = canvasRef.value
  if (!ctx || !canvas) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.translate(camera.offset.x, camera.offset.y)
  ctx.scale(camera.scale, camera.scale)

  if (showGrid.value) drawGrid(ctx)
  drawBoxes(ctx)
  drawPreview(ctx)

  ctx.restore()
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  const step = 50
  const w = canvasRef.value!.width / camera.scale
  const h = canvasRef.value!.height / camera.scale
  const startX = Math.floor(-camera.offset.x / camera.scale / step) * step - step
  const startY = Math.floor(-camera.offset.y / camera.scale / step) * step - step

  ctx.strokeStyle = 'rgba(120,120,120,0.3)'
  ctx.lineWidth = 1 / camera.scale

  for (let x = startX; x < startX + w + step*2; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, startY)
    ctx.lineTo(x, startY + h + step*2)
    ctx.stroke()
  }
  for (let y = startY; y < startY + h + step*2; y += step) {
    ctx.beginPath()
    ctx.moveTo(startX, y)
    ctx.lineTo(startX + w + step*2, y)
    ctx.stroke()
  }
}

function drawBoxes(ctx: CanvasRenderingContext2D) {
  for (const box of world.boxes) {
    ctx.fillStyle = 'rgba(0,180,255,0.5)'
    ctx.strokeStyle = '#4cc9ff'
    ctx.lineWidth = 1 / camera.scale
    ctx.fillRect(box.pos.x, box.pos.y, box.size.x, box.size.y)
    ctx.strokeRect(box.pos.x, box.pos.y, box.size.x, box.size.y)
  }
}

function drawPreview(ctx: CanvasRenderingContext2D) {
  if (!drawStartWorld || !drawCurrentWorld) return
  const x = Math.min(drawStartWorld.x, drawCurrentWorld.x)
  const y = Math.min(drawStartWorld.y, drawCurrentWorld.y)
  const w = Math.abs(drawStartWorld.x - drawCurrentWorld.x)
  const h = Math.abs(drawStartWorld.y - drawCurrentWorld.y)
  ctx.setLineDash([6 / camera.scale])
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1 / camera.scale
  ctx.fillRect(x, y, w, h)
  ctx.strokeRect(x, y, w, h)
  ctx.setLineDash([])
}

watch(showGrid, render)
</script>

<template>
  <div class="scene-root">
    <canvas
      ref="canvasRef"
      class="world-canvas"
      @wheel="onWheel"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @contextmenu="onContextMenu"
    ></canvas>

    <button class="grid-toggle" @click="showGrid = !showGrid">
      {{ showGrid ? 'Hide' : 'Show' }} Grid
    </button>
  </div>
</template>

<style scoped>
.scene-root { position: relative; width: 100%; height: 100%; }
.world-canvas { width: 100%; height: 100%; display: block; background: #1e1e1e; }
.grid-toggle { position: absolute; top: 12px; right: 12px; z-index: 10; }
</style>

import { reactive, markRaw } from 'vue'
import { World } from '../world/World'
import { Camera } from '../world/Camera'
import { BoxEntity } from '../world/BoxEntity'
import { CircleEntity } from '../world/CircleEntity'
import { TriangleEntity } from '../world/TriangleEntity'

interface PhysicsState {
  world: World
  camera: Camera
  selectedEntityId: number | null
  activeTool: 'rectangle' | 'circle' | 'triangle'
}

// 1. Create the engine instances
const rawWorld = new World()
const rawCamera = new Camera()

// 2. CRITICAL FIX: Make the entities array reactive, but keep the logic raw.
// We replace the native array in World with a Vue reactive array.
// This allows the SceneSideBar to update automatically when entities are added.
rawWorld.entities = reactive([]) 

export const physicsState = reactive<PhysicsState>({
  // We still mark the class instances as raw to prevent Vue from proxying 
  // complex methods/calculations, which saves performance.
  world: markRaw(rawWorld),
  camera: markRaw(rawCamera),
  selectedEntityId: null,
  activeTool: 'rectangle'
})

export function selectEntity(id: number | null) {
  physicsState.selectedEntityId = id
}

export async function saveProject() {
  const data = physicsState.world.entities.map(e => {
    const base = { id: e.id, name: e.name, transform: e.transform }
    if (e.name === 'Circle') return { ...base, radiusX: (e as any).radiusX, radiusY: (e as any).radiusY }
    return { ...base, vertices: (e as any).vertices }
  })
  const jsonString = JSON.stringify(data, null, 2)

  try {
    // Modern Browser API: Let the user pick where to save
    if ('showSaveFilePicker' in window) {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: 'nova_scene.json',
        types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }]
      })
      const writable = await handle.createWritable()
      await writable.write(jsonString)
      await writable.close()
      return
    }
  } catch (e: any) {
    if (e.name === 'AbortError') return // User cancelled the save dialog, do nothing
    console.warn("File System API failed, falling back to automatic download", e)
  }

  // Fallback for browsers that don't support showSaveFilePicker (e.g. Firefox default)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'nova_scene.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function loadProject(jsonString: string) {
  try {
    const data = JSON.parse(jsonString)
    physicsState.world.entities.splice(0, physicsState.world.entities.length)
    let maxId = 0
    data.forEach((item: any) => {
      if (item.id > maxId) maxId = item.id
      if (item.name === 'Box') {
        const e = new BoxEntity(item.id, item.transform.position, {x: 1, y: 1})
        e.transform = item.transform; e.vertices = item.vertices
        physicsState.world.entities.push(e)
      } else if (item.name === 'Triangle') {
        const e = new TriangleEntity(item.id, item.transform.position, {x: 1, y: 1})
        e.transform = item.transform; e.vertices = item.vertices
        physicsState.world.entities.push(e)
      } else if (item.name === 'Circle') {
        const e = new CircleEntity(item.id, item.transform.position, item.radiusX, item.radiusY)
        e.transform = item.transform
        physicsState.world.entities.push(e)
      }
    })
    ;(physicsState.world as any).nextId = maxId + 1
    physicsState.selectedEntityId = null
  } catch (e) {
    console.error("Failed to load project", e)
  }
}

export function clearScene() {
  physicsState.world.entities.splice(0, physicsState.world.entities.length)
  physicsState.selectedEntityId = null
}

export function deleteSelected() {
  if (physicsState.selectedEntityId === null) return
  const idx = physicsState.world.entities.findIndex(e => e.id === physicsState.selectedEntityId)
  if (idx !== -1) physicsState.world.entities.splice(idx, 1)
  physicsState.selectedEntityId = null
}

export function resetCamera() {
  physicsState.camera.scale = 1
  
  // Find the canvas to perfectly center the origin point
  const canvas = document.querySelector('canvas')
  if (canvas) {
    physicsState.camera.offset = { 
      x: canvas.clientWidth / 2, 
      y: canvas.clientHeight / 2 
    }
  } else {
    physicsState.camera.offset = { x: 0, y: 0 }
  }
}
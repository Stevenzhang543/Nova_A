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
  globalSettings: { gravity: number; airFriction: number; timeScale: number }
  simulationRunning: boolean // NEW: Tracks Start/Stop state
}

// 1. Create the engine instances
const rawWorld = new World()
const rawCamera = new Camera()

let simulationSnapshot: string | null = null

// 2. CRITICAL FIX: Make the entities array reactive, but keep the logic raw.
// We replace the native array in World with a Vue reactive array.
// This allows the SceneSideBar to update automatically when entities are added.
rawWorld.entities = reactive([]) 

export const physicsState = reactive<PhysicsState>({
  world: markRaw(rawWorld),
  camera: markRaw(rawCamera),
  selectedEntityId: null,
  activeTool: 'rectangle',
  globalSettings: { gravity: 9.8, airFriction: 0.01, timeScale: 1.0 },
  simulationRunning: false // NEW
})

// NEW Action
export function getSceneJSON() {
  return JSON.stringify(physicsState.world.entities.map(e => {
    // FIX: Explicitly pack every property to guarantee nothing is lost
    const eData: any = {
      id: e.id,
      name: e.name,
      shapeType: e.shapeType,
      transparency: e.transparency,
      angularVelocity: e.angularVelocity,
      linearDamping: e.linearDamping,
      angularDamping: e.angularDamping,
      mass: e.mass,
      autoInertia: e.autoInertia,
      inertia: e.inertia,
      gravityScale: e.gravityScale,
      torque: e.torque,
      gravity: e.gravity,
      restitution: e.restitution,
      staticFriction: e.staticFriction,
      dynamicFriction: e.dynamicFriction,
      isStatic: e.isStatic,
      isKinematic: e.isKinematic
    }
    
    // Deep clone nested objects
    eData.transform = { 
      position: { ...e.transform.position }, 
      scale: { ...e.transform.scale }, 
      rotation: e.transform.rotation 
    }
    eData.velocity = { ...e.velocity }
    eData.acceleration = { ...e.acceleration }
    eData.force = { ...e.force }
    eData.color = { ...e.color }
    
    // Specific geometry properties
    if (e.shapeType === 'Box' || e.shapeType === 'Triangle') {
      eData.vertices = (e as any).vertices.map((v: any) => ({...v}))
    } else if (e.shapeType === 'Circle') {
      eData.radiusX = (e as any).radiusX
      eData.radiusY = (e as any).radiusY
    }
    return eData
  }))
}

export function loadProject(jsonString: string) {
  try {
    const data = JSON.parse(jsonString)
    physicsState.world.entities.splice(0, physicsState.world.entities.length)
    let maxId = 0
    data.forEach((item: any) => {
      if (item.id > maxId) maxId = item.id
      
      let e: any;
      if (item.shapeType === 'Box' || item.name === 'Box') {
        e = new BoxEntity(item.id, item.transform.position, {x: 1, y: 1})
        e.vertices = item.vertices
      } else if (item.shapeType === 'Triangle' || item.name === 'Triangle') {
        e = new TriangleEntity(item.id, item.transform.position, {x: 1, y: 1})
        e.vertices = item.vertices
      } else if (item.shapeType === 'Circle' || item.name === 'Circle') {
        e = new CircleEntity(item.id, item.transform.position, item.radiusX, item.radiusY)
      }

      if (e) {
        // FIX: Explicitly assign all primitive values
        const propsToAssign = [
          'transparency', 'angularVelocity', 'linearDamping', 'angularDamping', 
          'mass', 'autoInertia', 'inertia', 'gravityScale', 'torque', 'gravity', 
          'restitution', 'staticFriction', 'dynamicFriction', 'isStatic', 'isKinematic', 'name'
        ]
        for (const prop of propsToAssign) {
          if (item[prop] !== undefined) e[prop] = item[prop]
        }
        
        // Explicitly map nested objects safely
        if (item.transform) e.transform = { position: { ...item.transform.position }, scale: { ...item.transform.scale }, rotation: item.transform.rotation }
        if (item.velocity) e.velocity = { ...item.velocity }
        if (item.acceleration) e.acceleration = { ...item.acceleration }
        if (item.force) e.force = { ...item.force }
        if (item.color) e.color = { ...item.color }
        
        physicsState.world.entities.push(e)
      }
    })
    ;(physicsState.world as any).nextId = maxId + 1
    physicsState.selectedEntityId = null
  } catch (e) {
    console.error("Failed to load project", e)
  }
}

export function toggleSimulation(state: boolean) {
  // If we are turning it ON and it wasn't already running, take a snapshot!
  if (state && !physicsState.simulationRunning) {
    simulationSnapshot = getSceneJSON()
  }
  physicsState.simulationRunning = state
}

export function resetSimulation() {
  physicsState.simulationRunning = false
  if (simulationSnapshot) {
    loadProject(simulationSnapshot) // Restore from snapshot
  }
}

export function selectEntity(id: number | null) {
  physicsState.selectedEntityId = id
}

export async function saveProject() {
  const jsonString = getSceneJSON() // Uses the new helper instead of manually mapping

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
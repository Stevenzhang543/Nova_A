import { reactive, markRaw } from 'vue'
import { World } from '../world/World'
import { Camera } from '../world/Camera'
import { BoxEntity } from '../world/BoxEntity'
import { CircleEntity } from '../world/CircleEntity'
import { TriangleEntity } from '../world/TriangleEntity'
import { editorState } from './editor'

interface PhysicsState {
  world: World
  camera: Camera
  selectedEntityId: number | null
  focusEntityID: number | null 
  activeTool: 'rectangle' | 'circle' | 'triangle'
  globalSettings: { gravity: number; airFriction: number; timeScale: number }
  simulationRunning: boolean 
}

const rawWorld = new World()
const rawCamera = new Camera()

let simulationSnapshot: string | null = null
rawWorld.entities = reactive([]) 

export const physicsState = reactive<PhysicsState>({
  world: markRaw(rawWorld),
  camera: markRaw(rawCamera),
  selectedEntityId: null,
  focusEntityID: null, 
  activeTool: 'rectangle',
  globalSettings: { gravity: 9.8, airFriction: 0.01, timeScale: 1.0 },
  simulationRunning: false 
})

// FEATURE: Centralized Editing Mode logic
export function enterEditMode(id: number | null) {
  physicsState.selectedEntityId = id;
  physicsState.focusEntityID = id; // Triggers camera auto-zoom
}

export function getSceneJSON() {
  return JSON.stringify({
    layers: editorState.layers,
    entities: physicsState.world.entities.map(e => {
      const eData: any = {
        id: e.id, name: e.name, shapeType: e.shapeType, layer: e.layer,
        texture: e.texture, 
        transparency: e.transparency, angularVelocity: e.angularVelocity,
        linearDamping: e.linearDamping, angularDamping: e.angularDamping,
        density: e.density, mass: e.mass, autoInertia: e.autoInertia, inertia: e.inertia,
        gravityScale: e.gravityScale, torque: e.torque, gravity: e.gravity,
        restitution: e.restitution, restitutionThreshold: e.restitutionThreshold, 
        staticFriction: e.staticFriction, dynamicFriction: e.dynamicFriction,
        isSensor: e.isSensor, isStatic: e.isStatic, isKinematic: e.isKinematic 
      }
      eData.transform = { position: { ...e.transform.position }, scale: { ...e.transform.scale }, rotation: e.transform.rotation }
      eData.velocity = { ...e.velocity }
      eData.acceleration = { ...e.acceleration }
      eData.force = { ...e.force }
      eData.color = { ...e.color }
      
      if (e.shapeType === 'Box' || e.shapeType === 'Triangle') { eData.vertices = (e as any).vertices.map((v: any) => ({...v})) } 
      else if (e.shapeType === 'Circle') { eData.radiusX = (e as any).radiusX; eData.radiusY = (e as any).radiusY }
      return eData
    })
  })
}

export function loadProject(jsonString: string, preserveIds = true) {
  try {
    const parsed = JSON.parse(jsonString)
    let entityData = parsed;
    if (parsed.entities) {
      entityData = parsed.entities;
      if (parsed.layers) editorState.layers = parsed.layers;
    } else {
      editorState.layers = [1];
    }

    physicsState.world.entities.splice(0, physicsState.world.entities.length)
    let maxId = 0
    entityData.forEach((item: any) => {
      if (item.id > maxId) maxId = item.id
      
      let e: any;
      if (item.shapeType === 'Box' || item.name === 'Box') {
        e = new BoxEntity(item.id, item.transform.position, {x: 1, y: 1}); e.vertices = item.vertices
      } else if (item.shapeType === 'Triangle' || item.name === 'Triangle') {
        e = new TriangleEntity(item.id, item.transform.position, {x: 1, y: 1}); e.vertices = item.vertices
      } else if (item.shapeType === 'Circle' || item.name === 'Circle') {
        e = new CircleEntity(item.id, item.transform.position, item.radiusX, item.radiusY)
      }

      if (e) {
        const propsToAssign = ['layer', 'texture', 'density', 'restitutionThreshold', 'isSensor', 'transparency', 'angularVelocity', 'linearDamping', 'angularDamping', 'mass', 'autoInertia', 'inertia', 'gravityScale', 'torque', 'gravity', 'restitution', 'staticFriction', 'dynamicFriction', 'isStatic', 'isKinematic', 'name']
        for (const prop of propsToAssign) { if (item[prop] !== undefined) e[prop] = item[prop] }
        if (item.transform) e.transform = { position: { ...item.transform.position }, scale: { ...item.transform.scale }, rotation: item.transform.rotation }
        if (item.velocity) e.velocity = { ...item.velocity }
        if (item.acceleration) e.acceleration = { ...item.acceleration }
        if (item.force) e.force = { ...item.force }
        if (item.color) e.color = { ...item.color }
        if (e.layer && !editorState.layers.includes(e.layer)) editorState.layers.push(e.layer)
        physicsState.world.entities.push(e)
      }
    })
    
    if (preserveIds) (physicsState.world as any).nextId = maxId + 1
    if (physicsState.selectedEntityId && !physicsState.world.entities.find(e => e.id === physicsState.selectedEntityId)) {
        enterEditMode(null)
    }
  } catch (e) { console.error("Failed to load project", e) }
}

export function toggleSimulation(state: boolean) {
  if (state && !physicsState.simulationRunning) simulationSnapshot = getSceneJSON()
  physicsState.simulationRunning = state
}

export function resetSimulation() {
  physicsState.simulationRunning = false
  if (simulationSnapshot) loadProject(simulationSnapshot) 
}

export async function saveProject() {
  const jsonString = getSceneJSON() 
  try {
    if ('showSaveFilePicker' in window) {
      const handle = await (window as any).showSaveFilePicker({ suggestedName: 'nova_scene.json', types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }] })
      const writable = await handle.createWritable()
      await writable.write(jsonString)
      await writable.close()
      return
    }
  } catch (e: any) {
    if (e.name === 'AbortError') return 
    console.warn("File System API failed", e)
  }
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'nova_scene.json'; a.click(); URL.revokeObjectURL(url)
}

export function clearScene() {
  physicsState.world.entities.splice(0, physicsState.world.entities.length)
  enterEditMode(null)
  physicsState.world.resetId() 
}

export function deleteSelected() {
  if (physicsState.selectedEntityId === null) return
  const idx = physicsState.world.entities.findIndex(e => e.id === physicsState.selectedEntityId)
  if (idx !== -1) physicsState.world.entities.splice(idx, 1)
  enterEditMode(null)
  if (physicsState.world.entities.length === 0) physicsState.world.resetId()
}

export function resetCamera() {
  physicsState.camera.scale = 0.5
  const canvas = document.querySelector('canvas')
  if (canvas) { physicsState.camera.offset = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 } } 
  else { physicsState.camera.offset = { x: 0, y: 0 } }
}

export function moveToFront(id: number) {
  const idx = physicsState.world.entities.findIndex(e => e.id === id)
  if (idx !== -1) {
    const [e] = physicsState.world.entities.splice(idx, 1)
    physicsState.world.entities.push(e)
  }
}

export function moveToBack(id: number) {
  const idx = physicsState.world.entities.findIndex(e => e.id === id)
  if (idx !== -1) {
    const [e] = physicsState.world.entities.splice(idx, 1)
    physicsState.world.entities.unshift(e)
  }
}

export function duplicateEntity(id: number) {
  const original = physicsState.world.entities.find(e => e.id === id)
  if (!original) return
  const sceneData = JSON.parse(getSceneJSON())
  const originalData = sceneData.entities.find((e: any) => e.id === id)
  if (!originalData) return

  originalData.id = (physicsState.world as any).nextId++
  originalData.transform.position.x += 10; originalData.transform.position.y -= 10 
  
  let clone: any
  if (originalData.shapeType === 'Box') { clone = new BoxEntity(originalData.id, originalData.transform.position, {x: 1, y: 1}); clone.vertices = originalData.vertices; } 
  else if (originalData.shapeType === 'Triangle') { clone = new TriangleEntity(originalData.id, originalData.transform.position, {x: 1, y: 1}); clone.vertices = originalData.vertices; } 
  else if (originalData.shapeType === 'Circle') { clone = new CircleEntity(originalData.id, originalData.transform.position, originalData.radiusX, originalData.radiusY) }
  
  if (clone) {
    const props = ['layer', 'texture', 'density', 'restitutionThreshold', 'isSensor', 'transparency', 'angularVelocity', 'linearDamping', 'angularDamping', 'mass', 'autoInertia', 'inertia', 'gravityScale', 'torque', 'gravity', 'restitution', 'staticFriction', 'dynamicFriction', 'isStatic', 'isKinematic', 'name']
    for (const p of props) clone[p] = originalData[p]
    clone.transform = originalData.transform; clone.velocity = originalData.velocity; clone.color = originalData.color
    physicsState.world.entities.push(clone)
  }
}

export const historyState = reactive({ stack: [] as string[], index: -1 })

export function pushHistory() {
  if (physicsState.simulationRunning) return; 
  const stateStr = getSceneJSON()
  if (historyState.index >= 0 && historyState.stack[historyState.index] === stateStr) return; 
  historyState.stack = historyState.stack.slice(0, historyState.index + 1)
  historyState.stack.push(stateStr)
  if (historyState.stack.length > 50) historyState.stack.shift() 
  else historyState.index++
}

export function undo() {
  if (historyState.index > 0) {
    historyState.index--; loadProject(historyState.stack[historyState.index], false)
    editorState.statusText = 'Undo Successful'
  }
}

export function redo() {
  if (historyState.index < historyState.stack.length - 1) {
    historyState.index++; loadProject(historyState.stack[historyState.index], false)
    editorState.statusText = 'Redo Successful'
  }
}
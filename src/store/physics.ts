// Nova_A/editor/src/store/physics.ts
import { reactive, markRaw } from 'vue'
import { World } from '../world/World'
import { Camera } from '../world/Camera'

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
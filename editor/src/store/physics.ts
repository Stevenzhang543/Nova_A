// Nova_A/editor/src/store/physics.ts
import { reactive, markRaw } from 'vue'
import { World } from '../world/World'
import { Camera } from '../world/Camera'
import type { Entity } from '../world/Entity'

interface PhysicsState {
  world: World
  camera: Camera
  selectedEntityId: number | null
  activeTool: 'rectangle' | 'circle' | 'triangle'
}

export const physicsState = reactive<PhysicsState>({
  world: markRaw(new World()),
  camera: markRaw(new Camera()),
  selectedEntityId: null,
  activeTool: 'rectangle'
})

export function selectEntity(id: number | null) {
  physicsState.selectedEntityId = id
}
import { reactive } from "vue";

export interface Vec2 {
  x: number;
  y: number;
}

export interface RigidBody {
  id: number;
  position: Vec2;
  width: number;
  height: number;
  color: string;
}

export interface World {
  gravity: Vec2;
  bodies: RigidBody[];
  scale: number;
  offset: Vec2;
}

export const physicsState = reactive<World>({
  gravity: { x: 0, y: 9.8 },
  bodies: [
    { id: 1, position: { x: 100, y: 100 }, width: 50, height: 50, color: '#f00' },
    { id: 2, position: { x: 200, y: 150 }, width: 60, height: 60, color: '#0f0' }
  ],
  scale: 1,
  offset: { x: 0, y: 0 }
});

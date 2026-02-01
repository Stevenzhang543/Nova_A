import type { Vec2 } from './types'

export class Transform {
  position: Vec2 = { x: 0, y: 0 }
  rotation = 0
  scale: Vec2 = { x: 1, y: 1 }
}

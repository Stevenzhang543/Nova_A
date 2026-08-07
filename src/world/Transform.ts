import type { Vec2 } from './types'
import { normalizeUuid } from './identity'

export class Transform {
  readonly uuid: string
  readonly kind = 'Transform2D' as const
  enabled = true
  removed = false
  parentUuid: string | null = null
  position: Vec2 = { x: 0, y: 0 }
  rotation = 0
  scale: Vec2 = { x: 1, y: 1 }

  constructor(uuid?: string) {
    this.uuid = normalizeUuid(uuid)
  }
}

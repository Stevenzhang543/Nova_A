import type { ShapeRenderCommand, SpriteRenderCommand } from './types'
import type { Vec2 } from '../world/types'

export interface GeometryData {
  positions: Vec2[]
  uvs: Vec2[]
  indices: number[]
}

function worldPoint(point: Vec2, position: Vec2, rotation: number, scale: Vec2): Vec2 {
  const x = point.x * scale.x
  const y = point.y * scale.y
  const cosine = Math.cos(rotation)
  const sine = Math.sin(rotation)
  return { x: position.x + x * cosine - y * sine, y: position.y + x * sine + y * cosine }
}

export function spriteGeometry(command: SpriteRenderCommand): GeometryData {
  const left = -command.pivot.x * command.size.x
  const bottom = -command.pivot.y * command.size.y
  const right = left + command.size.x
  const top = bottom + command.size.y
  const local = [
    { x: left, y: bottom }, { x: right, y: bottom },
    { x: right, y: top }, { x: left, y: top }
  ]
  const region = command.texture.uv
  const u0 = command.flipX ? region.x + region.width : region.x
  const u1 = command.flipX ? region.x : region.x + region.width
  const v0 = command.flipY ? region.y : region.y + region.height
  const v1 = command.flipY ? region.y + region.height : region.y
  return {
    positions: local.map(point => worldPoint(point, command.position, command.rotation, command.scale)),
    uvs: [{ x: u0, y: v0 }, { x: u1, y: v0 }, { x: u1, y: v1 }, { x: u0, y: v1 }],
    indices: [0, 1, 2, 0, 2, 3]
  }
}

function shapeLocalPoints(command: ShapeRenderCommand): Vec2[] {
  if (command.shape === 'Ellipse') {
    const segments = Math.min(96, Math.max(24, Math.ceil(Math.max(command.radiusX, command.radiusY) * 12)))
    return Array.from({ length: segments }, (_, index) => {
      const angle = index / segments * Math.PI * 2
      return { x: Math.cos(angle) * command.radiusX, y: Math.sin(angle) * command.radiusY }
    })
  }
  if (command.vertices.length >= 2) return command.vertices
  return [{ x: -.5, y: -.5 }, { x: .5, y: -.5 }, { x: .5, y: .5 }, { x: -.5, y: .5 }]
}

export function shapeGeometry(command: ShapeRenderCommand): GeometryData {
  const local = shapeLocalPoints(command)
  const xs = local.map(point => point.x)
  const ys = local.map(point => point.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const width = Math.max(1e-9, maxX - minX), height = Math.max(1e-9, maxY - minY)
  const region = command.texture?.uv ?? { x: 0, y: 0, width: 1, height: 1 }
  const positions = local.map(point => worldPoint(point, command.position, command.rotation, command.scale))
  const uvs = local.map(point => ({
    x: region.x + (point.x - minX) / width * region.width,
    y: region.y + (maxY - point.y) / height * region.height
  }))
  const indices: number[] = []
  for (let index = 1; index < local.length - 1; index++) indices.push(0, index, index + 1)
  return { positions, uvs, indices }
}

export function strokeGeometry(command: ShapeRenderCommand): GeometryData | null {
  if (command.strokeWidth <= 0 || command.stroke.a <= 0) return null
  const local = shapeLocalPoints(command)
  if (local.length < 2) return null
  const closed = command.shape !== 'Line'
  const positions: Vec2[] = []
  const uvs: Vec2[] = []
  const indices: number[] = []
  const segmentCount = closed ? local.length : local.length - 1
  for (let index = 0; index < segmentCount; index++) {
    const start = worldPoint(local[index], command.position, command.rotation, command.scale)
    const end = worldPoint(local[(index + 1) % local.length], command.position, command.rotation, command.scale)
    const dx = end.x - start.x, dy = end.y - start.y
    const length = Math.hypot(dx, dy)
    if (length <= 1e-9) continue
    const nx = -dy / length * command.strokeWidth * .5
    const ny = dx / length * command.strokeWidth * .5
    const base = positions.length
    positions.push(
      { x: start.x + nx, y: start.y + ny }, { x: end.x + nx, y: end.y + ny },
      { x: end.x - nx, y: end.y - ny }, { x: start.x - nx, y: start.y - ny }
    )
    uvs.push({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 })
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
  return { positions, uvs, indices }
}

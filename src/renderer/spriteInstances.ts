/** Backend-private GPU64, deliberately independent from transport SpriteInstanceV1 (80 bytes).
 * Store four old CPU world corners rather than change affine rounding in the vertex shader. */
import type { SpriteRenderCommand } from './types'

export const SPRITE_INSTANCE_FLOATS = 16
export const SPRITE_INSTANCE_BYTES = SPRITE_INSTANCE_FLOATS * Float32Array.BYTES_PER_ELEMENT

function corner(target: Float32Array, offset: number, localX: number, localY: number, command: SpriteRenderCommand, cosine: number, sine: number): boolean {
  const x = localX * command.scale.x, y = localY * command.scale.y
  // Keep the exact operation order of geometry.worldPoint before the original f32 upload cast.
  const worldX = command.position.x + x * cosine - y * sine
  const worldY = command.position.y + x * sine + y * cosine
  if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) return false
  target[offset] = worldX; target[offset + 1] = worldY
  return true
}

export function writeSpriteInstance(target: Float32Array, offset: number, command: SpriteRenderCommand, color: readonly number[]): boolean {
  const left = -command.pivot.x * command.size.x, bottom = -command.pivot.y * command.size.y
  const right = left + command.size.x, top = bottom + command.size.y
  const cosine = Math.cos(command.rotation), sine = Math.sin(command.rotation)
  if (!corner(target, offset, left, bottom, command, cosine, sine)
    || !corner(target, offset + 2, right, bottom, command, cosine, sine)
    || !corner(target, offset + 4, right, top, command, cosine, sine)
    || !corner(target, offset + 6, left, top, command, cosine, sine)) return false
  const region = command.texture.uv
  const u0 = command.flipX ? region.x + region.width : region.x
  const u1 = command.flipX ? region.x : region.x + region.width
  const v0 = command.flipY ? region.y : region.y + region.height
  const v1 = command.flipY ? region.y + region.height : region.y
  if (!Number.isFinite(u0) || !Number.isFinite(v0) || !Number.isFinite(u1) || !Number.isFinite(v1)) return false
  target[offset + 8] = u0; target[offset + 9] = v0; target[offset + 10] = u1; target[offset + 11] = v1
  target[offset + 12] = color[0]; target[offset + 13] = color[1]; target[offset + 14] = color[2]; target[offset + 15] = color[3]
  return true
}

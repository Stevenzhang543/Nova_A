import type { Vec2 } from '../world/types'

export type TextureFilter = 'Nearest' | 'Linear'
export type BlendMode2D = 'Alpha' | 'Additive' | 'Multiply' | 'Screen'

export interface RenderColor {
  r: number
  g: number
  b: number
  a: number
}

export interface TextureRegion {
  key: string
  source: TexImageSource
  uv: { x: number; y: number; width: number; height: number }
  filter: TextureFilter
  colorSpace?: 'sRGB' | 'Linear'
}

export interface FrameOptions {
  width: number
  height: number
  pixelRatio: number
  clearColor: RenderColor
}

export interface CameraRenderView {
  scale: number
  offset: Vec2
  position?: Vec2
  rotation?: number
  viewport?: { x: number; y: number; width: number; height: number }
}

export interface RenderOrder {
  sortingLayer: number
  orderInLayer: number
  material: string
  blendMode?: BlendMode2D
}

export interface ShapeRenderCommand extends RenderOrder {
  shape: 'Rectangle' | 'Ellipse' | 'Polygon' | 'Line'
  position: Vec2
  rotation: number
  scale: Vec2
  vertices: Vec2[]
  radiusX: number
  radiusY: number
  fill: RenderColor
  stroke: RenderColor
  strokeWidth: number
  texture?: TextureRegion | null
}

export interface SpriteRenderCommand extends RenderOrder {
  position: Vec2
  rotation: number
  scale: Vec2
  size: Vec2
  pivot: Vec2
  flipX: boolean
  flipY: boolean
  tint: RenderColor
  texture: TextureRegion
  nineSlice?: { left: number; top: number; right: number; bottom: number } | null
  mesh?: { positions: Vec2[]; uvs: Vec2[]; indices: number[] } | null
}

export interface TextRenderCommand extends RenderOrder {
  position: Vec2
  rotation: number
  scale: Vec2
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  lineHeight: number
  align: CanvasTextAlign
  color: RenderColor
  outlineColor: RenderColor
  outlineWidth: number
  maxWidth: number
}

export interface TileChunkRenderCommand extends RenderOrder {
  sprites: Omit<SpriteRenderCommand, keyof RenderOrder>[]
}

export interface RendererStats {
  backend: 'WebGL2' | 'Canvas2D'
  drawCalls: number
  batches: number
  triangles: number
  sprites: number
  shapes: number
  text: number
  textures: number
  gpuMs: number | null
  passes: number
  renderTargets: number
  overdraw: number
  batchBreaks: number
  atlasPages: number
}

export interface Renderer2D {
  readonly stats: RendererStats
  resize(width: number, height: number, pixelRatio: number): void
  beginFrame(options: FrameOptions): void
  beginCamera(camera: CameraRenderView): void
  submitSprite(command: SpriteRenderCommand): void
  submitShape(command: ShapeRenderCommand): void
  submitText(command: TextRenderCommand): void
  submitTileChunk(command: TileChunkRenderCommand): void
  endCamera(): void
  endFrame(): RendererStats
  destroy(): void
}

export const WHITE: RenderColor = { r: 255, g: 255, b: 255, a: 1 }

export function normalizedColor(color: RenderColor): [number, number, number, number] {
  return [
    Math.min(1, Math.max(0, color.r / 255)),
    Math.min(1, Math.max(0, color.g / 255)),
    Math.min(1, Math.max(0, color.b / 255)),
    Math.min(1, Math.max(0, color.a))
  ]
}

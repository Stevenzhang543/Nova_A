/** 二维渲染接口类型：声明绘制命令、相机、纹理及渲染后端之间的数据约定。 */
import type { GpuLightingFrame } from './lighting2dGpu'
import type { RequiredResourceUploadRequest, RequiredResourceUploadSnapshot, RequiredResourceUploadAck } from './requiredResourceUpload'
export type { RequiredResourceUploadRequest, RequiredResourceUploadSnapshot, RequiredResourceUploadAck, RequiredResourceVersion } from './requiredResourceUpload'
import type { Vec2 } from '../world/types'
import type { TextureFilter } from '../runtime/runtimeAssetRecordContracts'
export type { TextureFilter } from '../runtime/runtimeAssetRecordContracts'

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
  /** Changes whenever published pixels change, even at the same source identity and size. */
  revision?: string | number
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
  /** 26.42: normal map region for GPU lighting (same layout as `texture`); ignored by renderers without it. */
  normalMap?: TextureRegion | null
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
  /** Actual backend pipeline choice and number of sprites issued in instanced draws this frame. */
  spriteInstancing?: boolean
  spriteInstanceFallbackReason?: string | null
  instancedSprites?: number
  shapes: number
  text: number
  textures: number
  gpuMs: number | null
  /** CPU time after this frame's drawing API calls; null when drawing was suspended. */
  cpuSubmissionAtMs?: number | null
  /** GPU command completion observed via a fence; never a display/presentation timestamp. */
  gpuCompletionObservedAtMs?: number | null
  gpuCompletedSubmissionId?: number | null
  gpuSubmissionStatus?: 'untracked' | 'submitted' | 'deferred' | 'suspended' | 'sync-failed'
  gpuSubmissionFaultReason?: string | null
  gpuFramesInFlight?: number
  gpuSubmissionCreditLimit?: number
  deviceEpoch?: number
  backingWidth?: number
  backingHeight?: number
  antiAliasingSamples?: number
  antiAliasingLimited?: boolean
  passes: number
  renderTargets: number
  overdraw: number
  batchBreaks: number
  atlasPages: number
  textureMemoryBytes: number
  textureUploads: number
  textureEvictions: number
  textureBudgetBytes: number
  textureBudgetExceeded: boolean
  textureUploadQueue?: number
  textureUploadQueueBytes?: number
  textureUploadDeferrals?: number
  streamingMisses: number
  shaderCompiles: number
  shaderFallbacks: number
  contextLosses: number
  batchBreakReasons: Record<string, number>
  /** 26.42: where this frame's 2D lighting was drawn ('Off' when lighting is disabled) and why the GPU path was not used. */
  /** 26.42 P-E3: the WebGL2 context was created desynchronized (Player opt-in). */
  desynchronized?: boolean
  lightingBackend?: 'WebGL2' | 'Canvas2D' | 'Off'
  lightingFallbackReason?: string | null
  lights?: number
}

export interface Renderer2D {
  readonly stats: RendererStats
  resize(width: number, height: number, pixelRatio: number): void
  /** Legacy untracked fixture compatibility. Runtime/Player production must use tryBeginFrame;
   * remove this entry when direct callers and frozen fixtures migrate to real frame pulses. */
  beginFrame(options: FrameOptions): void
  /** Production owners admit the newest frame without waiting; false retains the previous surface. */
  tryBeginFrame?(options: FrameOptions): boolean
  beginCamera(camera: CameraRenderView): void
  /** Optional GPU preparation; CPU decoding is requested by the scene renderer. */
  preloadTexture?(texture: TextureRegion): void
  /** Revocable WebGL2 texture residency +observed submission-completion lease, not display/HUD FontReady. */
  requestRequiredResourceUpload?(request: RequiredResourceUploadRequest): RequiredResourceUploadSnapshot
  pollRequiredResourceUpload?(requestId: string): RequiredResourceUploadSnapshot | null
  isRequiredResourceUploadCurrent?(ack: RequiredResourceUploadAck): boolean
  cancelRequiredResourceUpload?(requestId: string): boolean
  releaseRequiredResourceUpload?(requestId: string): boolean
  submitSprite(command: SpriteRenderCommand): void
  submitShape(command: ShapeRenderCommand): void
  submitText(command: TextRenderCommand): void
  submitTileChunk(command: TileChunkRenderCommand): void
  endCamera(): void
  /** 26.42 P-D: GPU 2D lighting. `supportsGpuLighting` compiles the light programs once; false keeps Canvas 2D lighting. */
  supportsGpuLighting?(): boolean
  /** Lights for the frame being recorded; drawn and multiplied into the scene inside endFrame. */
  submitLighting?(frame: GpuLightingFrame): void
  endFrame(): RendererStats
  destroy(): void
}

export const WHITE: RenderColor = { r: 255, g: 255, b: 255, a: 1 }

/* 将整数 RGB 与浮点透明度转换为限制在零至一范围内的渲染颜色元组。 */
export function normalizedColor(color: RenderColor): [number, number, number, number] {
  return [
    Math.min(1, Math.max(0, color.r / 255)),
    Math.min(1, Math.max(0, color.g / 255)),
    Math.min(1, Math.max(0, color.b / 255)),
    Math.min(1, Math.max(0, color.a))
  ]
}

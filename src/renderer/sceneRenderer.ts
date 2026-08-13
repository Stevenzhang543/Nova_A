import { resolveAsset, resolveTexture } from '../assets/AssetDatabase'
import { compoundGeometries } from '../world/compoundGeometry'
import type { Connection } from '../world/Connection'
import { Camera2D, ShapeRenderer2D, SpriteRenderer2D, TextRenderer2D, TileMap2D } from '../world/components'
import type { Entity } from '../world/Entity'
import { worldTransform } from '../world/hierarchy'
import type { CameraRenderView, RenderColor, Renderer2D, RendererStats } from './types'
import { tileChunkCommands } from '../runtime/tilemap'
import { particleRuntime } from '../runtime/particles'
import { resolveMaterial } from './materials'
import type { TextureFilter } from './types'
import { deformSkin } from '../runtime/rigging'

export interface SceneRenderOptions {
  width: number
  height: number
  pixelRatio: number
  editorCamera: CameraRenderView
  gameView: boolean
  activeLayer: number
  renderLayer: number | 'all'
  canvasColor: string
  connections: Connection[]
  editorGrid?: { enabled: boolean; step: number; color: string }
}

export interface ActiveCamera {
  entity: Entity
  component: Camera2D
  view: CameraRenderView
  background: RenderColor
}

function byte(value: number): number { return Math.min(255, Math.max(0, Number.isFinite(value) ? value : 0)) }
function rgba(color: { r: number; g: number; b: number }, opacity = 100): RenderColor {
  return { r: byte(color.r), g: byte(color.g), b: byte(color.b), a: Math.min(1, Math.max(0, opacity / 100)) }
}
function parseCssColor(value: string): RenderColor {
  const match = value.match(/rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[, /]+([\d.]+))?\s*\)/i)
  if (match) return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: match[4] === undefined ? 1 : Number(match[4]) }
  const hex = value.trim().replace('#', '')
  if (/^[\da-f]{6}$/i.test(hex)) return { r: Number.parseInt(hex.slice(0, 2), 16), g: Number.parseInt(hex.slice(2, 4), 16), b: Number.parseInt(hex.slice(4, 6), 16), a: 1 }
  return { r: 17, g: 21, b: 27, a: 1 }
}

export function activeGameCameras(entities: Entity[], width: number, height: number): ActiveCamera[] {
  return entities
    .flatMap(entity => {
      const component = entity.camera2D
      if (!entity.enabled || !component?.enabled || component.removed || !component.active) return []
      const transform = worldTransform(entity, entities)
      const viewportHeight = height * component.viewport.height
      const rawScale = viewportHeight / (2 * Math.max(.000001, component.orthographicSize)) * Math.max(.000001, component.zoom)
      const scale = component.pixelPerfect ? Math.max(1, Math.round(rawScale)) : rawScale
      const position = component.pixelPerfect
        ? { x: Math.round(transform.position.x * scale) / scale, y: Math.round(transform.position.y * scale) / scale }
        : { ...transform.position }
      return [{ entity, component, view: { scale, offset: { x: width * .5, y: height * .5 }, position, rotation: transform.rotation, viewport: { ...component.viewport } }, background: rgba(component.backgroundColor) }]
    })
    .sort((first, second) => first.component.priority - second.component.priority || first.component.stackOrder - second.component.stackOrder || first.entity.id - second.entity.id)
}

export function activeGameCamera(entities: Entity[], width: number, height: number): ActiveCamera | null { return activeGameCameras(entities, width, height)[0] ?? null }

function renderState(reference: string, fallbackFilter: TextureFilter) {
  const asset = resolveAsset(reference)
  if (asset?.assetType !== 'material') return { blendMode: 'Alpha' as const, sampling: fallbackFilter }
  const material = resolveMaterial(reference)
  return { blendMode: material.blendMode, sampling: material.sampling }
}

function sortingLayer(entity: Entity): number {
  return entity.getComponent<TileMap2D>('TileMap2D')?.sortingLayer
    ?? entity.spriteRenderer?.sortingLayer ?? entity.textRenderer?.sortingLayer ?? entity.renderer.sortingLayer
}

function visibleWorldBounds(view: CameraRenderView, width: number, height: number) {
  const center = view.position ?? { x: (width * .5 - view.offset.x) / view.scale, y: (view.offset.y - height * .5) / view.scale }
  const halfWidth = width / Math.max(1e-9, view.scale) * .5
  const halfHeight = height / Math.max(1e-9, view.scale) * .5
  const rotation = view.rotation ?? 0
  const extentX = Math.abs(Math.cos(rotation)) * halfWidth + Math.abs(Math.sin(rotation)) * halfHeight
  const extentY = Math.abs(Math.sin(rotation)) * halfWidth + Math.abs(Math.cos(rotation)) * halfHeight
  return { minX: center.x - extentX, maxX: center.x + extentX, minY: center.y - extentY, maxY: center.y + extentY }
}

function submitSprite(renderer: Renderer2D, entity: Entity, sprite: SpriteRenderer2D, entities: Entity[]): void {
  if (!sprite.enabled || sprite.removed || !sprite.spriteAsset) return
  const state = renderState(sprite.material, sprite.filterMode)
  const texture = resolveTexture(sprite.spriteAsset, state.sampling)
  if (!texture) return
  const transform = worldTransform(entity, entities)
  renderer.submitSprite({
    position: transform.position, rotation: transform.rotation, scale: transform.scale,
    size: sprite.size, pivot: sprite.pivot, flipX: sprite.flipX, flipY: sprite.flipY,
    tint: rgba(sprite.tint, sprite.opacity), texture,
    sortingLayer: sprite.sortingLayer, orderInLayer: sprite.orderInLayer,
    material: sprite.material, blendMode: state.blendMode,
    nineSlice: sprite.nineSlice.enabled ? { left: sprite.nineSlice.left, top: sprite.nineSlice.top, right: sprite.nineSlice.right, bottom: sprite.nineSlice.bottom } : null,
    mesh: deformSkin(entity, sprite)
  })
}

function submitText(renderer: Renderer2D, entity: Entity, text: TextRenderer2D, entities: Entity[]): void {
  if (!text.enabled || text.removed || !text.text) return
  const transform = worldTransform(entity, entities)
  const fontAsset = resolveAsset(text.fontAsset)
  renderer.submitText({
    position: transform.position, rotation: transform.rotation, scale: transform.scale,
    text: text.text, fontFamily: fontAsset?.fontFamily || text.fontFamily,
    fontSize: text.fontSize, fontWeight: text.fontWeight, lineHeight: text.lineHeight,
    align: text.align, color: rgba(text.color, text.opacity), maxWidth: text.maxWidth,
    sortingLayer: text.sortingLayer, orderInLayer: text.orderInLayer, material: text.material
  })
}

export function renderWorld(renderer: Renderer2D, entities: Entity[], options: SceneRenderOptions): RendererStats {
  const cameras = options.gameView ? activeGameCameras(entities, options.width, options.height) : []
  const primaryCamera = cameras[0] ?? null
  renderer.beginFrame({
    width: options.width,
    height: options.height,
    pixelRatio: options.pixelRatio,
    clearColor: primaryCamera?.background ?? parseCssColor(options.canvasColor)
  })
  const compounds = compoundGeometries(entities, options.connections)
  const compoundMembers = new Set(compounds.filter(compound => compound.members.length > 1).flatMap(compound => [...compound.memberIds]))
  const passes = options.gameView && cameras.length ? cameras : [{ entity: null, component: null, view: options.editorCamera, background: parseCssColor(options.canvasColor) }]
  for (const camera of passes) {
    renderer.beginCamera(camera.view)
    const visibleBounds = visibleWorldBounds(camera.view, options.width, options.height)
    if (!options.gameView && options.editorGrid?.enabled) submitEditorGrid(renderer, options)
    const near = camera.component?.nearSortingLayer ?? -Infinity
    const far = camera.component?.farSortingLayer ?? Infinity
    const cullingMask = camera.component?.cullingMask ?? 0xffff_ffff
    const visible = entities
      .filter(entity => entity.enabled && (options.gameView || entity.editorVisible))
      .filter(entity => options.gameView || entity.layer === options.activeLayer)
      .filter(entity => options.renderLayer === 'all' || entity.layer === options.renderLayer)
      .filter(entity => (cullingMask & (1 << (entity.layer & 31))) !== 0)
      .filter(entity => sortingLayer(entity) >= near && sortingLayer(entity) <= far)
      .sort((first, second) => sortingLayer(first) - sortingLayer(second) || first.renderer.orderInLayer - second.renderer.orderInLayer || first.id - second.id)
    for (const entity of visible) {
      const tileMap = entity.getComponent<TileMap2D>('TileMap2D')
      if (tileMap) for (const chunk of tileChunkCommands(entity, tileMap, entities, visibleBounds)) renderer.submitTileChunk(chunk)
      const shape = entity.getComponent<ShapeRenderer2D>('ShapeRenderer2D')
      if (shape) {
        const transform = worldTransform(entity, entities)
        const materialState = renderState(shape.material, shape.filterMode)
        renderer.submitShape({
          shape: shape.shape, position: transform.position, rotation: transform.rotation, scale: transform.scale,
          vertices: shape.vertices, radiusX: shape.radiusX, radiusY: shape.radiusY,
          fill: rgba(shape.color, shape.opacity), stroke: rgba(shape.strokeColor, compoundMembers.has(entity.id) ? 0 : shape.strokeOpacity),
          strokeWidth: shape.strokeWidth, texture: resolveTexture(shape.textureAsset, materialState.sampling),
          sortingLayer: shape.sortingLayer, orderInLayer: shape.orderInLayer, material: shape.material, blendMode: materialState.blendMode
        })
      }
      const sprite = entity.getComponent<SpriteRenderer2D>('SpriteRenderer2D')
      if (sprite) submitSprite(renderer, entity, sprite, entities)
      const text = entity.getComponent<TextRenderer2D>('TextRenderer2D')
      if (text) submitText(renderer, entity, text, entities)
    }
    particleRuntime.submit(renderer, visible)
    for (const compound of compounds) {
      if (compound.members.length < 2 || !compound.members.some(member => visible.includes(member))) continue
      const style = compound.members[0].renderer
      for (const segment of compound.boundary) renderer.submitShape({
        shape: 'Line', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, vertices: [segment.start, segment.end], radiusX: 0, radiusY: 0,
        fill: rgba(style.color, 0), stroke: rgba(style.strokeColor, style.strokeOpacity), strokeWidth: style.strokeWidth,
        sortingLayer: style.sortingLayer, orderInLayer: style.orderInLayer + .001, material: style.material
      })
    }
    renderer.endCamera()
  }
  return renderer.endFrame()
}

function submitEditorGrid(renderer: Renderer2D, options: SceneRenderOptions): void {
  const camera = options.editorCamera
  const scale = Math.max(.000001, camera.scale)
  let step = Math.max(.000001, Number.isFinite(options.editorGrid?.step) ? options.editorGrid!.step : 1)
  while (step * scale < 8) step *= 10
  const viewLeft = -camera.offset.x / scale
  const viewRight = viewLeft + options.width / scale
  const viewTop = camera.offset.y / scale
  const viewBottom = viewTop - options.height / scale
  while ((viewRight - viewLeft) / step + (viewTop - viewBottom) / step > 1_024) step *= 10
  const color = parseCssColor(options.editorGrid?.color ?? '#202630')
  const submit = (start: { x: number; y: number }, end: { x: number; y: number }) => renderer.submitShape({
    shape: 'Line', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, vertices: [start, end],
    radiusX: 0, radiusY: 0, fill: { ...color, a: 0 }, stroke: color, strokeWidth: 1 / scale,
    sortingLayer: Number.MIN_SAFE_INTEGER, orderInLayer: 0, material: '__EditorGrid'
  })
  const startX = Math.floor(viewLeft / step) * step
  const startY = Math.floor(viewBottom / step) * step
  for (let x = startX; x <= viewRight; x += step) submit({ x, y: viewBottom }, { x, y: viewTop })
  for (let y = startY; y <= viewTop; y += step) submit({ x: viewLeft, y }, { x: viewRight, y })
}

import { resolveAsset, resolveTexture } from '../assets/AssetDatabase'
import { compoundGeometries } from '../world/compoundGeometry'
import type { Connection } from '../world/Connection'
import { Camera2D, ShapeRenderer2D, SpriteRenderer2D, TextRenderer2D } from '../world/components'
import type { Entity } from '../world/Entity'
import { worldTransform } from '../world/hierarchy'
import type { CameraRenderView, RenderColor, Renderer2D, RendererStats } from './types'

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

export function activeGameCamera(entities: Entity[], width: number, height: number): ActiveCamera | null {
  const entity = entities.find(candidate => candidate.enabled && candidate.camera2D?.enabled && candidate.camera2D.active)
  const component = entity?.camera2D
  if (!entity || !component) return null
  const transform = worldTransform(entity, entities)
  const rawScale = height / (2 * Math.max(.000001, component.orthographicSize)) * Math.max(.000001, component.zoom)
  const scale = component.pixelPerfect ? Math.max(1, Math.round(rawScale)) : rawScale
  return {
    entity,
    component,
    view: {
      scale,
      offset: { x: width * .5, y: height * .5 },
      position: { ...transform.position },
      rotation: transform.rotation,
      viewport: { ...component.viewport }
    },
    background: rgba(component.backgroundColor)
  }
}

function sortingLayer(entity: Entity): number {
  return entity.spriteRenderer?.sortingLayer ?? entity.textRenderer?.sortingLayer ?? entity.renderer.sortingLayer
}

function submitSprite(renderer: Renderer2D, entity: Entity, sprite: SpriteRenderer2D, entities: Entity[]): void {
  if (!sprite.enabled || sprite.removed || !sprite.spriteAsset) return
  const texture = resolveTexture(sprite.spriteAsset, sprite.filterMode)
  if (!texture) return
  const transform = worldTransform(entity, entities)
  renderer.submitSprite({
    position: transform.position, rotation: transform.rotation, scale: transform.scale,
    size: sprite.size, pivot: sprite.pivot, flipX: sprite.flipX, flipY: sprite.flipY,
    tint: rgba(sprite.tint, sprite.opacity), texture,
    sortingLayer: sprite.sortingLayer, orderInLayer: sprite.orderInLayer,
    material: sprite.material
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
  const camera = options.gameView ? activeGameCamera(entities, options.width, options.height) : null
  renderer.beginFrame({
    width: options.width,
    height: options.height,
    pixelRatio: options.pixelRatio,
    clearColor: camera?.background ?? parseCssColor(options.canvasColor)
  })
  renderer.beginCamera(camera?.view ?? options.editorCamera)
  if (!options.gameView && options.editorGrid?.enabled) submitEditorGrid(renderer, options)
  const compounds = compoundGeometries(entities, options.connections)
  const compoundMembers = new Set(compounds.filter(compound => compound.members.length > 1).flatMap(compound => [...compound.memberIds]))
  const near = camera?.component.nearSortingLayer ?? -Infinity
  const far = camera?.component.farSortingLayer ?? Infinity
  const visible = entities
    .filter(entity => entity.enabled && (options.gameView || entity.editorVisible))
    .filter(entity => options.gameView || entity.layer === options.activeLayer)
    .filter(entity => options.renderLayer === 'all' || entity.layer === options.renderLayer)
    .filter(entity => sortingLayer(entity) >= near && sortingLayer(entity) <= far)
    .sort((first, second) => sortingLayer(first) - sortingLayer(second) || first.renderer.orderInLayer - second.renderer.orderInLayer || first.id - second.id)
  for (const entity of visible) {
    const shape = entity.getComponent<ShapeRenderer2D>('ShapeRenderer2D')
    if (shape) {
      const transform = worldTransform(entity, entities)
      renderer.submitShape({
        shape: shape.shape, position: transform.position, rotation: transform.rotation, scale: transform.scale,
        vertices: shape.vertices, radiusX: shape.radiusX, radiusY: shape.radiusY,
        fill: rgba(shape.color, shape.opacity), stroke: rgba(shape.strokeColor, compoundMembers.has(entity.id) ? 0 : shape.strokeOpacity),
        strokeWidth: shape.strokeWidth, texture: resolveTexture(shape.textureAsset, shape.filterMode),
        sortingLayer: shape.sortingLayer, orderInLayer: shape.orderInLayer, material: shape.material
      })
    }
    const sprite = entity.getComponent<SpriteRenderer2D>('SpriteRenderer2D')
    if (sprite) submitSprite(renderer, entity, sprite, entities)
    const text = entity.getComponent<TextRenderer2D>('TextRenderer2D')
    if (text) submitText(renderer, entity, text, entities)
  }
  for (const compound of compounds) {
    if (compound.members.length < 2 || !compound.members.some(member => visible.includes(member))) continue
    const style = compound.members[0].renderer
    for (const segment of compound.boundary) {
      renderer.submitShape({
        shape: 'Line', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 },
        vertices: [segment.start, segment.end], radiusX: 0, radiusY: 0,
        fill: rgba(style.color, 0), stroke: rgba(style.strokeColor, style.strokeOpacity), strokeWidth: style.strokeWidth,
        sortingLayer: style.sortingLayer, orderInLayer: style.orderInLayer + .001, material: style.material
      })
    }
  }
  renderer.endCamera()
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

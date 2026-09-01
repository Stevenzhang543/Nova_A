import { resolveAsset, resolveTexture } from '../assets/AssetDatabase'
import { compoundGeometries } from '../world/compoundGeometry'
import type { Connection } from '../world/Connection'
import { Camera2D, ShapeRenderer2D, SpriteRenderer2D, TextRenderer2D, TileMap2D } from '../world/components'
import type { Entity } from '../world/Entity'
import { worldTransform } from '../world/hierarchy'
import type { CameraRenderView, RenderColor, Renderer2D, RendererStats } from './types'
import { tileChunkCommands } from '../runtime/tilemap'
import { particleRuntime } from '../runtime/particles'
import { canvasMaterialColor, resolveMaterial } from './materials'
import type { TextureFilter } from './types'
import { deformSkin } from '../runtime/rigging'
import { renderingSettings, updateActivePostProcess, updateActiveRenderQuality } from './renderSettings'
import { visibleWorldBounds } from './cameraMath'

export { gameScreenToWorld, visibleWorldBounds } from './cameraMath'

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
  performanceMode?: boolean
}

export interface ActiveCamera {
  entity: Entity
  component: Camera2D
  view: CameraRenderView
  background: RenderColor
}

function byte(value: number): number { return Math.min(255, Math.max(0, Number.isFinite(value) ? value : 0)) }
function finite(value: number, fallback: number): number { return Number.isFinite(value) ? value : fallback }
function safeViewport(viewport: Camera2D['viewport']): Camera2D['viewport'] {
  const x = Math.min(1 - 1e-6, Math.max(0, finite(viewport?.x, 0)))
  const y = Math.min(1 - 1e-6, Math.max(0, finite(viewport?.y, 0)))
  return {
    x, y,
    width: Math.max(.000001, Math.min(1 - x, finite(viewport?.width, 1))),
    height: Math.max(.000001, Math.min(1 - y, finite(viewport?.height, 1)))
  }
}
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

const smoothedCameraPositions = new WeakMap<Camera2D, { x: number; y: number }>()
interface TimelineCameraBlendOverride { fromEntityUuid: string | null; toEntityUuid: string; weight: number }
let timelineCameraBlend: TimelineCameraBlendOverride | null = null
export function setTimelineCameraBlend(value: TimelineCameraBlendOverride | null): void { timelineCameraBlend = value ? { ...value, weight: Math.min(1, Math.max(0, finite(value.weight, 0))) } : null }

export function activeGameCameras(entities: Entity[], width: number, height: number): ActiveCamera[] {
  const safeWidth = Math.max(1, finite(width, 1)), safeHeight = Math.max(1, finite(height, 1))
  return entities
    .flatMap(entity => {
      const component = entity.camera2D
      if (!entity.enabled || !component?.enabled || component.removed || !component.active) return []
      const transform = worldTransform(entity, entities)
      const blendOverride = timelineCameraBlend?.toEntityUuid === entity.uuid ? timelineCameraBlend : null
      const sourceEntity = blendOverride?.fromEntityUuid ? entities.find(candidate => candidate.uuid === blendOverride.fromEntityUuid && candidate.camera2D?.enabled) : null
      const sourceComponent = sourceEntity?.camera2D, sourceTransform = sourceEntity ? worldTransform(sourceEntity, entities) : null, cameraBlendWeight = blendOverride?.weight ?? 1
      const viewport = safeViewport(component.viewport)
      const viewportHeight = safeHeight * viewport.height
      const orthographicSize = finite(sourceComponent ? sourceComponent.orthographicSize + (component.orthographicSize - sourceComponent.orthographicSize) * cameraBlendWeight : component.orthographicSize, 10)
      const zoom = finite(sourceComponent ? sourceComponent.zoom + (component.zoom - sourceComponent.zoom) * cameraBlendWeight : component.zoom, 1)
      const rawScale = viewportHeight / (2 * Math.max(.000001, orthographicSize)) * Math.max(.000001, zoom)
      const pixelPerfect = component.pixelPerfect || renderingSettings.pixelSnap
      const scale = pixelPerfect ? Math.max(1, Math.round(rawScale)) : rawScale
      const followed = component.followTargetUuid ? entities.find(candidate => candidate.uuid === component.followTargetUuid) : null
      let desired = followed ? { ...worldTransform(followed, entities).position } : { ...transform.position }
      desired = { x: finite(desired.x, 0), y: finite(desired.y, 0) }
      if (sourceTransform) desired = { x: sourceTransform.position.x + (desired.x - sourceTransform.position.x) * cameraBlendWeight, y: sourceTransform.position.y + (desired.y - sourceTransform.position.y) * cameraBlendWeight }
      const previous = smoothedCameraPositions.get(component) ?? { ...desired }
      if (component.dragMargins.enabled && followed) {
        const halfHeight = Math.max(.000001, finite(component.orthographicSize, 10)), halfWidth = halfHeight * safeWidth / safeHeight
        const minX = previous.x - halfWidth * (1 - component.dragMargins.left), maxX = previous.x + halfWidth * (1 - component.dragMargins.right)
        const minY = previous.y - halfHeight * (1 - component.dragMargins.bottom), maxY = previous.y + halfHeight * (1 - component.dragMargins.top)
        desired = { x: desired.x < minX ? previous.x + desired.x - minX : desired.x > maxX ? previous.x + desired.x - maxX : previous.x, y: desired.y < minY ? previous.y + desired.y - minY : desired.y > maxY ? previous.y + desired.y - maxY : previous.y }
      }
      if (component.limits.enabled) desired = { x: Math.min(finite(component.limits.right, desired.x), Math.max(finite(component.limits.left, desired.x), desired.x)), y: Math.min(finite(component.limits.top, desired.y), Math.max(finite(component.limits.bottom, desired.y), desired.y)) }
      const blend = component.smoothing.enabled ? 1 - Math.exp(-Math.max(0, finite(component.smoothing.speed, 0)) / 60) : 1
      const smoothed = { x: previous.x + (desired.x - previous.x) * blend, y: previous.y + (desired.y - previous.y) * blend }
      smoothedCameraPositions.set(component, smoothed)
      const position = pixelPerfect
        ? { x: Math.round(smoothed.x * scale) / scale, y: Math.round(smoothed.y * scale) / scale }
        : smoothed
      const rotation = finite(sourceTransform ? sourceTransform.rotation + (transform.rotation - sourceTransform.rotation) * cameraBlendWeight : transform.rotation, 0)
      const background = sourceComponent ? { r: sourceComponent.backgroundColor.r + (component.backgroundColor.r - sourceComponent.backgroundColor.r) * cameraBlendWeight, g: sourceComponent.backgroundColor.g + (component.backgroundColor.g - sourceComponent.backgroundColor.g) * cameraBlendWeight, b: sourceComponent.backgroundColor.b + (component.backgroundColor.b - sourceComponent.backgroundColor.b) * cameraBlendWeight } : component.backgroundColor
      return [{ entity, component, view: { scale, offset: { x: safeWidth * .5, y: safeHeight * .5 }, position, rotation, viewport }, background: rgba(background) }]
    })
    .sort((first, second) => first.component.priority - second.component.priority || first.component.stackOrder - second.component.stackOrder || first.entity.id - second.entity.id)
}

export function activeGameCamera(entities: Entity[], width: number, height: number): ActiveCamera | null { return activeGameCameras(entities, width, height)[0] ?? null }

function renderState(reference: string, fallbackFilter: TextureFilter) {
  const asset = resolveAsset(reference)
  if (asset?.assetType !== 'material') return { blendMode: 'Alpha' as const, sampling: fallbackFilter, material: null }
  const material = resolveMaterial(reference)
  return { blendMode: material.blendMode, sampling: material.sampling, material }
}

function sortingLayer(entity: Entity): number {
  return entity.getComponent<TileMap2D>('TileMap2D')?.sortingLayer
    ?? entity.spriteRenderer?.sortingLayer ?? entity.textRenderer?.sortingLayer ?? entity.renderer.sortingLayer
}

function ancestorParallax(entity: Entity, entities: Entity[]): Entity | null {
  let current: Entity | undefined = entity
  const visited = new Set<string>()
  while (current && !visited.has(current.uuid)) { visited.add(current.uuid); if (current.authoring.kind === 'ParallaxLayer') return current; current = current.parentUuid ? entities.find(candidate => candidate.uuid === current!.parentUuid) : undefined }
  return null
}

function authoringPosition(entity: Entity, position: { x: number; y: number }, entities: Entity[], view: CameraRenderView): { x: number; y: number } {
  let current: Entity | undefined = entity, canvasLayer: Entity | undefined, parallaxLayer: Entity | undefined
  const visited = new Set<string>()
  while (current && !visited.has(current.uuid)) {
    visited.add(current.uuid)
    if (!canvasLayer && current.authoring.kind === 'CanvasLayer') canvasLayer = current
    if (!parallaxLayer && current.authoring.kind === 'ParallaxLayer') parallaxLayer = current
    current = current.parentUuid ? entities.find(candidate => candidate.uuid === current!.parentUuid) : undefined
  }
  const cameraPosition = view.position ?? { x: 0, y: 0 }
  if (canvasLayer?.authoring.canvasLayer.screenSpace) return { x: position.x + cameraPosition.x, y: position.y + cameraPosition.y }
  if (parallaxLayer) return { x: position.x + cameraPosition.x * (1 - parallaxLayer.authoring.parallax.motionScale.x), y: position.y + cameraPosition.y * (1 - parallaxLayer.authoring.parallax.motionScale.y) }
  return position
}
function authoredOrder(entity: Entity, base: number, entities: Entity[]): number { return base + entity.authoring.zOrder + (entity.authoring.sortMode === 'YSort' ? -worldTransform(entity, entities).position.y * .000001 : 0) }

function cssFontFamily(value: string): string {
  const family = value.trim()
  if (!family) return ''
  if (/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace)$/i.test(family)) return family
  return `"${family.replace(/["\\]/g, '')}"`
}

function submitSprite(renderer: Renderer2D, entity: Entity, sprite: SpriteRenderer2D, entities: Entity[], view: CameraRenderView): void {
  if (!sprite.enabled || sprite.removed || !sprite.spriteAsset) return
  const state = renderState(sprite.material, sprite.filterMode)
  const texture = resolveTexture(sprite.spriteAsset, state.sampling)
  if (!texture) return
  const transform = worldTransform(entity, entities)
  const base = authoringPosition(entity, transform.position, entities, view), parallaxLayer = ancestorParallax(entity, entities), parallax = parallaxLayer?.authoring.parallax
  const repeatX = parallax && parallax.repeat.x > 0 ? [-1, 0, 1] : [0], repeatY = parallax && parallax.repeat.y > 0 ? [-1, 0, 1] : [0]
  for (const y of repeatY) for (const x of repeatX) {
    const mirrored = parallax?.mirror === true && Math.abs(x + y) % 2 === 1
    renderer.submitSprite({
      position: { x: base.x + x * (parallax?.repeat.x ?? 0), y: base.y + y * (parallax?.repeat.y ?? 0) }, rotation: transform.rotation, scale: transform.scale,
      size: sprite.size, pivot: sprite.pivot, flipX: mirrored ? !sprite.flipX : sprite.flipX, flipY: sprite.flipY,
      tint: renderer.stats.backend === 'Canvas2D' && state.material ? canvasMaterialColor(state.material, rgba(sprite.tint, sprite.opacity)) : rgba(sprite.tint, sprite.opacity), texture,
      sortingLayer: sprite.sortingLayer, orderInLayer: authoredOrder(entity, sprite.orderInLayer, entities) + (parallax?.depth ?? 0) * .000001,
      material: sprite.material, blendMode: state.blendMode,
      nineSlice: sprite.nineSlice.enabled ? { left: sprite.nineSlice.left, top: sprite.nineSlice.top, right: sprite.nineSlice.right, bottom: sprite.nineSlice.bottom } : null,
      mesh: deformSkin(entity, sprite)
    })
  }
}

function renderedPathVertices(entity: Entity): Array<{ x: number; y: number }> {
  const path = entity.authoring.path, points = path.points.length ? path.points : entity.renderer.vertices
  if (entity.authoring.kind !== 'Path' || points.length < 2 || path.smoothing <= 0) return entity.renderer.vertices
  const result: Array<{ x: number; y: number }> = [], segmentCount = path.closed ? points.length : points.length - 1, steps = Math.max(3, Math.round(3 + path.smoothing * 21))
  for (let index = 0; index < segmentCount; index++) {
    const nextIndex = (index + 1) % points.length, p0 = points[index], p3 = points[nextIndex]
    const previous = points[(index - 1 + points.length) % points.length], following = points[(nextIndex + 1) % points.length]
    const automaticOut = { x: (p3.x - previous.x) * path.smoothing / 6, y: (p3.y - previous.y) * path.smoothing / 6 }, automaticIn = { x: (p0.x - following.x) * path.smoothing / 6, y: (p0.y - following.y) * path.smoothing / 6 }
    const outgoing = path.tangents[index]?.outgoing ?? automaticOut, incoming = path.tangents[nextIndex]?.incoming ?? automaticIn
    const p1 = { x: p0.x + outgoing.x, y: p0.y + outgoing.y }, p2 = { x: p3.x + incoming.x, y: p3.y + incoming.y }
    for (let step = index ? 1 : 0; step <= steps; step++) { const t = step / steps, inverse = 1 - t; result.push({ x: inverse ** 3 * p0.x + 3 * inverse ** 2 * t * p1.x + 3 * inverse * t ** 2 * p2.x + t ** 3 * p3.x, y: inverse ** 3 * p0.y + 3 * inverse ** 2 * t * p1.y + 3 * inverse * t ** 2 * p2.y + t ** 3 * p3.y }) }
  }
  return result
}

function submitText(renderer: Renderer2D, entity: Entity, text: TextRenderer2D, entities: Entity[], view: CameraRenderView): void {
  if (!text.enabled || text.removed || !text.text) return
  const transform = worldTransform(entity, entities)
  const fontAsset = resolveAsset(text.fontAsset)
  const importedFont = fontAsset?.assetType === 'font' ? fontAsset : null
  const fallbacks = importedFont?.settings.fontSettings.fallbackFamilies.map(cssFontFamily).filter(Boolean) ?? []
  const primaryFamily = cssFontFamily(importedFont?.fontFamily || text.fontFamily) || 'sans-serif'
  const outlineWidth = importedFont?.settings.fontSettings.outlineWidth ?? 0
  renderer.submitText({
    position: authoringPosition(entity, transform.position, entities, view), rotation: transform.rotation, scale: transform.scale,
    text: text.text, fontFamily: [primaryFamily, ...fallbacks].join(', '),
    fontSize: text.fontSize, fontWeight: text.fontWeight, lineHeight: text.lineHeight,
    align: text.align, color: rgba(text.color, text.opacity), outlineColor: { r: 0, g: 0, b: 0, a: outlineWidth > 0 ? text.opacity / 100 : 0 }, outlineWidth, maxWidth: text.maxWidth,
    sortingLayer: text.sortingLayer, orderInLayer: authoredOrder(entity, text.orderInLayer, entities), material: text.material
  })
}

export function renderWorld(renderer: Renderer2D, entities: Entity[], options: SceneRenderOptions): RendererStats {
  const cameras = options.gameView ? activeGameCameras(entities, options.width, options.height) : []
  const primaryCamera = cameras[0] ?? null
  const qualityPosition = primaryCamera?.view.position ?? options.editorCamera.position ?? { x: 0, y: 0 }
  updateActivePostProcess(qualityPosition)
  updateActiveRenderQuality(qualityPosition)
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
      .filter(entity => entity.enabled && entity.authoring.visible && (options.gameView || entity.editorVisible))
      .filter(entity => options.gameView || entity.layer === options.activeLayer)
      .filter(entity => options.renderLayer === 'all' || entity.layer === options.renderLayer)
      .filter(entity => (cullingMask & (1 << (entity.layer & 31))) !== 0)
      .filter(entity => sortingLayer(entity) >= near && sortingLayer(entity) <= far)
      .filter(entity => {
        if (!options.performanceMode) return true
        const position = worldTransform(entity, entities).position
        const margin = 4
        return position.x >= visibleBounds.minX - margin && position.x <= visibleBounds.maxX + margin && position.y >= visibleBounds.minY - margin && position.y <= visibleBounds.maxY + margin
      })
      .sort((first, second) => sortingLayer(first) - sortingLayer(second) || authoredOrder(first, first.renderer.orderInLayer, entities) - authoredOrder(second, second.renderer.orderInLayer, entities) || first.id - second.id)
    for (const entity of visible) {
      const tileMap = entity.getComponent<TileMap2D>('TileMap2D')
      if (tileMap) for (const chunk of tileChunkCommands(entity, tileMap, entities, visibleBounds, camera.view.position)) renderer.submitTileChunk(chunk)
      const shape = entity.getComponent<ShapeRenderer2D>('ShapeRenderer2D')
      if (shape) {
        const transform = worldTransform(entity, entities)
        const materialState = renderState(shape.material, shape.filterMode)
        renderer.submitShape({
          shape: shape.shape, position: authoringPosition(entity, transform.position, entities, camera.view), rotation: transform.rotation, scale: transform.scale,
          vertices: renderedPathVertices(entity), radiusX: shape.radiusX, radiusY: shape.radiusY,
          fill: renderer.stats.backend === 'Canvas2D' && materialState.material ? canvasMaterialColor(materialState.material, rgba(shape.color, shape.opacity)) : rgba(shape.color, shape.opacity), stroke: rgba(shape.strokeColor, compoundMembers.has(entity.id) ? 0 : shape.strokeOpacity),
          strokeWidth: shape.strokeWidth, texture: resolveTexture(shape.textureAsset, materialState.sampling),
          sortingLayer: shape.sortingLayer, orderInLayer: authoredOrder(entity, shape.orderInLayer, entities), material: shape.material, blendMode: materialState.blendMode
        })
      }
      const sprite = entity.getComponent<SpriteRenderer2D>('SpriteRenderer2D')
      if (sprite) submitSprite(renderer, entity, sprite, entities, camera.view)
      const text = entity.getComponent<TextRenderer2D>('TextRenderer2D')
      if (text) submitText(renderer, entity, text, entities, camera.view)
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

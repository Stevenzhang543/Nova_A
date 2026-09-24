/** 场景绘制编排：把当前场景、相机及可绘制组件转换为渲染后端提交的绘制命令。 */
import { resolveAsset, resolveTexture } from '../assets/AssetDatabase'
import { compoundGeometries } from '../world/compoundGeometry'
import type { Connection } from '../world/Connection'
import { Camera2D, ParticleEmitter2D, ShapeRenderer2D, SpriteRenderer2D, TextRenderer2D, TileMap2D } from '../world/components'
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
  /** One explicit clock advance; camera queries and lighting never advance it. */
  deltaSeconds?: number
}

export interface ActiveCamera {
  entity: Entity
  component: Camera2D
  view: CameraRenderView
  background: RenderColor
}

/* 调用 Math.min(255, Math.max(0, Number.isFinite(value) ? value : 0)) 并返回调用结果。 */ function byte(value: number): number { return Math.min(255, Math.max(0, Number.isFinite(value) ? value : 0)) }
/* 根据 Number.isFinite(value) 的真假，分别返回 value 或 fallback。 */ function finite(value: number, fallback: number): number { return Number.isFinite(value) ? value : fallback }
/* 将相机视口限制到有效的归一化矩形，异常数值使用默认值。 */
function safeViewport(viewport: Camera2D['viewport']): Camera2D['viewport'] {
  const x = Math.min(1 - 1e-6, Math.max(0, finite(viewport?.x, 0)))
  const y = Math.min(1 - 1e-6, Math.max(0, finite(viewport?.y, 0)))
  return {
    x, y,
    width: Math.max(.000001, Math.min(1 - x, finite(viewport?.width, 1))),
    height: Math.max(.000001, Math.min(1 - y, finite(viewport?.height, 1)))
  }
}
/* 返回具有所列字段的新对象 { r: byte(color.r), g: byte(color.g), b: byte(color.b), a: Math.min(1, Math.max(0, opacity / 100)) }。 */ function rgba(color: { r: number; g: number; b: number }, opacity = 100): RenderColor {
  return { r: byte(color.r), g: byte(color.g), b: byte(color.b), a: Math.min(1, Math.max(0, opacity / 100)) }
}
/* 解析 rgb/rgba 或六位十六进制颜色，无法识别时使用默认背景色。 */
function parseCssColor(value: string): RenderColor {
  const match = value.match(/rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[, /]+([\d.]+))?\s*\)/i)
  if (match) return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: match[4] === undefined ? 1 : Number(match[4]) }
  const hex = value.trim().replace('#', '')
  if (/^[\da-f]{6}$/i.test(hex)) return { r: Number.parseInt(hex.slice(0, 2), 16), g: Number.parseInt(hex.slice(2, 4), 16), b: Number.parseInt(hex.slice(4, 6), 16), a: 1 }
  return { r: 17, g: 21, b: 27, a: 1 }
}

let smoothedCameraPositions = new WeakMap<Camera2D, { x: number; y: number }>()
/** 将 new WeakMap() 赋给 smoothedCameraPositions，不显式返回值。 */ export function resetCameraSmoothing(): void { smoothedCameraPositions = new WeakMap() }
interface TimelineCameraBlendOverride { fromEntityUuid: string | null; toEntityUuid: string; weight: number }
let timelineCameraBlend: TimelineCameraBlendOverride | null = null
/** 将 value ? { ...value, weight: Math.min(1, Math.max(0, finite(value.weight, 0))) } : null 赋给 timelineCameraBlend，不显式返回值。 */ export function setTimelineCameraBlend(value: TimelineCameraBlendOverride | null): void { timelineCameraBlend = value ? { ...value, weight: Math.min(1, Math.max(0, finite(value.weight, 0))) } : null }

/* 收集活动游戏相机，计算跟随与时间轴混合后的视图，并按优先级稳定排序。 */
export function activeGameCameras(entities: Entity[], width: number, height: number, deltaSeconds?: number): ActiveCamera[] {
  const safeWidth = Math.max(1, finite(width, 1)), safeHeight = Math.max(1, finite(height, 1))
  return entities
    .flatMap(/* 从有效相机实体生成经过跟随、混合和视口校正的渲染视图。 */ entity => {
      const component = entity.camera2D
      if (!entity.enabled || !component?.enabled || component.removed || !component.active) return []
      const transform = worldTransform(entity, entities)
      const blendOverride = timelineCameraBlend?.toEntityUuid === entity.uuid ? timelineCameraBlend : null
      const sourceEntity = blendOverride?.fromEntityUuid ? entities.find(/* 先计算 candidate.uuid === blendOverride.fromEntityUuid；仅当其为真值时求右侧 candidate.camera2D?.enabled，返回短路求值结果。 */ candidate => candidate.uuid === blendOverride.fromEntityUuid && candidate.camera2D?.enabled) : null
      const sourceComponent = sourceEntity?.camera2D, sourceTransform = sourceEntity ? worldTransform(sourceEntity, entities) : null, cameraBlendWeight = blendOverride?.weight ?? 1
      const viewport = safeViewport(component.viewport)
      const viewportHeight = safeHeight * viewport.height
      const orthographicSize = finite(sourceComponent ? sourceComponent.orthographicSize + (component.orthographicSize - sourceComponent.orthographicSize) * cameraBlendWeight : component.orthographicSize, 10)
      const zoom = finite(sourceComponent ? sourceComponent.zoom + (component.zoom - sourceComponent.zoom) * cameraBlendWeight : component.zoom, 1)
      const rawScale = viewportHeight / (2 * Math.max(.000001, orthographicSize)) * Math.max(.000001, zoom)
      const pixelPerfect = component.pixelPerfect || renderingSettings.pixelSnap
      const scale = pixelPerfect ? Math.max(1, Math.round(rawScale)) : rawScale
      const followed = component.followTargetUuid ? entities.find(/* 比较 candidate.uuid 与 component.followTargetUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === component.followTargetUuid) : null
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
      const blend = component.smoothing.enabled ? 1 - Math.exp(-Math.max(0, finite(component.smoothing.speed, 0)) * Math.max(0, finite(deltaSeconds ?? 0, 0))) : 1
      const smoothed = deltaSeconds === undefined ? previous : { x: previous.x + (desired.x - previous.x) * blend, y: previous.y + (desired.y - previous.y) * blend }
      if (deltaSeconds !== undefined) smoothedCameraPositions.set(component, smoothed)
      const position = pixelPerfect
        ? { x: Math.round(smoothed.x * scale) / scale, y: Math.round(smoothed.y * scale) / scale }
        : smoothed
      const rotation = finite(sourceTransform ? sourceTransform.rotation + (transform.rotation - sourceTransform.rotation) * cameraBlendWeight : transform.rotation, 0)
      const background = sourceComponent ? { r: sourceComponent.backgroundColor.r + (component.backgroundColor.r - sourceComponent.backgroundColor.r) * cameraBlendWeight, g: sourceComponent.backgroundColor.g + (component.backgroundColor.g - sourceComponent.backgroundColor.g) * cameraBlendWeight, b: sourceComponent.backgroundColor.b + (component.backgroundColor.b - sourceComponent.backgroundColor.b) * cameraBlendWeight } : component.backgroundColor
      return [{ entity, component, view: { scale, offset: { x: safeWidth * .5, y: safeHeight * .5 }, position, rotation, viewport }, background: rgba(background) }]
    })
    .sort(/* 依次比较相机优先级、堆叠顺序及实体编号。 */ (first, second) => first.component.priority - second.component.priority || first.component.stackOrder - second.component.stackOrder || first.entity.id - second.entity.id)
}

/* 当 activeGameCameras(entities, width, height)[0] 为 null 或 undefined 时返回 null，否则保留左侧值。 */ export function activeGameCamera(entities: Entity[], width: number, height: number): ActiveCamera | null { return activeGameCameras(entities, width, height)[0] ?? null }

/* 解析材质的混合与采样设置，非材质引用保留默认混合和回退采样。 */
function renderState(reference: string, fallbackFilter: TextureFilter) {
  const asset = resolveAsset(reference)
  if (asset?.assetType !== 'material') return { blendMode: 'Alpha' as const, sampling: fallbackFilter, material: null }
  const material = resolveMaterial(reference)
  return { blendMode: material.blendMode, sampling: material.sampling, material }
}

/* 从瓦片、精灵、文本或基础渲染器中取得实体排序层。 */
function sortingLayer(entity: Entity): number {
  return entity.getComponent<TileMap2D>('TileMap2D')?.sortingLayer
    ?? entity.spriteRenderer?.sortingLayer ?? entity.textRenderer?.sortingLayer ?? entity.renderer.sortingLayer
}

/* 沿父链查找最近视差层，并通过访问集合避免循环遍历。 */
function ancestorParallax(entity: Entity, entities: Entity[]): Entity | null {
  let current: Entity | undefined = entity
  const visited = new Set<string>()
  while (current && !visited.has(current.uuid)) { visited.add(current.uuid); if (current.authoring.kind === 'ParallaxLayer') return current; current = current.parentUuid ? entities.find(/* 比较 candidate.uuid 与 current!.parentUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === current!.parentUuid) : undefined }
  return null
}

/* 沿祖先层解析屏幕空间或视差偏移，将实体位置调整到当前相机视图。 */
function authoringPosition(entity: Entity, position: { x: number; y: number }, entities: Entity[], view: CameraRenderView): { x: number; y: number } {
  let current: Entity | undefined = entity, canvasLayer: Entity | undefined, parallaxLayer: Entity | undefined
  const visited = new Set<string>()
  while (current && !visited.has(current.uuid)) {
    visited.add(current.uuid)
    if (!canvasLayer && current.authoring.kind === 'CanvasLayer') canvasLayer = current
    if (!parallaxLayer && current.authoring.kind === 'ParallaxLayer') parallaxLayer = current
    current = current.parentUuid ? entities.find(/* 比较 candidate.uuid 与 current!.parentUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === current!.parentUuid) : undefined
  }
  const cameraPosition = view.position ?? { x: 0, y: 0 }
  if (canvasLayer?.authoring.canvasLayer.screenSpace) return { x: position.x + cameraPosition.x, y: position.y + cameraPosition.y }
  if (parallaxLayer) return { x: position.x + cameraPosition.x * (1 - parallaxLayer.authoring.parallax.motionScale.x), y: position.y + cameraPosition.y * (1 - parallaxLayer.authoring.parallax.motionScale.y) }
  return position
}
/* 组合层内次序、作者指定深度与可选 Y 排序偏移。 */
function authoredOrder(entity: Entity, base: number, entities: Entity[]): number { return base + entity.authoring.zOrder + (entity.authoring.sortMode === 'YSort' ? -worldTransform(entity, entities).position.y * .000001 : 0) }

/* 保留标准 CSS 字体族，其余字体名清洗引号和反斜杠后加引号。 */
function cssFontFamily(value: string): string {
  const family = value.trim()
  if (!family) return ''
  if (/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace)$/i.test(family)) return family
  return `"${family.replace(/["\\]/g, '')}"`
}

/* 解析精灵资源并提交含视差重复、翻转、蒙皮及九宫格设置的绘制命令。 */
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

/* 按路径平滑度和显式或自动切线采样三次贝塞尔曲线，生成绘制顶点。 */
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

/* 解析导入字体及回退字体，提交包含描边、对齐和作者层级的文本命令。 */
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

/** Expand the existing camera culling rectangle for texture preparation only. */
/* 按受限预加载倍率扩大相机可见区域，并保留基础边界余量。 */
export function texturePreloadBounds(bounds: ReturnType<typeof visibleWorldBounds>, margin: number) {
  const factor = Math.min(8, Math.max(1, finite(margin, 1.5))), centerX = (bounds.minX + bounds.maxX) / 2, centerY = (bounds.minY + bounds.maxY) / 2
  const halfWidth = ((bounds.maxX - bounds.minX) / 2 + 4) * factor, halfHeight = ((bounds.maxY - bounds.minY) / 2 + 4) * factor
  return { minX: centerX - halfWidth, maxX: centerX + halfWidth, minY: centerY - halfHeight, maxY: centerY + halfHeight }
}

/* 逐相机提交世界绘制命令、更新质量并执行视域裁剪，在帧末处理纹理预加载任务。 */
export function renderWorld(renderer: Renderer2D, entities: Entity[], options: SceneRenderOptions): RendererStats {
  const cameras = options.gameView ? activeGameCameras(entities, options.width, options.height, options.deltaSeconds ?? 0) : []
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
  const compoundMembers = new Set(compounds.filter(/* 比较 compound.members.length 与 1，返回大于的判断结果。 */ compound => compound.members.length > 1).flatMap(/* 返回按声明顺序构造的数组 [...compound.memberIds]。 */ compound => [...compound.memberIds]))
  const passes = options.gameView && cameras.length ? cameras : [{ entity: null, component: null, view: options.editorCamera, background: parseCssColor(options.canvasColor) }]
  const preloadJobs: Array<() => void> = [], requestedTextures = new Set<string>()
  let preparedTileTextures = 0
  const requestTexture = /* 对有限数量的纹理引用去重，解析后提交可选预加载请求。 */ (reference: string | null | undefined, filter?: TextureFilter) => {
    if (!reference || requestedTextures.has(reference) || requestedTextures.size >= 256) return
    requestedTextures.add(reference)
    const texture = resolveTexture(reference, filter); if (texture) renderer.preloadTexture?.(texture)
  }
  for (const camera of passes) {
    renderer.beginCamera(camera.view)
    const visibleBounds = visibleWorldBounds(camera.view, options.width, options.height)
    if (!options.gameView && options.editorGrid?.enabled) submitEditorGrid(renderer, options)
    const near = camera.component?.nearSortingLayer ?? -Infinity
    const far = camera.component?.farSortingLayer ?? Infinity
    const cullingMask = camera.component?.cullingMask ?? 0xffff_ffff
    const candidates = entities
      .filter(/* 先计算 entity.enabled && entity.authoring.visible；仅当其为真值时求右侧 (options.gameView || entity.editorVisible)，返回短路求值结果。 */ entity => entity.enabled && entity.authoring.visible && (options.gameView || entity.editorVisible))
      .filter(/* 先计算 options.gameView；仅当其为假值时求右侧 entity.layer === options.activeLayer，返回短路求值结果。 */ entity => options.gameView || entity.layer === options.activeLayer)
      .filter(/* 先计算 options.renderLayer === 'all'；仅当其为假值时求右侧 entity.layer === options.renderLayer，返回短路求值结果。 */ entity => options.renderLayer === 'all' || entity.layer === options.renderLayer)
      .filter(/* 比较 (cullingMask & (1 << (entity.layer & 31))) 与 0，返回严格不等的判断结果。 */ entity => (cullingMask & (1 << (entity.layer & 31))) !== 0)
      .filter(/* 先计算 sortingLayer(entity) >= near；仅当其为真值时求右侧 sortingLayer(entity) <= far，返回短路求值结果。 */ entity => sortingLayer(entity) >= near && sortingLayer(entity) <= far)
    const visible = candidates.filter(/* 在性能模式下按带余量的可见范围筛选实体位置，其余模式保留实体。 */ entity => {
        if (!options.performanceMode) return true
        const position = worldTransform(entity, entities).position
        const margin = 4
        return position.x >= visibleBounds.minX - margin && position.x <= visibleBounds.maxX + margin && position.y >= visibleBounds.minY - margin && position.y <= visibleBounds.maxY + margin
      })
      .sort(/* 依次比较实体排序层、作者层内次序及实体编号。 */ (first, second) => sortingLayer(first) - sortingLayer(second) || authoredOrder(first, first.renderer.orderInLayer, entities) - authoredOrder(second, second.renderer.orderInLayer, entities) || first.id - second.id)
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
      if (compound.members.length < 2 || !compound.members.some(/* 调用 visible.includes(member) 并返回调用结果。 */ member => visible.includes(member))) continue
      const style = compound.members[0].renderer
      for (const segment of compound.boundary) renderer.submitShape({
        shape: 'Line', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, vertices: [segment.start, segment.end], radiusX: 0, radiusY: 0,
        fill: rgba(style.color, 0), stroke: rgba(style.strokeColor, style.strokeOpacity), strokeWidth: style.strokeWidth,
        sortingLayer: style.sortingLayer, orderInLayer: style.orderInLayer + .001, material: style.material
      })
    }
    renderer.endCamera()
    if (renderingSettings.textureStreaming.enabled && options.performanceMode) {
      const bounds = texturePreloadBounds(visibleBounds, renderingSettings.textureStreaming.preloadMargin), drawn = new Set(visible)
      for (const entity of candidates) {
        if (preloadJobs.length >= 256) break
        if (drawn.has(entity)) continue
        const position = worldTransform(entity, entities).position
        if (position.x < bounds.minX || position.x > bounds.maxX || position.y < bounds.minY || position.y > bounds.maxY) continue
        preloadJobs.push(/* 预加载实体精灵、形状、粒子及相关材质使用的纹理。 */ () => {
          const sprite = entity.spriteRenderer, shape = entity.getComponent<ShapeRenderer2D>('ShapeRenderer2D'), particles = entity.getComponent<ParticleEmitter2D>('ParticleEmitter2D')
          if (sprite?.enabled) { requestTexture(sprite.spriteAsset, sprite.filterMode); requestTexture(sprite.normalMapAsset, sprite.filterMode) }
          if (shape?.enabled) requestTexture(shape.textureAsset, shape.filterMode)
          if (particles?.enabled) requestTexture(particles.textureAsset)
          for (const reference of [sprite?.material, shape?.material, particles?.material]) if (reference && reference !== 'Default') for (const texture of Object.values(resolveMaterial(reference).textures)) requestTexture(texture)
        })
        if (preloadJobs.length >= 256) break
      }
      for (const entity of visible) {
        const tileMap = entity.getComponent<TileMap2D>('TileMap2D')
        if (!tileMap?.enabled || preloadJobs.length >= 256) continue
        preloadJobs.push(/* 在瓦片纹理数量预算内遍历预加载块并提交纹理请求。 */ () => { if (preparedTileTextures >= 256) return; for (const chunk of tileChunkCommands(entity, tileMap, entities, bounds, camera.view.position)) for (const sprite of chunk.sprites) { renderer.preloadTexture?.(sprite.texture); if (++preparedTileTextures >= 256) return } })
      }
    }
  }
  const stats = renderer.endFrame()
  for (const preload of preloadJobs) preload()
  return { ...stats, textureUploadQueue: renderer.stats.textureUploadQueue, textureUploadQueueBytes: renderer.stats.textureUploadQueueBytes, textureUploadDeferrals: renderer.stats.textureUploadDeferrals }
}

/* 根据缩放调整网格间距，在数量上限内提交固定屏幕线宽的编辑网格。 */
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
  const submit = /* 提交最低排序层的网格线命令，使网格绘制在场景对象下方。 */ (start: { x: number; y: number }, end: { x: number; y: number }) => renderer.submitShape({
    shape: 'Line', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, vertices: [start, end],
    radiusX: 0, radiusY: 0, fill: { ...color, a: 0 }, stroke: color, strokeWidth: 1 / scale,
    sortingLayer: Number.MIN_SAFE_INTEGER, orderInLayer: 0, material: '__EditorGrid'
  })
  const startX = Math.floor(viewLeft / step) * step
  const startY = Math.floor(viewBottom / step) * step
  for (let x = startX; x <= viewRight; x += step) submit({ x, y: viewBottom }, { x, y: viewTop })
  for (let y = startY; y <= viewTop; y += step) submit({ x: viewLeft, y }, { x: viewRight, y })
}

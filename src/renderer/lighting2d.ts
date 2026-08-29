import { entityBoundaryPoints } from '../world/Connection'
import { resolveTexture } from '../assets/AssetDatabase'
import { Light2D, ShadowCaster2D } from '../world/components'
import type { Entity } from '../world/Entity'
import { worldTransform } from '../world/hierarchy'
import type { Vec2 } from '../world/types'
import { activeGameCamera, activeGameCameras } from './sceneRenderer'
import { activePostProcessing, renderingSettings } from './renderSettings'
import type { CameraRenderView } from './types'

const normalResponseCache = new Map<string, HTMLCanvasElement>()

interface LightingOptions {
  width: number
  height: number
  editorCamera: CameraRenderView
  gameView: boolean
  activeLayer: number
}

function cameraFor(entities: Entity[], options: LightingOptions): CameraRenderView {
  return options.gameView
    ? activeGameCamera(entities, options.width, options.height)?.view ?? options.editorCamera
    : options.editorCamera
}

function worldToScreen(point: Vec2, camera: CameraRenderView, width: number, height: number): Vec2 {
  if (!camera.position) return { x: point.x * camera.scale + camera.offset.x, y: camera.offset.y - point.y * camera.scale }
  const viewport = camera.viewport ?? { x: 0, y: 0, width: 1, height: 1 }
  const viewportX = viewport.x * width, viewportY = (1 - viewport.y - viewport.height) * height
  const relative = { x: point.x - camera.position.x, y: point.y - camera.position.y }
  const angle = camera.rotation ?? 0, cosine = Math.cos(angle), sine = Math.sin(angle)
  const view = { x: relative.x * cosine + relative.y * sine, y: -relative.x * sine + relative.y * cosine }
  return { x: viewportX + viewport.width * width * .5 + view.x * camera.scale, y: viewportY + viewport.height * height * .5 - view.y * camera.scale }
}

function layerBit(layer: number): number { return (1 << (layer & 31)) >>> 0 }

function compatibleTargets(entities: Entity[], lightEntity: Entity, light: Light2D, activeLayer: number, gameView: boolean): Entity[] {
  return entities.filter(entity => {
    if (!entity.enabled || (!gameView && (!entity.editorVisible || entity.layer !== activeLayer))) return false
    if ((light.layerMask & layerBit(entity.layer)) === 0) return false
    const spriteMask = entity.spriteRenderer?.lightMask ?? 0xffff_ffff
    return (spriteMask & layerBit(lightEntity.layer)) !== 0 && !entity.hasComponent('Light2D') && !entity.hasComponent('Camera2D') && !entity.hasComponent('RectTransform')
  })
}

function clipTargets(context: CanvasRenderingContext2D, targets: Entity[], entities: Entity[], camera: CameraRenderView, width: number, height: number): boolean {
  context.beginPath()
  let paths = 0
  for (const entity of targets) {
    const points = entityBoundaryPoints(entity, 48, entities).map(point => worldToScreen(point, camera, width, height))
    if (points.length < 3) continue
    context.moveTo(points[0].x, points[0].y)
    for (let index = 1; index < points.length; index++) context.lineTo(points[index].x, points[index].y)
    context.closePath(); paths++
  }
  if (paths) context.clip()
  return paths > 0
}

function punchLight(context: CanvasRenderingContext2D, light: Light2D, position: Vec2, rotation: number, scale: number, options: LightingOptions): void {
  const radius = Math.max(1, light.range * scale)
  const strength = Math.min(1, light.intensity / 4)
  context.globalCompositeOperation = 'destination-out'
  if (light.lightType === 'Directional') {
    context.fillStyle = `rgba(0,0,0,${strength})`; context.fillRect(0, 0, options.width, options.height)
    context.globalCompositeOperation = 'screen'; context.fillStyle = `rgba(${light.color.r},${light.color.g},${light.color.b},${Math.min(.32, strength * .2)})`; context.fillRect(0, 0, options.width, options.height)
    return
  }
  context.save(); context.translate(position.x, position.y); context.rotate(-rotation)
  if (light.lightType === 'Spot') {
    const angle = light.outerAngle * Math.PI / 180
    context.beginPath(); context.moveTo(0, 0); context.arc(0, 0, radius, -angle * .5, angle * .5); context.closePath(); context.clip()
  } else if (light.lightType === 'Area') {
    const areaWidth = Math.max(1, light.areaSize.x * scale), areaHeight = Math.max(1, light.areaSize.y * scale)
    context.beginPath(); context.rect(-areaWidth * .5, -areaHeight * .5, areaWidth, areaHeight); context.clip()
  }
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius)
  const softness = Math.min(.98, Math.max(.02, light.shadowSoftness))
  gradient.addColorStop(0, `rgba(0,0,0,${strength})`)
  gradient.addColorStop(Math.max(.05, 1 - softness), `rgba(0,0,0,${strength * .82})`)
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  context.fillStyle = gradient; context.fillRect(-radius, -radius, radius * 2, radius * 2)
  context.globalCompositeOperation = 'screen'
  const colorGradient = context.createRadialGradient(0, 0, 0, 0, 0, radius)
  colorGradient.addColorStop(0, `rgba(${light.color.r},${light.color.g},${light.color.b},${Math.min(.45, strength * .32)})`)
  colorGradient.addColorStop(1, 'rgba(0,0,0,0)')
  context.fillStyle = colorGradient; context.fillRect(-radius, -radius, radius * 2, radius * 2)
  if (light.lightType === 'Spot' && light.innerAngle > 0) {
    const inner = Math.min(light.outerAngle, light.innerAngle) * Math.PI / 180
    context.beginPath(); context.moveTo(0, 0); context.arc(0, 0, radius, -inner * .5, inner * .5); context.closePath()
    context.fillStyle = `rgba(${light.color.r},${light.color.g},${light.color.b},${Math.min(.24, strength * .16)})`; context.fill()
  }
  context.restore()
}

function drawShadows(context: CanvasRenderingContext2D, lightEntity: Entity, light: Light2D, entities: Entity[], camera: CameraRenderView, options: LightingOptions): void {
  if (!light.castsShadows || renderingSettings.shadowQuality === 'Off' || light.lightType === 'Directional') return
  const lightWorld = worldTransform(lightEntity, entities).position
  const lightScreen = worldToScreen(lightWorld, camera, options.width, options.height)
  const shadowLength = Math.max(options.width, options.height) * 1.5
  for (const casterEntity of entities) {
    const caster = casterEntity.getComponent<ShadowCaster2D>('ShadowCaster2D')
    if (!caster?.enabled || caster.removed || (caster.layerMask & light.layerMask) === 0 || (casterEntity === lightEntity && !caster.selfShadows)) continue
    const boundary = entityBoundaryPoints(casterEntity, renderingSettings.shadowQuality === 'Ultra' ? 64 : renderingSettings.shadowQuality === 'Soft' ? 32 : 12, entities)
      .map(point => worldToScreen(point, camera, options.width, options.height))
    if (boundary.length < 2) continue
    context.save(); context.globalCompositeOperation = 'source-over'; context.fillStyle = `rgba(0,0,0,${caster.opacity})`
    if (renderingSettings.shadowQuality === 'Soft' || renderingSettings.shadowQuality === 'Ultra') context.filter = `blur(${renderingSettings.shadowQuality === 'Ultra' ? 8 : 4}px)`
    for (let index = 0; index < boundary.length; index++) {
      const first = boundary[index], second = boundary[(index + 1) % boundary.length]
      const extend = (point: Vec2) => { const dx = point.x - lightScreen.x, dy = point.y - lightScreen.y, length = Math.max(1e-6, Math.hypot(dx, dy)); return { x: point.x + dx / length * shadowLength, y: point.y + dy / length * shadowLength } }
      const firstFar = extend(first), secondFar = extend(second)
      context.beginPath(); context.moveTo(first.x, first.y); context.lineTo(second.x, second.y); context.lineTo(secondFar.x, secondFar.y); context.lineTo(firstFar.x, firstFar.y); context.closePath(); context.fill()
    }
    context.restore()
  }
}

function normalResponse(reference: string, direction: Vec2): HTMLCanvasElement | null {
  const texture = resolveTexture(reference)
  if (!texture) return null
  const angleBin = Math.round((Math.atan2(direction.y, direction.x) + Math.PI) / (Math.PI * 2) * 24) % 24
  const key = `${texture.key}:${texture.uv.x}:${texture.uv.y}:${texture.uv.width}:${texture.uv.height}:${angleBin}`
  const existing = normalResponseCache.get(key)
  if (existing) return existing
  const source = texture.source as CanvasImageSource & { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number }
  const sourceWidth = source.naturalWidth ?? source.width ?? 1, sourceHeight = source.naturalHeight ?? source.height ?? 1
  const pixelWidth = Math.max(1, Math.min(256, Math.round(texture.uv.width * sourceWidth))), pixelHeight = Math.max(1, Math.min(256, Math.round(texture.uv.height * sourceHeight)))
  const canvas = document.createElement('canvas'); canvas.width = pixelWidth; canvas.height = pixelHeight
  const response = canvas.getContext('2d', { willReadFrequently: true })
  if (!response) return null
  try {
    response.drawImage(source, texture.uv.x * sourceWidth, texture.uv.y * sourceHeight, texture.uv.width * sourceWidth, texture.uv.height * sourceHeight, 0, 0, pixelWidth, pixelHeight)
    const data = response.getImageData(0, 0, pixelWidth, pixelHeight)
    const angle = angleBin / 24 * Math.PI * 2 - Math.PI, lx = Math.cos(angle) * .72, ly = -Math.sin(angle) * .72, lz = .69
    for (let index = 0; index < data.data.length; index += 4) {
      const nx = data.data[index] / 127.5 - 1, ny = data.data[index + 1] / 127.5 - 1, nz = data.data[index + 2] / 127.5 - 1
      const lambert = Math.max(0, nx * lx + ny * ly + nz * lz)
      data.data[index] = 255; data.data[index + 1] = 255; data.data[index + 2] = 255; data.data[index + 3] = Math.round(data.data[index + 3] * (.12 + .88 * lambert))
    }
    response.putImageData(data, 0, 0); normalResponseCache.set(key, canvas)
    if (normalResponseCache.size > 192) normalResponseCache.delete(normalResponseCache.keys().next().value as string)
    return canvas
  } catch { return null }
}

function drawNormalMappedLight(context: CanvasRenderingContext2D, targets: Entity[], lightEntity: Entity, light: Light2D, entities: Entity[], camera: CameraRenderView, options: LightingOptions): void {
  const lightWorld = worldTransform(lightEntity, entities).position
  for (const entity of targets) {
    const sprite = entity.spriteRenderer
    if (!sprite?.normalMapAsset) continue
    const transform = worldTransform(entity, entities), dx = lightWorld.x - transform.position.x, dy = lightWorld.y - transform.position.y
    const distance = Math.hypot(dx, dy)
    if (light.lightType !== 'Directional' && distance > light.range) continue
    const response = normalResponse(sprite.normalMapAsset, light.lightType === 'Directional' ? { x: -Math.cos(transform.rotation), y: -Math.sin(transform.rotation) } : { x: dx, y: dy })
    if (!response) continue
    const position = worldToScreen(transform.position, camera, options.width, options.height), attenuation = light.lightType === 'Directional' ? 1 : Math.max(0, 1 - distance / Math.max(.0001, light.range))
    context.save(); context.globalCompositeOperation = 'screen'; context.globalAlpha = Math.min(.7, light.intensity * attenuation * .22)
    context.translate(position.x, position.y); context.rotate(-(transform.rotation - (camera.rotation ?? 0)))
    context.scale(camera.scale * transform.scale.x * (sprite.flipX ? -1 : 1), camera.scale * transform.scale.y * (sprite.flipY ? -1 : 1))
    context.drawImage(response, -sprite.pivot.x * sprite.size.x, -(1 - sprite.pivot.y) * sprite.size.y, sprite.size.x, sprite.size.y)
    context.restore()
  }
}

export function renderLighting2D(context: CanvasRenderingContext2D, entities: Entity[], options: LightingOptions): number {
  if (!renderingSettings.lightingEnabled) return 0
  const started = performance.now()
  const lights = entities.flatMap(entity => { const light = entity.getComponent<Light2D>('Light2D'); return entity.enabled && light?.enabled && !light.removed ? [{ entity, light }] : [] })
  const cameras = options.gameView
    ? activeGameCameras(entities, options.width, options.height).map(camera => camera.view)
    : [options.editorCamera]
  for (const camera of cameras.length ? cameras : [options.editorCamera]) {
    context.save()
    const viewport = camera.viewport ?? { x: 0, y: 0, width: 1, height: 1 }
    const viewportRect = { x: viewport.x * options.width, y: (1 - viewport.y - viewport.height) * options.height, width: viewport.width * options.width, height: viewport.height * options.height }
    context.beginPath(); context.rect(viewportRect.x, viewportRect.y, viewportRect.width, viewportRect.height); context.clip()
    const ambient = renderingSettings.ambientColor, darkness = Math.max(0, 1 - Math.min(1, renderingSettings.ambientIntensity))
    context.fillStyle = `rgba(${ambient.r * .08},${ambient.g * .08},${ambient.b * .08},${darkness})`; context.fillRect(viewportRect.x, viewportRect.y, viewportRect.width, viewportRect.height)
    for (const { entity, light } of lights) {
      const targets = compatibleTargets(entities, entity, light, options.activeLayer, options.gameView)
      context.save()
      if (!clipTargets(context, targets, entities, camera, options.width, options.height)) { context.restore(); continue }
      const transform = worldTransform(entity, entities), position = worldToScreen(transform.position, camera, options.width, options.height)
      punchLight(context, light, position, transform.rotation, camera.scale, options)
      drawNormalMappedLight(context, targets, entity, light, entities, camera, options)
      context.restore()
      drawShadows(context, entity, light, entities, camera, options)
    }
    context.restore()
  }
  return performance.now() - started
}

export function renderDebugView2D(context: CanvasRenderingContext2D, entities: Entity[], options: LightingOptions): number {
  if (renderingSettings.debugView === 'None') return 0
  const started = performance.now(), camera = cameraFor(entities, options)
  context.save()
  if (renderingSettings.debugView === 'Lighting') {
    context.globalCompositeOperation = 'source-over'; context.fillStyle = 'rgba(0,0,0,.72)'; context.fillRect(0, 0, options.width, options.height)
    for (const entity of entities) {
      const light = entity.getComponent<Light2D>('Light2D'); if (!light?.enabled || light.removed) continue
      const position = worldToScreen(worldTransform(entity, entities).position, camera, options.width, options.height)
      const radius = Math.max(6, light.range * camera.scale); const gradient = context.createRadialGradient(position.x, position.y, 0, position.x, position.y, radius)
      gradient.addColorStop(0, `rgba(${light.color.r},${light.color.g},${light.color.b},.9)`); gradient.addColorStop(1, 'rgba(0,0,0,0)'); context.fillStyle = gradient; context.fillRect(position.x - radius, position.y - radius, radius * 2, radius * 2)
    }
  } else {
    const visible = entities.filter(entity => entity.enabled && (options.gameView || entity.layer === options.activeLayer))
    for (const entity of visible) {
      const points = entityBoundaryPoints(entity, 32, entities).map(point => worldToScreen(point, camera, options.width, options.height)); if (points.length < 3) continue
      context.beginPath(); context.moveTo(points[0].x, points[0].y); points.slice(1).forEach(point => context.lineTo(point.x, point.y)); context.closePath()
      if (renderingSettings.debugView === 'Overdraw') { context.fillStyle = 'rgba(255,55,70,.18)'; context.fill() }
      else if (renderingSettings.debugView === 'BatchBreaks') {
        const material = entity.spriteRenderer?.material ?? entity.textRenderer?.material ?? entity.renderer.material
        let hash = 0; for (const character of material) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0
        context.strokeStyle = `hsl(${hash % 360} 85% 66%)`; context.lineWidth = 2; context.setLineDash([5, 3]); context.stroke(); context.setLineDash([])
      }
      else if (entity.spriteRenderer?.normalMapAsset) { context.strokeStyle = '#73d9ff'; context.lineWidth = 2; context.stroke() }
    }
  }
  context.restore(); return performance.now() - started
}

export function renderPostProcessOverlay(context: CanvasRenderingContext2D, width: number, height: number): number {
  if (!renderingSettings.postProcessing.enabled || activePostProcessing.vignette <= 0) return 0
  const started = performance.now(), amount = activePostProcessing.vignette
  const gradient = context.createRadialGradient(width * .5, height * .5, Math.min(width, height) * .18, width * .5, height * .5, Math.max(width, height) * .72)
  gradient.addColorStop(0, 'rgba(0,0,0,0)'); gradient.addColorStop(1, `rgba(0,0,0,${Math.min(.9, amount)})`)
  context.save(); context.fillStyle = gradient; context.fillRect(0, 0, width, height); context.restore()
  return performance.now() - started
}

export function worldPostProcessFilter(): string {
  if (!renderingSettings.postProcessing.enabled) return 'none'
  const effect = activePostProcessing
  const brightness = Math.pow(2, effect.exposure)
  const bloom = effect.bloom > 0 ? ` drop-shadow(0 0 ${Math.round(effect.bloom * 8)}px rgba(130,180,255,${Math.min(.8, effect.bloom * .3)}))` : ''
  return `brightness(${brightness}) contrast(${effect.contrast}) saturate(${effect.saturation}) blur(${effect.blur}px)${bloom}`
}

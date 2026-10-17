/** Original particle-emitter values; no particle simulation or render Owner is created. */
import type { ParticleEmitter2D } from '../world/components'
import { finiteNumber } from '../world/geometry'
import type { Vec2 } from '../world/types'


/* 调用 Math.min(maximum, Math.max(minimum, finiteNumber(value, fallback))) 并返回调用结果。 */ export function clamp(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, finiteNumber(value, fallback)))
}

/** 结构说明（自动提取）：normalizeParticleEmitter；输入 component；直接调用 includes、clamp、Math.round、safeVector、finiteNumber 等；写入 component.textureAsset、component.simulationBackend、component.emissionRate、component.burst 等；包含循环处理。 */ export function normalizeParticleEmitter(component: ParticleEmitter2D): void {
  component.textureAsset = typeof component.textureAsset === 'string' ? component.textureAsset : null
  if (!['Auto', 'CPU', 'GPU'].includes(component.simulationBackend)) component.simulationBackend = 'Auto'
  component.emissionRate = clamp(component.emissionRate, 20, 0, 100_000)
  component.burst = Math.round(clamp(component.burst, 0, 0, 100_000))
  component.lifetime = clamp(component.lifetime, 1, 1e-4, 86_400)
  component.initialVelocityMin = safeVector(component.initialVelocityMin, { x: -1, y: 1 })
  component.initialVelocityMax = safeVector(component.initialVelocityMax, { x: 1, y: 3 })
  component.gravity = safeVector(component.gravity, { x: 0, y: -9.80665 })
  component.rotationMin = finiteNumber(component.rotationMin)
  component.rotationMax = finiteNumber(component.rotationMax, Math.PI * 2)
  component.angularVelocityMin = finiteNumber(component.angularVelocityMin, -1)
  component.angularVelocityMax = finiteNumber(component.angularVelocityMax, 1)
  component.startScale = clamp(component.startScale, .2, 0, 1e6)
  component.endScale = clamp(component.endScale, 0, 0, 1e6)
  component.startOpacity = clamp(component.startOpacity, 100, 0, 100)
  component.endOpacity = clamp(component.endOpacity, 0, 0, 100)
  component.maxParticles = Math.round(clamp(component.maxParticles, 1000, 0, 100_000))
  component.sortingLayer = Math.round(clamp(component.sortingLayer, 0, -1_000_000, 1_000_000))
  component.orderInLayer = Math.round(clamp(component.orderInLayer, 0, -1_000_000, 1_000_000))
  component.material = typeof component.material === 'string' ? component.material.slice(0, 80) : 'Particles'
  if (component.blendMode !== 'Additive') component.blendMode = 'Alpha'
  if (!['Point', 'Box', 'Circle', 'Edge'].includes(component.emissionShape)) component.emissionShape = 'Point'
  component.shapeSize = safeVector(component.shapeSize, { x: 1, y: 1 }); component.shapeSize.x = Math.abs(component.shapeSize.x); component.shapeSize.y = Math.abs(component.shapeSize.y)
  component.shapeRadius = clamp(component.shapeRadius, .5, 0, 1e6)
  component.scaleCurve = safeCurve(component.scaleCurve, [{ time: 0, value: 1 }, { time: 1, value: 1 }])
  component.colorGradient = safeGradient(component.colorGradient)
  component.subEmitterUuid = typeof component.subEmitterUuid === 'string' && component.subEmitterUuid ? component.subEmitterUuid.slice(0, 128) : null
  component.subEmitterCount = Math.round(clamp(component.subEmitterCount, 1, 0, 1_000))
  component.previewInEditor = component.previewInEditor !== false
  if (!['None', 'Bounce', 'Stop'].includes(component.collisionMode)) component.collisionMode = 'None'
  component.collisionRestitution = clamp(component.collisionRestitution, .5, 0, 1)
  component.collisionLayerMask = Math.round(clamp(component.collisionLayerMask, 0xffff_ffff, 0, 0xffff_ffff)) >>> 0
  component.eventSignal = typeof component.eventSignal === 'string' ? component.eventSignal.slice(0, 128) : 'particle.event'
  component.trailEnabled = component.trailEnabled === true
  component.trailLength = Math.round(clamp(component.trailLength, 12, 2, 32))
  component.trailWidth = clamp(component.trailWidth, .08, .001, 1e6)
  for (const color of [component.startColor, component.endColor]) {
    color.r = Math.round(clamp(color.r, 255, 0, 255)); color.g = Math.round(clamp(color.g, 255, 0, 255)); color.b = Math.round(clamp(color.b, 255, 0, 255))
  }
}

/** 结构说明（自动提取）：safeCurve；输入 value、fallback；直接调用 Array.isArray、sort、flatMap、value.slice；返回路径包含 fallback。 */ function safeCurve(value: unknown, fallback: Array<{ time: number; value: number }>) {
  if (!Array.isArray(value)) return fallback
  const points = value.slice(0, 16).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 item；直接调用 clamp；返回表达式求值结果。 */ item => item && typeof item === 'object' ? [{ time: clamp((item as { time?: unknown }).time, 0, 0, 1), value: clamp((item as { value?: unknown }).value, 1, -100, 100) }] : []).sort(/* 计算表达式 a.time - b.time 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a.time - b.time)
  return points.length >= 2 ? points : fallback
}
/** 结构说明（自动提取）：safeGradient；输入 value；直接调用 Array.isArray、sort、flatMap、value.slice。 */ function safeGradient(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 16).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 item；直接调用 clamp、Math.round。 */ item => {
    if (!item || typeof item !== 'object') return []
    const source = item as { time?: unknown; color?: { r?: unknown; g?: unknown; b?: unknown }; opacity?: unknown }, color = source.color ?? {}
    return [{ time: clamp(source.time, 0, 0, 1), color: { r: Math.round(clamp(color.r, 255, 0, 255)), g: Math.round(clamp(color.g, 255, 0, 255)), b: Math.round(clamp(color.b, 255, 0, 255)) }, opacity: clamp(source.opacity, 100, 0, 100) }]
  }).sort(/* 计算表达式 a.time - b.time 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a.time - b.time)
}

/** 结构说明（自动提取）：safeVector；输入 value、fallback；直接调用 finiteNumber。 */ function safeVector(value: unknown, fallback: Vec2): Vec2 {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return { x: finiteNumber(source.x, fallback.x), y: finiteNumber(source.y, fallback.y) }
}

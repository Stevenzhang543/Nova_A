/** 26.44 补间：按时间把对象的属性从当前值过渡到目标值，使用 Robert Penner 的缓动方程。
 *
 * Scripts start tweens with `tween(property, to, seconds[, easing[, options]])` (or `entity_tween`
 * for another object) and the Blocks "Glide" statements. A tween captures the property's value when
 * it starts (after its delay), so it continues from wherever the object is. Tweens run on the fixed
 * step, after the scripts, so they are deterministic and replay with the game. A new tween of the
 * same property on the same object replaces the old one. When a tween finishes it emits
 * `tween.finished` (payload `#{ property }`) and, if given, its own signal.
 *
 * Properties: x, y (local position), rotation (radians), rotation_degrees, scale_x, scale_y, scale
 * (both axes) and opacity (0–100, sprite or UI). Runtime only; the editor never imports this. */
import type { Entity } from '../world/Entity'
import { finiteNumber } from '../world/geometry'

export type TweenProperty = 'x' | 'y' | 'rotation' | 'rotation_degrees' | 'scale_x' | 'scale_y' | 'scale' | 'opacity'
export type EasingFunction = (t: number) => number

const PROPERTY_NAMES: Record<string, TweenProperty> = {
  x: 'x', 'position.x': 'x', position_x: 'x', 'Transform.position.x': 'x',
  y: 'y', 'position.y': 'y', position_y: 'y', 'Transform.position.y': 'y',
  rotation: 'rotation', angle: 'rotation', 'Transform.rotation': 'rotation',
  rotation_degrees: 'rotation_degrees', degrees: 'rotation_degrees',
  scale_x: 'scale_x', 'scale.x': 'scale_x', 'Transform.scale.x': 'scale_x',
  scale_y: 'scale_y', 'scale.y': 'scale_y', 'Transform.scale.y': 'scale_y',
  scale: 'scale',
  opacity: 'opacity', alpha: 'opacity', 'SpriteRenderer.opacity': 'opacity', 'UI.opacity': 'opacity'
}

/** 26.44: the canonical tween property for a script name, or null. */
export function tweenProperty(name: string): TweenProperty | null {
  return PROPERTY_NAMES[name.trim()] ?? PROPERTY_NAMES[name.trim().toLowerCase()] ?? null
}

// Robert Penner's easing equations (t from 0 to 1), as in easings.net.
const c1 = 1.70158, c2 = c1 * 1.525, c3 = c1 + 1, c4 = (2 * Math.PI) / 3, c5 = (2 * Math.PI) / 4.5
function bounceOut(t: number): number {
  const n1 = 7.5625, d1 = 2.75
  if (t < 1 / d1) return n1 * t * t
  if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + .75 }
  if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + .9375 }
  t -= 2.625 / d1; return n1 * t * t + .984375
}
const inOut = (easeIn: EasingFunction): EasingFunction => t => t < .5 ? easeIn(2 * t) / 2 : 1 - easeIn(2 - 2 * t) / 2
const out = (easeIn: EasingFunction): EasingFunction => t => 1 - easeIn(1 - t)
const power = (exponent: number): EasingFunction => t => t ** exponent
const sineIn: EasingFunction = t => 1 - Math.cos((t * Math.PI) / 2)
const expoIn: EasingFunction = t => t === 0 ? 0 : 2 ** (10 * t - 10)
const circIn: EasingFunction = t => 1 - Math.sqrt(1 - t * t)
const backIn: EasingFunction = t => c3 * t * t * t - c1 * t * t
const elasticIn: EasingFunction = t => t === 0 ? 0 : t === 1 ? 1 : -(2 ** (10 * t - 10)) * Math.sin((t * 10 - 10.75) * c4)
const bounceIn: EasingFunction = t => 1 - bounceOut(1 - t)

export const EASINGS: Readonly<Record<string, EasingFunction>> = Object.freeze({
  linear: t => t,
  quad_in: power(2), quad_out: out(power(2)), quad_in_out: inOut(power(2)),
  cubic_in: power(3), cubic_out: out(power(3)), cubic_in_out: inOut(power(3)),
  quart_in: power(4), quart_out: out(power(4)), quart_in_out: inOut(power(4)),
  quint_in: power(5), quint_out: out(power(5)), quint_in_out: inOut(power(5)),
  sine_in: sineIn, sine_out: out(sineIn), sine_in_out: t => -(Math.cos(Math.PI * t) - 1) / 2,
  expo_in: expoIn, expo_out: out(expoIn), expo_in_out: t => t === 0 ? 0 : t === 1 ? 1 : t < .5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2,
  circ_in: circIn, circ_out: out(circIn), circ_in_out: inOut(circIn),
  back_in: backIn, back_out: out(backIn), back_in_out: t => t < .5 ? ((2 * t) ** 2 * ((c2 + 1) * 2 * t - c2)) / 2 : ((2 * t - 2) ** 2 * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2,
  elastic_in: elasticIn, elastic_out: t => t === 0 ? 0 : t === 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - .75) * c4) + 1,
  elastic_in_out: t => t === 0 ? 0 : t === 1 ? 1 : t < .5 ? -(2 ** (20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2 : (2 ** (-20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1,
  bounce_in: bounceIn, bounce_out: bounceOut, bounce_in_out: t => t < .5 ? (1 - bounceOut(1 - 2 * t)) / 2 : (1 + bounceOut(2 * t - 1)) / 2
})

/** 26.44: easing by name ("quad_out", "ease-out-quad", "EaseOutQuad"); linear when unknown. */
export function easingFunction(name: string): EasingFunction {
  const raw = String(name ?? '').trim()
  const direct = EASINGS[raw.toLowerCase().replace(/[-\s]/g, '_')]
  if (direct) return direct
  // "EaseOutQuad" / "ease_in_out_cubic" → "quad_out" / "cubic_in_out".
  const words = raw.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().replace(/[-\s]/g, '_').split('_').filter(word => word && word !== 'ease')
  const mode = words.filter(word => word === 'in' || word === 'out').join('_'), kind = words.find(word => word !== 'in' && word !== 'out')
  return (kind && mode && EASINGS[`${kind}_${mode}`]) || EASINGS.linear
}

export interface TweenRequest {
  property: string
  to: number
  seconds: number
  easing?: string
  delay?: number
  /** Extra plays after the first: 0 once, -1 forever. */
  loops?: number
  /** Every other play runs backwards. */
  yoyo?: boolean
  /** `to` is added to the starting value. */
  relative?: boolean
  signal?: string
}

interface ActiveTween {
  entity: Entity
  property: TweenProperty
  from: number
  to: number
  target: number
  relative: boolean
  seconds: number
  easing: EasingFunction
  delay: number
  elapsed: number
  started: boolean
  loopsLeft: number
  yoyo: boolean
  forward: boolean
  signal: string
}

export type TweenFinished = (entity: Entity, property: TweenProperty, signal: string) => void

/** 26.44: active tweens of one runtime session. */
export class TweenOwner {
  private tweens: ActiveTween[] = []

  /** Starts (or replaces) a tween; false when the property or the object cannot be animated. */
  start(entity: Entity, request: TweenRequest): boolean {
    const property = tweenProperty(request.property)
    if (!property || readTweenProperty(entity, property) === null) return false
    this.stop(entity, property)
    if (this.tweens.length >= 4096) this.tweens.shift()
    const loops = Math.round(finiteNumber(request.loops, 0))
    this.tweens.push({
      entity, property, from: 0, to: 0, target: finiteNumber(request.to), relative: request.relative === true,
      seconds: Math.max(0, finiteNumber(request.seconds)), easing: easingFunction(request.easing ?? 'linear'),
      delay: Math.max(0, finiteNumber(request.delay)), elapsed: 0, started: false,
      loopsLeft: loops < 0 ? Number.POSITIVE_INFINITY : loops, yoyo: request.yoyo === true, forward: true, signal: String(request.signal ?? '').slice(0, 80)
    })
    return true
  }

  /** Stops the object's tweens of `property` (all of them when empty or omitted). */
  stop(entity: Entity, property = ''): number {
    const canonical = property ? tweenProperty(property) : null
    if (property && !canonical) return 0
    const before = this.tweens.length
    this.tweens = this.tweens.filter(tween => tween.entity.uuid !== entity.uuid || (canonical !== null && tween.property !== canonical && !(canonical === 'scale' && (tween.property === 'scale_x' || tween.property === 'scale_y'))))
    return before - this.tweens.length
  }

  /** Forgets everything (session end). */
  reset(): void { this.tweens = [] }

  get size(): number { return this.tweens.length }

  /** Advances every tween by `delta` seconds of game time. `live` returns the object's current
   * instance (or true to keep it) and null/false for removed objects: tweens are matched by uuid,
   * because the editor hands scripts reactive proxies outside a frame and plain objects inside. */
  update(delta: number, live: (entity: Entity) => Entity | boolean | null | undefined, finished: TweenFinished): void {
    const step = Math.max(0, finiteNumber(delta))
    const done: ActiveTween[] = []
    const gone = new Set<ActiveTween>()
    for (const tween of this.tweens) {
      const current = live(tween.entity)
      if (!current) { done.push(tween); gone.add(tween); continue }
      if (current !== true) tween.entity = current
      let remaining = step
      if (!tween.started) {
        if (tween.delay > remaining) { tween.delay -= remaining; continue }
        remaining -= tween.delay; tween.delay = 0
        const current = readTweenProperty(tween.entity, tween.property)
        if (current === null) { done.push(tween); continue }
        tween.from = current; tween.to = tween.relative ? current + tween.target : tween.target; tween.started = true
      }
      tween.elapsed += remaining
      if (tween.seconds <= 0) { writeTweenProperty(tween.entity, tween.property, tween.to); done.push(tween); continue }
      // Plays that end within this step (a tween shorter than a step still lands on its end value).
      const cycles = Math.floor(tween.elapsed / tween.seconds)
      if (cycles > 0) {
        if (cycles > tween.loopsLeft) {
          const forward = tween.yoyo && tween.loopsLeft % 2 === 1 ? !tween.forward : tween.forward
          writeTweenProperty(tween.entity, tween.property, forward ? tween.to : tween.from); done.push(tween); continue
        }
        tween.loopsLeft -= cycles; tween.elapsed -= cycles * tween.seconds
        if (tween.yoyo && cycles % 2 === 1) tween.forward = !tween.forward
      }
      const progress = tween.seconds > 0 ? Math.min(1, tween.elapsed / tween.seconds) : 1
      const eased = tween.easing(tween.forward ? progress : 1 - progress)
      writeTweenProperty(tween.entity, tween.property, tween.from + (tween.to - tween.from) * eased)
    }
    if (!done.length) return
    this.tweens = this.tweens.filter(tween => !done.includes(tween))
    for (const tween of done) if (!gone.has(tween)) finished(tween.entity, tween.property, tween.signal)
  }
}

/** Current value of a tween property, or null when the object does not have it. */
export function readTweenProperty(entity: Entity, property: TweenProperty): number | null {
  const transform = entity.transform
  if (property === 'x') return transform.position.x
  if (property === 'y') return transform.position.y
  if (property === 'rotation') return transform.rotation
  if (property === 'rotation_degrees') return transform.rotation * 180 / Math.PI
  if (property === 'scale_x' || property === 'scale') return transform.scale.x
  if (property === 'scale_y') return transform.scale.y
  const sprite = entity.spriteRenderer
  if (sprite) return sprite.opacity
  for (const kind of ['Panel', 'Image', 'Text'] as const) {
    const component = entity.getComponent<{ opacity: number } & { readonly kind: typeof kind; enabled: boolean; removed: boolean; uuid: string }>(kind)
    if (component) return component.opacity
  }
  return null
}

/** Writes a tween property (scale stays non-zero, opacity within 0–100). */
export function writeTweenProperty(entity: Entity, property: TweenProperty, value: number): void {
  if (!Number.isFinite(value)) return
  const transform = entity.transform
  if (property === 'x') transform.position.x = value
  else if (property === 'y') transform.position.y = value
  else if (property === 'rotation') transform.rotation = value
  else if (property === 'rotation_degrees') transform.rotation = value * Math.PI / 180
  else if (property === 'scale_x') transform.scale.x = Math.abs(value) < 1e-6 ? 1e-6 : value
  else if (property === 'scale_y') transform.scale.y = Math.abs(value) < 1e-6 ? 1e-6 : value
  else if (property === 'scale') { const scale = Math.abs(value) < 1e-6 ? 1e-6 : value; const ratio = transform.scale.x !== 0 ? transform.scale.y / transform.scale.x : 1; transform.scale.x = scale; transform.scale.y = scale * ratio }
  else {
    const opacity = Math.min(100, Math.max(0, value))
    if (entity.spriteRenderer) entity.spriteRenderer.opacity = opacity
    for (const kind of ['Panel', 'Image', 'Text'] as const) {
      const component = entity.getComponent<{ opacity: number } & { readonly kind: typeof kind; enabled: boolean; removed: boolean; uuid: string }>(kind)
      if (component) component.opacity = opacity
    }
  }
}

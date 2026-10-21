/** 26.44: physics recording for the debugger. While enabled, every fixed step records the pose and
 * velocity of each moving body into a ring buffer (about ten seconds at 60 Hz, fewer for very large
 * scenes). While the game is paused the editor can scrub through the recording (the bodies are shown
 * where they were) and continue from a recorded step, dropping the recording after it.
 *
 * 26.45: with a keyframe store (`keyframes`) the recorder also saves complete keyframes: the whole
 * solver state (contacts, joints, sleep, ropes) plus the game state the host captures (script
 * variables, timers, tweens, animations). Keyframes are saved every few steps, as often as the memory
 * budget allows (every step in small scenes). Continuing from a keyframe restores all of it exactly,
 * so the game runs on as it did the first time; continuing from another step only sets the bodies'
 * poses and velocities, as in 26.44. Plain TypeScript; the editor mirrors `status()` for its UI. */
import type { Entity } from '../world/Entity'
import type { Vec2 } from '../world/types'
import { worldTransform, setWorldTransform } from '../world/hierarchy'

const FIELDS = 7 // x, y, rotation, vx, vy, angular velocity, sleeping
const MAX_FRAMES = 600
const MAX_VALUES = 3_000_000 // ~24 MB of Float64 values at most
const MAX_BODIES = 8_192
const KEYFRAME_BUDGET_BYTES = 64 * 1024 * 1024
const MAX_KEYFRAME_INTERVAL = 30

/** 26.45: where complete keyframes are kept (the host: physics snapshots in WASM plus game state). */
export interface PhysicsRecorderKeyframes {
  /** Saves a keyframe into `slot` (replacing what it held); returns its size in bytes, 0 on failure. */
  save(slot: number): number
  /** Restores the keyframe in `slot`; false when it is missing or no longer fits the scene. */
  restore(slot: number): boolean
  drop(slot: number): void
  clear(): void
}

export interface PhysicsRecorderStatus {
  enabled: boolean
  frames: number
  capacity: number
  bodies: number
  /** Recorded steps, oldest first (their engine step numbers and game times). */
  firstStep: number
  lastStep: number
  firstTime: number
  lastTime: number
  /** Frame shown while scrubbing (0 = oldest), or -1 when showing the live state. */
  scrubIndex: number
  /** 26.45: recorded frames that are complete keyframes, and the steps between keyframes. */
  keyframes: number
  keyframeInterval: number
}

export interface PhysicsRecorderWorld {
  readonly entities: Entity[]
  teleport(entity: Entity, position: Vec2, angle?: number): boolean
}

interface FrameMeta { step: number; time: number; count: number; uuids: string[]; keyframe: boolean }

export class PhysicsRecorder {
  enabled = false
  private stride = 0
  private capacity = 0
  private values = new Float64Array(0)
  private meta: FrameMeta[] = []
  private head = 0 // next slot to write
  private size = 0
  private scrub = -1
  private live: Array<{ entity: Entity; x: number; y: number; rotation: number }> | null = null
  /** 26.45: complete keyframes (null: poses only, as in 26.44). */
  keyframes: PhysicsRecorderKeyframes | null = null
  private keyframeInterval = 1
  private sinceKeyframe = Number.POSITIVE_INFINITY
  /** 26.45: how the last continue went: exact (a keyframe) or poses only. */
  lastContinue: { exact: boolean; step: number } | null = null

  /** Moving bodies: enabled, with a rigid body that is not static. */
  private bodies(entities: readonly Entity[]): Entity[] {
    const result: Entity[] = []
    for (const entity of entities) {
      if (!entity.enabled || !entity.hasComponent('RigidBody2D') || entity.isStatic) continue
      result.push(entity)
      if (result.length >= MAX_BODIES) break
    }
    return result
  }

  private ensureLayout(bodies: number): void {
    const stride = Math.max(64, 1 << Math.ceil(Math.log2(Math.max(1, bodies)))) * FIELDS
    if (stride <= this.stride && this.capacity > 0) return
    // A larger scene starts a new recording with a fitting number of frames.
    this.stride = stride
    this.capacity = Math.max(30, Math.min(MAX_FRAMES, Math.floor(MAX_VALUES / stride)))
    this.values = new Float64Array(this.capacity * stride)
    this.meta = Array.from({ length: this.capacity }, () => ({ step: 0, time: 0, count: 0, uuids: [], keyframe: false }))
    this.keyframes?.clear()
    this.head = 0; this.size = 0; this.scrub = -1; this.sinceKeyframe = Number.POSITIVE_INFINITY
  }

  /** Records the state after a fixed step (the scrubbed view is never recorded). */
  record(step: number, time: number, entities: readonly Entity[]): void {
    if (!this.enabled || this.scrub >= 0) return
    const bodies = this.bodies(entities)
    this.ensureLayout(bodies.length)
    const slot = this.head, base = slot * this.stride, meta = this.meta[slot]
    meta.step = step; meta.time = time; meta.count = bodies.length
    meta.uuids.length = bodies.length
    for (let index = 0; index < bodies.length; index++) {
      const entity = bodies[index], transform = worldTransform(entity, entities as Entity[]), at = base + index * FIELDS
      meta.uuids[index] = entity.uuid
      this.values[at] = transform.position.x; this.values[at + 1] = transform.position.y; this.values[at + 2] = transform.rotation
      this.values[at + 3] = entity.velocity.x; this.values[at + 4] = entity.velocity.y; this.values[at + 5] = entity.angularVelocity
      this.values[at + 6] = entity.rigidBody?.sleeping ? 1 : 0
    }
    this.recordKeyframe(slot, meta)
    this.head = (this.head + 1) % this.capacity
    this.size = Math.min(this.capacity, this.size + 1)
  }

  /** 26.45: saves a keyframe in this slot when one is due; the interval follows the memory budget. */
  private recordKeyframe(slot: number, meta: FrameMeta): void {
    const store = this.keyframes
    if (!store) { meta.keyframe = false; return }
    if (this.sinceKeyframe + 1 >= this.keyframeInterval) {
      let bytes = 0
      try { bytes = store.save(slot) } catch { bytes = 0 }
      meta.keyframe = bytes > 0
      if (bytes > 0) this.keyframeInterval = Math.max(1, Math.min(MAX_KEYFRAME_INTERVAL, Math.ceil(bytes * this.capacity / KEYFRAME_BUDGET_BYTES)))
      this.sinceKeyframe = 0
      return
    }
    if (meta.keyframe) store.drop(slot)
    meta.keyframe = false
    this.sinceKeyframe++
  }

  /** Slot of the frame `index` (0 = oldest). */
  private slot(index: number): number { return (this.head - this.size + index + this.capacity * 2) % this.capacity }

  status(): PhysicsRecorderStatus {
    const first = this.size ? this.meta[this.slot(0)] : null, last = this.size ? this.meta[this.slot(this.size - 1)] : null
    let keyframes = 0
    for (let index = 0; index < this.size; index++) if (this.meta[this.slot(index)].keyframe) keyframes++
    return { enabled: this.enabled, frames: this.size, capacity: this.capacity, bodies: last?.count ?? 0, firstStep: first?.step ?? 0, lastStep: last?.step ?? 0, firstTime: first?.time ?? 0, lastTime: last?.time ?? 0, scrubIndex: this.scrub, keyframes, keyframeInterval: this.keyframes ? this.keyframeInterval : 0 }
  }

  /** Step number and game time of a recorded frame, and whether it is a complete keyframe. */
  frameInfo(index: number): { step: number; time: number; count: number; keyframe: boolean } | null {
    if (index < 0 || index >= this.size) return null
    const meta = this.meta[this.slot(index)]
    return { step: meta.step, time: meta.time, count: meta.count, keyframe: meta.keyframe }
  }

  /** 26.45: the nearest keyframe at or before frame `index` (-1 when there is none). */
  keyframeAtOrBefore(index: number): number {
    for (let at = Math.min(this.size - 1, Math.round(index)); at >= 0; at--) if (this.meta[this.slot(at)].keyframe) return at
    return -1
  }

  get scrubbing(): boolean { return this.scrub >= 0 }

  /** Shows the bodies where they were at frame `index` (the live poses are kept for `endScrub`). */
  scrubTo(index: number, entities: Entity[]): boolean {
    if (!this.size) return false
    const target = Math.max(0, Math.min(this.size - 1, Math.round(index)))
    if (!this.live) this.live = this.bodies(entities).map(entity => { const transform = worldTransform(entity, entities); return { entity, x: transform.position.x, y: transform.position.y, rotation: transform.rotation } })
    this.scrub = target
    const slot = this.slot(target), base = slot * this.stride, meta = this.meta[slot]
    const byUuid = new Map(entities.map(entity => [entity.uuid, entity]))
    for (let index = 0; index < meta.count; index++) {
      const entity = byUuid.get(meta.uuids[index])
      if (!entity) continue
      const at = base + index * FIELDS, transform = worldTransform(entity, entities)
      setWorldTransform(entity, { ...transform, position: { x: this.values[at], y: this.values[at + 1] }, rotation: this.values[at + 2] }, entities)
    }
    return true
  }

  /** Back to the live state: the poses the bodies had before scrubbing, exactly. */
  endScrub(entities: Entity[]): void {
    if (this.live) for (const pose of this.live) {
      if (!entities.includes(pose.entity)) continue
      const transform = worldTransform(pose.entity, entities)
      setWorldTransform(pose.entity, { ...transform, position: { x: pose.x, y: pose.y }, rotation: pose.rotation }, entities)
    }
    this.live = null
    this.scrub = -1
  }

  /** Continues from the scrubbed frame and drops the frames after it. A keyframe restores the
   * complete state; otherwise bodies get the frame's poses (through the physics world) and
   * velocities. Returns the number of bodies rewound. */
  continueFromScrub(world: PhysicsRecorderWorld): number {
    if (this.scrub < 0) return 0
    const target = this.scrub, slot = this.slot(target), base = slot * this.stride, meta = this.meta[slot]
    // Restore first so teleports start from the live solver poses, then rewind through the world.
    this.endScrub(world.entities)
    let exact = false
    if (meta.keyframe && this.keyframes) { try { exact = this.keyframes.restore(slot) } catch { exact = false } }
    this.lastContinue = { exact, step: meta.step }
    const keep = target + 1
    if (exact) {
      this.head = (this.slot(0) + keep) % this.capacity
      this.size = keep
      this.sinceKeyframe = 0
      return meta.count
    }
    const byUuid = new Map(world.entities.map(entity => [entity.uuid, entity]))
    let rewound = 0
    for (let index = 0; index < meta.count; index++) {
      const entity = byUuid.get(meta.uuids[index])
      if (!entity) continue
      const at = base + index * FIELDS
      world.teleport(entity, { x: this.values[at], y: this.values[at + 1] }, this.values[at + 2])
      entity.velocity = { x: this.values[at + 3], y: this.values[at + 4] }
      entity.angularVelocity = this.values[at + 5]
      rewound++
    }
    // The recording continues from this frame.
    this.head = (this.slot(0) + keep) % this.capacity
    this.size = keep
    return rewound
  }

  /** Forgets the recording (new session). */
  reset(): void {
    this.head = 0; this.size = 0; this.scrub = -1; this.live = null; this.lastContinue = null
    this.sinceKeyframe = Number.POSITIVE_INFINITY
    for (const meta of this.meta) meta.keyframe = false
    this.keyframes?.clear()
  }
}

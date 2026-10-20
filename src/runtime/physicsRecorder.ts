/** 26.44: physics recording for the debugger. While enabled, every fixed step records the pose and
 * velocity of each moving body into a ring buffer (about ten seconds at 60 Hz, fewer for very large
 * scenes). While the game is paused the editor can scrub through the recording (the bodies are shown
 * where they were) and continue from a recorded step: the bodies get that step's poses and velocities
 * and the recording after it is dropped. Only bodies are rewound: scripts, timers and other state keep
 * their current values. Plain TypeScript; the editor mirrors `status()` for its UI. */
import type { Entity } from '../world/Entity'
import type { Vec2 } from '../world/types'
import { worldTransform, setWorldTransform } from '../world/hierarchy'

const FIELDS = 7 // x, y, rotation, vx, vy, angular velocity, sleeping
const MAX_FRAMES = 600
const MAX_VALUES = 3_000_000 // ~24 MB of Float64 values at most
const MAX_BODIES = 8_192

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
}

export interface PhysicsRecorderWorld {
  readonly entities: Entity[]
  teleport(entity: Entity, position: Vec2, angle?: number): boolean
}

interface FrameMeta { step: number; time: number; count: number; uuids: string[] }

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
    this.meta = Array.from({ length: this.capacity }, () => ({ step: 0, time: 0, count: 0, uuids: [] }))
    this.head = 0; this.size = 0; this.scrub = -1
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
    this.head = (this.head + 1) % this.capacity
    this.size = Math.min(this.capacity, this.size + 1)
  }

  /** Slot of the frame `index` (0 = oldest). */
  private slot(index: number): number { return (this.head - this.size + index + this.capacity * 2) % this.capacity }

  status(): PhysicsRecorderStatus {
    const first = this.size ? this.meta[this.slot(0)] : null, last = this.size ? this.meta[this.slot(this.size - 1)] : null
    return { enabled: this.enabled, frames: this.size, capacity: this.capacity, bodies: last?.count ?? 0, firstStep: first?.step ?? 0, lastStep: last?.step ?? 0, firstTime: first?.time ?? 0, lastTime: last?.time ?? 0, scrubIndex: this.scrub }
  }

  /** Step number and game time of a recorded frame. */
  frameInfo(index: number): { step: number; time: number; count: number } | null {
    if (index < 0 || index >= this.size) return null
    const meta = this.meta[this.slot(index)]
    return { step: meta.step, time: meta.time, count: meta.count }
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

  /** Continues from the scrubbed frame: bodies get its poses (through the physics world) and
   * velocities, and the frames after it are dropped. Returns the number of bodies rewound. */
  continueFromScrub(world: PhysicsRecorderWorld): number {
    if (this.scrub < 0) return 0
    const target = this.scrub, slot = this.slot(target), base = slot * this.stride, meta = this.meta[slot]
    // Restore first so teleports start from the live solver poses, then rewind through the world.
    this.endScrub(world.entities)
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
    const keep = target + 1
    this.head = (this.slot(0) + keep) % this.capacity
    this.size = keep
    return rewound
  }

  /** Forgets the recording (new session). */
  reset(): void { this.head = 0; this.size = 0; this.scrub = -1; this.live = null }
}

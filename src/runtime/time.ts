export interface TimeSnapshot {
  delta: number
  fixedDelta: number
  elapsed: number
  scale: number
  frame: number
}

interface RuntimeTimer {
  entityUuid: string
  name: string
  duration: number
  remaining: number
  repeat: boolean
  paused: boolean
  kind: 'timer' | 'task'
  generation: number
}

export interface TimerExpiration {
  entityUuid: string
  name: string
  kind: 'timer' | 'task'
  generation: number
}

export const MAX_RUNTIME_TIMERS = 10_000
export const MAX_TIMER_EXPIRATIONS_PER_FRAME = 4_096

export class RuntimeTime {
  readonly value: TimeSnapshot = { delta: 0, fixedDelta: 1 / 60, elapsed: 0, scale: 1, frame: 0 }
  private timers = new Map<string, RuntimeTimer>()
  private generation = 0
  private pending = new Map<string, { generation: number; count: number }>()

  beginFrame(frameDelta: number, tickRate: number, scale: number): TimerExpiration[] {
    this.value.scale = Number.isFinite(scale) ? Math.min(100, Math.max(0, scale)) : 1
    this.value.fixedDelta = 1 / Math.min(1000, Math.max(1, Number.isFinite(tickRate) ? tickRate : 60))
    this.value.delta = Math.min(.25, Math.max(0, Number.isFinite(frameDelta) ? frameDelta : 0)) * this.value.scale
    this.value.elapsed += this.value.delta
    this.value.frame = Math.min(Number.MAX_SAFE_INTEGER, this.value.frame + 1)
    return this.advanceTimers(this.value.delta)
  }

  start(entityUuid: string, name: string, seconds: number, repeat: boolean): boolean { return this.create(entityUuid, name, seconds, repeat, 'timer') }

  startTask(entityUuid: string, name: string, seconds: number): boolean { return this.create(entityUuid, name, seconds, false, 'task') }

  private create(entityUuid: string, name: string, seconds: number, repeat: boolean, kind: 'timer' | 'task'): boolean {
    if (!entityUuid || !name || name.length > 128 || !Number.isFinite(seconds)) return false
    const key = this.key(entityUuid, name, kind)
    if (!this.timers.has(key) && this.timers.size >= MAX_RUNTIME_TIMERS) return false
    const duration = Math.min(86_400, Math.max(.000001, Number.isFinite(seconds) ? seconds : 0))
    this.pending.delete(key)
    this.timers.set(key, { entityUuid, name, duration, remaining: duration, repeat, paused: false, kind, generation: ++this.generation })
    return true
  }

  pause(entityUuid: string, name: string): void {
    const key = this.key(entityUuid, name, 'timer'), timer = this.timers.get(key); if (timer) timer.paused = true
    this.pending.delete(key)
  }

  resume(entityUuid: string, name: string): void {
    const timer = this.timers.get(this.key(entityUuid, name, 'timer')); if (timer) timer.paused = false
  }

  cancel(entityUuid: string, name: string): void { const key = this.key(entityUuid, name, 'timer'); this.timers.delete(key); this.pending.delete(key) }
  cancelTask(entityUuid: string, name: string): void { const key = this.key(entityUuid, name, 'task'); this.timers.delete(key); this.pending.delete(key) }

  inspect(entityUuid: string): Array<{ name: string; kind: 'timer' | 'task'; remaining: number; paused: boolean }> {
    return [...this.timers.values()].filter(timer => timer.entityUuid === entityUuid).map(({ name, kind, remaining, paused }) => ({ name, kind, remaining, paused }))
  }

  /** Checks generation at dispatch time, after earlier callbacks may cancel or replace this timer. */
  consumeExpiration(expiration: TimerExpiration): boolean {
    const key = this.key(expiration.entityUuid, expiration.name, expiration.kind), pending = this.pending.get(key)
    if (!pending || pending.generation !== expiration.generation || pending.count <= 0) return false
    if (--pending.count === 0) this.pending.delete(key)
    return true
  }

  removeEntity(entityUuid: string): void {
    for (const [key, timer] of this.timers) if (timer.entityUuid === entityUuid) this.timers.delete(key)
    for (const key of this.pending.keys()) if (key.startsWith(`${entityUuid}\u0000`)) this.pending.delete(key)
  }

  reset(): void {
    Object.assign(this.value, { delta: 0, fixedDelta: 1 / 60, elapsed: 0, scale: 1, frame: 0 })
    this.timers.clear()
    this.pending.clear()
  }

  private advanceTimers(delta: number): TimerExpiration[] {
    this.pending.clear()
    if (delta <= 0) return []
    const expired: TimerExpiration[] = []
    for (const [key, timer] of this.timers) {
      if (timer.paused) continue
      timer.remaining -= delta
      let safety = 0
      while (timer.remaining <= 0 && safety++ < 64 && expired.length < MAX_TIMER_EXPIRATIONS_PER_FRAME) {
        expired.push({ entityUuid: timer.entityUuid, name: timer.name, kind: timer.kind, generation: timer.generation })
        const pending = this.pending.get(key)
        if (pending) pending.count++
        else this.pending.set(key, { generation: timer.generation, count: 1 })
        if (!timer.repeat) { this.timers.delete(key); break }
        timer.remaining += timer.duration
      }
    }
    return expired
  }

  private key(entityUuid: string, name: string, kind: 'timer' | 'task'): string { return `${entityUuid}\u0000${kind}\u0000${name}` }
}

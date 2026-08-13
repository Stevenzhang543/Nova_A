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
}

export interface TimerExpiration {
  entityUuid: string
  name: string
  kind: 'timer' | 'task'
}

export class RuntimeTime {
  readonly value: TimeSnapshot = { delta: 0, fixedDelta: 1 / 60, elapsed: 0, scale: 1, frame: 0 }
  private timers = new Map<string, RuntimeTimer>()

  beginFrame(frameDelta: number, tickRate: number, scale: number): TimerExpiration[] {
    this.value.scale = Number.isFinite(scale) ? Math.min(100, Math.max(0, scale)) : 1
    this.value.fixedDelta = 1 / Math.min(1000, Math.max(1, Number.isFinite(tickRate) ? tickRate : 60))
    this.value.delta = Math.min(.25, Math.max(0, Number.isFinite(frameDelta) ? frameDelta : 0)) * this.value.scale
    this.value.elapsed += this.value.delta
    this.value.frame = Math.min(Number.MAX_SAFE_INTEGER, this.value.frame + 1)
    return this.advanceTimers(this.value.delta)
  }

  start(entityUuid: string, name: string, seconds: number, repeat: boolean): void {
    const duration = Math.min(86_400, Math.max(.000001, Number.isFinite(seconds) ? seconds : 0))
    this.timers.set(this.key(entityUuid, name, 'timer'), { entityUuid, name, duration, remaining: duration, repeat, paused: false, kind: 'timer' })
  }

  startTask(entityUuid: string, name: string, seconds: number): void {
    const duration = Math.min(86_400, Math.max(.000001, Number.isFinite(seconds) ? seconds : 0))
    this.timers.set(this.key(entityUuid, name, 'task'), { entityUuid, name, duration, remaining: duration, repeat: false, paused: false, kind: 'task' })
  }

  pause(entityUuid: string, name: string): void {
    const timer = this.timers.get(this.key(entityUuid, name, 'timer')); if (timer) timer.paused = true
  }

  resume(entityUuid: string, name: string): void {
    const timer = this.timers.get(this.key(entityUuid, name, 'timer')); if (timer) timer.paused = false
  }

  cancel(entityUuid: string, name: string): void { this.timers.delete(this.key(entityUuid, name, 'timer')) }
  cancelTask(entityUuid: string, name: string): void { this.timers.delete(this.key(entityUuid, name, 'task')) }

  removeEntity(entityUuid: string): void {
    for (const [key, timer] of this.timers) if (timer.entityUuid === entityUuid) this.timers.delete(key)
  }

  reset(): void {
    Object.assign(this.value, { delta: 0, fixedDelta: 1 / 60, elapsed: 0, scale: 1, frame: 0 })
    this.timers.clear()
  }

  private advanceTimers(delta: number): TimerExpiration[] {
    if (delta <= 0) return []
    const expired: TimerExpiration[] = []
    for (const [key, timer] of this.timers) {
      if (timer.paused) continue
      timer.remaining -= delta
      let safety = 0
      while (timer.remaining <= 0 && safety++ < 64) {
        expired.push({ entityUuid: timer.entityUuid, name: timer.name, kind: timer.kind })
        if (!timer.repeat) { this.timers.delete(key); break }
        timer.remaining += timer.duration
      }
    }
    return expired
  }

  private key(entityUuid: string, name: string, kind: 'timer' | 'task'): string { return `${entityUuid}\u0000${kind}\u0000${name}` }
}

/** Optional, synchronous Runtime debug counters. They never write the resource catalog. */
import type { ScriptBreakpoint } from './scriptServices'

export interface ScriptDebugHitToken { readonly epoch: number; readonly key: string; readonly revision: number; readonly sequence: number }
export type ScriptDebugPreparedHit = { status: 'prepared'; token: ScriptDebugHitToken } | { status: 'unavailable'; reason: string }
export type ScriptDebugConsumedHit = { status: 'recorded'; hitCount: number } | { status: 'unavailable'; reason: string }
export interface ScriptDebugCounterSession {
  /** Called only with the Core's current synchronous source/point view; no deferred preparation. */
  prepareHit(scriptUuid: string, source: string, pointIndex: number, point: ScriptBreakpoint): ScriptDebugPreparedHit
  consumeHit(token: ScriptDebugHitToken): ScriptDebugConsumedHit
  dispose(): void
}
export interface ScriptDebugCounterOwner { openSession(worldEpoch: number): ScriptDebugCounterSession }
export interface ScriptDebugCounterLimits { maxPoints: number; maxMetadataBytes: number; maxSourceBytes: number }
export const SCRIPT_DEBUG_COUNTER_LIMITS: Readonly<ScriptDebugCounterLimits> = Object.freeze({ maxPoints: 2_048, maxMetadataBytes: 256 * 1_024, maxSourceBytes: 16 * 1_024 * 1_024 })

interface PointState { scriptUuid: string; point: ScriptBreakpoint; bytes: number; revision: number; hits: number; token: ScriptDebugHitToken | null }
interface SessionState { epoch: number; closed: boolean; points: Map<string, PointState>; sources: Map<string, string>; metadataBytes: number; sourceBytes: number; serial: number }
const snapshot = (point: ScriptBreakpoint): ScriptBreakpoint => ({ id: point.id, line: point.line, functionName: point.functionName, condition: point.condition, hitCondition: point.hitCondition, logMessage: point.logMessage, enabled: point.enabled, hitCount: 0 })
const samePoint = (a: ScriptBreakpoint, b: ScriptBreakpoint) => a.id === b.id && a.line === b.line && a.functionName === b.functionName && a.condition === b.condition && a.hitCondition === b.hitCondition && a.logMessage === b.logMessage && a.enabled === b.enabled
const unavailable = (reason: string): { status: 'unavailable'; reason: string } => ({ status: 'unavailable', reason })

/** One active registration per Owner; replacing it revokes old leases before publishing new state. */
export class BoundedScriptDebugCounterOwner implements ScriptDebugCounterOwner {
  private active: SessionState | null = null
  private readonly limits: ScriptDebugCounterLimits
  private readonly counts = { createdSessions: 0, activeSessions: 0, points: 0, metadataBytes: 0, sourceBytes: 0, refused: 0, hits: 0 }
  get diagnostics(): Readonly<typeof this.counts> { return this.counts }

  constructor(requested: Partial<ScriptDebugCounterLimits> = {}) {
    this.limits = Object.fromEntries(Object.entries(SCRIPT_DEBUG_COUNTER_LIMITS).map(([key, maximum]) => {
      const value = requested[key as keyof ScriptDebugCounterLimits]
      return [key, Number.isFinite(value) ? Math.max(1, Math.min(maximum, Math.floor(value!))) : maximum]
    })) as unknown as ScriptDebugCounterLimits
  }

  openSession(worldEpoch: number): ScriptDebugCounterSession {
    if (!Number.isSafeInteger(worldEpoch) || worldEpoch <= 0 || worldEpoch > 0xffff_ffff) throw new Error('Invalid debug world epoch.')
    if (this.active) this.close(this.active)
    const state: SessionState = { epoch: worldEpoch, closed: false, points: new Map(), sources: new Map(), metadataBytes: 0, sourceBytes: 0, serial: 0 }
    this.active = state; this.counts.createdSessions++; this.refresh(state)
    return {
      prepareHit: (scriptUuid, source, pointIndex, point) => this.prepare(state, scriptUuid, source, pointIndex, point),
      consumeHit: token => this.consume(state, token),
      dispose: () => this.close(state)
    }
  }

  private refresh(state: SessionState): void {
    if (this.active !== state) return
    this.counts.activeSessions = state.closed ? 0 : 1; this.counts.points = state.points.size
    this.counts.metadataBytes = state.metadataBytes; this.counts.sourceBytes = state.sourceBytes
  }

  private close(state: SessionState): void {
    if (state.closed) return
    state.closed = true; state.points.clear(); state.sources.clear(); state.metadataBytes = 0; state.sourceBytes = 0
    this.refresh(state)
    if (this.active === state) this.active = null
  }

  private refuse(reason: string): { status: 'unavailable'; reason: string } { this.counts.refused++; return unavailable(reason) }

  private prepare(state: SessionState, scriptUuid: string, source: string, pointIndex: number, point: ScriptBreakpoint): ScriptDebugPreparedHit {
    if (state.closed || this.active !== state) return this.refuse('stale-debug-session')
    if (typeof scriptUuid !== 'string' || !scriptUuid || typeof source !== 'string' || !Number.isSafeInteger(pointIndex) || pointIndex < 0 || !point || ['id', 'functionName', 'condition', 'logMessage'].some(key => typeof point[key as keyof ScriptBreakpoint] !== 'string') || !Number.isSafeInteger(point.line) || point.line < 1 || typeof point.enabled !== 'boolean' || !Number.isSafeInteger(point.hitCondition) || point.hitCondition < 0) return this.refuse('invalid-debug-point')
    const oldSource = state.sources.get(scriptUuid), sourceChanged = oldSource !== undefined && oldSource !== source
    const sourceBytes = state.sourceBytes - (oldSource?.length ?? 0) * 2 + source.length * 2
    if (sourceBytes > this.limits.maxSourceBytes) return this.refuse('debug-source-byte-capacity')
    // Bound unencoded inputs before allocating a key; JSON can expand one UTF-16 unit to six.
    // These are controlled payload/record budgets, not a claim about exact JS heap size.
    const payloadBytes = 96 + 2 * (scriptUuid.length + point.id.length + point.functionName.length + point.condition.length + point.logMessage.length)
    const maximumKeyBytes = 2 * (6 * scriptUuid.length + String(pointIndex).length + 7)
    if (payloadBytes > this.limits.maxMetadataBytes || maximumKeyBytes > this.limits.maxMetadataBytes) return this.refuse('debug-metadata-byte-capacity')
    // The slot is stable across point ID replacement; the ID belongs to the point revision.
    const key = JSON.stringify([scriptUuid, pointIndex]), bytes = payloadBytes + key.length * 2
    if (bytes > this.limits.maxMetadataBytes) return this.refuse('debug-metadata-byte-capacity')
    const current = sourceChanged ? undefined : state.points.get(key)
    let retiredBytes = 0, retiredPoints = 0
    if (sourceChanged) for (const entry of state.points.values()) if (entry.scriptUuid === scriptUuid) { retiredBytes += entry.bytes; retiredPoints++ }
    if (!current && state.points.size - retiredPoints >= this.limits.maxPoints) return this.refuse('debug-point-capacity')
    const metadataBytes = state.metadataBytes - retiredBytes - (current?.bytes ?? 0) + bytes
    if (metadataBytes > this.limits.maxMetadataBytes) return this.refuse('debug-metadata-byte-capacity')
    if (state.serial >= 0xffff_ffff) return this.refuse('debug-token-sequence-exhausted')
    // All admission checks succeed before invalidating the prior valid source/point state.
    if (sourceChanged) for (const [oldKey, entry] of state.points) if (entry.scriptUuid === scriptUuid) state.points.delete(oldKey)
    const sequence = ++state.serial, changed = !current || !samePoint(current.point, point)
    const entry: PointState = changed ? { scriptUuid, point: snapshot(point), bytes, revision: sequence, hits: 0, token: null } : current
    const token = Object.freeze({ epoch: state.epoch, key, revision: entry.revision, sequence })
    entry.token = token; state.points.set(key, entry); state.sources.set(scriptUuid, source)
    state.metadataBytes = metadataBytes; state.sourceBytes = sourceBytes; this.refresh(state)
    return { status: 'prepared', token }
  }

  private consume(state: SessionState, token: ScriptDebugHitToken): ScriptDebugConsumedHit {
    if (state.closed || this.active !== state) return this.refuse('stale-debug-session')
    if (!token || token.epoch !== state.epoch) return this.refuse('stale-debug-epoch')
    const entry = state.points.get(token.key)
    if (!entry || entry.token !== token || entry.revision !== token.revision) return this.refuse('stale-hit-token')
    entry.token = null; entry.hits = Math.min(1_000_000_000, entry.hits + 1); this.counts.hits++
    return { status: 'recorded', hitCount: entry.hits }
  }
}

/** A bounded, revocable texture upload lease. Completion is GPU commands, never display. */
import type { TextureRegion } from './types'

export interface RequiredResourceVersion {
  readonly catalogIdentity: object
  readonly catalogRevision: number
  readonly mediaOwner: object
  readonly mediaRevision: number
}
export interface RequiredResourceUploadRequest {
  readonly requestId: string
  readonly version: RequiredResourceVersion
  /** Live authority read from the captured Catalog/Media owner; never a global registry. */
  readCurrentVersion(): RequiredResourceVersion
  readonly resources: readonly { readonly resourceId: string; readonly texture: TextureRegion }[]
  readonly signal?: AbortSignal
}
export interface RequiredResourceUploadAck {
  readonly requestId: string
  readonly rendererOwner: object
  readonly deviceEpoch: number
  readonly version: RequiredResourceVersion
  readonly submissionSerial: number
  readonly completionObservedAtMs: number
  readonly resourceCount: number
  readonly uniqueTextureCount: number
  readonly nominalRgbaBytes: number
}
export type RequiredResourceUploadStatus = 'pending' | 'ready' | 'failed' | 'cancelled' | 'invalidated'
export interface RequiredResourceUploadSnapshot {
  readonly requestId: string
  readonly status: RequiredResourceUploadStatus
  readonly reason: string | null
  readonly ack: RequiredResourceUploadAck | null
}
export interface RequiredTextureObservation {
  readonly residencyToken: object
  readonly contentVersion: string
  readonly width: number
  readonly height: number
}
export interface RequiredResourceUploadBackend {
  deviceEpoch(): number
  usable(): boolean
  byteBudget(): number
  dimensions(texture: TextureRegion): { width: number; height: number }
  contentVersion(texture: TextureRegion): string
  resident(texture: TextureRegion): RequiredTextureObservation | null
  queue(texture: TextureRegion): boolean
}
interface HeldTexture { texture: TextureRegion; contentVersion: string; width: number; height: number; bytes: number }
interface Entry {
  id: string; version: RequiredResourceVersion; readVersion: (() => RequiredResourceVersion) | null; epoch: number
  resources: HeldTexture[]; resourceCount: number; bytes: number
  status: RequiredResourceUploadStatus; reason: string | null; ack: RequiredResourceUploadAck | null
  submission: number | null; tokens: object[]; signal?: AbortSignal; abort?: () => void; held: boolean
}
const sameVersion = (a: RequiredResourceVersion, b: RequiredResourceVersion) => !!b && a.catalogIdentity === b.catalogIdentity && a.catalogRevision === b.catalogRevision && a.mediaOwner === b.mediaOwner && a.mediaRevision === b.mediaRevision
const validVersion = (v: RequiredResourceVersion) => !!v && typeof v.catalogIdentity === 'object' && v.catalogIdentity !== null && typeof v.mediaOwner === 'object' && v.mediaOwner !== null && Number.isSafeInteger(v.catalogRevision) && v.catalogRevision >= 0 && Number.isSafeInteger(v.mediaRevision) && v.mediaRevision >= 0

export class RequiredResourceUploadTracker {
  private readonly entries = new Map<string, Entry>()
  private readonly sources = new Map<object, { count: number; bytes: number; version: string }>()
  private bytes = 0
  private closed = false
  constructor(readonly rendererOwner: object, private readonly backend: RequiredResourceUploadBackend) {}

  request(request: RequiredResourceUploadRequest): RequiredResourceUploadSnapshot {
    if (this.closed || !this.backend.usable()) throw new Error('REQUIRED_UPLOAD_RENDERER_UNAVAILABLE')
    if (!request || typeof request.requestId !== 'string' || !request.requestId || request.requestId.length > 256 || this.entries.has(request.requestId) || !validVersion(request.version) || typeof request.readCurrentVersion !== 'function' || !Array.isArray(request.resources) || request.resources.length < 1 || request.resources.length > 2048) throw new Error('REQUIRED_UPLOAD_REQUEST_INVALID')
    if (request.signal?.aborted) throw new Error('REQUIRED_UPLOAD_CANCELLED')
    if (this.entries.size >= 4) throw new Error('REQUIRED_UPLOAD_REQUEST_CAPACITY')
    const readVersion = request.readCurrentVersion.bind(request), version = Object.freeze({ ...request.version })
    if (!sameVersion(version, readVersion())) throw new Error('REQUIRED_UPLOAD_VERSION_CHANGED')
    const unique = new Map<object, HeldTexture>(), ids = new Set<string>()
    for (const resource of request.resources) {
      if (!resource || typeof resource.resourceId !== 'string' || !resource.resourceId || resource.resourceId.length > 512 || ids.has(resource.resourceId) || !resource.texture || typeof resource.texture.source !== 'object' || resource.texture.source === null || resource.texture.revision === undefined || (typeof resource.texture.revision !== 'number' && typeof resource.texture.revision !== 'string') || typeof resource.texture.revision === 'number' && !Number.isFinite(resource.texture.revision) || typeof resource.texture.revision === 'string' && resource.texture.revision.length > 256) throw new Error('REQUIRED_UPLOAD_RESOURCE_INVALID')
      ids.add(resource.resourceId)
      const texture: TextureRegion = { ...resource.texture, uv: { ...resource.texture.uv } }
      const { width, height } = this.backend.dimensions(texture), bytes = width * height * 4, contentVersion = this.backend.contentVersion(texture)
      if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 || !Number.isSafeInteger(bytes) || bytes <= 0) throw new Error('REQUIRED_UPLOAD_DIMENSIONS_INVALID')
      const existing = unique.get(texture.source as object)
      if (existing && (existing.contentVersion !== contentVersion || existing.width !== width || existing.height !== height)) throw new Error('REQUIRED_UPLOAD_SOURCE_VERSION_CONFLICT')
      unique.set(texture.source as object, { texture, width, height, bytes, contentVersion })
    }
    const resources = [...unique.values()]
    let addedBytes = 0, addedSources = 0
    for (const resource of resources) {
      const old = this.sources.get(resource.texture.source as object)
      if (old && (old.version !== resource.contentVersion || old.bytes !== resource.bytes)) throw new Error('REQUIRED_UPLOAD_SOURCE_VERSION_CONFLICT')
      if (!old) { addedBytes += resource.bytes; addedSources++ }
    }
    const budget = this.backend.byteBudget()
    if (!Number.isSafeInteger(budget) || budget < 1 || !Number.isSafeInteger(addedBytes) || this.bytes + addedBytes > budget || this.sources.size + addedSources > 2047) throw new Error(`REQUIRED_UPLOAD_BUDGET_EXCEEDED: required ${this.bytes + addedBytes} bytes, available ${budget}`)
    const entry: Entry = { id: request.requestId, version, readVersion, epoch: this.backend.deviceEpoch(), resources, resourceCount: request.resources.length, bytes: resources.reduce((n, r) => n + r.bytes, 0), status: 'pending', reason: null, ack: null, submission: null, tokens: [], signal: request.signal, held: true }
    this.entries.set(entry.id, entry)
    for (const resource of resources) { const key = resource.texture.source as object, old = this.sources.get(key); if (old) old.count++; else { this.sources.set(key, { count: 1, bytes: resource.bytes, version: resource.contentVersion }); this.bytes += resource.bytes } }
    if (request.signal) { entry.abort = () => this.cancel(entry.id); request.signal.addEventListener('abort', entry.abort, { once: true }); if (request.signal.aborted) this.cancel(entry.id) }
    try { if (this.current(entry)) for (const resource of resources) if (!this.observe(resource) && !this.backend.queue(resource.texture)) { this.finish(entry, 'failed', 'REQUIRED_UPLOAD_QUEUE_REJECTED'); break } }
    catch (error) { this.finish(entry, 'failed', `REQUIRED_UPLOAD_FAILED: ${error instanceof Error ? error.message : String(error)}`) }
    return this.snapshot(entry.id)!
  }
  private current(entry: Entry): boolean {
    if (entry.status !== 'pending' && entry.status !== 'ready') return false
    try {
      if (this.closed || !this.backend.usable() || entry.epoch !== this.backend.deviceEpoch() || !entry.readVersion || !sameVersion(entry.version, entry.readVersion())) { this.finish(entry, 'invalidated', 'REQUIRED_UPLOAD_OWNER_OR_VERSION_CHANGED'); return false }
    } catch (error) { this.finish(entry, 'invalidated', `REQUIRED_UPLOAD_AUTHORITY_FAILED: ${error instanceof Error ? error.message : String(error)}`); return false }
    return true
  }
  private observe(resource: HeldTexture): RequiredTextureObservation | null {
    const observed = this.backend.resident(resource.texture)
    return observed && observed.contentVersion === resource.contentVersion && observed.width === resource.width && observed.height === resource.height ? observed : null
  }
  submitted(serial: number): void {
    for (const entry of this.entries.values()) if (entry.status === 'pending' && entry.submission === null && this.current(entry)) {
      const textures = entry.resources.map(r => this.observe(r))
      if (textures.every((r): r is RequiredTextureObservation => r !== null)) { entry.submission = serial; entry.tokens = textures.map(r => r.residencyToken) }
    }
  }
  completed(serial: number, observedAtMs: number): void {
    for (const entry of this.entries.values()) if (entry.status === 'pending' && entry.submission !== null && entry.submission <= serial && this.current(entry)) {
      if (!this.resident(entry)) { this.finish(entry, 'invalidated', 'REQUIRED_UPLOAD_RESIDENCY_CHANGED'); continue }
      entry.status = 'ready'
      entry.ack = Object.freeze({ requestId: entry.id, rendererOwner: this.rendererOwner, deviceEpoch: entry.epoch, version: entry.version, submissionSerial: entry.submission, completionObservedAtMs: observedAtMs, resourceCount: entry.resourceCount, uniqueTextureCount: entry.resources.length, nominalRgbaBytes: entry.bytes })
    }
  }
  private resident(entry: Entry): boolean { return entry.resources.every((r, i) => this.observe(r)?.residencyToken === entry.tokens[i]) }
  snapshot(id: string): RequiredResourceUploadSnapshot | null {
    const entry = this.entries.get(id); if (!entry) return null
    if (this.current(entry) && entry.submission !== null && !this.resident(entry)) this.finish(entry, 'invalidated', 'REQUIRED_UPLOAD_RESIDENCY_CHANGED')
    return Object.freeze({ requestId: id, status: entry.status, reason: entry.reason, ack: entry.ack })
  }
  isCurrent(ack: RequiredResourceUploadAck): boolean { const entry = this.entries.get(ack.requestId); return !!entry && entry.ack === ack && ack.rendererOwner === this.rendererOwner && this.snapshot(ack.requestId)?.status === 'ready' }
  isRetained(source: object): boolean { return this.sources.has(source) }
  failSource(source: object, reason: string): void { for (const entry of this.entries.values()) if (entry.held && entry.resources.some(r => r.texture.source === source)) this.finish(entry, 'failed', reason) }
  invalidate(reason: string): void { for (const entry of this.entries.values()) if (entry.held) this.finish(entry, 'invalidated', reason) }
  cancel(id: string): boolean { const entry = this.entries.get(id); if (!entry || !entry.held) return false; this.finish(entry, 'cancelled', 'REQUIRED_UPLOAD_CANCELLED'); return true }
  private finish(entry: Entry, status: RequiredResourceUploadStatus, reason: string): void {
    if (!entry.held) return
    entry.held = false; entry.status = status; entry.reason = reason; entry.ack = null
    if (entry.signal && entry.abort) entry.signal.removeEventListener('abort', entry.abort)
    entry.signal = undefined; entry.abort = undefined
    for (const resource of entry.resources) { const key = resource.texture.source as object, held = this.sources.get(key)!; if (--held.count === 0) { this.sources.delete(key); this.bytes -= held.bytes } }
    entry.resources = []; entry.tokens = []; entry.readVersion = null
  }
  release(id: string): boolean { const entry = this.entries.get(id); if (!entry) return false; if (entry.held) this.finish(entry, 'cancelled', 'REQUIRED_UPLOAD_RELEASED'); this.entries.delete(id); return true }
  diagnostics() { return { requests: this.entries.size, retainedSources: this.sources.size, retainedNominalRgbaBytes: this.bytes, pending: [...this.entries.values()].filter(e => e.status === 'pending').length } }
  dispose(): void { if (this.closed) return; this.invalidate('REQUIRED_UPLOAD_RENDERER_DISPOSED'); this.closed = true; this.entries.clear() }
}

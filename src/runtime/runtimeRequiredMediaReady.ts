/** One loading lease driven by the existing viewport frame. No simulation, frame or Media disposal owner. */
import { assertRuntimeSceneMediaRequirements } from './runtimeSceneMediaRequirements'
import type { RuntimeMediaClock, RuntimeSceneMediaRequirements } from './runtimeSceneMediaRequirements'
import type { RuntimeCpuMediaReady, RuntimeMediaBinding } from './runtimeMediaBinding'
import type { Renderer2D, TextureRegion, RequiredResourceUploadAck, RequiredResourceVersion, RequiredResourceUploadSnapshot } from '../renderer/types'

export interface RuntimeCriticalTextureCollection {
  readonly catalogIdentity: object
  readonly mediaToken: object
  readonly entryIdentity: object
  readonly renderer: Renderer2D
  readonly coverage: Readonly<{
    scene: 'caller-verified'
    sceneEvidence: string
    worldText: 'verified-none' | 'verified-published-textures' | 'unverified'
    worldTextEvidence: string
    /** Actual Canvas2D HUD needs no WebGL texture. This certificate does not verify its font/layout/render/display. */
    hud: 'verified-none' | 'verified-published-textures' | 'canvas2d-cpu-overlay' | 'unverified'
    hudEvidence: string
  }>
  /** Published, versioned regions from the actual scene and text consumers. No independent parser/rasterizer. */
  readonly resources: readonly { readonly resourceId: string; readonly texture: TextureRegion; readonly role: 'scene' | 'world-text' | 'hud-text' }[]
}
export interface RuntimeRequiredMediaReadyPorts {
  readonly binding: RuntimeMediaBinding
  readonly renderer: Renderer2D
  readonly clock: RuntimeMediaClock
  collectCriticalTextures(context: Readonly<{ binding: RuntimeMediaBinding; renderer: Renderer2D; requirements: RuntimeSceneMediaRequirements; cpuReady: RuntimeCpuMediaReady }>): RuntimeCriticalTextureCollection | Promise<RuntimeCriticalTextureCollection>
}
export type RuntimeRequiredMediaReadyStatus = 'idle' | 'preparing-cpu' | 'collecting-critical' | 'upload-pending' | 'retained-ready' | 'gpu-not-required' | 'not-ready' | 'unsupported' | 'failed' | 'cancelled' | 'invalidated' | 'closed'
export interface RuntimeRetainedMediaReady {
  readonly scope: 'READY_GPU_COMMANDS_COMPLETE' | 'GPU_NOT_REQUIRED'
  readonly cpuReady: RuntimeCpuMediaReady
  readonly coverage: RuntimeCriticalTextureCollection['coverage']
  readonly ack: RequiredResourceUploadAck | null
}
export interface RuntimeRequiredMediaReadySnapshot {
  readonly status: RuntimeRequiredMediaReadyStatus
  readonly reason: string | null
  readonly requestId: string | null
  readonly resourceCount: number
  readonly hudTextureCount: number
  readonly worldTextTextureCount: number
  readonly terminalTransitions: number
  readonly preparationSettled: boolean
  readonly latePreparationFailure: string | null
  readonly cleanupErrors: readonly string[]
  readonly readyScope: RuntimeRetainedMediaReady['scope'] | null
  readonly costs: Readonly<{ preparationWallMs: number | null; readyObservedWallMs: number | null; gpuExecutionMs: null; displayMs: null }>
}
const message = (error: unknown): string => error instanceof Error ? error.message : String(error)
const sameVersion = (a: RequiredResourceVersion, b: RequiredResourceVersion): boolean => a.catalogIdentity === b.catalogIdentity && a.catalogRevision === b.catalogRevision && a.mediaOwner === b.mediaOwner && a.mediaRevision === b.mediaRevision
const elapsed = (start: number | null, end: number | null): number | null => start === null || end === null || end < start ? null : end - start

export class RuntimeRequiredMediaReady {
  readonly binding: RuntimeMediaBinding
  readonly renderer: Renderer2D
  private readonly clock: RuntimeMediaClock
  private collector: RuntimeRequiredMediaReadyPorts['collectCriticalTextures'] | null
  private status: RuntimeRequiredMediaReadyStatus = 'idle'
  private reason: string | null = null
  private started = false
  private terminal = false
  private terminalTransitions = 0
  private requestId: string | null = null
  private requestHeld = false
  private resources = 0
  private hudTextures = 0
  private worldTextTextures = 0
  private requirements: RuntimeSceneMediaRequirements | null = null
  private cpuReady: RuntimeCpuMediaReady | null = null
  private capturedVersion: RequiredResourceVersion | null = null
  private readiness: RuntimeRetainedMediaReady | null = null
  private signal: AbortSignal | undefined
  private abortListener: (() => void) | undefined
  private operation: Promise<RuntimeRequiredMediaReadySnapshot> | null = null
  private settled = true
  private lateFailure: string | null = null
  private readonly cleanupErrors: string[] = []
  private startedAt: number | null = null
  private preparationWallMs: number | null = null
  private readyObservedWallMs: number | null = null

  constructor(ports: RuntimeRequiredMediaReadyPorts) {
    if (!ports?.binding || !ports.renderer || !ports.clock || ports.clock !== ports.binding.clock || typeof ports.clock.nowMilliseconds !== 'function' || typeof ports.collectCriticalTextures !== 'function') throw new Error('RUNTIME_REQUIRED_MEDIA_PORTS_REQUIRED')
    ports.binding.assertCurrent()
    this.binding = ports.binding; this.renderer = ports.renderer; this.clock = ports.clock
    this.collector = ports.collectCriticalTextures.bind(ports)
  }
  private stamp(): number | null { const value = this.clock.nowMilliseconds(); return Number.isFinite(value) && value >= 0 ? value : null }
  private readVersion(): RequiredResourceVersion {
    this.binding.assertCurrent()
    return { catalogIdentity: this.binding.catalog, catalogRevision: this.binding.catalog.revision(), mediaOwner: this.binding.token, mediaRevision: this.binding.media.textureContentRevision() }
  }
  private assertCpuCurrent(): void {
    this.binding.assertCurrent()
    if (!this.requirements || !this.cpuReady || this.binding.snapshot().ready !== this.cpuReady || this.cpuReady.catalogIdentity !== this.binding.catalog || this.cpuReady.mediaToken !== this.binding.token || this.cpuReady.entryIdentity !== this.requirements.entryIdentity || this.cpuReady.sceneUuid !== this.requirements.sceneUuid) throw new Error('RUNTIME_REQUIRED_MEDIA_CPU_OR_ENTRY_CHANGED')
    assertRuntimeSceneMediaRequirements(this.requirements, this.binding.catalog, this.clock)
  }
  /** Starts once. This promise settles after actual CPU/collector completion, never by pretending a cancelled decode completed. */
  prepare(requirements: RuntimeSceneMediaRequirements, requestId: string, signal?: AbortSignal): Promise<RuntimeRequiredMediaReadySnapshot> {
    if (this.started || this.terminal) throw new Error('RUNTIME_REQUIRED_MEDIA_PREPARATION_ALREADY_STARTED_OR_CLOSED')
    if (typeof requestId !== 'string' || !requestId || requestId.length > 256) throw new Error('RUNTIME_REQUIRED_MEDIA_REQUEST_ID_INVALID')
    assertRuntimeSceneMediaRequirements(requirements, this.binding.catalog, this.clock)
    this.started = true; this.requirements = requirements; this.requestId = requestId; this.signal = signal
    this.abortListener = () => this.cancel()
    signal?.addEventListener('abort', this.abortListener, { once: true })
    if (signal?.aborted) { this.cancel(); return Promise.resolve(this.snapshot()) }
    this.settled = false
    // Publish the completion promise before any injected synchronous CPU/clock/collector callback can close this lease.
    this.operation = Promise.resolve().then(() => this.prepareActual())
    return this.operation
  }
  private async prepareActual(): Promise<RuntimeRequiredMediaReadySnapshot> {
    try {
      if (this.terminal) return this.snapshot()
      this.status = 'preparing-cpu'; this.startedAt = this.stamp()
      if (this.terminal) return this.snapshot()
      // Do not forward loading cancellation: original Binding cancels by disposing Media. Root retires the viewport first.
      this.cpuReady = await this.binding.prepareCpu(this.requirements!)
      if (this.terminal) return this.snapshot()
      this.assertCpuCurrent(); this.status = 'collecting-critical'
      const collection = await this.collector!(Object.freeze({ binding: this.binding, renderer: this.renderer, requirements: this.requirements!, cpuReady: this.cpuReady }))
      if (this.terminal) return this.snapshot()
      this.assertCpuCurrent()
      if (!collection || collection.catalogIdentity !== this.binding.catalog || collection.mediaToken !== this.binding.token || collection.entryIdentity !== this.requirements!.entryIdentity || collection.renderer !== this.renderer) throw new Error('RUNTIME_REQUIRED_MEDIA_COLLECTION_OWNER_MISMATCH')
      const coverage = collection.coverage
      if (!coverage || coverage.scene !== 'caller-verified' || typeof coverage.sceneEvidence !== 'string' || !coverage.sceneEvidence || !['verified-none', 'verified-published-textures', 'canvas2d-cpu-overlay', 'unverified'].includes(coverage.hud) || !['verified-none', 'verified-published-textures', 'unverified'].includes(coverage.worldText) || typeof coverage.worldTextEvidence !== 'string' || !coverage.worldTextEvidence || typeof coverage.hudEvidence !== 'string' || !coverage.hudEvidence) throw new Error('RUNTIME_REQUIRED_MEDIA_COVERAGE_REQUIRED')
      if (coverage.worldText === 'unverified') { this.finish('not-ready', 'RUNTIME_REQUIRED_MEDIA_WORLD_TEXT_COVERAGE_UNVERIFIED'); return this.snapshot() }
      if (coverage.hud === 'unverified') { this.finish('not-ready', 'RUNTIME_REQUIRED_MEDIA_HUD_COVERAGE_UNVERIFIED'); return this.snapshot() }
      if (!Array.isArray(collection.resources) || collection.resources.length > 2048 || collection.resources.some(resource => !resource || !['scene', 'world-text', 'hud-text'].includes(resource.role))) throw new Error('RUNTIME_REQUIRED_MEDIA_COLLECTION_INVALID')
      this.resources = collection.resources.length; this.hudTextures = collection.resources.filter(resource => resource.role === 'hud-text').length; this.worldTextTextures = collection.resources.filter(resource => resource.role === 'world-text').length
      if (coverage.worldText === 'verified-none' && this.worldTextTextures || coverage.worldText === 'verified-published-textures' && !this.worldTextTextures) throw new Error('RUNTIME_REQUIRED_MEDIA_WORLD_TEXT_COVERAGE_CONFLICT')
      if ((coverage.hud === 'verified-none' || coverage.hud === 'canvas2d-cpu-overlay') && this.hudTextures || coverage.hud === 'verified-published-textures' && !this.hudTextures) throw new Error('RUNTIME_REQUIRED_MEDIA_HUD_COVERAGE_CONFLICT')
      if (this.requirements!.mediaPlan.images.length && !collection.resources.some(resource => resource.role === 'scene')) throw new Error('RUNTIME_REQUIRED_MEDIA_SCENE_TEXTURE_COVERAGE_CONFLICT')
      const frozenCoverage = Object.freeze({ ...coverage })
      this.capturedVersion = Object.freeze(this.readVersion())
      this.preparationWallMs = elapsed(this.startedAt, this.stamp())
      if (this.terminal) return this.snapshot()
      if (!this.resources) {
        this.readiness = Object.freeze({ scope: 'GPU_NOT_REQUIRED', cpuReady: this.cpuReady, coverage: frozenCoverage, ack: null })
        this.status = 'gpu-not-required'; this.readyObservedWallMs = this.preparationWallMs
      } else {
        const renderer = this.renderer
        if (typeof renderer.requestRequiredResourceUpload !== 'function' || typeof renderer.pollRequiredResourceUpload !== 'function' || typeof renderer.isRequiredResourceUploadCurrent !== 'function' || typeof renderer.cancelRequiredResourceUpload !== 'function' || typeof renderer.releaseRequiredResourceUpload !== 'function') { this.finish('unsupported', 'RUNTIME_REQUIRED_MEDIA_RENDERER_CAPABILITY_UNSUPPORTED'); return this.snapshot() }
        const result = renderer.requestRequiredResourceUpload({ requestId: this.requestId!, version: this.capturedVersion, readCurrentVersion: () => this.readVersion(), resources: collection.resources })
        this.requestHeld = true
        if (this.terminal) { this.releaseRequest(); return this.snapshot() }
        this.status = 'upload-pending'
        this.readiness = Object.freeze({ scope: 'READY_GPU_COMMANDS_COMPLETE', cpuReady: this.cpuReady, coverage: frozenCoverage, ack: null })
        this.consumeUpload(result)
      }
      this.collector = null
    } catch (error) {
      if (this.terminal) this.lateFailure = message(error)
      else this.finish('failed', message(error))
    } finally { this.settled = true }
    return this.snapshot()
  }
  private consumeUpload(value: RequiredResourceUploadSnapshot | null): void {
    if (this.terminal) return
    if (!value || value.requestId !== this.requestId) { this.finish('invalidated', 'RUNTIME_REQUIRED_MEDIA_UPLOAD_REQUEST_MISSING'); return }
    if (value.status === 'pending') return
    if (value.status !== 'ready' || !value.ack) { this.finish(value.status === 'cancelled' ? 'cancelled' : value.status === 'failed' ? 'failed' : 'invalidated', value.reason ?? 'RUNTIME_REQUIRED_MEDIA_UPLOAD_NOT_READY'); return }
    if (!this.renderer.isRequiredResourceUploadCurrent!(value.ack) || !this.capturedVersion || !sameVersion(this.capturedVersion, value.ack.version)) { this.finish('invalidated', 'RUNTIME_REQUIRED_MEDIA_ACK_CHANGED'); return }
    this.assertCpuCurrent()
    if (!sameVersion(this.capturedVersion, this.readVersion())) { this.finish('invalidated', 'RUNTIME_REQUIRED_MEDIA_VERSION_CHANGED'); return }
    this.readiness = Object.freeze({ ...this.readiness!, ack: value.ack })
    this.status = 'retained-ready'; this.readyObservedWallMs = elapsed(this.startedAt, this.stamp())
  }
  /** Caller invokes after its existing same-renderer frame. Does not begin/draw/end a frame or wait for GPU. */
  notifyExistingFrame(renderer: Renderer2D): RuntimeRequiredMediaReadySnapshot {
    if (renderer !== this.renderer) throw new Error('RUNTIME_REQUIRED_MEDIA_FRAME_RENDERER_MISMATCH')
    if (this.terminal || this.status !== 'upload-pending' && this.status !== 'retained-ready' && this.status !== 'gpu-not-required') return this.snapshot()
    try {
      this.assertCpuCurrent()
      if (!this.capturedVersion || !sameVersion(this.capturedVersion, this.readVersion())) this.finish('invalidated', 'RUNTIME_REQUIRED_MEDIA_VERSION_CHANGED')
      else if (this.requestHeld) this.consumeUpload(this.renderer.pollRequiredResourceUpload!(this.requestId!))
    } catch (error) { this.finish('invalidated', message(error)) }
    return this.snapshot()
  }
  /** A revocable retained certificate. Every consumer calls this again, including after frame/epoch/catalog changes. */
  useRetainedReady(): RuntimeRetainedMediaReady {
    if (!this.terminal && (this.status === 'retained-ready' || this.status === 'gpu-not-required')) {
      try {
        this.assertCpuCurrent()
        if (!this.capturedVersion || !sameVersion(this.capturedVersion, this.readVersion()) || this.status === 'retained-ready' && (!this.readiness?.ack || !this.renderer.isRequiredResourceUploadCurrent!(this.readiness.ack))) this.finish('invalidated', 'RUNTIME_REQUIRED_MEDIA_READY_REVOKED')
      } catch (error) { this.finish('invalidated', message(error)) }
    }
    if (this.terminal || !this.readiness || this.status !== 'retained-ready' && this.status !== 'gpu-not-required') throw new Error('RUNTIME_REQUIRED_MEDIA_NOT_RETAINED_READY: ' + (this.reason ?? this.status))
    return this.readiness
  }
  private releaseRequest(): void {
    if (!this.requestHeld) return
    this.requestHeld = false
    try { this.renderer.cancelRequiredResourceUpload!(this.requestId!) } catch (error) { this.cleanupErrors.push(message(error)) }
    try { this.renderer.releaseRequiredResourceUpload!(this.requestId!) } catch (error) { this.cleanupErrors.push(message(error)) }
  }
  private finish(status: RuntimeRequiredMediaReadyStatus, reason: string): void {
    if (this.terminal) return
    this.terminal = true; this.terminalTransitions++; this.status = status; this.reason = reason; this.readiness = null; this.collector = null
    if (this.signal && this.abortListener) this.signal.removeEventListener('abort', this.abortListener)
    this.signal = undefined; this.abortListener = undefined
    this.releaseRequest()
  }
  cancel(): void { this.finish('cancelled', 'RUNTIME_REQUIRED_MEDIA_CANCELLED') }
  rendererRetired(renderer: Renderer2D): void {
    if (renderer !== this.renderer) throw new Error('RUNTIME_REQUIRED_MEDIA_RETIRED_RENDERER_MISMATCH')
    this.finish('invalidated', 'RUNTIME_REQUIRED_MEDIA_RENDERER_RETIRED')
  }
  /** Closes only this request; never disposes Media/atlas or destroys Renderer. Root retires viewport, then disposes Binding. */
  async dispose(): Promise<void> { this.finish('closed', 'RUNTIME_REQUIRED_MEDIA_CLOSED'); await this.operation }
  snapshot(): RuntimeRequiredMediaReadySnapshot {
    return Object.freeze({ status: this.status, reason: this.reason, requestId: this.requestId, resourceCount: this.resources, hudTextureCount: this.hudTextures, worldTextTextureCount: this.worldTextTextures, terminalTransitions: this.terminalTransitions, preparationSettled: this.settled, latePreparationFailure: this.lateFailure, cleanupErrors: Object.freeze([...this.cleanupErrors]), readyScope: this.status === 'retained-ready' || this.status === 'gpu-not-required' ? this.readiness?.scope ?? null : null, costs: Object.freeze({ preparationWallMs: this.preparationWallMs, readyObservedWallMs: this.readyObservedWallMs, gpuExecutionMs: null, displayMs: null }) })
  }
}

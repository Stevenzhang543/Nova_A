/** One fixed Catalog/Media Owner binding. CPU readiness does not acknowledge Renderer uploads or display. */
import { RuntimeMediaOwner } from './runtimeMediaOwner'
import { assertRuntimeSceneMediaRequirements } from './runtimeSceneMediaRequirements'
import type { RuntimeMediaClock, RuntimeSceneMediaRequirements } from './runtimeSceneMediaRequirements'
import type { RuntimeMediaPorts } from './runtimeMediaOwner'
import type { AssetRecord } from './runtimeAssetRecordContracts'
import type { RuntimeProjectCatalog } from './runtimeProjectCatalog'
import type { TextureFilter } from '../renderer/types'

export interface RuntimeCpuMediaReady {
  readonly scope: 'CPU_MEDIA_READY'
  readonly mediaToken: object
  readonly catalogIdentity: object
  readonly revision: number
  readonly entryIdentity: object
  readonly sceneUuid: string
  readonly imageCount: number
  readonly fontCount: number
  readonly atlasScope: 'ORIGINAL_CATALOG'
  readonly atlasImageCount: number
  readonly costs: Readonly<{ preparationWallMs: number | null; cpuBarrierWallMs: number | null; totalWallMs: number | null; admissionWaitMs: null; codecWallMs: null; mergeWallMs: null; actualHardwareBytes: null }>
}
const claims = new WeakMap<object, RuntimeMediaBinding>()
const stamp = (clock: RuntimeMediaClock): number | null => { const value = clock.nowMilliseconds(); return Number.isFinite(value) && value >= 0 ? value : null }
const elapsed = (start: number | null, end: number | null) => start === null || end === null || end < start ? null : end - start

export class RuntimeMediaBinding {
  readonly media: RuntimeMediaOwner
  readonly revision: number
  private closed = false
  private active = false
  private disposal: Promise<void> | null = null
  private readonly cancellation = new AbortController()
  private ready: RuntimeCpuMediaReady | null = null
  private lastFailure: string | null = null
  constructor(readonly catalog: RuntimeProjectCatalog<AssetRecord>, ports: RuntimeMediaPorts, readonly clock: RuntimeMediaClock) {
    if (!catalog || !clock || typeof clock.nowMilliseconds !== 'function' || typeof catalog.revision !== 'function' || typeof catalog.resolveAsset !== 'function' || typeof catalog.listIdentities !== 'function') throw new Error('RUNTIME_MEDIA_BINDING_PORTS_REQUIRED')
    if (claims.has(catalog)) throw new Error('RUNTIME_MEDIA_CATALOG_ALREADY_BOUND')
    this.revision = catalog.revision()
    const current = () => !this.closed && claims.get(catalog) === this && catalog.revision() === this.revision
    this.media = new RuntimeMediaOwner({ identity: catalog, projectId: catalog.projectId, revision: catalog.revision.bind(catalog), listRecords: catalog.listIdentities.bind(catalog), resolveAsset: catalog.resolveAsset.bind(catalog) }, ports, { isCurrentOwner: current })
    claims.set(catalog, this)
  }
  get token(): object { return this.media.token }
  get isDisposed(): boolean { return this.closed }
  assertCurrent(): void { if (this.closed || claims.get(this.catalog) !== this || this.catalog.revision() !== this.revision) throw new Error('RUNTIME_MEDIA_BINDING_CLOSED_OR_STALE') }
  resolveAsset(reference: string | null | undefined) { this.assertCurrent(); return this.catalog.resolveAsset(reference) }
  resolveTexture(reference: string | null | undefined, filter?: TextureFilter) { this.assertCurrent(); return this.media.resolveTexture(reference, filter) }
  resolveTextureRegion(...args: Parameters<RuntimeMediaOwner['resolveTextureRegion']>) { this.assertCurrent(); return this.media.resolveTextureRegion(...args) }
  fontMetadata(reference: string | null | undefined) { this.assertCurrent(); return this.media.fontMetadata(reference) }
  readMaterialSource(reference: string): string | null { this.assertCurrent(); return this.catalog.resolveAsset(reference)?.assetType === 'material' ? this.catalog.readDependencyText(reference) : null }
  snapshot() { return Object.freeze({ scope: 'CPU_MEDIA_ONLY' as const, closed: this.closed, preparing: this.active, ready: this.ready, lastFailure: this.lastFailure, media: this.media.snapshot(), gpuReady: null }) }
  async prepareCpu(requirements: RuntimeSceneMediaRequirements, signal?: AbortSignal): Promise<RuntimeCpuMediaReady> {
    this.assertCurrent(); assertRuntimeSceneMediaRequirements(requirements, this.catalog, this.clock)
    if (requirements.status !== 'PREPARED') throw new Error('RUNTIME_MEDIA_NOT_READY: ' + requirements.unresolved.join('; '))
    if (this.active) throw new Error('RUNTIME_MEDIA_PREPARATION_ALREADY_ACTIVE')
    if (signal?.aborted) { void this.dispose().catch(() => undefined); throw new Error('RUNTIME_MEDIA_CANCELLED') }
    this.active = true; this.ready = null; this.lastFailure = null
    const cancel = () => { void this.dispose().catch(() => undefined) }
    signal?.addEventListener('abort', cancel, { once: true })
    try {
      const started = stamp(this.clock)
      const value = await this.media.prepareRequired(requirements.mediaPlan, this.cancellation.signal)
      this.assertCurrent()
      if (signal?.aborted) throw new Error('RUNTIME_MEDIA_CANCELLED')
      const ended = stamp(this.clock)
      const ready: RuntimeCpuMediaReady = Object.freeze({ scope: value.scope, mediaToken: this.token, catalogIdentity: this.catalog, revision: this.revision, entryIdentity: requirements.entryIdentity, sceneUuid: requirements.sceneUuid, imageCount: value.imageCount, fontCount: value.fontCount, atlasScope: requirements.atlasScope, atlasImageCount: requirements.atlasImageCount, costs: Object.freeze({ preparationWallMs: requirements.costs.preparationWallMs, cpuBarrierWallMs: elapsed(started, ended), totalWallMs: elapsed(requirements.costs.startedAtMs, ended), admissionWaitMs: null, codecWallMs: null, mergeWallMs: null, actualHardwareBytes: null }) })
      this.ready = ready; return ready
    } catch (error) {
      this.lastFailure = error instanceof Error ? error.message : String(error)
      // Disposal starts now, but the actual codec terminal (not this rejected waiter) releases the claim.
      void this.dispose().catch(() => undefined)
      throw error
    } finally { this.active = false; signal?.removeEventListener('abort', cancel) }
  }
  /** Caller must retire Renderer references before invoking this final Media release. */
  dispose(): Promise<void> {
    if (this.disposal) return this.disposal
    let complete!: () => void, fail!: (error: unknown) => void
    this.disposal = new Promise<void>((resolve, reject) => { complete = resolve; fail = reject })
    this.closed = true; this.ready = null; this.cancellation.abort()
    const release = () => { if (claims.get(this.catalog) === this) claims.delete(this.catalog) }
    try { this.media.dispose().then(() => { release(); complete() }, error => { release(); fail(error) }) }
    catch (error) { this.lastFailure = error instanceof Error ? error.message : String(error); fail(error) }
    return this.disposal
  }
}

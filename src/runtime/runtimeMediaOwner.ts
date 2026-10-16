/** Catalog-bound CPU media. Platform operations retain admission until their real terminal. */
import { BoundedImportCache } from '../assets/importRetention'
import { buildRuntimeTextureAtlases, TEXTURE_ATLAS_LIMITS, type RuntimeAtlasPage } from './runtimeAtlas'
import { DerivedSpriteTextureOwner } from './derivedSpriteTextureOwner'
import { fontFamilyFor } from './runtimeAssetPreparation'
import type { AssetRecord as PersistedAssetRecord } from './runtimeAssetRecordContracts'
import type { CatalogReadonly } from './runtimeProjectCatalog'
import type { TextureRegion } from '../renderer/types'
type AssetRecord = CatalogReadonly<PersistedAssetRecord>

export interface MediaOperation<T> { readonly result: Promise<T>; readonly terminal: Promise<void>; cancel(reason?: string): void }
export interface MediaDecodeOptions { expectedBytes: number; identity: string; revision: number }
export interface RuntimeMediaPorts {
  decodeImage(source: string, options: MediaDecodeOptions): MediaOperation<HTMLImageElement>
  loadFont(family: string, source: string, options: MediaDecodeOptions): MediaOperation<FontFace>
  readonly fontsAvailable: boolean
  installFont(face: FontFace): void
  removeFont(face: FontFace): void
  createCanvas(): HTMLCanvasElement
}
export interface RuntimeMediaCatalog {
  readonly identity: object
  readonly projectId: string
  revision(): number
  listRecords(): readonly AssetRecord[]
  resolveAsset(reference: string | null | undefined): AssetRecord | null
}
export interface RuntimeMediaState {
  atlasPages: RuntimeAtlasPage[]
  atlasError: string
  generation: number
}
export interface RuntimeMediaOwnerOptions {
  /** Temporary unique Editor compatibility choice. Independent Player must never enable it. */
  legacyEditorFontFamilies?: boolean
  /** Only the mutable authoring Catalog may change revision within its fixed session identity. */
  mutableEditorCatalog?: boolean
  state?: RuntimeMediaState
  isCurrentOwner?: () => boolean
  wrapAtlasPage?: (page: RuntimeAtlasPage) => RuntimeAtlasPage
  initialDecodedRevision?: number
  initialAtlasContentRevision?: number
}
const IMAGE_CACHE_LIMITS = Object.freeze({ entries: 256, bytes: 128 * 1024 * 1024 })
let ownerSequence = 0
const aborted = () => new Error('MEDIA_CANCELLED: Media consumer no longer owns this request.')
/** Cancel only this waiter; shared browser work remains admitted until its actual terminal. */
function waitForConsumer<T>(pending: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return pending
  if (signal.aborted) return Promise.reject(aborted())
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => { signal.removeEventListener('abort', onAbort); reject(aborted()) }
    signal.addEventListener('abort', onAbort, { once: true })
    pending.then(value => { signal.removeEventListener('abort', onAbort); resolve(value) }, error => { signal.removeEventListener('abort', onAbort); reject(error) })
  })
}

export class RuntimeMediaOwner {
  readonly token = Object.freeze({})
  readonly state: RuntimeMediaState
  readonly derived: DerivedSpriteTextureOwner
  private readonly sequence: number
  private readonly catalogRevision: number
  private readonly operations = new Set<MediaOperation<unknown>>()
  private readonly pendingImageLoads = new Map<string, MediaOperation<HTMLImageElement>>()
  private readonly rejectedImageSources = new WeakMap<AssetRecord, { source: string; error: string }>()
  private readonly imageCache: BoundedImportCache<string, HTMLImageElement | null>
  private readonly installedFonts = new Map<string, FontFace>()
  private readonly ownedFonts = new WeakMap<FontFace, { uuid: string; source: string }>()
  private readonly fontVersions = new Map<string, { source: string; family: string }>()
  private readonly fontRequests = new Map<string, { source: string; promise: Promise<FontFace | null> }>()
  private atlasRevision = 0
  private atlasContentRevision: number
  private decodedTextureRevision: number
  private closed = false
  private fontVersionSequence = 0
  private disposal: Promise<void> | null = null

  constructor(readonly catalog: RuntimeMediaCatalog, private readonly ports: RuntimeMediaPorts, private readonly options: RuntimeMediaOwnerOptions = {}) {
    if (!catalog || !catalog.identity || typeof catalog.projectId !== 'string' || !catalog.projectId || [catalog.resolveAsset,catalog.listRecords,catalog.revision].some(value => typeof value !== 'function')) throw new Error('MEDIA_CATALOG_REQUIRED')
    if (!ports || [ports.decodeImage,ports.loadFont,ports.installFont,ports.removeFont,ports.createCanvas].some(value => typeof value !== 'function')) throw new Error('MEDIA_PORTS_REQUIRED')
    this.catalogRevision = catalog.revision()
    if (!Number.isSafeInteger(this.catalogRevision) || this.catalogRevision < 0 || ownerSequence >= Number.MAX_SAFE_INTEGER) throw new Error('MEDIA_REVISION_INVALID')
    this.sequence = ++ownerSequence
    this.state = options.state ?? { atlasPages: [], atlasError: '', generation: this.catalogRevision }
    this.atlasContentRevision = options.initialAtlasContentRevision ?? 0
    this.decodedTextureRevision = options.initialDecodedRevision ?? 0
    this.derived = new DerivedSpriteTextureOwner(ports.createCanvas.bind(ports))
    this.imageCache = new BoundedImportCache(IMAGE_CACHE_LIMITS.entries, IMAGE_CACHE_LIMITS.bytes, key => {
      const pending = this.pendingImageLoads.get(key)
      if (pending) { this.pendingImageLoads.delete(key); pending.cancel('Media image cache evicted') }
    })
  }
  get isDisposed(): boolean { return this.closed }
  private current(): boolean { return !this.closed && (this.options.isCurrentOwner?.() ?? true) && (this.options.mutableEditorCatalog || this.catalog.revision() === this.catalogRevision) === true }
  private requireOpen(): void { if (!this.current()) throw new Error('MEDIA_OWNER_CLOSED_OR_STALE') }
  private currentRecord(record: AssetRecord, source: string): boolean { return this.current() && record.source === source && this.catalog.resolveAsset(record.uuid) === record }
  private track<T>(operation: MediaOperation<T>): MediaOperation<T> {
    this.requireOpen()
    this.operations.add(operation as MediaOperation<unknown>)
    void operation.result.catch(() => undefined)
    void operation.terminal.then(() => this.operations.delete(operation as MediaOperation<unknown>))
    return operation
  }
  private decode(source: string, expectedBytes: number, identity: string): MediaOperation<HTMLImageElement> {
    this.requireOpen()
    return this.track(this.ports.decodeImage(source, { expectedBytes, identity: `media:${this.sequence}:${identity}`, revision: this.catalogRevision }))
  }
  async imageMetadata(source: string): Promise<{ width: number; height: number }> {
    this.requireOpen()
    const image = await this.decode(source, IMAGE_CACHE_LIMITS.bytes, 'metadata').result
    this.requireOpen(); return { width: image.naturalWidth, height: image.naturalHeight }
  }
  private effectiveFamily(record: AssetRecord): string {
    if (this.options.legacyEditorFontFamilies) return record.fontFamily || fontFamilyFor(record.uuid)
    let version = this.fontVersions.get(record.uuid)
    if (!version || version.source !== record.source) {
      if (this.fontVersionSequence >= Number.MAX_SAFE_INTEGER) throw new Error('MEDIA_FONT_VERSION_EXHAUSTED')
      version = { source: record.source, family: `NovaRuntimeMedia_${this.sequence}_${++this.fontVersionSequence}_${record.uuid.replace(/-/g, '')}_${this.catalogRevision}` }
      this.fontVersions.set(record.uuid, version)
    }
    return version.family
  }
  async prepareFont(record: AssetRecord): Promise<FontFace | null> {
    this.requireOpen()
    if (record.assetType !== 'font' || !record.source || !this.ports.fontsAvailable) return null
    const existing = this.fontRequests.get(record.uuid)
    if (existing?.source === record.source) return existing.promise
    const source = record.source, operation = this.track(this.ports.loadFont(this.effectiveFamily(record), source, { expectedBytes: Math.max(4, source.length * 2), identity: `media:${this.sequence}:font:${record.uuid}`, revision: this.catalogRevision }))
    const promise = operation.result.then(face => { this.requireOpen(); this.ownedFonts.set(face, { uuid: record.uuid, source }); return face })
    this.fontRequests.set(record.uuid, { source, promise })
    void promise.catch(() => { if (this.fontRequests.get(record.uuid)?.promise === promise) this.fontRequests.delete(record.uuid) })
    return promise
  }
  registerFont(uuid: string, face: FontFace | null): void {
    this.requireOpen(); if (!face) return
    if (this.ownedFonts.get(face)?.uuid !== uuid) throw new Error('MEDIA_FONT_OWNER_MISMATCH')
    this.ports.installFont(face)
    const previous = this.installedFonts.get(uuid)
    if (previous && previous !== face) this.ports.removeFont(previous)
    this.installedFonts.set(uuid, face)
  }
  installFont(record: AssetRecord): void {
    const source = record.source
    void this.prepareFont(record).then(face => { if (this.currentRecord(record, source)) this.registerFont(record.uuid, face) }).catch(() => undefined)
  }
  removeFont(uuid: string): void { const font = this.installedFonts.get(uuid); if (font) this.ports.removeFont(font); this.installedFonts.delete(uuid); this.fontRequests.delete(uuid) }
  fontMetadata(reference: string | null | undefined): { family: string; fallbackFamilies: readonly string[]; outlineWidth: number } | null {
    this.requireOpen(); const asset = this.catalog.resolveAsset(reference)
    if (asset?.assetType !== 'font') return null
    if (!this.options.legacyEditorFontFamilies && !this.installedFonts.has(asset.uuid)) return null
    const family = (name: string) => { const record = this.catalog.listRecords().find(item => item.assetType === 'font' && item.fontFamily === name); return record && this.installedFonts.has(record.uuid) ? this.effectiveFamily(record) : name }
    return { family: this.options.legacyEditorFontFamilies ? asset.fontFamily : this.effectiveFamily(asset), fallbackFamilies: this.options.legacyEditorFontFamilies ? asset.settings.fontSettings.fallbackFamilies : asset.settings.fontSettings.fallbackFamilies.map(family), outlineWidth: asset.settings.fontSettings.outlineWidth }
  }
  clearImages(): void { this.imageCache.clear() }
  deleteImage(uuid: string): void { this.imageCache.delete(uuid) }
  clearDerived(): void { this.derived.clearDerivedSpriteTextures() }
  invalidate(record: AssetRecord): void { this.rejectedImageSources.delete(record); this.imageCache.delete(record.uuid) }
  revisionValues(): { decoded: number; atlas: number } { return { decoded: this.decodedTextureRevision, atlas: this.atlasContentRevision } }
  textureContentRevision(): number { return this.decodedTextureRevision + this.atlasContentRevision }
  imageDecodedCacheStats() { return { entries: this.imageCache.size, bytes: this.imageCache.bytes, pending: this.pendingImageLoads.size, limits: IMAGE_CACHE_LIMITS } }
  snapshot() { return Object.freeze({ disposed: this.closed, pendingOperations: this.operations.size, images: this.imageDecodedCacheStats(), fonts: this.installedFonts.size, atlasPages: this.state.atlasPages.length, contentRevision: this.textureContentRevision(), scope: 'CPU_MEDIA_ONLY' as const, externalSourceRetentionBytes: null }) }

  assetTextureDiagnostic(reference: string | null | undefined): string {
  this.requireOpen()

  const record = this.catalog.resolveAsset(reference)
  if (!record) return 'TEXTURE_MISSING: Select or repair the missing image reference.'
  if (record.derivedSprite) {
    const texture = this.catalog.resolveAsset(record.derivedSprite.textureAsset)
    if (!texture || texture.assetType !== 'image' || texture.derivedSprite) return 'TEXTURE_SOURCE_MISSING: Repair the original image linked by this frame.'
    if (!this.catalog.resolveAsset(record.derivedSprite.ownerAsset)) return 'TEXTURE_OWNER_MISSING: Repair the atlas or sheet that owns this frame.'
    const frame = record.derivedSprite.frame
    if (frame.x + frame.width > texture.width || frame.y + frame.height > texture.height) return 'TEXTURE_FRAME_BOUNDS: This frame no longer fits its source image. Restore or reimport the matching source.'
    const failure = this.rejectedImageSources.get(texture)
    return failure?.source === texture.source ? failure.error : ''
  }
  const failure = this.rejectedImageSources.get(record)
  return failure?.source === record.source ? failure.error : ''
}

  resolveTexture(reference: string | null | undefined, filterOverride?: 'Nearest' | 'Linear'): TextureRegion | null {
  this.requireOpen()

  const record = this.catalog.resolveAsset(reference)
  if (!record || record.assetType !== 'image') return null
  const texture = this.resolveUncroppedTexture(record, filterOverride)
  return texture ? this.importedSpriteRegion(record, texture) : null
}

  resolveUncroppedTexture(record: AssetRecord, filterOverride?: 'Nearest' | 'Linear'): TextureRegion | null {
  if (record.derivedSprite) {
    const image = this.catalog.resolveAsset(record.derivedSprite.textureAsset)
    if (!image || image.assetType !== 'image' || image.derivedSprite) return null
    const texture = this.resolveUncroppedTexture(image, filterOverride)
    return texture ? this.derived.resolveDerivedSpriteTexture(record.derivedSprite, texture, image, filterOverride ?? record.settings.filterMode) : null
  }
  if (!record.source) return null
  for (const page of this.state.atlasPages) {
    const region = page.regions.get(record.uuid)
    if (region) return { ...region, key: region.key + ':revision:' + this.atlasContentRevision, revision: this.atlasContentRevision, filter: filterOverride ?? region.filter, colorSpace: record.settings.colorSpace }
  }
  if (this.rejectedImageSources.get(record)?.source === record.source) return null
  let image = this.imageCache.get(record.uuid)
  if (!image && !this.pendingImageLoads.has(record.uuid)) {
    const expectedBytes = Math.max(4, record.width * record.height * 4)
    if (!Number.isFinite(expectedBytes) || expectedBytes > IMAGE_CACHE_LIMITS.bytes) { this.rejectedImageSources.set(record, { source: record.source, error: 'TEXTURE_MEMORY_BUDGET: This source exceeds the128MiB decoded-image budget. Enable atlas packing or import a smaller source.' }); return null }
    const source = record.source
    if (!this.imageCache.set(record.uuid, null, expectedBytes)) return null
    let operation: MediaOperation<HTMLImageElement>
    try { operation = this.decode(source, record.width > 0 && record.height > 0 ? expectedBytes : IMAGE_CACHE_LIMITS.bytes, record.uuid) }
    catch (error) { this.imageCache.delete(record.uuid); throw error }
    this.pendingImageLoads.set(record.uuid, operation)
    void operation.result.then(loaded => {
      if (this.pendingImageLoads.get(record.uuid) !== operation) return
      this.pendingImageLoads.delete(record.uuid)
      if (!this.currentRecord(record, source)) return
      this.decodedTextureRevision++
      const weight = loaded.naturalWidth * loaded.naturalHeight * 4
      if (!Number.isFinite(weight) || weight <= 0 || !this.imageCache.set(record.uuid, loaded, weight)) { this.imageCache.delete(record.uuid); this.rejectedImageSources.set(record, { source, error: 'TEXTURE_DECODE_FAILED: Image pixels could not be retained. Reimport the source to retry; reduce oversized image dimensions.' }) }
    }, () => {
      if (this.pendingImageLoads.get(record.uuid) !== operation) return
      this.pendingImageLoads.delete(record.uuid); this.imageCache.delete(record.uuid)
      if (this.currentRecord(record, source)) this.rejectedImageSources.set(record, { source, error: 'TEXTURE_DECODE_FAILED: Image decoding failed. Reimport the source to retry.' })
    })
  }
  if (!image || !image.complete || image.naturalWidth <= 0) return null
  return { key: `asset:${record.uuid}:${record.pipeline?.artifactHash || record.importedAt}`, source: image, revision: record.pipeline?.artifactHash || record.importedAt, uv: { x: 0, y: 0, width: 1, height: 1 }, filter: filterOverride ?? record.settings.filterMode, colorSpace: record.settings.colorSpace }
}

  resolveTextureRegion(
  reference: string | null | undefined,
  region: { x: number; y: number; width: number; height: number },
  filterOverride?: 'Nearest' | 'Linear'
): TextureRegion | null {
  this.requireOpen()

  const record = this.catalog.resolveAsset(reference)
  const texture = record?.assetType === 'image' ? this.resolveUncroppedTexture(record, filterOverride) : null
  if (!record || !texture || record.width <= 0 || record.height <= 0) return null
  const x = Math.min(record.width - 1, Math.max(0, Number(region.x) || 0))
  const y = Math.min(record.height - 1, Math.max(0, Number(region.y) || 0))
  const width = Math.min(record.width - x, Math.max(1, Number(region.width) || 1))
  const height = Math.min(record.height - y, Math.max(1, Number(region.height) || 1))
  return {
    ...texture,
    key: `${texture.key}:region:${x}:${y}:${width}:${height}`,
    uv: {
      x: texture.uv.x + x / record.width * texture.uv.width,
      y: texture.uv.y + y / record.height * texture.uv.height,
      width: width / record.width * texture.uv.width,
      height: height / record.height * texture.uv.height
    }
  }
}

  importedSpriteRegion(record: AssetRecord, texture: TextureRegion): TextureRegion {
  const region = record.settings.spriteRegion
  if (!region || record.width <= 0 || record.height <= 0) return texture
  const x = Math.min(record.width - 1, Math.max(0, region.x))
  const y = Math.min(record.height - 1, Math.max(0, region.y))
  const width = Math.min(record.width - x, Math.max(1, region.width))
  const height = Math.min(record.height - y, Math.max(1, region.height))
  return {
    ...texture,
    key: `${texture.key}:${x}:${y}:${width}:${height}`,
    uv: {
      x: texture.uv.x + x / record.width * texture.uv.width,
      y: texture.uv.y + y / record.height * texture.uv.height,
      width: width / record.width * texture.uv.width,
      height: height / record.height * texture.uv.height
    }
  }
}

  async rebuildTextureAtlases(): Promise<void> {
    this.requireOpen(); const revision = ++this.atlasRevision
    const pages = await buildRuntimeTextureAtlases([...this.catalog.listRecords()], {
      decodeImage: source => this.decode(source, TEXTURE_ATLAS_LIMITS.decodedPixels * 4, `atlas:${revision}`).result,
      createCanvas: this.ports.createCanvas.bind(this.ports)
    })
    if (!this.current() || revision !== this.atlasRevision) return
    this.state.atlasPages.splice(0, this.state.atlasPages.length, ...pages.map(page => this.options.wrapAtlasPage?.(page) ?? page))
    this.atlasContentRevision++; this.clearDerived(); this.state.atlasError = ''; this.state.generation++
  }
  queueTextureAtlasRebuild(): void {
    const pending = this.rebuildTextureAtlases(), requestedRevision = this.atlasRevision
    void pending.catch(error => {
      if (!this.current() || requestedRevision !== this.atlasRevision) return
      this.state.atlasError = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500)
      console.error('Texture atlas rebuild failed; the previous valid atlas remains active.', error)
    })
  }
  async prepareRequired(plan: { catalogIdentity: object; revision: number; images: readonly string[]; fonts: readonly string[]; atlas?: boolean }, signal?: AbortSignal): Promise<Readonly<{ scope: 'CPU_MEDIA_READY'; imageCount: number; fontCount: number }>> {
    this.requireOpen()
    if (plan.catalogIdentity !== this.catalog.identity || plan.revision !== this.catalog.revision()) throw new Error('MEDIA_REQUIRED_CATALOG_MISMATCH')
    const check = () => { this.requireOpen(); if (signal?.aborted) throw aborted(); if (plan.revision !== this.catalog.revision()) throw new Error('MEDIA_REQUIRED_REVISION_CHANGED') }
    check()
    if (plan.atlas) { await waitForConsumer(this.rebuildTextureAtlases(), signal); check() }
    for (const reference of plan.images) {
      check(); const record = this.catalog.resolveAsset(reference)
      if (!record || record.assetType !== 'image') throw new Error('MEDIA_REQUIRED_IMAGE_MISSING')
      let texture = this.resolveTexture(reference)
      if (!texture) { const original = record.derivedSprite ? this.catalog.resolveAsset(record.derivedSprite.textureAsset) : record; const pending = original && this.pendingImageLoads.get(original.uuid); if (pending) await waitForConsumer(pending.result, signal); check(); texture = this.resolveTexture(reference) }
      if (!texture) throw new Error(this.assetTextureDiagnostic(reference) || 'MEDIA_REQUIRED_IMAGE_NOT_READY')
    }
    for (const reference of plan.fonts) {
      check(); const record = this.catalog.resolveAsset(reference)
      if (!record || record.assetType !== 'font') throw new Error('MEDIA_REQUIRED_FONT_MISSING')
      const face = await waitForConsumer(this.prepareFont(record), signal); check()
      if (!face) throw new Error('MEDIA_REQUIRED_FONT_UNAVAILABLE')
      this.registerFont(record.uuid, face)
    }
    check(); return Object.freeze({ scope: 'CPU_MEDIA_READY' as const, imageCount: plan.images.length, fontCount: plan.fonts.length })
  }
  dispose(): Promise<void> {
    if (this.disposal) return this.disposal
    this.closed = true; this.atlasRevision++
    for (const operation of this.operations) operation.cancel('Media owner disposed')
    for (const face of this.installedFonts.values()) this.ports.removeFont(face)
    this.installedFonts.clear(); this.fontRequests.clear(); this.imageCache.clear(); this.derived.clearDerivedSpriteTextures()
    // Never mutate published canvas/image sources: the Renderer may still retain their object.
    this.disposal = Promise.all([...this.operations].map(operation => operation.terminal)).then(() => undefined)
    return this.disposal
  }
}

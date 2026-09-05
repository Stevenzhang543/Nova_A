import { resetImportSessionCaches } from './importRetention'
import { reactive } from 'vue'
import { BoundedImportCache, IMPORT_LIMITS } from './importRetention'
import { sha256Bytes } from './contentHash'
import type { AssetImportSettings, AssetPipelineMetadata } from './types'
import { assetSettingsHash, stableAssetSettings, validateImportSource } from './assetProduction'

export const ASSET_IMPORTER_VERSION = '3.1.0'
const CACHE_NAME = 'nova-a-imports-v3.1'
const MAX_PARALLEL_IMPORTS = Math.max(1, Math.min(4, typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? Math.floor(navigator.hardwareConcurrency / 2) : 2))

export interface AssetImportJob {
  id: number
  name: string
  progress: number
  status: 'queued' | 'reading' | 'processing' | 'writing' | 'complete' | 'cancelled' | 'failed'
  error: string
  logs: string[]
  retryable: boolean
}

export interface ExternalAssetChange {
  id: string
  uuid: string
  name: string
  detectedAt: number
  file: File
}

export interface ImportedArtifact {
  bytes: ArrayBuffer
  source: string
  metadata: AssetPipelineMetadata
}

let nextJobId = 1
let running = 0
const waiting: Array<() => void> = []
const controllers = new Map<number, AbortController>()
const memoryCache = new BoundedImportCache<string, Blob>(IMPORT_LIMITS.cacheEntries, IMPORT_LIMITS.memoryBytes)
const retryInputs = new BoundedImportCache<number, { file: File; settings: AssetImportSettings; targetUuid?: string }>(IMPORT_LIMITS.retries, IMPORT_LIMITS.retryBytes, id => { const job = importPipelineState.jobs.find(job => job.id === id); if (job) job.retryable = false })

export const importPipelineState = reactive({ jobs: [] as AssetImportJob[], externalChanges: [] as ExternalAssetChange[] })

function platform(): AssetPipelineMetadata['platform'] {
  const value = typeof navigator === 'undefined' ? '' : navigator.userAgent.toLowerCase()
  if (value.includes('windows')) return 'windows'
  if (value.includes('mac')) return 'macos'
  if (value.includes('linux')) return 'linux'
  return 'web'
}

const stable=stableAssetSettings

async function acquire(signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw new DOMException('Import cancelled', 'AbortError')
  if (running < MAX_PARALLEL_IMPORTS) { running++; return }
  await new Promise<void>((resolve, reject) => {
    const start = () => { signal.removeEventListener('abort', cancel); running++; resolve() }
    const cancel = () => { const index = waiting.indexOf(start); if (index >= 0) waiting.splice(index, 1); reject(new DOMException('Import cancelled', 'AbortError')) }
    waiting.push(start)
    signal.addEventListener('abort', cancel, { once: true })
  })
}

function release(): void { running = Math.max(0, running - 1); waiting.shift()?.() }

async function readBytes(file: File, job: AssetImportJob, signal: AbortSignal): Promise<ArrayBuffer> {
  if (!file.stream) return file.arrayBuffer()
  const reader = file.stream().getReader()
  const cancel = () => { void reader.cancel().catch(() => undefined) }
  signal.addEventListener('abort', cancel, { once: true })
  const chunks: Uint8Array[] = []
  let received = 0
  try {
    while (true) {
      if (signal.aborted) throw new DOMException('Import cancelled', 'AbortError')
      const result = await reader.read()
      if (result.done) break
      chunks.push(result.value)
      received += result.value.byteLength
      if (received > IMPORT_LIMITS.sourceBytes) throw new Error('SOURCE_TOO_LARGE: Source exceeds the 512 MiB importer limit.')
      job.progress = file.size ? Math.min(.62, received / file.size * .62) : .62
    }
  } finally { signal.removeEventListener('abort', cancel); reader.releaseLock() }
  const bytes = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return bytes.buffer
}

async function hashInWorker(bytes: ArrayBuffer, settings: AssetImportSettings, target: string, signal: AbortSignal): Promise<{ sourceHash: string; cacheKey: string }> {
  if (typeof Worker === 'undefined') {
    const source = await crypto.subtle.digest('SHA-256', bytes)
    const sourceHash = [...new Uint8Array(source)].map(value => value.toString(16).padStart(2, '0')).join('')
    const key = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sourceHash}\n${ASSET_IMPORTER_VERSION}\n${target}\n${stable(settings)}`))
    return { sourceHash, cacheKey: [...new Uint8Array(key)].map(value => value.toString(16).padStart(2, '0')).join('') }
  }
  const worker = new Worker(new URL('./import.worker.ts', import.meta.url), { type: 'module' })
  return new Promise((resolve, reject) => {
    const cancel = () => { worker.terminate(); reject(new DOMException('Import cancelled', 'AbortError')) }
    signal.addEventListener('abort', cancel, { once: true })
    worker.onmessage = event => {
      signal.removeEventListener('abort', cancel)
      worker.terminate()
      if (event.data.error) reject(new Error(event.data.error))
      else resolve(event.data as { sourceHash: string; cacheKey: string })
    }
    worker.onerror = event => { signal.removeEventListener('abort', cancel); worker.terminate(); reject(new Error(event.message)) }
    worker.postMessage({ id: 1, bytes, settings: stable(settings), importerVersion: ASSET_IMPORTER_VERSION, platform: target })
  })
}

async function cachedArtifact(key: string): Promise<Blob | null> {
  const memory = memoryCache.get(key)
  if (memory) return memory
  if (typeof caches === 'undefined') return null
  const response = await (await caches.open(CACHE_NAME)).match(`/__nova_import_cache__/${key}`)
  if (!response) return null
  const blob = await response.blob()
  memoryCache.set(key, blob, blob.size)
  return blob
}

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Imported artifact could not be encoded'))
    reader.onerror = () => reject(reader.error ?? new Error('Imported artifact could not be encoded'))
    reader.readAsDataURL(blob)
  })
}

let diskMaintenance: Promise<void> = Promise.resolve()
async function atomicCacheWrite(key: string, blob: Blob): Promise<void> {
  memoryCache.set(key, blob, blob.size)
  if (typeof caches === 'undefined' || blob.size > IMPORT_LIMITS.diskBytes) return
  const task = diskMaintenance.then(async () => {
    const cache = await caches.open(CACHE_NAME)
    const temporary = new Request(new URL(`/__nova_import_cache__/tmp-${key}-${crypto.randomUUID()}`, location.href))
    const final = new Request(new URL(`/__nova_import_cache__/${key}`, location.href))
    try {
      await cache.put(temporary, new Response(blob, { headers: { 'Content-Length': String(blob.size) } }))
      const staged = await cache.match(temporary)
      if (!staged) throw new Error('Atomic asset-cache verification failed')
      await cache.delete(final); await cache.put(final, staged.clone())
    } finally { await cache.delete(temporary) }
    const entries = await cache.keys(); let bytes = 0, count = 0
    // Newest insertions win. Stale temporary entries are always disposable.
    for (const request of [...entries].reverse()) {
      const response = await cache.match(request)
      const declared = response?.headers.get('Content-Length'), size = declared == null ? NaN : Number(declared)
      if (request.url.includes('/tmp-') || !response || !Number.isFinite(size) || size < 0 || ++count > IMPORT_LIMITS.cacheEntries || bytes + size > IMPORT_LIMITS.diskBytes) await cache.delete(request)
      else bytes += size
    }
  })
  diskMaintenance = task.catch(() => undefined); await task
}

async function verifyDecodedArtifact(file: File, blob: Blob): Promise<void> {
  if (!(file.type.startsWith('image/') || /\.(?:png|jpe?g|webp|gif|svg)$/i.test(file.name))) return
  if (typeof createImageBitmap !== 'function') return
  const bitmap = await createImageBitmap(blob).catch(() => null)
  if (!bitmap || bitmap.width < 1 || bitmap.height < 1 || bitmap.width > 32768 || bitmap.height > 32768 || bitmap.width * bitmap.height > 268435456) { bitmap?.close(); throw new Error('IMAGE_DECODE: Source bytes could not be decoded within the 32768px / 268435456-pixel limit.') }
  bitmap.close()
}

export async function processAssetImport(file: File, settings: AssetImportSettings, options: { targetUuid?: string; signal?: AbortSignal } = {}): Promise<ImportedArtifact> {
  if (controllers.size >= IMPORT_LIMITS.jobs) throw new Error('IMPORT_QUEUE_LIMIT: Wait for current imports before adding more files.')
  settings = JSON.parse(JSON.stringify(settings)) as AssetImportSettings
  const job = reactive<AssetImportJob>({ id: nextJobId++, name: file.name, progress: 0, status: 'queued', error: '', logs: ['Queued import'], retryable: false })
  importPipelineState.jobs.push(job)
  const controller = new AbortController()
  controllers.set(job.id, controller)
  const abort = () => controller.abort()
  options.signal?.addEventListener('abort', abort, {once: true}); if(options.signal?.aborted) controller.abort()
  let acquired = false
  try {
    if (file.size > IMPORT_LIMITS.sourceBytes) throw new Error('SOURCE_TOO_LARGE: Source exceeds the 512 MiB importer limit.')
    await acquire(controller.signal); acquired = true
    job.status = 'reading'; job.logs.push('Reading source bytes')
    const bytes = await readBytes(file, job, controller.signal)
    if (controller.signal.aborted) throw new DOMException('Import cancelled', 'AbortError')
    const diagnostics = validateImportSource(file.name, file.type, bytes, settings)
    const blocking = diagnostics.filter(diagnostic => diagnostic.severity === 'error')
    if (blocking.length) throw new Error(blocking.map(diagnostic => `${diagnostic.code}: ${diagnostic.message}`).join('\n'))
    job.status = 'processing'; job.progress = .7; job.logs.push(`Processing with importer ${ASSET_IMPORTER_VERSION}`)
    const target = platform()
    const hashes = await hashInWorker(bytes.slice(0), settings, `${target}\n${file.type}`, controller.signal)
    if (controller.signal.aborted) throw new DOMException('Import cancelled', 'AbortError')
    job.status = 'writing'; job.progress = .88; job.logs.push('Writing verified generated artifact')
    const blob = new Blob([bytes], { type: file.type || 'application/octet-stream' })
    await verifyDecodedArtifact(file, blob)
    if (controller.signal.aborted) throw new DOMException('Import cancelled', 'AbortError')
    let cached: Blob | null = null
    try {
      cached = await cachedArtifact(hashes.cacheKey)
      if (cached && sha256Bytes(new Uint8Array(await cached.arrayBuffer())) !== hashes.sourceHash) { cached = null; memoryCache.delete(hashes.cacheKey); diagnostics.push({ severity: 'warning', code: 'CACHE_CORRUPT', message: 'Discarded a cached artifact that failed its source checksum.' }) }
      if (!cached) await atomicCacheWrite(hashes.cacheKey, blob)
    } catch { diagnostics.push({ severity: 'warning', code: 'CACHE_UNAVAILABLE', message: 'Disposable importer cache is unavailable; verified source bytes were retained.' }) }
    const source = await dataUrl(cached ?? blob)
    if (controller.signal.aborted) throw new DOMException('Import cancelled', 'AbortError')
    job.status = 'complete'; job.progress = 1; job.logs.push(cached ? 'Reused matching cached artifact' : 'Imported artifact verified')
    return {
      bytes, source,
      metadata: {
        importerId: file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg') ? 'nova.svg' : file.type.startsWith('image/') ? 'nova.image' : file.type.startsWith('audio/') ? 'nova.audio' : file.type.startsWith('font/') ? 'nova.font' : 'nova.source',
        importerVersion: ASSET_IMPORTER_VERSION, presetId: settings.textureProfile || 'Default', platform: target, sourceHash: hashes.sourceHash, artifactHash: hashes.sourceHash, contentHash: hashes.sourceHash,
        cacheKey: hashes.cacheKey, status: 'ready', lastValidSource: source, error: '', dependencies: [], reverseDependencies: [], cacheHit: cached !== null,
        settingsHash: assetSettingsHash(settings), artifactSettingsHash: assetSettingsHash({ ...settings, platformVariants: settings.platformVariants[target] ?? settings.compression }),
        invalidationReason: cached ? 'Verified source, importer, settings, and platform cache key matched.' : 'No verified artifact matched this source/importer/settings/platform cache key.',
        sourceSettings: stableAssetSettings(settings), artifactSettings: stableAssetSettings({ target, compression: settings.platformOverrides[target] ?? settings.platformVariants[target] ?? settings.compression }),
        diagnostics, reproducible: true, deprecatedSettings: []
      }
    }
  } catch (error) {
    job.status = controller.signal.aborted || error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'failed'
    job.error = error instanceof Error ? error.message : String(error)
    job.logs.push(job.error); job.retryable = job.status === 'failed'; if (job.retryable) job.retryable = retryInputs.set(job.id, { file, settings, targetUuid: options.targetUuid }, file.size)
    throw error
  } finally {
    options.signal?.removeEventListener('abort', abort)
    controllers.delete(job.id)
    if (acquired) release()
    while (importPipelineState.jobs.length > IMPORT_LIMITS.jobs) { const index = importPipelineState.jobs.findIndex(value => ['complete', 'cancelled', 'failed'].includes(value.status)); if (index < 0) break; retryInputs.delete(importPipelineState.jobs[index].id); importPipelineState.jobs.splice(index, 1) }
    window.setTimeout(() => {
      const index = importPipelineState.jobs.indexOf(job)
      if (index >= 0 && ['complete', 'cancelled', 'failed'].includes(job.status)) { retryInputs.delete(job.id); importPipelineState.jobs.splice(index, 1) }
    }, job.status === 'failed' ? 15_000 : 3000)
  }
}

export function cancelAssetImport(jobId: number): void { controllers.get(jobId)?.abort() }

export async function retryAssetImport(jobId: number): Promise<{ file: File; settings: AssetImportSettings; artifact: ImportedArtifact; targetUuid?: string } | null> {
  const input = retryInputs.get(jobId)
  if (!input) return null
  retryInputs.delete(jobId)
  return { file: input.file, settings: input.settings, targetUuid: input.targetUuid, artifact: await processAssetImport(input.file, input.settings, { targetUuid: input.targetUuid }) }
}

export function notifyExternalAssetChange(uuid: string, file: File): ExternalAssetChange {
  const previous = importPipelineState.externalChanges.findIndex(change => change.uuid === uuid)
  const change: ExternalAssetChange = { id: crypto.randomUUID(), uuid, name: file.name, detectedAt: Date.now(), file }
  if (previous >= 0) importPipelineState.externalChanges.splice(previous, 1, change)
  else { if (importPipelineState.externalChanges.length >= IMPORT_LIMITS.changes) throw new Error('ASSET_CHANGE_LIMIT: Resolve pending external changes first.'); importPipelineState.externalChanges.push(change) }
  return change
}

export function dismissExternalAssetChange(id: string): void {
  const index = importPipelineState.externalChanges.findIndex(change => change.id === id)
  if (index >= 0) importPipelineState.externalChanges.splice(index, 1)
}

type WatchedHandle = { getFile(): Promise<File> }
const watchers = new Map<string, { handle: WatchedHandle; modified: number | null; timer: number; debounce: number; polling: boolean }>()

export function watchAssetSource(uuid: string, handle: WatchedHandle, onChange: (file: File) => Promise<boolean>, initialModified?: number): void {
  stopWatchingAsset(uuid)
  if (watchers.size >= IMPORT_LIMITS.watchers) throw new Error('ASSET_WATCH_LIMIT: Too many watched source files.')
  const entry = { handle, modified: Number.isFinite(initialModified) ? initialModified! : null, timer: 0, debounce: 0, polling: false }
  entry.timer = window.setInterval(async () => {
    if (entry.polling || watchers.get(uuid) !== entry) return
    entry.polling = true
    try {
      const file = await handle.getFile()
      if (watchers.get(uuid) !== entry) return
      if (entry.modified === null) { entry.modified = file.lastModified; return }
      if (file.lastModified === entry.modified) return
      window.clearTimeout(entry.debounce)
      entry.debounce = window.setTimeout(() => {
        if (watchers.get(uuid) !== entry) return
        try { const change = notifyExternalAssetChange(uuid, file); entry.modified = file.lastModified
          void onChange(file).then(reimported => { if (reimported) dismissExternalAssetChange(change.id) }).catch(() => undefined)
        } catch { /* Retain the previous timestamp so a full pending queue is retried on the next poll. */ }
      }, 250)
    } catch { if (watchers.get(uuid) === entry) stopWatchingAsset(uuid) } finally { entry.polling = false }
  }, 1000)
  watchers.set(uuid, entry)
}

export function stopWatchingAsset(uuid: string): void {
  const entry = watchers.get(uuid)
  if (entry) { window.clearInterval(entry.timer); window.clearTimeout(entry.debounce) }
  watchers.delete(uuid)
}

export function isAssetWatched(uuid: string): boolean { return watchers.has(uuid) }

export function clearAssetImportSession(): void {
  resetImportSessionCaches()
  for (const controller of controllers.values()) controller.abort()
  for (const uuid of [...watchers.keys()]) stopWatchingAsset(uuid)
  retryInputs.clear(); memoryCache.clear(); importPipelineState.externalChanges.splice(0)
}
export function assetImportRetentionStats() { return { cacheEntries: memoryCache.size, cacheBytes: memoryCache.bytes, retries: retryInputs.size, retryBytes: retryInputs.bytes, running, queued: waiting.length, watchers: watchers.size } }

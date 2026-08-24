import { reactive } from 'vue'
import type { AssetImportSettings, AssetPipelineMetadata } from './types'
import { assetSettingsHash, stableAssetSettings, validateImportSource } from './assetProduction'

export const ASSET_IMPORTER_VERSION = '3.0.0'
const CACHE_NAME = 'nova-a-imports-v3'
const MAX_PARALLEL_IMPORTS = Math.max(1, Math.min(4, navigator.hardwareConcurrency ? Math.floor(navigator.hardwareConcurrency / 2) : 2))

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
const memoryCache = new Map<string, Blob>()
const retryInputs = new Map<number, { file: File; settings: AssetImportSettings }>()

export const importPipelineState = reactive({ jobs: [] as AssetImportJob[], externalChanges: [] as ExternalAssetChange[] })

function platform(): AssetPipelineMetadata['platform'] {
  const value = navigator.userAgent.toLowerCase()
  if (value.includes('windows')) return 'windows'
  if (value.includes('mac')) return 'macos'
  if (value.includes('linux')) return 'linux'
  return 'web'
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`
  return JSON.stringify(value)
}

async function acquire(signal: AbortSignal): Promise<void> {
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
  const chunks: Uint8Array[] = []
  let received = 0
  try {
    while (true) {
      if (signal.aborted) throw new DOMException('Import cancelled', 'AbortError')
      const result = await reader.read()
      if (result.done) break
      chunks.push(result.value)
      received += result.value.byteLength
      job.progress = file.size ? Math.min(.62, received / file.size * .62) : .62
    }
  } finally { reader.releaseLock() }
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
  if (!('caches' in window)) return null
  const response = await (await caches.open(CACHE_NAME)).match(`/__nova_import_cache__/${key}`)
  if (!response) return null
  const blob = await response.blob()
  memoryCache.set(key, blob)
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

async function atomicCacheWrite(key: string, blob: Blob): Promise<void> {
  memoryCache.set(key, blob)
  if (!('caches' in window)) return
  const cache = await caches.open(CACHE_NAME)
  const temporary = new Request(`/__nova_import_cache__/tmp-${key}-${crypto.randomUUID()}`)
  const final = new Request(`/__nova_import_cache__/${key}`)
  await cache.put(temporary, new Response(blob))
  const staged = await cache.match(temporary)
  if (!staged) throw new Error('Atomic asset-cache verification failed')
  await cache.put(final, staged.clone())
  await cache.delete(temporary)
}

async function verifyDecodedArtifact(file: File, blob: Blob): Promise<void> {
  if (!(file.type.startsWith('image/') || /\.(?:png|jpe?g|webp|gif|svg)$/i.test(file.name))) return
  if (typeof createImageBitmap !== 'function') return
  const bitmap = await createImageBitmap(blob).catch(() => null)
  if (!bitmap || bitmap.width < 1 || bitmap.height < 1) throw new Error('IMAGE_DECODE: Source bytes passed signature checks but could not be decoded.')
  bitmap.close()
}

export async function processAssetImport(file: File, settings: AssetImportSettings): Promise<ImportedArtifact> {
  const job = reactive<AssetImportJob>({ id: nextJobId++, name: file.name, progress: 0, status: 'queued', error: '', logs: ['Queued import'], retryable: false })
  importPipelineState.jobs.push(job)
  const controller = new AbortController()
  controllers.set(job.id, controller)
  let acquired = false
  try {
    await acquire(controller.signal); acquired = true
    job.status = 'reading'; job.logs.push('Reading source bytes')
    const bytes = await readBytes(file, job, controller.signal)
    if (controller.signal.aborted) throw new DOMException('Import cancelled', 'AbortError')
    const diagnostics = validateImportSource(file.name, file.type, bytes, settings)
    const blocking = diagnostics.filter(diagnostic => diagnostic.severity === 'error')
    if (blocking.length) throw new Error(blocking.map(diagnostic => `${diagnostic.code}: ${diagnostic.message}`).join('\n'))
    job.status = 'processing'; job.progress = .7; job.logs.push(`Processing with importer ${ASSET_IMPORTER_VERSION}`)
    const target = platform()
    const hashes = await hashInWorker(bytes.slice(0), settings, target, controller.signal)
    if (controller.signal.aborted) throw new DOMException('Import cancelled', 'AbortError')
    job.status = 'writing'; job.progress = .88; job.logs.push('Writing verified generated artifact')
    const blob = new Blob([bytes], { type: file.type || 'application/octet-stream' })
    await verifyDecodedArtifact(file, blob)
    const cached = await cachedArtifact(hashes.cacheKey)
    const artifact = cached ?? blob
    if (!cached) await atomicCacheWrite(hashes.cacheKey, blob)
    const source = await dataUrl(artifact)
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
    job.status = error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'failed'
    job.error = error instanceof Error ? error.message : String(error)
    job.logs.push(job.error); job.retryable = job.status === 'failed'; if (job.retryable) retryInputs.set(job.id, { file, settings: JSON.parse(JSON.stringify(settings)) as AssetImportSettings })
    throw error
  } finally {
    controllers.delete(job.id)
    if (acquired) release()
    if (importPipelineState.jobs.length > 50) importPipelineState.jobs.splice(0, importPipelineState.jobs.length - 50)
    window.setTimeout(() => {
      const index = importPipelineState.jobs.indexOf(job)
      if (index >= 0 && ['complete', 'cancelled', 'failed'].includes(job.status)) importPipelineState.jobs.splice(index, 1)
    }, job.status === 'failed' ? 15_000 : 3000)
  }
}

export function cancelAssetImport(jobId: number): void { controllers.get(jobId)?.abort() }

export async function retryAssetImport(jobId: number): Promise<{ file: File; settings: AssetImportSettings; artifact: ImportedArtifact } | null> {
  const input = retryInputs.get(jobId)
  if (!input) return null
  retryInputs.delete(jobId)
  return { file: input.file, settings: input.settings, artifact: await processAssetImport(input.file, input.settings) }
}

export function notifyExternalAssetChange(uuid: string, file: File): ExternalAssetChange {
  const previous = importPipelineState.externalChanges.findIndex(change => change.uuid === uuid)
  const change: ExternalAssetChange = { id: crypto.randomUUID(), uuid, name: file.name, detectedAt: Date.now(), file }
  if (previous >= 0) importPipelineState.externalChanges.splice(previous, 1, change)
  else importPipelineState.externalChanges.push(change)
  return change
}

export function dismissExternalAssetChange(id: string): void {
  const index = importPipelineState.externalChanges.findIndex(change => change.id === id)
  if (index >= 0) importPipelineState.externalChanges.splice(index, 1)
}

type WatchedHandle = { getFile(): Promise<File> }
const watchers = new Map<string, { handle: WatchedHandle; modified: number; timer: number }>()

export function watchAssetSource(uuid: string, handle: WatchedHandle, onChange: (file: File) => Promise<boolean>): void {
  stopWatchingAsset(uuid)
  let debounce = 0
  const entry = { handle, modified: 0, timer: 0 }
  entry.timer = window.setInterval(async () => {
    try {
      const file = await handle.getFile()
      if (!entry.modified) { entry.modified = file.lastModified; return }
      if (file.lastModified === entry.modified) return
      entry.modified = file.lastModified
      window.clearTimeout(debounce)
      debounce = window.setTimeout(() => {
        const change = notifyExternalAssetChange(uuid, file)
        void onChange(file).then(reimported => { if (reimported) dismissExternalAssetChange(change.id) }).catch(() => undefined)
      }, 250)
    } catch { stopWatchingAsset(uuid) }
  }, 1000)
  watchers.set(uuid, entry)
}

export function stopWatchingAsset(uuid: string): void {
  const entry = watchers.get(uuid)
  if (entry) window.clearInterval(entry.timer)
  watchers.delete(uuid)
}

export function isAssetWatched(uuid: string): boolean { return watchers.has(uuid) }

/** 资源导入管线：读取来源、计算摘要、验证并缓存产物，管理取消重试及外部来源监听。 */
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
const retryInputs = new BoundedImportCache<number, { file: File; settings: AssetImportSettings; targetUuid?: string }>(IMPORT_LIMITS.retries, IMPORT_LIMITS.retryBytes, /** 重试输入被驱逐时取消对应任务的可重试标记。 */ id => { const job = importPipelineState.jobs.find(/* 比较 job.id 与 id，返回严格相等的判断结果。 */ job => job.id === id); if (job) job.retryable = false })

export const importPipelineState = reactive({ jobs: [] as AssetImportJob[], externalChanges: [] as ExternalAssetChange[] })

/** 根据浏览器平台标识选择导入目标平台，未识别或无导航器时使用 web。 */ function platform(): AssetPipelineMetadata['platform'] {
  const value = typeof navigator === 'undefined' ? '' : navigator.userAgent.toLowerCase()
  if (value.includes('windows')) return 'windows'
  if (value.includes('mac')) return 'macos'
  if (value.includes('linux')) return 'linux'
  return 'web'
}

const stable=stableAssetSettings

/** 获取有界导入并发名额，满额时加入可取消队列。 */ async function acquire(signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw new DOMException('Import cancelled', 'AbortError')
  if (running < MAX_PARALLEL_IMPORTS) { running++; return }
  await new Promise<void>(/** 登记等待导入名额的启动及取消处理器，避免取消任务残留队列。 */ (resolve, reject) => {
    const start = /** 轮到等待任务时移除取消监听，增加运行计数并允许导入继续。 */ () => { signal.removeEventListener('abort', cancel); running++; resolve() }
    const cancel = /** 从并发等待队列移除当前任务并以取消错误结束等待。 */ () => { const index = waiting.indexOf(start); if (index >= 0) waiting.splice(index, 1); reject(new DOMException('Import cancelled', 'AbortError')) }
    waiting.push(start)
    signal.addEventListener('abort', cancel, { once: true })
  })
}

/** 扣减运行名额并唤醒队列首个等待任务。 */ function release(): void { running = Math.max(0, running - 1); waiting.shift()?.() }

/** 以可取消流分块读取源文件并更新进度，检查字节预算后合并缓冲；无流接口时使用文件缓冲读取。 */ async function readBytes(file: File, job: AssetImportJob, signal: AbortSignal): Promise<ArrayBuffer> {
  if (!file.stream) return file.arrayBuffer()
  const reader = file.stream().getReader()
  const cancel = /** 取消正在读取的源文件流，忽略取消自身的清理错误。 */ () => { void reader.cancel().catch(/* 返回 undefined 的当前值。 */ () => undefined) }
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

/** 优先在独立 Worker 中计算源和设置缓存摘要，无 Worker 时使用主线程 Web Crypto。 */ async function hashInWorker(bytes: ArrayBuffer, settings: AssetImportSettings, target: string, signal: AbortSignal): Promise<{ sourceHash: string; cacheKey: string }> {
  if (typeof Worker === 'undefined') {
    const source = await crypto.subtle.digest('SHA-256', bytes)
    const sourceHash = [...new Uint8Array(source)].map(/* 调用 value.toString(16).padStart(2, '0') 并返回调用结果。 */ value => value.toString(16).padStart(2, '0')).join('')
    const key = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sourceHash}\n${ASSET_IMPORTER_VERSION}\n${target}\n${stable(settings)}`))
    return { sourceHash, cacheKey: [...new Uint8Array(key)].map(/* 调用 value.toString(16).padStart(2, '0') 并返回调用结果。 */ value => value.toString(16).padStart(2, '0')).join('') }
  }
  const worker = new Worker(new URL('./import.worker.ts', import.meta.url), { type: 'module' })
  return new Promise(/** 登记哈希 Worker 的取消、回复及错误处理后发送源和设置请求。 */ (resolve, reject) => {
    const cancel = /** 终止哈希 Worker 并以取消错误拒绝当前请求。 */ () => { worker.terminate(); reject(new DOMException('Import cancelled', 'AbortError')) }
    signal.addEventListener('abort', cancel, { once: true })
    worker.onmessage = /** 移除取消监听并终止哈希 Worker，按回复交付摘要或错误。 */ event => {
      signal.removeEventListener('abort', cancel)
      worker.terminate()
      if (event.data.error) reject(new Error(event.data.error))
      else resolve(event.data as { sourceHash: string; cacheKey: string })
    }
    worker.onerror = /** 清理监听并终止异常 Worker，将其错误消息传给导入调用者。 */ event => { signal.removeEventListener('abort', cancel); worker.terminate(); reject(new Error(event.message)) }
    worker.postMessage({ id: 1, bytes, settings: stable(settings), importerVersion: ASSET_IMPORTER_VERSION, platform: target })
  })
}

/** 优先读取内存缓存，再从浏览器缓存恢复产物并尝试加入有界内存缓存。 */ async function cachedArtifact(key: string): Promise<Blob | null> {
  const memory = memoryCache.get(key)
  if (memory) return memory
  if (typeof caches === 'undefined') return null
  const response = await (await caches.open(CACHE_NAME)).match(`/__nova_import_cache__/${key}`)
  if (!response) return null
  const blob = await response.blob()
  memoryCache.set(key, blob, blob.size)
  return blob
}

/** 通过 FileReader 将导入产物编码为数据 URI，读取或编码失败时拒绝。 */ function dataUrl(blob: Blob): Promise<string> {
  return new Promise(/** 建立 Blob 数据 URI 读取器，将读取成功或失败传回等待者。 */ (resolve, reject) => {
    const reader = new FileReader()
    reader.onload = /* 根据 typeof reader.result === 'string' 的真假，分别返回 resolve(reader.result) 或 reject(new Error('Imported artifact could not be encoded'))。 */ () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Imported artifact could not be encoded'))
    reader.onerror = /* 调用 reject(reader.error ?? new Error('Imported artifact could not be encoded')) 并返回调用结果。 */ () => reject(reader.error ?? new Error('Imported artifact could not be encoded'))
    reader.readAsDataURL(blob)
  })
}

let diskMaintenance: Promise<void> = Promise.resolve()
/** 写入内存并串行暂存、提交浏览器缓存，再按条目数和声明字节上限清理旧项。 */ async function atomicCacheWrite(key: string, blob: Blob): Promise<void> {
  memoryCache.set(key, blob, blob.size)
  if (typeof caches === 'undefined' || blob.size > IMPORT_LIMITS.diskBytes) return
  const task = diskMaintenance.then(/** 串行写入临时缓存并核验后替换正式项，清理临时记录及超预算旧缓存。 */ async () => {
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
  diskMaintenance = task.catch(/* 返回 undefined 的当前值。 */ () => undefined); await task
}

/** 对支持的图像源尝试位图解码并检查边长和像素预算，无论成功失败均释放获得的位图。 */ async function verifyDecodedArtifact(file: File, blob: Blob): Promise<void> {
  if (!(file.type.startsWith('image/') || /\.(?:png|jpe?g|webp|gif|svg)$/i.test(file.name))) return
  if (typeof createImageBitmap !== 'function') return
  const bitmap = await createImageBitmap(blob).catch(/* 返回固定值 null。 */ () => null)
  // 部分浏览器不支持直接从 SVG Blob 创建 ImageBitmap，但其图像解码器可以正常显示 SVG。
  if (!bitmap && (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) && typeof Image !== 'undefined') {
    const url = URL.createObjectURL(blob)
    try {
      await new Promise<void>(/** 使用真实图像解码器验证 SVG，超时与错误均清理监听。 */ (resolve, reject) => {
        const image = new Image()
        const timer = setTimeout(/** 限制 SVG 解码等待时间，拒绝不可结算的输入。 */ () => finish(new Error('IMAGE_DECODE: SVG decoding timed out.')), 15000)
        /** 单次结算并解除对源和监听器的引用。 */ function finish(error?: Error) { clearTimeout(timer); image.onload = null; image.onerror = null; image.src = ''; error ? reject(error) : resolve() }
        image.onload = /** 对 SVG 解码后的实际像素使用与位图完全相同的预算。 */ () => finish(image.naturalWidth < 1 || image.naturalHeight < 1 || image.naturalWidth > 32768 || image.naturalHeight > 32768 || image.naturalWidth * image.naturalHeight > 268435456 ? new Error('IMAGE_DECODE: SVG dimensions exceed the importer limit.') : undefined)
        image.onerror = /** 将浏览器解码失败交给导入错误路径。 */ () => finish(new Error('IMAGE_DECODE: SVG source could not be decoded.'))
        image.src = url
      })
      return
    } finally { URL.revokeObjectURL(url) }
  }
  if (!bitmap || bitmap.width < 1 || bitmap.height < 1 || bitmap.width > 32768 || bitmap.height > 32768 || bitmap.width * bitmap.height > 268435456) { bitmap?.close(); throw new Error('IMAGE_DECODE: Source bytes could not be decoded within the 32768px / 268435456-pixel limit.') }
  bitmap.close()
}

/** 在有界可取消队列中读取校验并哈希源文件，验证缓存和解码产物，生成元信息并管理失败重试及任务清理。 */ export async function processAssetImport(file: File, settings: AssetImportSettings, options: { targetUuid?: string; signal?: AbortSignal } = {}): Promise<ImportedArtifact> {
  if (controllers.size >= IMPORT_LIMITS.jobs) throw new Error('IMPORT_QUEUE_LIMIT: Wait for current imports before adding more files.')
  settings = JSON.parse(JSON.stringify(settings)) as AssetImportSettings
  const job = reactive<AssetImportJob>({ id: nextJobId++, name: file.name, progress: 0, status: 'queued', error: '', logs: ['Queued import'], retryable: false })
  importPipelineState.jobs.push(job)
  const controller = new AbortController()
  controllers.set(job.id, controller)
  const abort = /* 调用 controller.abort() 并返回调用结果。 */ () => controller.abort()
  options.signal?.addEventListener('abort', abort, {once: true}); if(options.signal?.aborted) controller.abort()
  let acquired = false
  try {
    if (file.size > IMPORT_LIMITS.sourceBytes) throw new Error('SOURCE_TOO_LARGE: Source exceeds the 512 MiB importer limit.')
    await acquire(controller.signal); acquired = true
    job.status = 'reading'; job.logs.push('Reading source bytes')
    const bytes = await readBytes(file, job, controller.signal)
    if (controller.signal.aborted) throw new DOMException('Import cancelled', 'AbortError')
    const diagnostics = validateImportSource(file.name, file.type, bytes, settings)
    const blocking = diagnostics.filter(/* 比较 diagnostic.severity 与 'error'，返回严格相等的判断结果。 */ diagnostic => diagnostic.severity === 'error')
    if (blocking.length) throw new Error(blocking.map(/** 按模板 `${diagnostic.code}: ${diagnostic.message}` 生成并返回字符串。 */ diagnostic => `${diagnostic.code}: ${diagnostic.message}`).join('\n'))
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
    while (importPipelineState.jobs.length > IMPORT_LIMITS.jobs) { const index = importPipelineState.jobs.findIndex(/* 调用 ['complete', 'cancelled', 'failed'].includes(value.status) 并返回调用结果。 */ value => ['complete', 'cancelled', 'failed'].includes(value.status)); if (index < 0) break; retryInputs.delete(importPipelineState.jobs[index].id); importPipelineState.jobs.splice(index, 1) }
    window.setTimeout(/** 延迟移除已结束导入任务及其保留重试输入，避免状态列表长期增长。 */ () => {
      const index = importPipelineState.jobs.indexOf(job)
      if (index >= 0 && ['complete', 'cancelled', 'failed'].includes(job.status)) { retryInputs.delete(job.id); importPipelineState.jobs.splice(index, 1) }
    }, job.status === 'failed' ? 15_000 : 3000)
  }
}

/** 执行时调用 controllers.get(jobId)?.abort()；不显式返回调用结果。 */ export function cancelAssetImport(jobId: number): void { controllers.get(jobId)?.abort() }

/** 消费保留的失败输入并重新执行导入，返回源设置、目标身份及新产物。 */ export async function retryAssetImport(jobId: number): Promise<{ file: File; settings: AssetImportSettings; artifact: ImportedArtifact; targetUuid?: string } | null> {
  const input = retryInputs.get(jobId)
  if (!input) return null
  retryInputs.delete(jobId)
  return { file: input.file, settings: input.settings, targetUuid: input.targetUuid, artifact: await processAssetImport(input.file, input.settings, { targetUuid: input.targetUuid }) }
}

/** 登记或替换资源的外部文件变更，限制待处理数量并保留文件供后续重导入。 */ export function notifyExternalAssetChange(uuid: string, file: File): ExternalAssetChange {
  const previous = importPipelineState.externalChanges.findIndex(/* 比较 change.uuid 与 uuid，返回严格相等的判断结果。 */ change => change.uuid === uuid)
  const change: ExternalAssetChange = { id: crypto.randomUUID(), uuid, name: file.name, detectedAt: Date.now(), file }
  if (previous >= 0) importPipelineState.externalChanges.splice(previous, 1, change)
  else { if (importPipelineState.externalChanges.length >= IMPORT_LIMITS.changes) throw new Error('ASSET_CHANGE_LIMIT: Resolve pending external changes first.'); importPipelineState.externalChanges.push(change) }
  return change
}

/** 按变更身份移除已处理或忽略的外部变更记录。 */ export function dismissExternalAssetChange(id: string): void {
  const index = importPipelineState.externalChanges.findIndex(/* 比较 change.id 与 id，返回严格相等的判断结果。 */ change => change.id === id)
  if (index >= 0) importPipelineState.externalChanges.splice(index, 1)
}

type WatchedHandle = { getFile(): Promise<File> }
const watchers = new Map<string, { handle: WatchedHandle; modified: number | null; timer: number; debounce: number; polling: boolean }>()

/** 安装有界轮询和防抖文件监听，以监听对象身份避免异步结果作用到替换后的监听。 */ export function watchAssetSource(uuid: string, handle: WatchedHandle, onChange: (file: File) => Promise<boolean>, initialModified?: number): void {
  stopWatchingAsset(uuid)
  if (watchers.size >= IMPORT_LIMITS.watchers) throw new Error('ASSET_WATCH_LIMIT: Too many watched source files.')
  const entry = { handle, modified: Number.isFinite(initialModified) ? initialModified! : null, timer: 0, debounce: 0, polling: false }
  entry.timer = window.setInterval(/** 防止重复文件读取，核对监听身份后检测修改时间并安排防抖通知，句柄失效时停止监听。 */ async () => {
    if (entry.polling || watchers.get(uuid) !== entry) return
    entry.polling = true
    try {
      const file = await handle.getFile()
      if (watchers.get(uuid) !== entry) return
      if (entry.modified === null) { entry.modified = file.lastModified; return }
      if (file.lastModified === entry.modified) return
      window.clearTimeout(entry.debounce)
      entry.debounce = window.setTimeout(/** 防抖到期后登记文件变更并尝试重导入，队列满时保留旧时间以供下次重试。 */ () => {
        if (watchers.get(uuid) !== entry) return
        try { const change = notifyExternalAssetChange(uuid, file); entry.modified = file.lastModified
          void onChange(file).then(/** 仅在自动重导入成功后移除对应待处理文件变更。 */ reimported => { if (reimported) dismissExternalAssetChange(change.id) }).catch(/* 返回 undefined 的当前值。 */ () => undefined)
        } catch { /* Retain the previous timestamp so a full pending queue is retried on the next poll. */ }
      }, 250)
    } catch { if (watchers.get(uuid) === entry) stopWatchingAsset(uuid) } finally { entry.polling = false }
  }, 1000)
  watchers.set(uuid, entry)
}

/** 取消资源的轮询与防抖计时器，并删除监听记录。 */ export function stopWatchingAsset(uuid: string): void {
  const entry = watchers.get(uuid)
  if (entry) { window.clearInterval(entry.timer); window.clearTimeout(entry.debounce) }
  watchers.delete(uuid)
}

/* 调用 watchers.has(uuid) 并返回调用结果。 */ export function isAssetWatched(uuid: string): boolean { return watchers.has(uuid) }

/** 清理会话缓存，取消所有活动导入和文件监听，并释放重试、内存缓存及外部变更记录。 */ export function clearAssetImportSession(): void {
  resetImportSessionCaches()
  for (const controller of controllers.values()) controller.abort()
  for (const uuid of [...watchers.keys()]) stopWatchingAsset(uuid)
  retryInputs.clear(); memoryCache.clear(); importPipelineState.externalChanges.splice(0)
}
/** 返回导入缓存、重试、运行队列和文件监听的当前保留量供诊断。 */ export function assetImportRetentionStats() { return { cacheEntries: memoryCache.size, cacheBytes: memoryCache.bytes, retries: retryInputs.size, retryBytes: retryInputs.bytes, running, queued: waiting.length, watchers: watchers.size } }

/** 游戏导出：收集项目与依赖资源，组织目标产物并提供下载或保存流程。 */
import { assertStudioDraftsSaved } from '../editor/studioSaveBoundary'
import { assetState } from '../assets/AssetDatabase'
import { selectBuildAssets } from '../assets/assetProduction'
import type { AssetRecord } from '../assets/types'
import { assetSourceBytes } from '../assets/contentHash'
import { addEditorLog, editorState } from '../store/editor'
import { getSceneJSON, physicsState, sceneManager, settlePendingDocumentEdits } from '../store/physics'
import { buildProgress, buildSettings, recordBuildHistory, serializeBuildSettings, synchronizeBuildScenes, validateBuildSettings } from './buildSettings'
import { NOVA_ENGINE_VERSION } from '../projects/projectFormat'
import { createNovaPak, packageBase64 } from './novaPak'
import { OFFICIAL_AI_PACKAGE_ID, OFFICIAL_NAVIGATION_PACKAGE_ID, OFFICIAL_NETWORKING_PACKAGE_ID, packageEnabled, packageState } from './packages'
import { productionSettings } from './production'
import { OFFICIAL_ANDROID_PACKAGE_ID } from './packages'
import { projectSessionState } from '../projects/projectSession'
import { stableProjectText, teamWorkflowMetadata } from './teamWorkflow'
import { createBuildProvenance, releaseEngineeringState, webDeploymentHeaders } from './releaseEngineering'
import { validateProductionRuntime } from './productionValidation'
import { createWebArchive } from './webArchive'

interface ExportFile { path: string; dataBase64: string }
interface NativeBuildResult { outputPath: string; files: string[]; launched: boolean; cacheHits?: number; changedFiles?: number; buildId?: string }

interface WritableFile { write(value: Blob | string): Promise<void>; close(): Promise<void> }
interface FileHandle { createWritable(): Promise<WritableFile> }
interface DirectoryHandle {
  getDirectoryHandle(name: string, options: { create: boolean }): Promise<DirectoryHandle>
  getFileHandle(name: string, options: { create: boolean }): Promise<FileHandle>
}

interface ViteManifestEntry { file: string; css?: string[]; assets?: string[]; imports?: string[]; dynamicImports?: string[] }

/* 调用 packageBase64(bytes) 并返回调用结果。 */ function bytesToBase64(bytes: Uint8Array): string { return packageBase64(bytes) }
/* 调用 [...bytes].map(value => value.toString(16).padStart(2, '0')).join('') 并返回调用结果。 */ function bytesToHex(bytes: Uint8Array): string { return [...bytes].map(/* 调用 value.toString(16).padStart(2, '0') 并返回调用结果。 */ value => value.toString(16).padStart(2, '0')).join('') }
/** 结构说明（自动提取）：sha256；输入 bytes；直接调用 bytesToHex、Uint8Array、crypto.subtle.digest、bytes.buffer.slice；等待异步结果。 */ async function sha256(bytes: Uint8Array): Promise<string> { return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer))) }

/** 结构说明（自动提取）：buildSbomSerial；输入 buildId、deterministic；直接调用 crypto.randomUUID、slice、padEnd、replace、buildId.toLowerCase 等。 */ export function buildSbomSerial(buildId: string, deterministic: boolean): string {
  if (!deterministic) return `urn:uuid:${crypto.randomUUID()}`
  const hash = buildId.toLowerCase().replace(/[^0-9a-f]/g, '').padEnd(32, '0').slice(0, 32)
  const variant = ((Number.parseInt(hash[16], 16) & 0x3) | 0x8).toString(16)
  return `urn:uuid:${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

/* 先计算 value.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 80)；仅当其为假值时求右侧 'MyGame'，返回短路求值结果。 */ export function sanitizeGameName(value: string): string {
  return value.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 80) || 'MyGame'
}

/** 结构说明（自动提取）：assetsForBuild；输入 project；直接调用 Array.isArray、JSON.parse、JSON.stringify、selectBuildAssets、result.diagnostics.filter 等；返回路径包含 result.assets；包含显式抛错路径。 */ function assetsForBuild(project:unknown) {
  const source=project&&typeof project==='object'?(project as {assets?:unknown}).assets:undefined
  const snapshot=Array.isArray(source)?source as AssetRecord[]:JSON.parse(JSON.stringify(assetState.records)) as AssetRecord[]
  const result=selectBuildAssets(snapshot,assetState.contentGroups,project,buildSettings.delivery)
  const failures=result.diagnostics.filter(/* 比较 issue.severity 与 'error'，返回严格相等的判断结果。 */ issue=>issue.severity==='error')
  if(failures.length)throw new Error(failures.map(/* 返回 issue.message 的当前值。 */ issue=>issue.message).join('\n'))
  return result.assets
}

/** 结构说明（自动提取）：androidImageFile；输入 reference、path；直接调用 reference.startsWith、reference.slice、assetState.records.find、bytesToBase64、assetSourceBytes。 */ function androidImageFile(reference: string | null, path: string): ExportFile | null {
  if (!reference) return null
  const uuid = reference.startsWith('asset://') ? reference.slice(8) : reference
  const asset = assetState.records.find(/* 比较 item.uuid 与 uuid，返回严格相等的判断结果。 */ item => item.uuid === uuid)
  if (!asset || asset.assetType !== 'image') return null
  return { path, dataBase64: bytesToBase64(assetSourceBytes(asset.source)) }
}

/** 结构说明（自动提取）：projectForBuild；输入 projectJson；直接调用 JSON.parse、Array.isArray、Map、sourceScenes.flatMap、filter 等；写入 project.scenes、project.activeSceneUuid、settings.build、settings.team 等；包含显式抛错路径。 */ function projectForBuild(projectJson: string): string {
  const project = JSON.parse(projectJson) as Record<string, unknown>
  const sourceScenes = Array.isArray(project.scenes) ? project.scenes as Array<Record<string, unknown>> : []
  const scenesByUuid = new Map(sourceScenes.flatMap(/* 根据 typeof scene.uuid === 'string' 的真假，分别返回 [[scene.uuid, scene] as const] 或 []。 */ scene => typeof scene.uuid === 'string' ? [[scene.uuid, scene] as const] : []))
  const orderedScenes = buildSettings.sceneOrder.map(/* 调用 scenesByUuid.get(uuid) 并返回调用结果。 */ uuid => scenesByUuid.get(uuid)).filter(/* 调用 Boolean(scene) 并返回调用结果。 */ (scene): scene is Record<string, unknown> => Boolean(scene))
  if (orderedScenes.length !== buildSettings.sceneOrder.length) throw new Error('One or more build scenes no longer exist. Refresh Build Settings and try again.')
  project.scenes = orderedScenes
  project.activeSceneUuid = buildSettings.startupSceneUuid
  const settings = project.projectSettings && typeof project.projectSettings === 'object'
    ? project.projectSettings as Record<string, unknown>
    : {}
  settings.build = serializeBuildSettings(buildSettings.sceneOrder)
  settings.team = teamWorkflowMetadata()
  project.projectSettings = settings
  return stableProjectText(project)
}

/** 结构说明（自动提取）：fetchBytes；输入 path；直接调用 fetch、path.startsWith、Error、Uint8Array、response.arrayBuffer；等待异步结果；包含显式抛错路径。 */ async function fetchBytes(path: string): Promise<Uint8Array> {
  const response = await fetch(path.startsWith('.') ? path : `./${path}`)
  if (!response.ok) throw new Error(`Could not read bundled player file ${path}`)
  return new Uint8Array(await response.arrayBuffer())
}

/** 结构说明（自动提取）：collectWebPlayerFiles；无显式参数；直接调用 fetch、Error、manifestResponse.json、find、Object.keys 等；写入 manifestResponse；返回路径包含 files；包含循环处理；等待异步结果；包含显式抛错路径。 */ async function collectWebPlayerFiles(): Promise<ExportFile[]> {
  let manifestResponse = await fetch('./player-manifest.json')
  if (!manifestResponse.ok) manifestResponse = await fetch('./.vite/manifest.json')
  if (!manifestResponse.ok) throw new Error('Web Player files are available in a production build. Run pnpm build before exporting from a browser preview.')
  const manifest = await manifestResponse.json() as Record<string, ViteManifestEntry>
  const playerKey = Object.keys(manifest).find(/* 先计算 key === 'player.html' || key.endsWith('/player.ts')；仅当其为假值时求右侧 key.endsWith('player.ts')，返回短路求值结果。 */ key => key === 'player.html' || key.endsWith('/player.ts') || key.endsWith('player.ts'))
  if (!playerKey) throw new Error('The production bundle does not contain Nova Player')
  const paths = new Set<string>(), visited = new Set<string>()
  const includeDynamicEntry = /** 结构说明（自动提取）：includeDynamicEntry；输入 key；直接调用 key.endsWith、packageEnabled。 */ (key: string): boolean => {
    if (key.endsWith('/networking.ts') || key === 'src/runtime/networking.ts') return productionSettings.networking.enabled && packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID)
    if (key.endsWith('/navigation2d.ts') || key === 'src/runtime/navigation2d.ts') return packageEnabled(OFFICIAL_NAVIGATION_PACKAGE_ID)
    if (key.endsWith('/aiTools.ts') || key === 'src/runtime/aiTools.ts') return packageEnabled(OFFICIAL_AI_PACKAGE_ID)
    return true
  }
  const visit = /** 结构说明（自动提取）：visit；输入 key；直接调用 visited.has、visited.add、Error、paths.add、entry.css.forEach 等；包含显式抛错路径。 */ (key: string) => {
    if (visited.has(key)) return
    visited.add(key)
    const entry = manifest[key]
    if (!entry) throw new Error(`Web Player manifest dependency is missing: ${key}`)
    paths.add(entry.file)
    entry.css?.forEach(/* 调用 paths.add(path) 并返回调用结果。 */ path => paths.add(path))
    entry.assets?.forEach(/* 调用 paths.add(path) 并返回调用结果。 */ path => paths.add(path))
    entry.imports?.forEach(visit)
    entry.dynamicImports?.filter(includeDynamicEntry).forEach(visit)
  }
  visit(playerKey)
  const htmlResponse = await fetch('./player.html')
  if (!htmlResponse.ok) throw new Error('Nova Player HTML is missing from this build')
  const html = (await htmlResponse.text()).replace(/<title>.*?<\/title>/i, `<title>${sanitizeGameName(buildSettings.gameName)}</title>`)
  const files: ExportFile[] = [{ path: 'index.html', dataBase64: bytesToBase64(new TextEncoder().encode(html)) }]
  for (const path of paths) files.push({ path, dataBase64: bytesToBase64(await fetchBytes(path)) })
  return files
}

/** 结构说明（自动提取）：directoryAt；输入 root、path；直接调用 filter、path.split、directory.getDirectoryHandle；写入 directory；返回路径包含 directory；包含循环处理；等待异步结果。 */ async function directoryAt(root: DirectoryHandle, path: string): Promise<DirectoryHandle> {
  let directory = root
  for (const part of path.split('/').filter(Boolean)) directory = await directory.getDirectoryHandle(part, { create: true })
  return directory
}

/** 结构说明（自动提取）：writeBrowserFile；输入 root、path、bytes；直接调用 filter、path.split、parts.pop、directoryAt、parts.join 等；等待异步结果。 */ async function writeBrowserFile(root: DirectoryHandle, path: string, bytes: Uint8Array): Promise<void> {
  const parts = path.split('/').filter(Boolean)
  const name = parts.pop()
  if (!name) return
  const directory = await directoryAt(root, parts.join('/'))
  const handle = await directory.getFileHandle(name, { create: true })
  const writable = await handle.createWritable()
  await writable.write(new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)]))
  await writable.close()
}

/** 结构说明（自动提取）：decodeBase64；输入 value；直接调用 atob、Uint8Array.from。 */ function decodeBase64(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, /* 调用 character.charCodeAt(0) 并返回调用结果。 */ character => character.charCodeAt(0))
}

/** 结构说明（自动提取）：exportWebInBrowser；输入 pack、webFiles、zip、directory；直接调用 webFiles.map、createWebArchive、sanitizeGameName、URL.createObjectURL、document.createElement 等；写入 anchor.href、anchor.download；包含循环处理；等待异步结果。 */ async function exportWebInBrowser(pack: Uint8Array, webFiles: ExportFile[], zip = false, directory?: DirectoryHandle): Promise<NativeBuildResult> {
  const picker = (window as unknown as { showDirectoryPicker?: (options?: { mode: 'readwrite' }) => Promise<DirectoryHandle> }).showDirectoryPicker
  if (zip || !picker) {
    const files = [...webFiles.map(/** 构造并返回记录 { path: file.path, bytes: decodeBase64(file.dataBase64) }，字段按当前实参及捕获状态求值。 */ file => ({ path: file.path, bytes: decodeBase64(file.dataBase64) })), { path: 'game.nova-pak', bytes: pack }]
    const archive = await createWebArchive(files)
    const outputPath = sanitizeGameName(buildSettings.gameName) + '-web.zip'
    const url = URL.createObjectURL(archive)
    try {
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = outputPath; anchor.click()
    } finally { window.setTimeout(/* 调用 URL.revokeObjectURL(url) 并返回调用结果。 */ () => URL.revokeObjectURL(url), 1000) }
    return { outputPath, files: files.map(/* 返回 file.path 的当前值。 */ file => file.path), launched: false, cacheHits: 0, changedFiles: files.length, buildId: await sha256(pack) }
  }
  const root = directory ?? await picker.call(window, { mode: 'readwrite' })
  for (const file of webFiles) await writeBrowserFile(root, file.path, decodeBase64(file.dataBase64))
  await writeBrowserFile(root, 'game.nova-pak', pack)
  return { outputPath: sanitizeGameName(buildSettings.gameName), files: ['index.html', 'game.nova-pak', ...webFiles.slice(1).map(/* 返回 file.path 的当前值。 */ file => file.path)], launched: false, cacheHits: 0, changedFiles: webFiles.length + 1, buildId: await sha256(pack) }
}

/** 结构说明（自动提取）：webBuildMetadata；输入 pack、webFiles、projectJson、selectedAssets；直接调用 sha256、decodeBase64、files.push、files.sort、toISOString 等；包含循环处理；等待异步结果。 */ async function webBuildMetadata(pack: Uint8Array, webFiles: ExportFile[], projectJson: string, selectedAssets: AssetRecord[]): Promise<ExportFile[]> {
  const packHash = await sha256(pack)
  const files: Array<{ path: string; sha256: string; bytes: number }> = [{ path: 'game.nova-pak', sha256: packHash, bytes: pack.byteLength }]
  for (const file of webFiles) {
    const bytes = decodeBase64(file.dataBase64)
    files.push({ path: file.path, sha256: await sha256(bytes), bytes: bytes.byteLength })
  }
  files.sort(/* 调用 a.path.localeCompare(b.path) 并返回调用结果。 */ (a, b) => a.path.localeCompare(b.path))
  const report = { format: 'nova-build-report', version: 2, engineVersion: NOVA_ENGINE_VERSION, buildId: packHash, createdAt: buildSettings.delivery.deterministic ? '1970-01-01T00:00:00.000Z' : new Date().toISOString(), target: buildSettings.target, architecture: buildSettings.architecture, profile: buildSettings.profile, runtimeMode: buildSettings.runtimeMode, projectId: projectSessionState.id, totalBytes: files.reduce(/* 计算表达式 sum + file.bytes 并返回结果，沿用操作数的原有类型规则。 */ (sum, file) => sum + file.bytes, 0), cacheMode: buildSettings.delivery.cacheMode, files }
  const patch = { format: 'nova-patch-manifest', version: 1, fromBuild: null, toBuild: packHash, added: files.map(/* 返回 file.path 的当前值。 */ file => file.path), changed: [], removed: [], files }
  const dependencies = { format: 'nova-dependency-report', version: 1, engineVersion: NOVA_ENGINE_VERSION, packages: JSON.parse(projectJson).packages?.lockfile ?? [], assets: selectedAssets.map(/** 构造并返回记录 { uuid: asset.uuid, path: asset.path, type: asset.assetType }，字段按当前实参及捕获状态求值。 */ asset => ({ uuid: asset.uuid, path: asset.path, type: asset.assetType })) }
  const contentManifest = { format: 'nova-content-manifest', version: 1, engineVersion: NOVA_ENGINE_VERSION, buildId: packHash, include: [...buildSettings.delivery.include], exclude: [...buildSettings.delivery.exclude], stripUnusedAssets: buildSettings.delivery.stripUnusedAssets, compression: buildSettings.delivery.compression, files }
  const size = { format: 'nova-build-size-report', version: 1, engineVersion: NOVA_ENGINE_VERSION, totalBytes: files.reduce(/* 计算表达式 sum + file.bytes 并返回结果，沿用操作数的原有类型规则。 */ (sum, file) => sum + file.bytes, 0), files: [...files].sort(/* 计算表达式 b.bytes - a.bytes 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => b.bytes - a.bytes) }
  const provenance = createBuildProvenance({
    engineVersion: NOVA_ENGINE_VERSION, buildId: packHash, projectId: projectSessionState.id, target: buildSettings.target,
    architecture: buildSettings.architecture, profile: buildSettings.profile, releaseChannel: buildSettings.delivery.releaseChannel,
    settings: buildSettings, packages: packageState.lockfile, files, deterministic: buildSettings.delivery.deterministic,
    toolchain: { builder: 'Nova_A Web Export 1', packageManager: 'pnpm 10.30.0', projectFormat: '2.29' }
  })
  const sbom = { format: 'CycloneDX', specVersion: '1.5', serialNumber: buildSbomSerial(packHash, buildSettings.delivery.deterministic), version: 1, metadata: { component: { type: 'application', name: buildSettings.gameName, version: buildSettings.platform.version }, properties: [{ name: 'nova.engine', value: NOVA_ENGINE_VERSION }, { name: 'nova.build', value: packHash }] }, components: packageState.lockfile.map(/** 结构说明（自动提取）：packageState.lockfile.map 回调；输入 entry；返回表达式求值结果。 */ entry => ({ type: 'library', 'bom-ref': `${entry.id}@${entry.version}`, name: entry.id, version: entry.version, hashes: [{ alg: 'SHA-256', content: entry.sha256 }], properties: [{ name: 'nova.source', value: `${entry.source.kind}:${entry.source.location}` }] })) }
  const deployment = { format: 'nova-deployment-manifest', version: 1, engineVersion: NOVA_ENGINE_VERSION, buildId: packHash, mode: buildSettings.delivery.deploymentMode, destination: buildSettings.delivery.deploymentDestination || 'local', releaseChannel: buildSettings.delivery.releaseChannel, implicitNetworkOperation: false, headers: buildSettings.delivery.webHeaders ? '_headers' : null }
  const encode = /** 构造并返回记录 { path, dataBase64: bytesToBase64(new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`)) }，字段按当前实参及捕获状态求值。 */ (path: string, value: unknown): ExportFile => ({ path, dataBase64: bytesToBase64(new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`)) })
  return [
    encode('nova-build-report.json', report),
    encode('nova-content-manifest.json', contentManifest),
    ...(buildSettings.delivery.provenance ? [encode('nova-build-provenance.json', provenance)] : []),
    ...(buildSettings.delivery.sbom ? [encode('nova-sbom.cdx.json', sbom)] : []),
    encode('nova-deployment-manifest.json', deployment),
    ...(buildSettings.delivery.webHeaders ? [{ path: '_headers', dataBase64: bytesToBase64(new TextEncoder().encode(webDeploymentHeaders())) }] : []),
    ...(buildSettings.delivery.sizeReport ? [encode('nova-build-size-report.json', size)] : []),
    ...(buildSettings.delivery.dependencyReport ? [encode('nova-dependency-report.json', dependencies)] : []),
    ...(buildSettings.delivery.patchManifest ? [encode('nova-patch-manifest.json', patch)] : [])
  ]
}

/** 结构说明（自动提取）：buildGame；输入 run、webDelivery；直接调用 settlePendingDocumentEdits、Error、assertStudioDraftsSaved、toISOString、Date 等；写入 buildProgress.phase、buildProgress.percent、buildProgress.message、buildProgress.outputPath 等；返回路径包含 result；等待异步结果；包含显式抛错路径。 */ export async function buildGame(run = false, webDelivery: 'auto' | 'zip' = 'auto'): Promise<NativeBuildResult> {
  if (!settlePendingDocumentEdits()) throw new Error('Finish or cancel invalid edits before exporting the project.')
  assertStudioDraftsSaved()
  const startedAt = new Date().toISOString()
  const startedClock = performance.now()
  synchronizeBuildScenes(sceneManager.scenes.map(/* 返回 scene.uuid 的当前值。 */ scene => scene.uuid))
  const validationErrors = [
    ...validateBuildSettings(buildSettings),
    ...validateProductionRuntime(assetState, editorState.rendererStats, physicsState.audioSettings)
  ].filter(/* 比较 issue.severity 与 'error'，返回严格相等的判断结果。 */ issue => issue.severity === 'error')
  if (validationErrors.length) throw new Error(validationErrors.map(/* 返回 issue.message 的当前值。 */ issue => issue.message).join(' '))
  if (buildSettings.target === 'android' && !packageEnabled(OFFICIAL_ANDROID_PACKAGE_ID)) throw new Error('Install the optional Nova Android Export package before selecting Android.')
  if (buildSettings.runtimeMode === 'headless-server') {
    if (buildSettings.target === 'web') throw new Error('Headless authoritative-server exports require a native desktop target.')
    if (!packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID) || !productionSettings.networking.enabled || !productionSettings.networking.autoStart) throw new Error('Enable the optional Nova Networking package, networking settings, and automatic runtime startup before exporting a headless server.')
    if (productionSettings.networking.role === 'client') throw new Error('Headless server exports require the networking role Server or Host.')
  }
  if (webDelivery === 'zip' && buildSettings.target !== 'web') throw new Error('ZIP download requires the Web target.')
  buildProgress.phase = 'validating'; buildProgress.percent = 8; buildProgress.message = 'Validating scenes and asset references…'; buildProgress.outputPath = ''
  // Request the folder while the activating user gesture is still available.
  const picker = (window as unknown as { showDirectoryPicker?: (options: { mode: 'readwrite' }) => Promise<DirectoryHandle> }).showDirectoryPicker
  const browserDirectory = webDelivery === 'auto' && buildSettings.target === 'web' && !('__TAURI_INTERNALS__' in window) && picker ? await picker.call(window, { mode: 'readwrite' }) : undefined

  const projectJson = projectForBuild(getSceneJSON())
  buildProgress.phase = 'packing'; buildProgress.percent = 32; buildProgress.message = 'Creating indexed game.nova-pak…'
  const selectedAssets = assetsForBuild(JSON.parse(projectJson))
  const pack = await createNovaPak(projectJson, selectedAssets, buildSettings.startupSceneUuid, { deterministic: buildSettings.delivery.deterministic, compression: buildSettings.delivery.compression, authoritativeAssets: true })
  buildProgress.phase = 'exporting'; buildProgress.percent = 66; buildProgress.message = 'Writing Nova Player export…'
  const webFiles = buildSettings.target === 'web' || buildSettings.target === 'android' ? await collectWebPlayerFiles() : []
  if (buildSettings.target === 'web') webFiles.push(...await webBuildMetadata(pack, webFiles, projectJson, selectedAssets))
  if (buildSettings.target === 'android') {
    const icon = androidImageFile(buildSettings.platform.iconAsset, 'nova-android/mipmap-hdpi/ic_launcher.png')
    const splash = androidImageFile(buildSettings.platform.splashAsset, 'nova-android/drawable/nova_splash.png')
    if (icon) webFiles.push(icon); if (splash) webFiles.push(splash)
  }
  let result: NativeBuildResult
  if (buildSettings.target === 'web' && webDelivery === 'zip') {
    result = await exportWebInBrowser(pack, webFiles, true)
  } else if ('__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core')
    result = await invoke<NativeBuildResult>('export_game', {
      request: {
        gameName: sanitizeGameName(buildSettings.gameName), target: buildSettings.target,
        architecture: buildSettings.architecture, runtimeMode: buildSettings.runtimeMode, packageIntoExecutable: buildSettings.packageIntoExecutable,
        developmentBuild: buildSettings.developmentBuild, outputDirectory: buildSettings.outputDirectory,
        packBase64: packageBase64(pack), webFiles, run, projectId: projectSessionState.id,
        profile: buildSettings.profile, platform: buildSettings.platform, delivery: buildSettings.delivery
      }
    })
  } else {
    if (buildSettings.target !== 'web') throw new Error('Desktop game exports must be created from the Nova_A desktop editor. Web export is available here.')
    result = await exportWebInBrowser(pack, webFiles, false, browserDirectory)
  }
  buildProgress.phase = 'complete'; buildProgress.percent = 100; buildProgress.message = `Build complete: ${result.outputPath}`; buildProgress.outputPath = result.outputPath; buildProgress.cacheHits = result.cacheHits ?? 0; buildProgress.changedFiles = result.changedFiles ?? result.files.length
  editorState.statusText = buildProgress.message
  addEditorLog(buildProgress.message, 'Project', 'info', result.outputPath)
  if (!releaseEngineeringState.lastManifest || releaseEngineeringState.lastManifest.buildId !== (result.buildId || await sha256(pack))) {
    createBuildProvenance({
      engineVersion: NOVA_ENGINE_VERSION, buildId: result.buildId || await sha256(pack), projectId: projectSessionState.id,
      target: buildSettings.target, architecture: buildSettings.architecture, profile: buildSettings.profile,
      releaseChannel: buildSettings.delivery.releaseChannel, settings: buildSettings, packages: packageState.lockfile,
      files: [{ path: 'game.nova-pak', sha256: await sha256(pack), bytes: pack.byteLength }], deterministic: buildSettings.delivery.deterministic,
      toolchain: { builder: '__TAURI_INTERNALS__' in window ? 'Nova_A Desktop Export 1' : 'Nova_A Web Export 1', projectFormat: '2.29' }
    })
  }
  const manifest = releaseEngineeringState.lastManifest
  recordBuildHistory({
    id: crypto.randomUUID(), startedAt, finishedAt: new Date().toISOString(), target: buildSettings.target, profile: buildSettings.profile,
    status: 'complete', outputPath: result.outputPath, buildId: result.buildId ?? '', sizeBytes: pack.byteLength,
    message: `${selectedAssets.length} assets; ${result.changedFiles ?? result.files.length} changed files`, durationMs: Math.max(0, performance.now() - startedClock),
    inputsHash: manifest?.inputsHash, outputsHash: manifest?.outputsHash, cacheKey: manifest?.cacheKey,
    manifestPath: `${result.outputPath}/nova-build-provenance.json`, log: [`target=${buildSettings.target}`, `profile=${buildSettings.profile}`, `template=${buildSettings.delivery.exportTemplate}`, `cache=${buildSettings.delivery.cacheMode}`],
    evidenceStatus: buildSettings.delivery.releaseChannel === 'stable' && buildSettings.platform.signingMode === 'none' ? 'warning' : 'passed'
  })
  return result
}

/** 结构说明（自动提取）：failBuild；输入 error；直接调用 String、addEditorLog；写入 buildProgress.phase、buildProgress.message、buildProgress.percent、editorState.statusText；返回路径包含 message。 */ export function failBuild(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  buildProgress.phase = 'failed'; buildProgress.message = message; buildProgress.percent = 0
  editorState.statusText = message
  addEditorLog(message, 'Engine', 'error', 'Build Settings')
  return message
}

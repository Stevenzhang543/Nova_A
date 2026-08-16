import { assetState } from '../assets/AssetDatabase'
import { addEditorLog, editorState } from '../store/editor'
import { getSceneJSON, sceneManager } from '../store/physics'
import { buildProgress, buildSettings, synchronizeBuildScenes, validateBuildSettings } from './buildSettings'
import { createNovaPak, packageBase64 } from './novaPak'
import { OFFICIAL_AI_PACKAGE_ID, OFFICIAL_NAVIGATION_PACKAGE_ID, OFFICIAL_NETWORKING_PACKAGE_ID, packageEnabled } from './packages'
import { productionSettings } from './production'
import { OFFICIAL_ANDROID_PACKAGE_ID } from './packages'
import { projectSessionState } from '../projects/projectSession'
import { stableProjectText } from './teamWorkflow'

interface ExportFile { path: string; dataBase64: string }
interface NativeBuildResult { outputPath: string; files: string[]; launched: boolean; cacheHits?: number; changedFiles?: number; buildId?: string }

interface WritableFile { write(value: Blob | string): Promise<void>; close(): Promise<void> }
interface FileHandle { createWritable(): Promise<WritableFile> }
interface DirectoryHandle {
  getDirectoryHandle(name: string, options: { create: boolean }): Promise<DirectoryHandle>
  getFileHandle(name: string, options: { create: boolean }): Promise<FileHandle>
}

interface ViteManifestEntry { file: string; css?: string[]; assets?: string[]; imports?: string[]; dynamicImports?: string[] }

function bytesToBase64(bytes: Uint8Array): string { return packageBase64(bytes) }
function bytesToHex(bytes: Uint8Array): string { return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('') }
async function sha256(bytes: Uint8Array): Promise<string> { return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer))) }

function sanitizeGameName(value: string): string {
  return value.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 80) || 'MyGame'
}

function projectForBuild(projectJson: string): string {
  const project = JSON.parse(projectJson) as Record<string, unknown>
  const sourceScenes = Array.isArray(project.scenes) ? project.scenes as Array<Record<string, unknown>> : []
  const scenesByUuid = new Map(sourceScenes.flatMap(scene => typeof scene.uuid === 'string' ? [[scene.uuid, scene] as const] : []))
  const orderedScenes = buildSettings.sceneOrder.map(uuid => scenesByUuid.get(uuid)).filter((scene): scene is Record<string, unknown> => Boolean(scene))
  if (orderedScenes.length !== buildSettings.sceneOrder.length) throw new Error('One or more build scenes no longer exist. Refresh Build Settings and try again.')
  project.scenes = orderedScenes
  project.activeSceneUuid = buildSettings.startupSceneUuid
  const settings = project.projectSettings && typeof project.projectSettings === 'object'
    ? project.projectSettings as Record<string, unknown>
    : {}
  settings.build = { ...buildSettings, sceneOrder: [...buildSettings.sceneOrder], outputDirectory: '' }
  project.projectSettings = settings
  return stableProjectText(project)
}

async function fetchBytes(path: string): Promise<Uint8Array> {
  const response = await fetch(path.startsWith('.') ? path : `./${path}`)
  if (!response.ok) throw new Error(`Could not read bundled player file ${path}`)
  return new Uint8Array(await response.arrayBuffer())
}

async function collectWebPlayerFiles(): Promise<ExportFile[]> {
  const manifestResponse = await fetch('./.vite/manifest.json')
  if (!manifestResponse.ok) throw new Error('Web Player files are available in a production build. Run pnpm build before exporting from a browser preview.')
  const manifest = await manifestResponse.json() as Record<string, ViteManifestEntry>
  const playerKey = Object.keys(manifest).find(key => key === 'player.html' || key.endsWith('/player.ts') || key.endsWith('player.ts'))
  if (!playerKey) throw new Error('The production bundle does not contain Nova Player')
  const paths = new Set<string>()
  const includeDynamicEntry = (key: string): boolean => {
    if (key.endsWith('/networking.ts') || key === 'src/runtime/networking.ts') return productionSettings.networking.enabled && packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID)
    if (key.endsWith('/navigation2d.ts') || key === 'src/runtime/navigation2d.ts') return packageEnabled(OFFICIAL_NAVIGATION_PACKAGE_ID)
    if (key.endsWith('/aiTools.ts') || key === 'src/runtime/aiTools.ts') return packageEnabled(OFFICIAL_AI_PACKAGE_ID)
    return true
  }
  const visit = (key: string) => {
    const entry = manifest[key]
    if (!entry) return
    paths.add(entry.file)
    entry.css?.forEach(path => paths.add(path))
    entry.assets?.forEach(path => paths.add(path))
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

async function directoryAt(root: DirectoryHandle, path: string): Promise<DirectoryHandle> {
  let directory = root
  for (const part of path.split('/').filter(Boolean)) directory = await directory.getDirectoryHandle(part, { create: true })
  return directory
}

async function writeBrowserFile(root: DirectoryHandle, path: string, bytes: Uint8Array): Promise<void> {
  const parts = path.split('/').filter(Boolean)
  const name = parts.pop()
  if (!name) return
  const directory = await directoryAt(root, parts.join('/'))
  const handle = await directory.getFileHandle(name, { create: true })
  const writable = await handle.createWritable()
  await writable.write(new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)]))
  await writable.close()
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

async function exportWebInBrowser(pack: Uint8Array, webFiles: ExportFile[]): Promise<NativeBuildResult> {
  const picker = (window as unknown as { showDirectoryPicker?: (options?: { mode: 'readwrite' }) => Promise<DirectoryHandle> }).showDirectoryPicker
  if (!picker) {
    const url = URL.createObjectURL(new Blob([pack.buffer.slice(pack.byteOffset, pack.byteOffset + pack.byteLength)], { type: 'application/x-nova-pak' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'game.nova-pak'; anchor.click(); URL.revokeObjectURL(url)
    return { outputPath: anchor.download, files: [anchor.download], launched: false, cacheHits: 0, changedFiles: 1, buildId: await sha256(pack) }
  }
  const root = await picker({ mode: 'readwrite' })
  for (const file of webFiles) await writeBrowserFile(root, file.path, decodeBase64(file.dataBase64))
  await writeBrowserFile(root, 'game.nova-pak', pack)
  return { outputPath: sanitizeGameName(buildSettings.gameName), files: ['index.html', 'game.nova-pak', ...webFiles.slice(1).map(file => file.path)], launched: false, cacheHits: 0, changedFiles: webFiles.length + 1, buildId: await sha256(pack) }
}

async function webBuildMetadata(pack: Uint8Array, webFiles: ExportFile[]): Promise<ExportFile[]> {
  const packHash = await sha256(pack)
  const files: Array<{ path: string; sha256: string; bytes: number }> = [{ path: 'game.nova-pak', sha256: packHash, bytes: pack.byteLength }]
  for (const file of webFiles) {
    const bytes = decodeBase64(file.dataBase64)
    files.push({ path: file.path, sha256: await sha256(bytes), bytes: bytes.byteLength })
  }
  files.sort((a, b) => a.path.localeCompare(b.path))
  const report = { format: 'nova-build-report', version: 1, engineVersion: '3.0.0', buildId: packHash, createdAt: buildSettings.delivery.deterministic ? '1970-01-01T00:00:00.000Z' : new Date().toISOString(), target: buildSettings.target, architecture: buildSettings.architecture, profile: buildSettings.profile, projectId: projectSessionState.id, files }
  const patch = { format: 'nova-patch-manifest', version: 1, fromBuild: null, toBuild: packHash, added: files.map(file => file.path), changed: [], removed: [], files }
  const encode = (path: string, value: unknown): ExportFile => ({ path, dataBase64: bytesToBase64(new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`)) })
  return [encode('nova-build-report.json', report), ...(buildSettings.delivery.patchManifest ? [encode('nova-patch-manifest.json', patch)] : [])]
}

export async function buildGame(run = false): Promise<NativeBuildResult> {
  synchronizeBuildScenes(sceneManager.scenes.map(scene => scene.uuid))
  const validationErrors = validateBuildSettings(buildSettings).filter(issue => issue.severity === 'error')
  if (validationErrors.length) throw new Error(validationErrors.map(issue => issue.message).join(' '))
  if (buildSettings.target === 'android' && !packageEnabled(OFFICIAL_ANDROID_PACKAGE_ID)) throw new Error('Install the optional Nova Android Export package before selecting Android.')
  if (buildSettings.runtimeMode === 'headless-server') {
    if (buildSettings.target === 'web') throw new Error('Headless authoritative-server exports require a native desktop target.')
    if (!packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID) || !productionSettings.networking.enabled) throw new Error('Enable the optional Nova Networking package and networking settings before exporting a headless server.')
    if (productionSettings.networking.role === 'client') throw new Error('Headless server exports require the networking role Server or Host.')
  }
  buildProgress.phase = 'validating'; buildProgress.percent = 8; buildProgress.message = 'Validating scenes and asset references…'; buildProgress.outputPath = ''
  const projectJson = projectForBuild(getSceneJSON())
  buildProgress.phase = 'packing'; buildProgress.percent = 32; buildProgress.message = 'Creating indexed game.nova-pak…'
  const pack = await createNovaPak(projectJson, assetState.records, buildSettings.startupSceneUuid, { deterministic: buildSettings.delivery.deterministic, compression: buildSettings.delivery.compression })
  buildProgress.phase = 'exporting'; buildProgress.percent = 66; buildProgress.message = 'Writing Nova Player export…'
  const webFiles = buildSettings.target === 'web' ? await collectWebPlayerFiles() : []
  if (buildSettings.target === 'web' && !('__TAURI_INTERNALS__' in window)) webFiles.push(...await webBuildMetadata(pack, webFiles))
  let result: NativeBuildResult
  if ('__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core')
    result = await invoke<NativeBuildResult>('export_game', {
      request: {
        gameName: sanitizeGameName(buildSettings.gameName), target: buildSettings.target,
        architecture: buildSettings.architecture, packageIntoExecutable: buildSettings.packageIntoExecutable,
        developmentBuild: buildSettings.developmentBuild, outputDirectory: buildSettings.outputDirectory,
        packBase64: packageBase64(pack), webFiles, run, projectId: projectSessionState.id,
        profile: buildSettings.profile, platform: buildSettings.platform, delivery: buildSettings.delivery
      }
    })
  } else {
    if (buildSettings.target !== 'web') throw new Error('Desktop game exports must be created from the Nova_A desktop editor. Web export is available here.')
    result = await exportWebInBrowser(pack, webFiles)
  }
  buildProgress.phase = 'complete'; buildProgress.percent = 100; buildProgress.message = `Build complete: ${result.outputPath}`; buildProgress.outputPath = result.outputPath; buildProgress.cacheHits = result.cacheHits ?? 0; buildProgress.changedFiles = result.changedFiles ?? result.files.length
  editorState.statusText = buildProgress.message
  addEditorLog(buildProgress.message, 'Project', 'info', result.outputPath)
  return result
}

export function failBuild(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  buildProgress.phase = 'failed'; buildProgress.message = message; buildProgress.percent = 0
  editorState.statusText = message
  addEditorLog(message, 'Engine', 'error', 'Build Settings')
  return message
}

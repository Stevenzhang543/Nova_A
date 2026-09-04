#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { lstat, mkdir, readFile, realpath, writeFile, stat, unlink } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { defaultExportTemplateId, validateExportTemplate } from './export-template-registry.mjs'

const REPOSITORY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const PACKAGE_AUTHORITY = JSON.parse(await readFile(join(REPOSITORY_ROOT, 'package.json'), 'utf8'))
const ENGINE_VERSION = String(PACKAGE_AUTHORITY.version ?? '')
if (!/^\d+\.\d+\.\d+$/.test(ENGINE_VERSION)) throw new Error('package.json does not contain a valid three-part Nova_A machine version')
const HEADER_BYTES = 16
const EMBEDDED_MAGIC = Buffer.from('NOVAPK2!')
const MAX_PACKAGE_BYTES = 1024 * 1024 * 1024
const OFFICIAL_NETWORKING_PACKAGE_ID = 'top.whitelists.novaa.networking'
const OFFICIAL_NAVIGATION_PACKAGE_ID = 'top.whitelists.novaa.navigation'
const OFFICIAL_AI_PACKAGE_ID = 'top.whitelists.novaa.ai'

function argumentsMap(values) {
  const output = new Map()
  for (let index = 0; index < values.length; index++) if (values[index].startsWith('--')) output.set(values[index].slice(2), values[index + 1]?.startsWith('--') ? true : values[++index] ?? true)
  return output
}

const args = argumentsMap(process.argv.slice(2))
if (args.has('help') || !args.has('project')) {
  console.log('Nova_A headless exporter\n\n  pnpm export -- --project project.nova --target web --output Builds/MyGame [--profile release] [--architecture x86_64] [--runtime game] [--compression balanced] [--single-file|--sidecar] [--no-incremental] [--no-patch] [--player path]')
  process.exit(args.has('help') ? 0 : 2)
}

const projectPath = resolve(String(args.get('project')))
const projectAssetRoot = await realpath(dirname(projectPath))
const target = String(args.get('target') ?? 'web')
const output = resolve(String(args.get('output') ?? join(dirname(projectPath), 'Builds', 'HeadlessExport')))
const profile = String(args.get('profile') ?? 'release')
const architecture = String(args.get('architecture') ?? (process.arch === 'arm64' ? 'aarch64' : 'x86_64'))
const runtimeMode = String(args.get('runtime') ?? 'game')
const compression = String(args.get('compression') ?? 'balanced')
const cacheMode = String(args.get('cache') ?? (args.has('clean') ? 'clean' : 'incremental'))
if (!['clean', 'incremental', 'validate'].includes(cacheMode)) throw new Error('Cache mode must be clean, incremental, or validate')
const incremental = cacheMode !== 'clean' && !args.has('no-incremental') && String(args.get('incremental') ?? 'true') !== 'false'
const patchEnabled = !args.has('no-patch') && String(args.get('patch') ?? 'true') !== 'false'
if (!['windows', 'linux', 'macos', 'web'].includes(target)) throw new Error(`Unsupported CLI target ${target}`)
if (!['debug', 'release'].includes(profile)) throw new Error('Profile must be debug or release')
if (!['x86_64', 'aarch64'].includes(architecture)) throw new Error('Architecture must be x86_64 or aarch64')
if (!['game', 'headless-server'].includes(runtimeMode)) throw new Error('Runtime must be game or headless-server')
if (!['store', 'balanced', 'maximum'].includes(compression)) throw new Error('Compression must be store, balanced, or maximum')
if (target === 'web' && runtimeMode === 'headless-server') throw new Error('Authoritative headless runtime requires a native target')
const hostTarget = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : process.platform === 'linux' ? 'linux' : 'unknown'
if (target !== 'web' && target !== hostTarget) throw new Error(`${target} export requires a matching ${target} host or CI runner; Nova_A does not create mislabeled cross-target bundles`)
if (target !== 'web' && !args.has('player') && ((process.arch === 'arm64' ? 'aarch64' : 'x86_64') !== architecture)) throw new Error(`${architecture} native export requires an explicit matching player template`)

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
}
function sha(bytes) { return createHash('sha256').update(bytes).digest('hex') }
function publicDeploymentDestination(value) {
  if (!value) return 'local'
  try { const parsed = new URL(String(value)); return parsed.protocol === 'https:' ? parsed.origin : 'configured-external' } catch { return 'configured-external' }
}
function redactPackageSource(entry) {
  if (!entry?.source || typeof entry.source !== 'object') return
  const kind = String(entry.source.kind ?? 'unknown').slice(0, 40), location = String(entry.source.location ?? '')
  const safeRegistryLabel = kind === 'registry' && location && !/[\\/:@]/.test(location) && !/(?:token|secret|password|key)\s*=/i.test(location)
  entry.source = { ...entry.source, kind, location: safeRegistryLabel ? location.slice(0, 160) : `${kind || 'unknown'}-source-redacted` }
}
function safeRelative(path) {
  const normalized = String(path).replaceAll('\\', '/')
  if (!normalized || isAbsolute(path) || normalized.startsWith('/') || /^[a-z]:/i.test(normalized) || normalized.includes('\0') || normalized.split('/').some(part => part === '..' || part === '')) throw new Error(`Unsafe output path ${path}`)
  return normalized
}
function embedPackage(player, packageBytes) {
  if (!packageBytes.length || packageBytes.length > MAX_PACKAGE_BYTES) throw new Error('Embedded Nova packages must contain 1 byte to 1 GiB')
  const length = Buffer.alloc(8); length.writeBigUInt64LE(BigInt(packageBytes.length))
  return Buffer.concat([player, packageBytes, EMBEDDED_MAGIC, length, createHash('sha256').update(packageBytes).digest()])
}
function hasEmbeddedNovaPackage(player) {
  if (player.length < 48) return false
  const footerStart = player.length - 48
  // Any terminal NOVAPK marker means this is not a clean player template.
  // Reject malformed footers too: treating them as clean would append a second
  // package after stale or attacker-controlled embedded project data.
  return player.subarray(footerStart, footerStart + EMBEDDED_MAGIC.length).equals(EMBEDDED_MAGIC)
}
function globMatches(path, pattern) {
  const expression = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0000/g, '.*')
  return new RegExp(`^${expression}$`, 'i').test(path.replaceAll('\\', '/'))
}
function projectPackageEnabled(project, id) {
  return Array.isArray(project?.packages?.installed)
    && project.packages.installed.some(item => item?.manifest?.id === id && item.project === true && item.enabled === true)
}
function isTauriManifestEntry(key) {
  const normalized = String(key).replaceAll('\\', '/').toLowerCase()
  return normalized.includes('/@tauri-apps/') || normalized.includes('/@tauri-apps+')
}
function includeWebDynamicEntry(project, key) {
  if (isTauriManifestEntry(key)) return false
  if (key.endsWith('/networking.ts') || key === 'src/runtime/networking.ts') return project?.projectSettings?.production?.networking?.enabled === true && projectPackageEnabled(project, OFFICIAL_NETWORKING_PACKAGE_ID)
  if (key.endsWith('/navigation2d.ts') || key === 'src/runtime/navigation2d.ts') return projectPackageEnabled(project, OFFICIAL_NAVIGATION_PACKAGE_ID)
  if (key.endsWith('/aiTools.ts') || key === 'src/runtime/aiTools.ts') return projectPackageEnabled(project, OFFICIAL_AI_PACKAGE_ID)
  return true
}
function validateHeadlessNetworkExport(project, requestedRuntimeMode) {
  if (requestedRuntimeMode !== 'headless-server') return
  const networkPackageId = OFFICIAL_NETWORKING_PACKAGE_ID
  const networking = project?.projectSettings?.production?.networking
  if (!networking || networking.enabled !== true) throw new Error('Headless server export requires networking to be enabled in Project Settings.')
  if (networking.permissionGranted !== true) throw new Error('Headless server export requires explicit project network permission.')
  if (networking.autoStart !== true) throw new Error('Headless server export requires networking to start automatically with the runtime.')
  if (networking.role !== 'server' && networking.role !== 'host') throw new Error('Headless server export requires Server or Host authority; Client projects cannot become authorities during export.')
  if (networking.sessionMode !== 'direct') throw new Error('Headless server export requires Direct session mode; Local sessions cannot accept another process.')
  if (networking.transport !== 'native-udp') throw new Error('Headless server export currently requires the reviewed native UDP transport. Custom/WebSocket headless adapters must be qualified and packaged before export.')
  if (Number(networking.protocolVersion) !== 2) throw new Error('Headless server export requires Nova Network Protocol 2.')
  if (networking.security?.requireEncryption === true) throw new Error('Native UDP is not encrypted. Disable the encryption claim for localhost qualification or select a reviewed encrypted transport when one is available.')
  const installed = Array.isArray(project?.packages?.installed)
    ? project.packages.installed.find(entry => entry?.manifest?.id === networkPackageId && entry.enabled === true && entry.project === true)
    : null
  const locked = Array.isArray(project?.packages?.lockfile)
    ? project.packages.lockfile.find(entry => entry?.id === networkPackageId)
    : null
  if (!installed || !locked) throw new Error(`Headless server export requires the enabled and locked ${networkPackageId} package.`)
  const manifest = installed.manifest ?? {}
  if (manifest.version !== locked.version || manifest.sha256 !== locked.sha256 || !/^[a-f0-9]{64}$/.test(String(locked.sha256 ?? ''))) throw new Error(`Headless server networking package lock does not match its installed manifest.`)
  if (!Array.isArray(manifest.permissions) || !manifest.permissions.includes('network.client') || !manifest.permissions.includes('network.listen')) throw new Error('Headless Server/Host authority requires the reviewed network.client and network.listen package permissions.')
  const grantedPermissions = Array.isArray(installed.grantedPermissions) ? installed.grantedPermissions : []
  if (!grantedPermissions.includes('network.client') || !grantedPermissions.includes('network.listen')) throw new Error('Headless Server/Host authority requires explicit grants for network.client and network.listen. Review the package permissions in Manage before exporting.')
  if (networking.authentication?.mode === 'hook' || networking.transportAdapterId || Object.values(networking.services ?? {}).some(Boolean)) throw new Error('Headless CLI export cannot prove editor-registered authentication, transport, identity, lobby, or relay providers. Package and statically register the provider before enabling it in a headless build.')
}
const INLINE_TEXT_ASSET_TYPES = new Set(['script', 'prefab', 'scene', 'material', 'animation', 'controller', 'animationMask', 'rig', 'skin', 'timeline', 'tileset', 'atlas', 'shader', 'localization', 'uiTheme', 'behaviorTree', 'stateMachine', 'tilePalette', 'brushPreset', 'terrainRules', 'dataSchema', 'dataTable', 'replay', 'resource'])
async function writeIncremental(path, bytes) {
  try { if (incremental && sha(await readFile(path)) === sha(bytes)) return false } catch { /* New file. */ }
  await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes); return true
}
async function assetBytes(asset) {
  const source = String(asset.source ?? '')
  if (source.startsWith('data:')) return Buffer.from(source.slice(source.indexOf(',') + 1), source.slice(0, source.indexOf(',')).includes(';base64') ? 'base64' : 'utf8')
  const embeddedText = INLINE_TEXT_ASSET_TYPES.has(String(asset.assetType))
    || String(asset.mimeType ?? '').startsWith('text/')
    || String(asset.mimeType ?? '').includes('json')
    || String(asset.mimeType ?? '').startsWith('application/x-nova-')
  if (Object.hasOwn(asset, 'source') && (embeddedText || (source === '' && Number(asset.byteLength ?? 0) === 0))) return Buffer.from(source, 'utf8')
  const diskPath = resolve(dirname(projectPath), safeRelative(String(asset.path ?? '')))
  try {
    const canonicalPath = await realpath(diskPath)
    const relativePath = relative(projectAssetRoot, canonicalPath)
    if (relativePath === '..' || relativePath.startsWith('../') || relativePath.startsWith('..\\') || isAbsolute(relativePath)) throw new Error('resolved through a link outside the project directory')
    const info = await lstat(canonicalPath)
    if (!info.isFile()) throw new Error('resolved asset is not a regular file')
    return await readFile(canonicalPath)
  }
  catch (error) { throw new Error(`Asset "${String(asset.name ?? asset.uuid ?? asset.path ?? 'unknown')}" could not be read from ${diskPath}: ${error instanceof Error ? error.message : String(error)}. Reimport the source, repair its path, or embed it before building.`) }
}

const project = JSON.parse(await readFile(projectPath, 'utf8'))
const schema = Number(project.formatVersion ?? 1)
if (!Number.isFinite(schema) || schema > 29) throw new Error(`Project schema ${schema} is newer than this exporter`)
if (!Array.isArray(project.scenes) || !project.scenes.length) throw new Error('Project must contain at least one scene')
validateHeadlessNetworkExport(project, runtimeMode)
if (runtimeMode === 'headless-server' && args.has('player')) throw new Error('Headless export rejects an explicit --player until that binary can be matched to a reviewed Export Template hash. Build Nova_A on this host and use its default player template.')
const build = project.projectSettings?.build ?? {}
const packageIntoExecutable = args.has('sidecar') ? false : args.has('single-file') ? true : build.packageIntoExecutable !== false && (target === 'windows' || target === 'linux')
build.target = target; build.profile = profile; build.architecture = architecture; build.runtimeMode = runtimeMode; build.developmentBuild = profile === 'debug'; build.outputDirectory = ''
build.packageIntoExecutable = packageIntoExecutable
build.delivery = { ...(build.delivery ?? {}), deterministic: true, incremental, cacheMode, compression, patchManifest: patchEnabled }
build.delivery.releaseChannel = String(args.get('channel') ?? build.delivery.releaseChannel ?? (profile === 'release' ? 'beta' : 'development'))
if (!['stable', 'beta', 'development'].includes(build.delivery.releaseChannel)) throw new Error('Release channel must be stable, beta, or development')
if (build.delivery.releaseChannel === 'stable' && profile !== 'release') throw new Error('Stable channel output requires the release profile')
const storedTemplateId = String(build.delivery.exportTemplate ?? '')
let requestedTemplateId = String(args.get('template') ?? storedTemplateId)
// A CLI tuple override mirrors the interactive Build Settings behavior: a
// known registered template from the old tuple follows the new target. An
// unknown/custom ID still fails visibly and is never silently replaced.
if (!args.has('template') && (args.has('target') || args.has('architecture') || args.has('runtime'))) {
  const storedValidation = validateExportTemplate({ id: storedTemplateId, target, architecture, runtimeMode, host: process.platform, explicitPlayer: args.has('player') })
  if (storedValidation.template && storedValidation.errors.some(issue => issue.code === 'EXPORT_TEMPLATE_TUPLE_MISMATCH')) requestedTemplateId = defaultExportTemplateId(target, architecture, runtimeMode, process.platform)
}
const templateValidation = validateExportTemplate({ id: requestedTemplateId, target, architecture, runtimeMode, host: process.platform, explicitPlayer: args.has('player') })
if (templateValidation.errors.length) throw new Error(templateValidation.errors.map(issue => `[${issue.code}] ${issue.message}`).join(' '))
build.delivery.exportTemplate = templateValidation.resolvedId
build.delivery.provenance = String(args.get('provenance') ?? build.delivery.provenance ?? 'true') !== 'false'
build.delivery.sbom = String(args.get('sbom') ?? build.delivery.sbom ?? 'true') !== 'false'
build.delivery.webHeaders = String(args.get('web-headers') ?? build.delivery.webHeaders ?? 'true') !== 'false'
build.delivery.deploymentMode = String(args.get('deployment') ?? build.delivery.deploymentMode ?? 'local')
build.delivery.deploymentDestination = String(args.get('deployment-destination') ?? build.delivery.deploymentDestination ?? '')
if (build.delivery.deploymentMode === 'remote-hook' && !/^https:\/\//i.test(build.delivery.deploymentDestination)) throw new Error('Remote deployment requires an explicit HTTPS destination; Nova_A never deploys implicitly')
const signingHookConfigured = Boolean(build.delivery.signingHook), notarizationHookConfigured = Boolean(build.delivery.notarizationHook)
const deploymentDestination = publicDeploymentDestination(build.delivery.deploymentDestination)
project.projectSettings ??= {}; project.projectSettings.build = build
const sceneIds = new Set(project.scenes.map(scene => String(scene?.uuid ?? '')).filter(Boolean))
const requestedSceneOrder = Array.isArray(build.sceneOrder) ? build.sceneOrder.map(String).filter(Boolean) : []
const invalidSceneOrder = requestedSceneOrder.filter(uuid => !sceneIds.has(uuid))
if (invalidSceneOrder.length) throw new Error(`Build scene order contains missing scene UUIDs: ${invalidSceneOrder.join(', ')}. Remove them in Build Settings or restore those scenes.`)
build.sceneOrder = [...new Set([...requestedSceneOrder, ...sceneIds])]
const requestedStartup = String(build.startupSceneUuid ?? '')
if (requestedStartup && !sceneIds.has(requestedStartup)) throw new Error(`Startup scene ${requestedStartup} does not exist. Choose one of: ${[...sceneIds].join(', ')}.`)
const activeScene = String(project.activeSceneUuid ?? '')
build.startupSceneUuid = requestedStartup || (sceneIds.has(activeScene) ? activeScene : build.sceneOrder[0])
const entries = [{ path: 'project.nova', bytes: null, mimeType: 'application/x-nova-project' }]
const includePatterns = String(args.get('include') ?? '').split(',').map(value => value.trim()).filter(Boolean).concat(Array.isArray(build.delivery.include) ? build.delivery.include : [])
const excludePatterns = String(args.get('exclude') ?? '').split(',').map(value => value.trim()).filter(Boolean).concat(Array.isArray(build.delivery.exclude) ? build.delivery.exclude : [])
const stripUnused = args.has('strip-unused') || build.delivery.stripUnusedAssets === true
const allAssets = Array.isArray(project.assets) ? project.assets : [], referencedText = JSON.stringify({ ...project, assets: [] }), includedIds = new Set(allAssets.filter(asset => !stripUnused || referencedText.includes(String(asset.uuid))).map(asset => String(asset.uuid)))
let closureChanged = true
while (closureChanged) { closureChanged = false; for (const asset of allAssets) if (includedIds.has(String(asset.uuid))) for (const dependency of asset.pipeline?.dependencies ?? []) if (!includedIds.has(String(dependency))) { includedIds.add(String(dependency)); closureChanged = true } }
const selectedAssets = allAssets.filter(asset => {
  const path = String(asset.path ?? '').replaceAll('\\', '/')
  return (!stripUnused || includedIds.has(String(asset.uuid))) && (!includePatterns.length || includePatterns.some(pattern => globMatches(path, pattern))) && !excludePatterns.some(pattern => globMatches(path, pattern))
})
project.assets = selectedAssets
build.platform = { ...(build.platform ?? {}), signingIdentity: '', notarizationProfile: '' }
build.delivery = { ...build.delivery, signingHook: '', notarizationHook: '', deploymentDestination: '' }
for (const entry of [...(project.packages?.installed ?? []), ...(project.packages?.lockfile ?? [])]) redactPackageSource(entry)
const packagedPaths = new Map([['project.nova', 'Project manifest']])
for (const asset of selectedAssets) {
  const bytes = await assetBytes(asset)
  const packagedPath = safeRelative(String(asset.path))
  const pathKey = packagedPath.toLowerCase()
  const previous = packagedPaths.get(pathKey)
  if (previous) throw new Error(`Assets "${previous}" and "${String(asset.name ?? asset.uuid)}" both map to ${packagedPath}. Rename or move one asset before building.`)
  packagedPaths.set(pathKey, String(asset.name ?? asset.uuid))
  entries.push({ path: packagedPath, bytes, mimeType: String(asset.mimeType || 'application/octet-stream'), asset })
  delete asset.source
  if (profile === 'release' && asset.assetType === 'script') delete asset.script
}
entries[0].bytes = Buffer.from(`${JSON.stringify(stable(project))}\n`)
entries.sort((a, b) => a.path.localeCompare(b.path))
for (const entry of entries) entry.packedBytes = compression === 'store' ? entry.bytes : gzipSync(entry.bytes, { level: compression === 'maximum' ? 9 : 6, mtime: 0 })
let offset = 0
const indexEntries = entries.map(entry => { const result = { path: entry.path, offset, length: entry.packedBytes.length, originalLength: entry.bytes.length, codec: compression === 'store' ? 'store' : 'gzip', mimeType: entry.mimeType, sha256: sha(entry.bytes), assetUuid: entry.asset?.uuid, assetType: entry.asset?.assetType }; offset += entry.packedBytes.length; return result })
const index = Buffer.from(JSON.stringify({ format: 'nova-pak', version: 1, engineVersion: ENGINE_VERSION, createdAt: '1970-01-01T00:00:00.000Z', startupSceneUuid: String(build.startupSceneUuid || project.activeSceneUuid || project.scenes[0].uuid), entries: indexEntries }))
const header = Buffer.alloc(HEADER_BYTES); header.write('NOVAPAK\0'); header.writeUInt32LE(1, 8); header.writeUInt32LE(index.length, 12)
const pack = Buffer.concat([header, index, ...entries.map(entry => entry.packedBytes)])
if (pack.length > MAX_PACKAGE_BYTES) throw new Error('game.nova-pak exceeds the 1 GiB player safety limit')
const buildId = sha(pack)
await mkdir(output, { recursive: true })
let changedFiles = 0, cacheHits = 0
const outputs = []
let playerTemplateEvidence = null
async function emit(relativePath, bytes) { const normalized = safeRelative(relativePath); if (await writeIncremental(join(output, normalized), bytes)) changedFiles++; else cacheHits++; outputs.push(normalized) }

if (target === 'web') {
  const dist = resolve(String(args.get('dist') ?? join(process.cwd(), 'dist')))
  const manifest = JSON.parse(await readFile(join(dist, '.vite', 'manifest.json'), 'utf8'))
  const playerKey = Object.keys(manifest).find(key => key === 'player.html' || key.endsWith('/player.ts') || key.endsWith('player.ts'))
  if (!playerKey) throw new Error('Production dist has no Nova Player entry; run pnpm build first')
  const selected = new Set(), visitedEntries = new Set(), pendingEntries = [playerKey]
  while (pendingEntries.length) {
    const key = pendingEntries.pop()
    if (!key || visitedEntries.has(key)) continue
    if (visitedEntries.size >= 100_000) throw new Error('Production manifest exceeds the 100,000-entry export safety limit')
    visitedEntries.add(key)
    const item = manifest[key]
    if (!item) continue
    if (item.file) selected.add(item.file)
    for (const path of item.css ?? []) selected.add(path)
    for (const path of item.assets ?? []) selected.add(path)
    for (const child of item.imports ?? []) if (!visitedEntries.has(child)) pendingEntries.push(child)
    for (const child of item.dynamicImports ?? []) if (includeWebDynamicEntry(project, child) && !visitedEntries.has(child)) pendingEntries.push(child)
  }
  const html = await readFile(join(dist, 'player.html'))
  await emit('index.html', html)
  for (const path of [...selected].sort()) await emit(path, await readFile(join(dist, safeRelative(path))))
} else {
  const defaultPlayer = process.platform === 'win32' ? join(process.cwd(), 'src-tauri', 'target', 'release', 'nova_a.exe') : join(process.cwd(), 'src-tauri', 'target', 'release', 'nova_a')
  const player = resolve(String(args.get('player') ?? defaultPlayer))
  const extension = target === 'windows' ? '.exe' : ''
  const name = `${String(build.gameName || 'MyGame').replace(/[^a-z0-9._ -]/gi, '').trim() || 'MyGame'}${extension}`
  const destination = join(output, name)
  if (resolve(destination).toLowerCase() === resolve(player).toLowerCase()) throw new Error('The game output cannot overwrite its player template')
  const playerBytes = await readFile(player)
  if (hasEmbeddedNovaPackage(playerBytes)) throw new Error('Player template already contains an embedded NOVAPK payload. Use a clean reviewed player binary to prevent nested or stale project data.')
  playerTemplateEvidence = { templateId: templateValidation.resolvedId, source: args.has('player') ? 'explicit-player' : 'matching-host-default', fileName: player.split(/[\\/]/).at(-1), bytes: playerBytes.length, sha256: sha(playerBytes), trust: 'local-build-observed-unsigned', registeredHashVerification: 'pending-signed-template-registry' }
  const executableBytes = packageIntoExecutable ? embedPackage(playerBytes, pack) : playerBytes
  if (await writeIncremental(destination, executableBytes)) changedFiles++; else cacheHits++
  outputs.push(name)
}
if (target === 'web' || !packageIntoExecutable) await emit('game.nova-pak', pack)
const records = []
for (const path of [...new Set(outputs)].sort()) { const full = join(output, path); try { const info = await stat(full); if (info.isFile()) { const bytes = await readFile(full); records.push({ path, sha256: sha(bytes), bytes: info.size }) } } catch { /* Directory bundles are represented by their package. */ } }
const ownedFiles = [...new Set([
  ...outputs,
  ...(patchEnabled ? ['nova-patch-manifest.json'] : []),
  'nova-build-report.json', 'nova-content-manifest.json', 'nova-deployment-manifest.json',
  ...(build.delivery.provenance ? ['nova-build-provenance.json'] : []),
  ...(build.delivery.sbom ? ['nova-sbom.cdx.json'] : []),
  ...(target === 'web' && build.delivery.webHeaders ? ['_headers'] : []),
  ...(target !== 'web' && (build.delivery.debugSymbols !== false || build.delivery.crashSymbols !== false) ? ['symbols/nova-symbol-map.json'] : []),
  ...(build.delivery?.sizeReport !== false ? ['nova-build-size-report.json'] : []),
  ...(build.delivery?.dependencyReport !== false ? ['nova-dependency-report.json'] : [])
])].sort()
let previous = null
try { previous = JSON.parse(await readFile(join(output, 'nova-build-report.json'), 'utf8')) } catch { /* First build. */ }
const before = new Map((previous?.files ?? []).map(file => [file.path, file.sha256])), after = new Map(records.map(file => [file.path, file.sha256]))
const patch = { format: 'nova-patch-manifest', version: 1, fromBuild: previous?.buildId ?? null, toBuild: buildId, added: [...after.keys()].filter(path => !before.has(path)), changed: [...after].filter(([path, hash]) => before.has(path) && before.get(path) !== hash).map(([path]) => path), removed: [...before.keys()].filter(path => !after.has(path)), files: records }
let removedOwnedFiles = 0
if (cacheMode === 'clean' && previous?.format === 'nova-build-report' && (Array.isArray(previous.ownedFiles) || Array.isArray(previous.files))) {
  const outputRoot = await realpath(output)
  const outputPrefix = `${outputRoot.toLowerCase()}${outputRoot.endsWith('/') || outputRoot.endsWith('\\') ? '' : process.platform === 'win32' ? '\\' : '/'}`
  const currentPaths = new Set(ownedFiles.map(path => path.toLowerCase()))
  const previousOwnedFiles = Array.isArray(previous.ownedFiles) ? previous.ownedFiles : previous.files.map(file => file.path)
  for (const previousFile of previousOwnedFiles) {
    const previousPath = safeRelative(String(typeof previousFile === 'string' ? previousFile : previousFile?.path ?? ''))
    if (currentPaths.has(previousPath.toLowerCase())) continue
    const fullPath = resolve(output, previousPath)
    let parentPath
    try { parentPath = await realpath(dirname(fullPath)) } catch (error) { if (error?.code === 'ENOENT') continue; throw error }
    const parentKey = parentPath.toLowerCase()
    if (parentKey !== outputRoot.toLowerCase() && !`${parentKey}${process.platform === 'win32' ? '\\' : '/'}`.startsWith(outputPrefix)) throw new Error(`Refusing to clean report-owned output outside the build directory: ${previousPath}`)
    try {
      const info = await lstat(fullPath)
      if (!info.isFile() && !info.isSymbolicLink()) throw new Error(`Refusing to clean non-file report output: ${previousPath}`)
      await unlink(fullPath)
      removedOwnedFiles++
    } catch (error) { if (error?.code !== 'ENOENT') throw error }
  }
}
if (patchEnabled) await emit('nova-patch-manifest.json', Buffer.from(`${JSON.stringify(patch, null, 2)}\n`))
else try { await unlink(join(output, 'nova-patch-manifest.json')) } catch { /* No stale patch manifest. */ }
const cacheSemantics = cacheMode === 'clean'
  ? 'rewrite-current-remove-stale-report-owned-preserve-untracked'
  : cacheMode === 'validate'
    ? 'validate-and-reuse-identical-owned-outputs'
    : 'reuse-identical-owned-outputs'
const report = { format: 'nova-build-report', version: 2, engineVersion: ENGINE_VERSION, buildId, createdAt: 0, target, architecture, profile, runtimeMode, exportTemplate: templateValidation.resolvedId, exportTemplateVersion: templateValidation.template?.id.endsWith('-v1') ? 1 : null, templateMigratedFrom: templateValidation.migratedFrom, playerTemplate: playerTemplateEvidence, cacheMode, cacheSemantics, removedOwnedFiles, ownedFiles, projectId: String(project.projectMetadata?.id ?? ''), totalBytes: records.reduce((sum, file) => sum + file.bytes, 0), files: records }
await emit('nova-build-report.json', Buffer.from(`${JSON.stringify(report, null, 2)}\n`))
const contentManifest = { format: 'nova-content-manifest', version: 1, engineVersion: ENGINE_VERSION, buildId, include: includePatterns, exclude: excludePatterns, stripUnusedAssets: stripUnused, compression, files: records }
await emit('nova-content-manifest.json', Buffer.from(`${JSON.stringify(contentManifest, null, 2)}\n`))
if (build.delivery.provenance) {
  const inputsHash = sha(Buffer.from(JSON.stringify(stable({ build, packages: project.packages?.lockfile ?? [], projectId: project.projectMetadata?.id ?? '' }))))
  const outputsHash = sha(Buffer.from(JSON.stringify(stable(records))))
  const provenance = { format: 'nova-build-provenance', version: 1, engineVersion: ENGINE_VERSION, buildId, projectId: String(project.projectMetadata?.id ?? ''), target, architecture, profile, releaseChannel: build.delivery.releaseChannel, sourceCommit: String(args.get('source-commit') ?? 'working-tree').slice(0, 80), toolchain: { builder: 'Nova_A Build CLI 1', node: process.version, host: process.platform, architecture: process.arch }, inputsHash, outputsHash, cacheKey: sha(Buffer.from(`${ENGINE_VERSION}:${target}:${architecture}:${profile}:${inputsHash}`)), deterministic: true, generatedAt: '1970-01-01T00:00:00.000Z', files: records }
  await emit('nova-build-provenance.json', Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`))
}
if (build.delivery.sbom) {
  const components = (project.packages?.lockfile ?? []).map(entry => ({ type: 'library', 'bom-ref': `${entry.id}@${entry.version}`, name: entry.id, version: entry.version, hashes: [{ alg: 'SHA-256', content: entry.sha256 }], properties: [{ name: 'nova.source', value: `${entry.source?.kind ?? 'unknown'}:${entry.source?.location ?? ''}` }] }))
  const sbom = { bomFormat: 'CycloneDX', specVersion: '1.5', serialNumber: `urn:sha256:${buildId}`, version: 1, metadata: { component: { type: 'application', name: String(build.gameName ?? 'MyGame'), version: String(build.platform?.version ?? '1.0.0') }, properties: [{ name: 'nova.engine', value: ENGINE_VERSION }, { name: 'nova.build', value: buildId }] }, components }
  await emit('nova-sbom.cdx.json', Buffer.from(`${JSON.stringify(sbom, null, 2)}\n`))
}
const deployment = { format: 'nova-deployment-manifest', version: 1, engineVersion: ENGINE_VERSION, buildId, mode: build.delivery.deploymentMode, destination: deploymentDestination, releaseChannel: build.delivery.releaseChannel, implicitNetworkOperation: false, signing: { hookConfigured: signingHookConfigured, notarizationHookConfigured, execution: 'external-explicit' }, cleanMachineJob: build.delivery.cleanMachineJob === true }
await emit('nova-deployment-manifest.json', Buffer.from(`${JSON.stringify(deployment, null, 2)}\n`))
if (target === 'web' && build.delivery.webHeaders) await emit('_headers', Buffer.from('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n\n/index.html\n  Cache-Control: no-cache\n/player.html\n  Cache-Control: no-cache\n'))
if (target !== 'web' && (build.delivery.debugSymbols !== false || build.delivery.crashSymbols !== false)) await emit('symbols/nova-symbol-map.json', Buffer.from(`${JSON.stringify({ format: 'nova-symbol-map', version: 1, engineVersion: ENGINE_VERSION, buildId, workflow: 'Archive matching PDB, dSYM, or unstripped ELF symbols under this build ID.' }, null, 2)}\n`))
if (build.delivery?.sizeReport !== false) await emit('nova-build-size-report.json', Buffer.from(`${JSON.stringify({ format: 'nova-build-size-report', version: 1, engineVersion: ENGINE_VERSION, totalBytes: report.totalBytes, files: [...records].sort((a, b) => b.bytes - a.bytes) }, null, 2)}\n`))
if (build.delivery?.dependencyReport !== false) await emit('nova-dependency-report.json', Buffer.from(`${JSON.stringify({ format: 'nova-dependency-report', version: 1, engineVersion: ENGINE_VERSION, packages: project.packages?.lockfile ?? [], assets: entries.filter(entry => entry.asset).map(entry => ({ uuid: entry.asset.uuid, path: entry.path, type: entry.asset.assetType })) }, null, 2)}\n`))
console.log(JSON.stringify({ output, buildId, changedFiles, cacheHits, files: new Set(outputs).size, packageIntoExecutable, exportTemplate: templateValidation.resolvedId, templateMigratedFrom: templateValidation.migratedFrom, diagnostics: [] }, null, 2))

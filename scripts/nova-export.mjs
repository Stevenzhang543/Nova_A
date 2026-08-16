#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, copyFile, stat, unlink } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const ENGINE_VERSION = '3.2.0'
const HEADER_BYTES = 16

function argumentsMap(values) {
  const output = new Map()
  for (let index = 0; index < values.length; index++) if (values[index].startsWith('--')) output.set(values[index].slice(2), values[index + 1]?.startsWith('--') ? true : values[++index] ?? true)
  return output
}

const args = argumentsMap(process.argv.slice(2))
if (args.has('help') || !args.has('project')) {
  console.log('Nova_A headless exporter\n\n  pnpm export -- --project project.nova --target web --output Builds/MyGame [--profile release] [--architecture x86_64] [--runtime game] [--compression balanced] [--no-incremental] [--no-patch] [--player path]')
  process.exit(args.has('help') ? 0 : 2)
}

const projectPath = resolve(String(args.get('project')))
const target = String(args.get('target') ?? 'web')
const output = resolve(String(args.get('output') ?? join(dirname(projectPath), 'Builds', 'HeadlessExport')))
const profile = String(args.get('profile') ?? 'release')
const architecture = String(args.get('architecture') ?? (process.arch === 'arm64' ? 'aarch64' : 'x86_64'))
const runtimeMode = String(args.get('runtime') ?? 'game')
const compression = String(args.get('compression') ?? 'balanced')
const incremental = !args.has('no-incremental') && String(args.get('incremental') ?? 'true') !== 'false'
const patchEnabled = !args.has('no-patch') && String(args.get('patch') ?? 'true') !== 'false'
if (!['windows', 'linux', 'macos', 'web'].includes(target)) throw new Error(`Unsupported CLI target ${target}`)
if (!['debug', 'release'].includes(profile)) throw new Error('Profile must be debug or release')
if (!['x86_64', 'aarch64'].includes(architecture)) throw new Error('Architecture must be x86_64 or aarch64')
if (!['game', 'headless-server'].includes(runtimeMode)) throw new Error('Runtime must be game or headless-server')
if (!['store', 'balanced', 'maximum'].includes(compression)) throw new Error('Compression must be store, balanced, or maximum')
if (target === 'web' && runtimeMode === 'headless-server') throw new Error('Authoritative headless runtime requires a native target')

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
}
function sha(bytes) { return createHash('sha256').update(bytes).digest('hex') }
function safeRelative(path) {
  const normalized = path.replaceAll('\\', '/').replace(/^\/+/, '')
  if (!normalized || normalized.split('/').some(part => part === '..')) throw new Error(`Unsafe output path ${path}`)
  return normalized
}
const INLINE_TEXT_ASSET_TYPES = new Set(['script', 'prefab', 'scene', 'material', 'animation', 'controller', 'animationMask', 'rig', 'skin', 'timeline', 'tileset', 'atlas', 'shader', 'localization', 'uiTheme', 'behaviorTree', 'stateMachine', 'tilePalette', 'brushPreset', 'terrainRules', 'dataSchema', 'dataTable', 'replay'])
async function writeIncremental(path, bytes) {
  try { if (incremental && sha(await readFile(path)) === sha(bytes)) return false } catch { /* New file. */ }
  await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes); return true
}
async function assetBytes(asset) {
  const source = String(asset.source ?? '')
  if (source.startsWith('data:')) return Buffer.from(source.slice(source.indexOf(',') + 1), source.slice(0, source.indexOf(',')).includes(';base64') ? 'base64' : 'utf8')
  if (source && INLINE_TEXT_ASSET_TYPES.has(String(asset.assetType))) return Buffer.from(source, 'utf8')
  const diskPath = resolve(dirname(projectPath), safeRelative(String(asset.path ?? '')))
  return readFile(diskPath)
}

const project = JSON.parse(await readFile(projectPath, 'utf8'))
const schema = Number(project.formatVersion ?? 1)
if (!Number.isFinite(schema) || schema > 23) throw new Error(`Project schema ${schema} is newer than this exporter`)
if (!Array.isArray(project.scenes) || !project.scenes.length) throw new Error('Project must contain at least one scene')
const build = project.projectSettings?.build ?? {}
build.target = target; build.profile = profile; build.architecture = architecture; build.runtimeMode = runtimeMode; build.developmentBuild = profile === 'debug'; build.outputDirectory = ''
build.delivery = { ...(build.delivery ?? {}), deterministic: true, incremental, compression, patchManifest: patchEnabled }
project.projectSettings ??= {}; project.projectSettings.build = build
const entries = [{ path: 'project.nova', bytes: null, mimeType: 'application/x-nova-project' }]
for (const asset of Array.isArray(project.assets) ? project.assets : []) {
  const bytes = await assetBytes(asset)
  entries.push({ path: safeRelative(String(asset.path)), bytes, mimeType: String(asset.mimeType || 'application/octet-stream'), asset })
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
const buildId = sha(pack)
await mkdir(output, { recursive: true })
let changedFiles = 0, cacheHits = 0
const outputs = []
async function emit(relativePath, bytes) { const normalized = safeRelative(relativePath); if (await writeIncremental(join(output, normalized), bytes)) changedFiles++; else cacheHits++; outputs.push(normalized) }

if (target === 'web') {
  const dist = resolve(String(args.get('dist') ?? join(process.cwd(), 'dist')))
  const manifest = JSON.parse(await readFile(join(dist, '.vite', 'manifest.json'), 'utf8'))
  const playerKey = Object.keys(manifest).find(key => key === 'player.html' || key.endsWith('/player.ts') || key.endsWith('player.ts'))
  if (!playerKey) throw new Error('Production dist has no Nova Player entry; run pnpm build first')
  const selected = new Set(), visit = key => { const item = manifest[key]; if (!item) return; selected.add(item.file); for (const path of item.css ?? []) selected.add(path); for (const path of item.assets ?? []) selected.add(path); for (const child of item.imports ?? []) visit(child) }
  visit(playerKey)
  const html = await readFile(join(dist, 'player.html'))
  await emit('index.html', html)
  for (const path of [...selected].sort()) await emit(path, await readFile(join(dist, safeRelative(path))))
} else {
  const defaultPlayer = process.platform === 'win32' ? join(process.cwd(), 'src-tauri', 'target', 'release', 'nova_a.exe') : join(process.cwd(), 'src-tauri', 'target', 'release', 'nova_a')
  const player = resolve(String(args.get('player') ?? defaultPlayer))
  const extension = target === 'windows' ? '.exe' : ''
  const name = `${String(build.gameName || 'MyGame').replace(/[^a-z0-9._ -]/gi, '').trim() || 'MyGame'}${extension}`
  const destination = join(output, name)
  let same = false
  try { same = incremental && sha(await readFile(player)) === sha(await readFile(destination)) } catch { /* New player. */ }
  if (same) cacheHits++; else { await copyFile(player, destination); changedFiles++ }
  outputs.push(name)
}
await emit('game.nova-pak', pack)
const records = []
for (const path of [...new Set(outputs)].sort()) { const full = join(output, path); try { const info = await stat(full); if (info.isFile()) { const bytes = await readFile(full); records.push({ path, sha256: sha(bytes), bytes: info.size }) } } catch { /* Directory bundles are represented by their package. */ } }
let previous = null
try { previous = JSON.parse(await readFile(join(output, 'nova-build-report.json'), 'utf8')) } catch { /* First build. */ }
const before = new Map((previous?.files ?? []).map(file => [file.path, file.sha256])), after = new Map(records.map(file => [file.path, file.sha256]))
const patch = { format: 'nova-patch-manifest', version: 1, fromBuild: previous?.buildId ?? null, toBuild: buildId, added: [...after.keys()].filter(path => !before.has(path)), changed: [...after].filter(([path, hash]) => before.has(path) && before.get(path) !== hash).map(([path]) => path), removed: [...before.keys()].filter(path => !after.has(path)), files: records }
if (patchEnabled) await emit('nova-patch-manifest.json', Buffer.from(`${JSON.stringify(patch, null, 2)}\n`))
else try { await unlink(join(output, 'nova-patch-manifest.json')) } catch { /* No stale patch manifest. */ }
const report = { format: 'nova-build-report', version: 1, engineVersion: ENGINE_VERSION, buildId, createdAt: 0, target, architecture, profile, projectId: String(project.projectMetadata?.id ?? ''), files: records }
await emit('nova-build-report.json', Buffer.from(`${JSON.stringify(report, null, 2)}\n`))
console.log(JSON.stringify({ output, buildId, changedFiles, cacheHits, files: outputs.length + 2 }, null, 2))

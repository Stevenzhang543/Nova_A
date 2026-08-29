import { reactive } from 'vue'
import { addEditorLog } from '../store/editor'
import { assetReference, resolveAsset } from '../assets/AssetDatabase'
import { NOVA_PLUGIN_API_VERSION } from './stableContracts'

export { NOVA_PLUGIN_API_VERSION }
export const MAX_PLUGIN_BYTES = 16 * 1024 * 1024
export const MAX_PLUGIN_CALL_MS = 8
export type PluginPermission =
  | 'log' | 'events' | 'editor.commands' | 'editor.menus' | 'editor.panels' | 'editor.importers'
  | 'editor.docks' | 'editor.assets' | 'editor.components' | 'editor.inspectors' | 'editor.gizmos' | 'editor.settings' | 'editor.graph-nodes'
  | 'render.passes' | 'build.hooks' | 'build.steps' | 'project.templates' | 'runtime.systems'
export type PluginContributionKind = 'commands' | 'menus' | 'panels' | 'docks' | 'importers' | 'assetEditors' | 'components' | 'inspectors' | 'gizmos' | 'settings' | 'graphNodes' | 'renderPasses' | 'buildHooks' | 'buildSteps' | 'templates' | 'runtimeSystems' | 'events'
export interface PluginContributionDescriptor { id: string; label: string; description?: string; entry?: string; slot?: string; order?: number }
export interface PluginContribution extends PluginContributionDescriptor { kind: PluginContributionKind }

export interface PluginManifest {
  id: string
  name: string
  version: string
  apiVersion: 1 | 2
  engine: string
  entry: string
  entryAsset: string | null
  entryType: 'wasm' | 'native'
  permissions: PluginPermission[]
  enabled: boolean
  projectEnabled: boolean
  sha256: string
  signature: string
  publicKey: string
  contributions: Partial<Record<PluginContributionKind, PluginContributionDescriptor[]>>
}

interface ActivePlugin { manifest: PluginManifest; instance: WebAssembly.Instance }
const allowedPermissions = new Set<PluginPermission>(['log', 'events', 'editor.commands', 'editor.menus', 'editor.panels', 'editor.importers', 'editor.docks', 'editor.assets', 'editor.components', 'editor.inspectors', 'editor.gizmos', 'editor.settings', 'editor.graph-nodes', 'render.passes', 'build.hooks', 'build.steps', 'project.templates', 'runtime.systems'])
const contributionPermission: Record<PluginContributionKind, PluginPermission> = {
  commands: 'editor.commands', menus: 'editor.menus', panels: 'editor.panels', docks: 'editor.docks', importers: 'editor.importers', assetEditors: 'editor.assets', components: 'editor.components', inspectors: 'editor.inspectors', gizmos: 'editor.gizmos', settings: 'editor.settings', graphNodes: 'editor.graph-nodes', renderPasses: 'render.passes', buildHooks: 'build.hooks', buildSteps: 'build.steps', templates: 'project.templates', runtimeSystems: 'runtime.systems', events: 'events'
}

export const PLUGIN_API_MATRIX: ReadonlyArray<{ kind: PluginContributionKind; permission: PluginPermission; exportName: string; host: 'editor' | 'runtime' | 'build' | 'renderer' }> = Object.freeze([
  { kind: 'docks', permission: 'editor.docks', exportName: 'nova_plugin_panel', host: 'editor' },
  { kind: 'inspectors', permission: 'editor.inspectors', exportName: 'nova_plugin_inspector', host: 'editor' },
  { kind: 'importers', permission: 'editor.importers', exportName: 'nova_plugin_importer', host: 'editor' },
  { kind: 'components', permission: 'editor.components', exportName: 'nova_plugin_component', host: 'runtime' },
  { kind: 'graphNodes', permission: 'editor.graph-nodes', exportName: 'nova_plugin_graph_node', host: 'editor' },
  { kind: 'renderPasses', permission: 'render.passes', exportName: 'nova_plugin_render_pass', host: 'renderer' },
  { kind: 'buildSteps', permission: 'build.steps', exportName: 'nova_plugin_build_step', host: 'build' },
  { kind: 'templates', permission: 'project.templates', exportName: 'nova_plugin_template', host: 'editor' },
  { kind: 'commands', permission: 'editor.commands', exportName: 'nova_plugin_command', host: 'editor' },
  { kind: 'settings', permission: 'editor.settings', exportName: 'nova_plugin_settings', host: 'editor' }
])

const startupSafeMode = typeof location !== 'undefined' && new URLSearchParams(location.search).get('safe-mode') === '1'
  || typeof localStorage !== 'undefined' && localStorage.getItem('nova-a-plugin-safe-mode') === 'true'
export const pluginState = reactive({
  manifests: [] as PluginManifest[], active: 0, errors: [] as string[], safeMode: startupSafeMode,
  safeModeRecommended: typeof localStorage !== 'undefined' && localStorage.getItem('nova-a-plugin-crashed') === 'true',
  contributions: [] as Array<PluginContribution & { pluginId: string; pluginName: string }>,
  generation: 0, reloads: 0, unloads: 0, isolatedFailures: 0
})

function safeText(value: unknown, maximum: number): string { return typeof value === 'string' ? value.trim().slice(0, maximum) : '' }
function decodeBase64(value: string): Uint8Array { return Uint8Array.from(atob(value), character => character.charCodeAt(0)) }
function hex(bytes: ArrayBuffer): string { return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('') }

export function normalizePluginManifest(value: unknown): PluginManifest {
  const source = value && typeof value === 'object' ? value as Partial<PluginManifest> : {}
  const id = safeText(source.id, 120), name = safeText(source.name, 120), version = safeText(source.version, 40)
  const entryType = source.entryType === 'native' ? 'native' : 'wasm'
  const entry = safeText(source.entry, 240)
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(id)) throw new Error('Plugin ID must use reverse-domain style.')
  if (!name) throw new Error('Plugin name is required.')
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) throw new Error('Plugin version must use semantic versioning.')
  const apiVersion = Number(source.apiVersion)
  if (apiVersion !== 1 && apiVersion !== NOVA_PLUGIN_API_VERSION) throw new Error(`Plugin API ${source.apiVersion} is unsupported; Nova_A accepts API 1 or ${NOVA_PLUGIN_API_VERSION}.`)
  if (entry.includes('..') || entry.startsWith('/') || entry.includes('\\') || (entryType === 'wasm' && !entry.toLowerCase().endsWith('.wasm'))) throw new Error('Plugin entry must be a safe relative path.')
  const permissions = Array.isArray(source.permissions) ? [...new Set(source.permissions.filter((permission): permission is PluginPermission => allowedPermissions.has(permission as PluginPermission)))] : []
  if (Array.isArray(source.permissions) && permissions.length !== source.permissions.length) throw new Error('Plugin requests an unsupported capability.')
  if (apiVersion === 1 && permissions.some(permission => permission !== 'log' && permission !== 'events')) throw new Error('Plugin API 1 only supports log and events permissions.')
  const contributions: PluginManifest['contributions'] = {}
  if (source.contributions && typeof source.contributions === 'object') {
    for (const kind of Object.keys(contributionPermission) as PluginContributionKind[]) {
      const values = source.contributions[kind]
      if (!Array.isArray(values)) continue
      if (!permissions.includes(contributionPermission[kind])) throw new Error(`${kind} contributions require ${contributionPermission[kind]}.`)
      contributions[kind] = values.flatMap(item => item && typeof item === 'object' && safeText(item.id, 120) ? [{
        id: safeText(item.id, 120), label: safeText(item.label, 120) || safeText(item.id, 120),
        description: safeText(item.description, 300) || undefined, entry: safeText(item.entry, 120) || undefined,
        slot: safeText(item.slot, 80) || undefined, order: Number.isFinite(Number(item.order)) ? Math.max(-1_000, Math.min(1_000, Number(item.order))) : undefined
      }] : []).slice(0, 256)
    }
  }
  return {
    id, name, version, apiVersion, engine: safeText(source.engine, 40) || (apiVersion === 1 ? '^2.0.0' : '^2.6.0'), entry,
    entryAsset: typeof source.entryAsset === 'string' ? source.entryAsset : null, entryType, permissions,
    enabled: source.enabled !== false, projectEnabled: source.projectEnabled !== false,
    sha256: safeText(source.sha256, 128).toLowerCase(), signature: safeText(source.signature, 1024), publicKey: safeText(source.publicKey, 1024), contributions
  }
}

export function refreshPluginContributions(): void {
  pluginState.contributions.splice(0)
  for (const manifest of pluginState.manifests.filter(item => item.enabled && item.projectEnabled && item.entryType === 'wasm')) {
    for (const [kind, items] of Object.entries(manifest.contributions) as Array<[PluginContributionKind, PluginContributionDescriptor[]]>) {
      for (const item of items) pluginState.contributions.push({ ...item, kind, pluginId: manifest.id, pluginName: manifest.name })
    }
  }
}

export function setPluginSafeMode(enabled: boolean): void {
  pluginState.safeMode = enabled
  if (typeof localStorage !== 'undefined') localStorage.setItem('nova-a-plugin-safe-mode', String(enabled))
  if (enabled) pluginRuntime.stop()
}

export function loadPluginManifests(value: unknown): void {
  const manifests = Array.isArray(value) ? value.flatMap(item => { try { return [normalizePluginManifest(item)] } catch { return [] } }) : []
  pluginState.manifests.splice(0, pluginState.manifests.length, ...new Map(manifests.map(manifest => [manifest.id, manifest])).values())
  refreshPluginContributions()
}

export function serializePluginManifests(): PluginManifest[] { return pluginState.manifests.map(manifest => JSON.parse(JSON.stringify(manifest)) as PluginManifest) }

async function verifyPlugin(manifest: PluginManifest, bytes: ArrayBuffer): Promise<void> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  if (manifest.sha256 && hex(digest) !== manifest.sha256) throw new Error('Plugin SHA-256 does not match its manifest.')
  if (manifest.signature || manifest.publicKey) {
    if (!manifest.signature || !manifest.publicKey) throw new Error('Signed plugins require both signature and public key.')
    const key = await crypto.subtle.importKey('raw', decodeBase64(manifest.publicKey), { name: 'Ed25519' }, false, ['verify'])
    if (!await crypto.subtle.verify({ name: 'Ed25519' }, key, decodeBase64(manifest.signature), digest)) throw new Error('Plugin signature is invalid.')
  }
}

function assertMemory(instance: WebAssembly.Instance): void {
  const memory = instance.exports.memory
  if (memory instanceof WebAssembly.Memory && memory.buffer.byteLength > MAX_PLUGIN_BYTES) throw new Error('Plugin exceeds the 16 MB memory limit.')
}

export async function instantiateWasmPlugin(manifestValue: unknown, bytes: ArrayBuffer): Promise<WebAssembly.Instance> {
  const manifest = normalizePluginManifest(manifestValue)
  if (manifest.entryType === 'native') throw new Error('Native extensions are not downloaded or executed by Nova_A.')
  if (bytes.byteLength < 8 || bytes.byteLength > MAX_PLUGIN_BYTES) throw new Error('Plugin binary is empty or exceeds 16 MB.')
  const magic = new Uint8Array(bytes, 0, 4)
  if (magic[0] !== 0 || magic[1] !== 97 || magic[2] !== 115 || magic[3] !== 109) throw new Error('Plugin entry is not WebAssembly.')
  await verifyPlugin(manifest, bytes)
  const imports = { nova: {
    api_version: () => manifest.apiVersion,
    log: (level: number, code: number) => { if (manifest.permissions.includes('log')) addEditorLog(`${manifest.name}: plugin message ${code}`, 'Plugin', level >= 3 ? 'error' : level === 2 ? 'warning' : 'info') },
    emit_event: (_event: number, _value: number) => manifest.permissions.includes('events') ? 1 : 0,
    has_capability: (capability: number) => capability >= 0 && capability < manifest.permissions.length ? 1 : 0
  } }
  const started = performance.now()
  const result = await WebAssembly.instantiate(bytes, imports)
  const instance = result instanceof WebAssembly.Instance ? result : result.instance
  assertMemory(instance)
  const exports = instance.exports as Record<string, WebAssembly.ExportValue>
  if (typeof exports.nova_plugin_api_version !== 'function' || Number((exports.nova_plugin_api_version as CallableFunction)()) !== manifest.apiVersion) throw new Error(`Plugin must export nova_plugin_api_version() returning ${manifest.apiVersion}.`)
  if (typeof exports.nova_plugin_init !== 'function') throw new Error('Plugin must export nova_plugin_init().')
  ;(exports.nova_plugin_init as CallableFunction)()
  if (performance.now() - started > 100) throw new Error('Plugin initialization exceeded the 100 ms limit.')
  assertMemory(instance)
  return instance
}

async function bytesFromAsset(reference: string | null): Promise<ArrayBuffer> {
  const record = resolveAsset(reference)
  if (!record?.source) throw new Error(`Missing plugin asset ${reference ?? '(none)'}.`)
  return fetch(record.source).then(response => response.arrayBuffer())
}

class PluginRuntime {
  private active: ActivePlugin[] = []
  private generation = 0
  async start(): Promise<void> {
    this.stop(); const generation = this.generation; pluginState.errors.splice(0)
    if (pluginState.safeMode) { addEditorLog('Plugin Safe Mode is active; third-party plugins were skipped.', 'Plugin', 'warning'); return }
    for (const manifest of pluginState.manifests.filter(item => item.enabled && item.projectEnabled && item.entryType === 'wasm')) {
      try {
        const instance = await instantiateWasmPlugin(manifest, await bytesFromAsset(manifest.entryAsset))
        if (generation !== this.generation) return
        this.active.push({ manifest, instance })
      } catch (error) { this.isolateFailure(manifest, error) }
    }
    pluginState.active = this.active.length; pluginState.generation = this.generation; refreshPluginContributions()
  }
  update(delta: number): void {
    const failed = new Set<ActivePlugin>()
    for (const plugin of this.active) {
      const update = plugin.instance.exports.nova_plugin_update
      if (typeof update !== 'function') continue
      try {
        const started = performance.now(); (update as CallableFunction)(Number.isFinite(delta) ? delta : 0); assertMemory(plugin.instance)
        if (performance.now() - started > MAX_PLUGIN_CALL_MS) throw new Error(`runtime call exceeded ${MAX_PLUGIN_CALL_MS} ms`)
      } catch (error) { failed.add(plugin); this.isolateFailure(plugin.manifest, error) }
    }
    if (failed.size) this.active = this.active.filter(plugin => !failed.has(plugin)); pluginState.active = this.active.length
  }
  invokeCommand(commandId: string, pluginId?: string): boolean {
    return this.invokeContribution('commands', commandId, pluginId)
  }
  invokeContribution(kind: PluginContributionKind, contributionId: string, pluginId?: string): boolean {
    const contribution = pluginState.contributions.find(item => item.kind === kind && item.id === contributionId && (!pluginId || item.pluginId === pluginId))
    const plugin = contribution && this.active.find(item => item.manifest.id === contribution.pluginId)
    const exportName = PLUGIN_API_MATRIX.find(item => item.kind === kind)?.exportName
      ?? ({ panels: 'nova_plugin_panel', menus: 'nova_plugin_menu', assetEditors: 'nova_plugin_asset_editor', gizmos: 'nova_plugin_gizmo', buildHooks: 'nova_plugin_build_hook', runtimeSystems: 'nova_plugin_runtime_system', events: 'nova_plugin_event' } as Partial<Record<PluginContributionKind, string>>)[kind]
    const handler = exportName ? plugin?.instance.exports[exportName] : undefined
    if (!plugin || typeof handler !== 'function') return false
    try {
      const started = performance.now()
      ;(handler as CallableFunction)(plugin.manifest.contributions[kind]?.findIndex(item => item.id === contributionId) ?? -1)
      assertMemory(plugin.instance)
      if (performance.now() - started > MAX_PLUGIN_CALL_MS) throw new Error(`${kind} call exceeded ${MAX_PLUGIN_CALL_MS} ms`)
      return true
    } catch (error) {
      this.active = this.active.filter(item => item !== plugin); pluginState.active = this.active.length
      this.isolateFailure(plugin.manifest, error); return false
    }
  }
  stop(): void {
    this.generation++
    for (const plugin of this.active) { const shutdown = plugin.instance.exports.nova_plugin_shutdown; if (typeof shutdown === 'function') try { (shutdown as CallableFunction)() } catch { /* isolated */ } }
    this.active = []; pluginState.active = 0; pluginState.generation = this.generation
  }
  unload(pluginId: string): boolean {
    const plugin = this.active.find(item => item.manifest.id === pluginId)
    if (!plugin) return false
    const shutdown = plugin.instance.exports.nova_plugin_shutdown
    if (typeof shutdown === 'function') try { (shutdown as CallableFunction)() } catch { /* isolated */ }
    this.active = this.active.filter(item => item !== plugin); pluginState.active = this.active.length; pluginState.unloads++; this.generation++; pluginState.generation = this.generation
    return true
  }
  async reload(pluginId?: string): Promise<void> {
    pluginState.reloads++
    if (!pluginId) { await this.start(); return }
    const manifest = pluginState.manifests.find(item => item.id === pluginId && item.enabled && item.projectEnabled && item.entryType === 'wasm')
    this.unload(pluginId)
    if (!manifest || pluginState.safeMode) return
    const generation = this.generation
    try {
      const instance = await instantiateWasmPlugin(manifest, await bytesFromAsset(manifest.entryAsset))
      if (generation !== this.generation) return
      this.active.push({ manifest, instance }); pluginState.active = this.active.length
    } catch (error) { this.isolateFailure(manifest, error) }
  }
  private isolateFailure(manifest: PluginManifest, error: unknown): void {
    const message = `${manifest.name}: ${error instanceof Error ? error.message : String(error)}`
    pluginState.errors.push(message); pluginState.isolatedFailures++; addEditorLog(`${message}. The plugin was isolated.`, 'Plugin', 'error')
    if (typeof localStorage !== 'undefined') localStorage.setItem('nova-a-plugin-crashed', 'true')
    pluginState.safeModeRecommended = true
  }
}

export function attachPluginAsset(manifest: PluginManifest, uuid: string): PluginManifest { return { ...manifest, entryAsset: assetReference(uuid) } }
export const pluginRuntime = new PluginRuntime()

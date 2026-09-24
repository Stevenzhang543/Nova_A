/** 项目插件运行：加载插件描述、注册扩展能力并管理启用与清理。 */
import { reactive } from 'vue'
import { onPackageLifecycle } from './packages'
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
  approvedPermissions: PluginPermission[]
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
  activePluginIds: [] as string[],
  safeModeRecommended: typeof localStorage !== 'undefined' && localStorage.getItem('nova-a-plugin-crashed') === 'true',
  contributions: [] as Array<PluginContribution & { pluginId: string; pluginName: string }>,
  generation: 0, reloads: 0, unloads: 0, isolatedFailures: 0
})

/* 根据 typeof value === 'string' 的真假，分别返回 value.trim().slice(0, maximum) 或 ''。 */ function safeText(value: unknown, maximum: number): string { return typeof value === 'string' ? value.trim().slice(0, maximum) : '' }
/* 调用 Uint8Array.from(atob(value), character => character.charCodeAt(0)) 并返回调用结果。 */ function decodeBase64(value: string): Uint8Array { return Uint8Array.from(atob(value), /* 调用 character.charCodeAt(0) 并返回调用结果。 */ character => character.charCodeAt(0)) }
/* 调用 [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('') 并返回调用结果。 */ function hex(bytes: ArrayBuffer): string { return [...new Uint8Array(bytes)].map(/* 调用 value.toString(16).padStart(2, '0') 并返回调用结果。 */ value => value.toString(16).padStart(2, '0')).join('') }

/** 结构说明（自动提取）：normalizePluginManifest；输入 value；直接调用 safeText、test、Error、Number、entry.includes 等；写入 contributions[…]；包含循环处理；包含显式抛错路径。 */ export function normalizePluginManifest(value: unknown): PluginManifest {
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
  const permissions = Array.isArray(source.permissions) ? [...new Set(source.permissions.filter(/* 调用 allowedPermissions.has(permission as PluginPermission) 并返回调用结果。 */ (permission): permission is PluginPermission => allowedPermissions.has(permission as PluginPermission)))] : []
  if (Array.isArray(source.permissions) && permissions.length !== source.permissions.length) throw new Error('Plugin requests an unsupported capability.')
  if (apiVersion === 1 && permissions.some(/* 先计算 permission !== 'log'；仅当其为真值时求右侧 permission !== 'events'，返回短路求值结果。 */ permission => permission !== 'log' && permission !== 'events')) throw new Error('Plugin API 1 only supports log and events permissions.')
  const contributions: PluginManifest['contributions'] = {}
  if (source.contributions && typeof source.contributions === 'object') {
    for (const kind of Object.keys(contributionPermission) as PluginContributionKind[]) {
      const values = source.contributions[kind]
      if (!Array.isArray(values)) continue
      if (!permissions.includes(contributionPermission[kind])) throw new Error(`${kind} contributions require ${contributionPermission[kind]}.`)
      contributions[kind] = values.flatMap(/** 结构说明（自动提取）：values.flatMap 回调；输入 item；直接调用 safeText、Number.isFinite、Number、Math.max、Math.min；返回表达式求值结果。 */ item => item && typeof item === 'object' && safeText(item.id, 120) ? [{
        id: safeText(item.id, 120), label: safeText(item.label, 120) || safeText(item.id, 120),
        description: safeText(item.description, 300) || undefined, entry: safeText(item.entry, 120) || undefined,
        slot: safeText(item.slot, 80) || undefined, order: Number.isFinite(Number(item.order)) ? Math.max(-1_000, Math.min(1_000, Number(item.order))) : undefined
      }] : []).slice(0, 256)
    }
  }
  return {
    id, name, version, apiVersion, engine: safeText(source.engine, 40) || (apiVersion === 1 ? '^2.0.0' : '^2.6.0'), entry,
    entryAsset: typeof source.entryAsset === 'string' ? source.entryAsset : null, entryType, permissions,
    approvedPermissions: Array.isArray(source.approvedPermissions) ? [...new Set(source.approvedPermissions.filter(/* 调用 permissions.includes(permission as PluginPermission) 并返回调用结果。 */ (permission): permission is PluginPermission => permissions.includes(permission as PluginPermission)))] : [],
    enabled: source.enabled !== false, projectEnabled: source.projectEnabled !== false,
    sha256: safeText(source.sha256, 128).toLowerCase(), signature: safeText(source.signature, 1024), publicKey: safeText(source.publicKey, 1024), contributions
  }
}

/** Imported plugin declarations cannot bring their own user consent. */
/** 结构说明（自动提取）：preparePackagePluginManifest；输入 value、reviewedPackage；直接调用 normalizePluginManifest、Error；包含显式抛错路径。 */ export function preparePackagePluginManifest(value: unknown, reviewedPackage: { id: string; version: string; pluginApi: number | null }): PluginManifest {
  const manifest = normalizePluginManifest(value)
  if (reviewedPackage.pluginApi !== manifest.apiVersion || manifest.id !== reviewedPackage.id || manifest.version !== reviewedPackage.version) throw new Error('Plugin identity, version and API must match the reviewed package.')
  return { ...manifest, approvedPermissions: [], enabled: false, projectEnabled: false }
}

/** 结构说明（自动提取）：refreshPluginContributions；无显式参数；直接调用 pluginState.contributions.splice、pluginState.manifests.filter、Object.entries、manifest.approvedPermissions.includes、pluginState.contributions.push；包含循环处理。 */ export function refreshPluginContributions(): void {
  pluginState.contributions.splice(0)
  for (const manifest of pluginState.manifests.filter(/* 先计算 item.enabled && item.projectEnabled && item.entryType === 'wasm'；仅当其为真值时求右侧 pluginState.activePluginIds.includes(item.id)，返回短路求值结果。 */ item => item.enabled && item.projectEnabled && item.entryType === 'wasm' && pluginState.activePluginIds.includes(item.id))) {
    for (const [kind, items] of Object.entries(manifest.contributions) as Array<[PluginContributionKind, PluginContributionDescriptor[]]>) {
      if (manifest.approvedPermissions.includes(contributionPermission[kind])) for (const item of items) pluginState.contributions.push({ ...item, kind, pluginId: manifest.id, pluginName: manifest.name })
    }
  }
}

/** 结构说明（自动提取）：setPluginSafeMode；输入 enabled；直接调用 TypeError、localStorage.setItem、String、pluginRuntime.stop；写入 pluginState.safeMode；包含显式抛错路径。 */ export function setPluginSafeMode(enabled: boolean): void {
  if (typeof enabled !== 'boolean') throw new TypeError('Plugin safe mode must be boolean')
  pluginState.safeMode = enabled
  if (typeof localStorage !== 'undefined') localStorage.setItem('nova-a-plugin-safe-mode', String(enabled))
  if (enabled) pluginRuntime.stop()
}

/** 结构说明（自动提取）：loadPluginManifests；输入 value；直接调用 pluginRuntime.stop、Array.isArray、value.flatMap、pluginState.manifests.splice、values 等。 */ export function loadPluginManifests(value: unknown): void {
  pluginRuntime.stop()
  const manifests = Array.isArray(value) ? value.flatMap(/** 结构说明（自动提取）：value.flatMap 回调；输入 item；直接调用 normalizePluginManifest。 */ item => { try { return [normalizePluginManifest(item)] } catch { return [] } }) : []
  pluginState.manifests.splice(0, pluginState.manifests.length, ...new Map(manifests.map(/* 返回按声明顺序构造的数组 [manifest.id, manifest]。 */ manifest => [manifest.id, manifest])).values())
  refreshPluginContributions()
}

/* 调用 pluginState.manifests.map(manifest => JSON.parse(JSON.stringify(manifest)) as PluginManifest) 并返回调用结果。 */ export function serializePluginManifests(): PluginManifest[] { return pluginState.manifests.map(/** 结构说明（自动提取）：pluginState.manifests.map 回调；输入 manifest；直接调用 JSON.parse、JSON.stringify；返回表达式求值结果。 */ manifest => JSON.parse(JSON.stringify(manifest)) as PluginManifest) }

/** 结构说明（自动提取）：verifyPlugin；输入 manifest、bytes；直接调用 crypto.subtle.digest、hex、Error、crypto.subtle.importKey、decodeBase64 等；等待异步结果；包含显式抛错路径。 */ async function verifyPlugin(manifest: PluginManifest, bytes: ArrayBuffer): Promise<void> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  if (manifest.sha256 && hex(digest) !== manifest.sha256) throw new Error('Plugin SHA-256 does not match its manifest.')
  if (manifest.signature || manifest.publicKey) {
    if (!manifest.signature || !manifest.publicKey) throw new Error('Signed plugins require both signature and public key.')
    const key = await crypto.subtle.importKey('raw', decodeBase64(manifest.publicKey), { name: 'Ed25519' }, false, ['verify'])
    if (!await crypto.subtle.verify({ name: 'Ed25519' }, key, decodeBase64(manifest.signature), digest)) throw new Error('Plugin signature is invalid.')
  }
}

/** 结构说明（自动提取）：validateWasmPluginPackage；输入 manifestValue、bytes；直接调用 normalizePluginManifest、Error、Uint8Array、verifyPlugin、WebAssembly.compile 等；返回路径包含 manifest；等待异步结果；包含显式抛错路径。 */ export async function validateWasmPluginPackage(manifestValue: unknown, bytes: ArrayBuffer): Promise<PluginManifest> {
  const manifest = normalizePluginManifest(manifestValue)
  if (manifest.entryType === 'native') throw new Error('Native extensions are not downloaded or executed by Nova_A.')
  if (bytes.byteLength < 8 || bytes.byteLength > MAX_PLUGIN_BYTES) throw new Error('Plugin binary is empty or exceeds 16 MB.')
  const magic = new Uint8Array(bytes, 0, 4)
  if (magic[0] !== 0 || magic[1] !== 97 || magic[2] !== 115 || magic[3] !== 109) throw new Error('Plugin entry is not WebAssembly.')
  await verifyPlugin(manifest, bytes)
  const module = await WebAssembly.compile(bytes)
  const allowedImports = new Set(['nova:api_version', 'nova:log', 'nova:emit_event', 'nova:has_capability'])
  const denied = WebAssembly.Module.imports(module).filter(/* 返回 allowedImports.has(`${item.module}:${item.name}`) 的逻辑取反结果。 */ item => !allowedImports.has(`${item.module}:${item.name}`))
  if (denied.length) throw new Error(`Plugin imports an unsupported host capability: ${denied[0].module}.${denied[0].name}.`)
  const exports = new Map(WebAssembly.Module.exports(module).map(/* 返回按声明顺序构造的数组 [item.name, item.kind]。 */ item => [item.name, item.kind]))
  if (exports.get('nova_plugin_api_version') !== 'function' || exports.get('nova_plugin_init') !== 'function') throw new Error('Plugin must export nova_plugin_api_version() and nova_plugin_init().')
  return manifest
}

/** 结构说明（自动提取）：assertMemory；输入 instance；直接调用 Error；包含显式抛错路径。 */ function assertMemory(instance: WebAssembly.Instance): void {
  const memory = instance.exports.memory
  if (memory instanceof WebAssembly.Memory && memory.buffer.byteLength > MAX_PLUGIN_BYTES) throw new Error('Plugin exceeds the 16 MB memory limit.')
}

/** 结构说明（自动提取）：instantiateWasmPlugin；输入 manifestValue、bytes、isCurrent；直接调用 validateWasmPluginPackage、isCurrent、Error、performance.now、WebAssembly.instantiate 等；返回路径包含 instance；等待异步结果；包含显式抛错路径。 */ export async function instantiateWasmPlugin(manifestValue: unknown, bytes: ArrayBuffer, isCurrent: () => boolean = /* 返回固定值 true。 */ () => true): Promise<WebAssembly.Instance> {
  const manifest = await validateWasmPluginPackage(manifestValue, bytes)
  if (!isCurrent()) throw new Error('Plugin loading was cancelled.')
  const imports = { nova: {
    api_version: /* 返回 manifest.apiVersion 的当前值。 */ () => manifest.apiVersion,
    log: /** 结构说明（自动提取）：匿名回调；输入 level、code；直接调用 manifest.approvedPermissions.includes、addEditorLog。 */ (level: number, code: number) => { if (manifest.approvedPermissions.includes('log')) addEditorLog(`${manifest.name}: plugin message ${code}`, 'Plugin', level >= 3 ? 'error' : level === 2 ? 'warning' : 'info') },
    emit_event: /* 根据 manifest.approvedPermissions.includes('events') 的真假，分别返回 1 或 0。 */ (_event: number, _value: number) => manifest.approvedPermissions.includes('events') ? 1 : 0,
    has_capability: /** 结构说明（自动提取）：匿名回调；输入 capability；直接调用 manifest.approvedPermissions.includes；返回表达式求值结果。 */ (capability: number) => capability >= 0 && capability < manifest.permissions.length && manifest.approvedPermissions.includes(manifest.permissions[capability]) ? 1 : 0
  } }
  const started = performance.now()
  const result = await WebAssembly.instantiate(bytes, imports)
  const instance = result instanceof WebAssembly.Instance ? result : result.instance
  if (!isCurrent()) { shutdownPluginInstance(instance); throw new Error('Plugin loading was cancelled.') }
  assertMemory(instance)
  const exports = instance.exports as Record<string, WebAssembly.ExportValue>
  if (typeof exports.nova_plugin_api_version !== 'function' || Number((exports.nova_plugin_api_version as CallableFunction)()) !== manifest.apiVersion) throw new Error(`Plugin must export nova_plugin_api_version() returning ${manifest.apiVersion}.`)
  if (typeof exports.nova_plugin_init !== 'function') throw new Error('Plugin must export nova_plugin_init().')
  ;(exports.nova_plugin_init as CallableFunction)()
  if (performance.now() - started > 100) throw new Error('Plugin initialization exceeded the 100 ms limit.')
  assertMemory(instance)
  return instance
}

/** 结构说明（自动提取）：bytesFromAsset；输入 reference；直接调用 resolveAsset、Error、test、then、fetch；包含显式抛错路径。 */ async function bytesFromAsset(reference: string | null): Promise<ArrayBuffer> {
  const record = resolveAsset(reference)
  if (!record?.source) throw new Error(`Missing plugin asset ${reference ?? '(none)'}.`)
  if (!/^(?:data:|blob:)/i.test(record.source)) throw new Error('Plugin assets must be imported locally before loading; remote fetches are disabled.')
  return fetch(record.source).then(/** 结构说明（自动提取）：then 回调；输入 response；直接调用 Error、response.arrayBuffer；包含显式抛错路径。 */ response => { if (!response.ok) throw new Error('Unable to read the local plugin asset.'); return response.arrayBuffer() })
}

/** 结构说明（自动提取）：shutdownPluginInstance；输入 instance。 */ function shutdownPluginInstance(instance: WebAssembly.Instance): void {
  const shutdown = instance.exports.nova_plugin_shutdown
  if (typeof shutdown === 'function') try { (shutdown as CallableFunction)() } catch { /* Each plugin owns its shutdown failure. */ }
}
class PluginRuntime {
  private active: ActivePlugin[] = []
  private generation = 0
  /** 结构说明（自动提取）：synchronizeState；无显式参数；直接调用 pluginState.activePluginIds.splice、active.map、refreshPluginContributions；写入 pluginState.active、pluginState.generation。 */ private synchronizeState(): void { pluginState.active = this.active.length; pluginState.activePluginIds.splice(0, pluginState.activePluginIds.length, ...this.active.map(/* 返回 item.manifest.id 的当前值。 */ item => item.manifest.id)); pluginState.generation = this.generation; refreshPluginContributions() }
  /** 结构说明（自动提取）：start；无显式参数；直接调用 stop、pluginState.errors.splice、addEditorLog、pluginState.manifests.filter、instantiateWasmPlugin 等；包含循环处理；等待异步结果。 */ async start(): Promise<void> {
    this.stop(); const generation = this.generation; pluginState.errors.splice(0)
    if (pluginState.safeMode) { addEditorLog('Plugin Safe Mode is active; third-party plugins were skipped.', 'Plugin', 'warning'); return }
    for (const manifest of pluginState.manifests.filter(/* 先计算 item.enabled && item.projectEnabled；仅当其为真值时求右侧 item.entryType === 'wasm'，返回短路求值结果。 */ item => item.enabled && item.projectEnabled && item.entryType === 'wasm')) {
      if (generation !== this.generation) return
      try {
        const instance = await instantiateWasmPlugin(manifest, await bytesFromAsset(manifest.entryAsset), /* 先计算 generation === this.generation && manifest.enabled && manifest.projectEnabled；仅当其为真值时求右侧 !pluginState.safeMode，返回短路求值结果。 */ () => generation === this.generation && manifest.enabled && manifest.projectEnabled && !pluginState.safeMode)
        if (generation !== this.generation) { shutdownPluginInstance(instance); return }
        this.active.push({ manifest, instance })
      } catch (error) { if (generation === this.generation) this.isolateFailure(manifest, error) }
    }
    this.synchronizeState()
  }
  /** 结构说明（自动提取）：update；输入 delta；直接调用 Set、pluginState.manifests.includes、failed.add、shutdownPluginInstance、performance.now 等；写入 active；包含循环处理；包含显式抛错路径。 */ update(delta: number): void {
    const failed = new Set<ActivePlugin>()
    for (const plugin of this.active) {
      if (!plugin.manifest.enabled || !plugin.manifest.projectEnabled || !pluginState.manifests.includes(plugin.manifest)) { failed.add(plugin); shutdownPluginInstance(plugin.instance); continue }
      const update = plugin.instance.exports.nova_plugin_update
      if (typeof update !== 'function') continue
      try {
        const started = performance.now(); (update as CallableFunction)(Number.isFinite(delta) ? delta : 0); assertMemory(plugin.instance)
        if (performance.now() - started > MAX_PLUGIN_CALL_MS) throw new Error(`runtime call exceeded ${MAX_PLUGIN_CALL_MS} ms`)
      } catch (error) { failed.add(plugin); this.isolateFailure(plugin.manifest, error) }
    }
    if (failed.size) this.active = this.active.filter(/* 返回 failed.has(plugin) 的逻辑取反结果。 */ plugin => !failed.has(plugin)); this.synchronizeState()
  }
  /* 调用 this.invokeContribution('commands', commandId, pluginId) 并返回调用结果。 */ invokeCommand(commandId: string, pluginId?: string): boolean {
    return this.invokeContribution('commands', commandId, pluginId)
  }
  /** 结构说明（自动提取）：invokeContribution；输入 kind、contributionId、pluginId；直接调用 pluginState.contributions.find、active.find、PLUGIN_API_MATRIX.find、performance.now、plugin.manifest.contributions[…].findIndex 等；写入 active、pluginState.active；包含显式抛错路径。 */ invokeContribution(kind: PluginContributionKind, contributionId: string, pluginId?: string): boolean {
    const contribution = pluginState.contributions.find(/* 先计算 item.kind === kind && item.id === contributionId；仅当其为真值时求右侧 (!pluginId || item.pluginId === pluginId)，返回短路求值结果。 */ item => item.kind === kind && item.id === contributionId && (!pluginId || item.pluginId === pluginId))
    const plugin = contribution && this.active.find(/* 比较 item.manifest.id 与 contribution.pluginId，返回严格相等的判断结果。 */ item => item.manifest.id === contribution.pluginId)
    const exportName = PLUGIN_API_MATRIX.find(/* 比较 item.kind 与 kind，返回严格相等的判断结果。 */ item => item.kind === kind)?.exportName
      ?? ({ panels: 'nova_plugin_panel', menus: 'nova_plugin_menu', assetEditors: 'nova_plugin_asset_editor', gizmos: 'nova_plugin_gizmo', buildHooks: 'nova_plugin_build_hook', runtimeSystems: 'nova_plugin_runtime_system', events: 'nova_plugin_event' } as Partial<Record<PluginContributionKind, string>>)[kind]
    const handler = exportName ? plugin?.instance.exports[exportName] : undefined
    if (!plugin || typeof handler !== 'function') return false
    try {
      const started = performance.now()
      ;(handler as CallableFunction)(plugin.manifest.contributions[kind]?.findIndex(/* 比较 item.id 与 contributionId，返回严格相等的判断结果。 */ item => item.id === contributionId) ?? -1)
      assertMemory(plugin.instance)
      if (performance.now() - started > MAX_PLUGIN_CALL_MS) throw new Error(`${kind} call exceeded ${MAX_PLUGIN_CALL_MS} ms`)
      return true
    } catch (error) {
      this.active = this.active.filter(/* 比较 item 与 plugin，返回严格不等的判断结果。 */ item => item !== plugin); pluginState.active = this.active.length
      this.isolateFailure(plugin.manifest, error); return false
    }
  }
  /** 结构说明（自动提取）：stop；无显式参数；直接调用 synchronizeState；写入 active；包含循环处理。 */ stop(): void {
    this.generation++
    for (const plugin of this.active) { const shutdown = plugin.instance.exports.nova_plugin_shutdown; if (typeof shutdown === 'function') try { (shutdown as CallableFunction)() } catch { /* isolated */ } }
    this.active = []; this.synchronizeState()
  }
  /** 结构说明（自动提取）：unload；输入 pluginId；直接调用 active.find、synchronizeState、active.filter；写入 active。 */ unload(pluginId: string): boolean {
    this.generation++
    const plugin = this.active.find(/* 比较 item.manifest.id 与 pluginId，返回严格相等的判断结果。 */ item => item.manifest.id === pluginId)
    if (!plugin) { this.synchronizeState(); return false }
    const shutdown = plugin.instance.exports.nova_plugin_shutdown
    if (typeof shutdown === 'function') try { (shutdown as CallableFunction)() } catch { /* isolated */ }
    this.active = this.active.filter(/* 比较 item 与 plugin，返回严格不等的判断结果。 */ item => item !== plugin); pluginState.unloads++; this.synchronizeState()
    return true
  }
  /** 结构说明（自动提取）：reload；输入 pluginId；直接调用 start、pluginState.manifests.find、unload、instantiateWasmPlugin、bytesFromAsset 等；等待异步结果。 */ async reload(pluginId?: string): Promise<void> {
    pluginState.reloads++
    if (!pluginId) { await this.start(); return }
    const manifest = pluginState.manifests.find(/* 先计算 item.id === pluginId && item.enabled && item.projectEnabled；仅当其为真值时求右侧 item.entryType === 'wasm'，返回短路求值结果。 */ item => item.id === pluginId && item.enabled && item.projectEnabled && item.entryType === 'wasm')
    this.unload(pluginId)
    if (!manifest || pluginState.safeMode) return
    const generation = this.generation
    try {
      const instance = await instantiateWasmPlugin(manifest, await bytesFromAsset(manifest.entryAsset), /* 先计算 generation === this.generation && manifest.enabled && manifest.projectEnabled；仅当其为真值时求右侧 !pluginState.safeMode，返回短路求值结果。 */ () => generation === this.generation && manifest.enabled && manifest.projectEnabled && !pluginState.safeMode)
      if (generation !== this.generation) { shutdownPluginInstance(instance); return }
      this.active.push({ manifest, instance }); this.synchronizeState()
    } catch (error) { if (generation === this.generation) this.isolateFailure(manifest, error) }
  }
  /** 结构说明（自动提取）：isolateFailure；输入 manifest、error；直接调用 String、pluginState.errors.push、addEditorLog、localStorage.setItem；写入 pluginState.safeModeRecommended。 */ private isolateFailure(manifest: PluginManifest, error: unknown): void {
    const message = `${manifest.name}: ${error instanceof Error ? error.message : String(error)}`
    pluginState.errors.push(message); pluginState.isolatedFailures++; addEditorLog(`${message}. The plugin was isolated.`, 'Plugin', 'error')
    if (typeof localStorage !== 'undefined') localStorage.setItem('nova-a-plugin-crashed', 'true')
    pluginState.safeModeRecommended = true
  }
}

/* 返回具有所列字段的新对象 { ...manifest, entryAsset: assetReference(uuid) }。 */ export function attachPluginAsset(manifest: PluginManifest, uuid: string): PluginManifest { return { ...manifest, entryAsset: assetReference(uuid) } }
/** 结构说明（自动提取）：setPluginPermission；输入 pluginId、permission、approved；直接调用 pluginState.manifests.find、manifest.permissions.includes、Set、manifest.approvedPermissions.filter、pluginRuntime.unload 等；写入 manifest.approvedPermissions。 */ export function setPluginPermission(pluginId: string, permission: PluginPermission, approved: boolean): boolean {
  if (typeof approved !== 'boolean') return false
  const manifest=pluginState.manifests.find(/* 比较 item.id 与 pluginId，返回严格相等的判断结果。 */ item=>item.id===pluginId)
  if(!manifest||!manifest.permissions.includes(permission))return false
  manifest.approvedPermissions=approved?[...new Set([...manifest.approvedPermissions,permission])]:manifest.approvedPermissions.filter(/* 比较 item 与 permission，返回严格不等的判断结果。 */ item=>item!==permission)
  if (!approved) pluginRuntime.unload(pluginId)
  refreshPluginContributions();pluginState.generation++;return true
}
export const pluginRuntime = new PluginRuntime()

onPackageLifecycle(/** 结构说明（自动提取）：onPackageLifecycle 回调；输入 id、action；直接调用 pluginState.manifests.find、refreshPluginContributions、pluginRuntime.unload、pluginState.manifests.findIndex、pluginState.manifests.splice 等；写入 manifest.projectEnabled、pluginState.manifests[…].projectEnabled、pluginState.manifests[…].enabled。 */ (id, action) => {
  if (action === 'enable') { const manifest = pluginState.manifests.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id); if (manifest) manifest.projectEnabled = true; refreshPluginContributions(); return }
  pluginRuntime.unload(id)
  const index = pluginState.manifests.findIndex(/* 比较 manifest.id 与 id，返回严格相等的判断结果。 */ manifest => manifest.id === id)
  if (index < 0) return
  if (action === 'uninstall') pluginState.manifests.splice(index, 1)
  else {
    pluginState.manifests[index].projectEnabled = false
    if (action === 'update' || action === 'rollback') {
      pluginState.manifests[index].enabled = false
      addEditorLog('Package version changed. Import its matching reviewed plugin manifest and binary before reloading.', 'Plugin', 'warning')
    }
  }
  refreshPluginContributions()
})

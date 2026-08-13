import { reactive } from 'vue'
import { addEditorLog } from '../store/editor'
import { assetReference, resolveAsset } from '../assets/AssetDatabase'

export const NOVA_PLUGIN_API_VERSION = 1
export const MAX_PLUGIN_BYTES = 16 * 1024 * 1024
export type PluginPermission = 'log' | 'events'

export interface PluginManifest {
  id: string
  name: string
  version: string
  apiVersion: number
  engine: string
  entry: string
  entryAsset: string | null
  permissions: PluginPermission[]
  enabled: boolean
}

interface ActivePlugin { manifest: PluginManifest; instance: WebAssembly.Instance }

const allowedPermissions = new Set<PluginPermission>(['log', 'events'])
export const pluginState = reactive({ manifests: [] as PluginManifest[], active: 0, errors: [] as string[] })

function safeText(value: unknown, maximum: number): string { return typeof value === 'string' ? value.trim().slice(0, maximum) : '' }

export function normalizePluginManifest(value: unknown): PluginManifest {
  const source = value && typeof value === 'object' ? value as Partial<PluginManifest> : {}
  const id = safeText(source.id, 120)
  const name = safeText(source.name, 120)
  const version = safeText(source.version, 40)
  const entry = safeText(source.entry, 240)
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(id)) throw new Error('Plugin id must use reverse-domain style, for example top.whitelists.camera-tools.')
  if (!name) throw new Error('Plugin name is required.')
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) throw new Error('Plugin version must use semantic versioning.')
  if (Number(source.apiVersion) !== NOVA_PLUGIN_API_VERSION) throw new Error(`Plugin API ${source.apiVersion} is unsupported; Nova_A requires API ${NOVA_PLUGIN_API_VERSION}.`)
  if (!entry.toLowerCase().endsWith('.wasm') || entry.includes('..') || entry.startsWith('/') || entry.includes('\\')) throw new Error('Plugin entry must be a safe relative .wasm path.')
  const permissions = Array.isArray(source.permissions) ? [...new Set(source.permissions.filter((permission): permission is PluginPermission => allowedPermissions.has(permission as PluginPermission)))] : []
  if (Array.isArray(source.permissions) && permissions.length !== source.permissions.length) throw new Error('Plugin requests an unsupported permission. Nova_A 2.0 only supports log and events.')
  return { id, name, version, apiVersion: NOVA_PLUGIN_API_VERSION, engine: safeText(source.engine, 40) || '^2.0.0', entry, entryAsset: typeof source.entryAsset === 'string' ? source.entryAsset : null, permissions, enabled: source.enabled !== false }
}

export function loadPluginManifests(value: unknown): void {
  const manifests = Array.isArray(value) ? value.flatMap(item => { try { return [normalizePluginManifest(item)] } catch { return [] } }) : []
  const unique = new Map(manifests.map(manifest => [manifest.id, manifest]))
  pluginState.manifests.splice(0, pluginState.manifests.length, ...unique.values())
}

export function serializePluginManifests(): PluginManifest[] { return pluginState.manifests.map(manifest => ({ ...manifest, permissions: [...manifest.permissions] })) }

export async function instantiateWasmPlugin(manifestValue: unknown, bytes: ArrayBuffer): Promise<WebAssembly.Instance> {
  const manifest = normalizePluginManifest(manifestValue)
  if (bytes.byteLength < 8 || bytes.byteLength > MAX_PLUGIN_BYTES) throw new Error('Plugin binary is empty or exceeds the 16 MB limit.')
  const magic = new Uint8Array(bytes, 0, 4)
  if (magic[0] !== 0 || magic[1] !== 97 || magic[2] !== 115 || magic[3] !== 109) throw new Error('Plugin entry is not a WebAssembly module.')
  const canLog = manifest.permissions.includes('log')
  const imports = {
    nova: {
      api_version: () => NOVA_PLUGIN_API_VERSION,
      log: (level: number, code: number) => { if (canLog) addEditorLog(`${manifest.name}: plugin message ${code}`, 'Plugin', level >= 3 ? 'error' : level === 2 ? 'warning' : 'info') },
      emit_event: (_event: number, _value: number) => manifest.permissions.includes('events') ? 1 : 0
    }
  }
  const result = await WebAssembly.instantiate(bytes, imports)
  const instance = result instanceof WebAssembly.Instance ? result : result.instance
  const exports = instance.exports as Record<string, WebAssembly.ExportValue>
  const api = exports.nova_plugin_api_version
  if (typeof api !== 'function' || Number((api as CallableFunction)()) !== NOVA_PLUGIN_API_VERSION) throw new Error('Plugin must export nova_plugin_api_version() returning 1.')
  const initialize = exports.nova_plugin_init
  if (typeof initialize !== 'function') throw new Error('Plugin must export nova_plugin_init().')
  ;(initialize as CallableFunction)()
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
    this.stop()
    const generation = this.generation
    pluginState.errors.splice(0)
    for (const manifest of pluginState.manifests.filter(item => item.enabled)) {
      try {
        const instance = await instantiateWasmPlugin(manifest, await bytesFromAsset(manifest.entryAsset))
        if (generation !== this.generation) return
        this.active.push({ manifest, instance })
      } catch (error) {
        const message = `${manifest.name}: ${error instanceof Error ? error.message : String(error)}`
        pluginState.errors.push(message)
        addEditorLog(message, 'Plugin', 'error')
      }
    }
    pluginState.active = this.active.length
  }

  update(delta: number): void {
    const failed = new Set<ActivePlugin>()
    for (const plugin of this.active) {
      const update = plugin.instance.exports.nova_plugin_update
      if (typeof update !== 'function') continue
      try { (update as CallableFunction)(Number.isFinite(delta) ? delta : 0) } catch (error) {
        failed.add(plugin)
        const message = `${plugin.manifest.name}: ${error instanceof Error ? error.message : String(error)}`
        pluginState.errors.push(message)
        addEditorLog(`${message}. The plugin was disabled for this play session.`, 'Plugin', 'error')
      }
    }
    if (failed.size) this.active = this.active.filter(plugin => !failed.has(plugin))
    pluginState.active = this.active.length
  }

  stop(): void {
    this.generation++
    for (const plugin of this.active) {
      const shutdown = plugin.instance.exports.nova_plugin_shutdown
      if (typeof shutdown === 'function') { try { (shutdown as CallableFunction)() } catch { /* Shutdown cannot block the runtime. */ } }
    }
    this.active = []
    pluginState.active = 0
  }
}

export function attachPluginAsset(manifest: PluginManifest, uuid: string): PluginManifest {
  return { ...manifest, entryAsset: assetReference(uuid) }
}

export const pluginRuntime = new PluginRuntime()

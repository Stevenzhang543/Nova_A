<template>
  <section class="plugin-settings">
    <p>{{ t('pluginDescription') }}</p>
    <div class="plugin-summary"><span>{{ t('pluginApi') }}</span><strong>WASM API {{ NOVA_PLUGIN_API_VERSION }}</strong><span>{{ t('activePlugins') }}</span><strong>{{ pluginState.active }}</strong></div>
    <div v-if="pluginState.manifests.length" class="plugin-list">
      <article v-for="manifest in pluginState.manifests" :key="manifest.id">
        <div class="plugin-identity"><strong>{{ manifest.name }}</strong><small>{{ manifest.id }} · {{ manifest.version }}</small><span>{{ contributionCount(manifest.id) }} {{ t('pluginContributions') }}</span></div>
        <label><input v-model="manifest.enabled" type="checkbox" @change="toggle(manifest.id,manifest.enabled)">{{ t('enabled') }}</label>
        <button :title="t('reloadPlugin')" @click="pluginRuntime.reload(manifest.id)">↻</button><button :title="t('removePlugin')" @click="remove(manifest.id)">×</button>
        <div class="permission-review"><strong>{{ t('permissionReview') }}</strong><label v-for="permission in manifest.permissions" :key="permission"><input :checked="manifest.approvedPermissions.includes(permission)" type="checkbox" @change="approve(manifest.id,permission,($event.target as HTMLInputElement).checked)"><span>{{ permission }}</span></label><small v-if="!manifest.permissions.length">{{ t('noPermissionsRequested') }}</small></div>
      </article>
    </div>
    <p v-else class="empty">{{ t('noPlugins') }}</p>
    <button class="import-button" @click="fileInput?.click()">+ {{ t('importWasmPlugin') }}</button>
    <p v-if="message" :class="['message', { error: failed }]" role="status">{{ message }}</p>
    <input ref="fileInput" hidden type="file" multiple accept=".json,.wasm,application/json,application/wasm" @change="importBundle">
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../i18n'
import { importAssetFiles } from '../assets/AssetDatabase'
import { pushHistory } from '../store/physics'
import { NOVA_PLUGIN_API_VERSION, attachPluginAsset, normalizePluginManifest, pluginRuntime, pluginState, setPluginPermission, validateWasmPluginPackage, type PluginPermission } from '../runtime/plugins'

const fileInput = ref<HTMLInputElement | null>(null)
const message = ref('')
const failed = ref(false)

function commit(): void { pushHistory('Configure plugins') }
async function toggle(id:string,enabled:boolean):Promise<void>{if(enabled)await pluginRuntime.reload(id);else pluginRuntime.unload(id);commit()}
function remove(id: string): void { pluginRuntime.unload(id);const index = pluginState.manifests.findIndex(item => item.id === id); if (index !== -1) pluginState.manifests.splice(index, 1); commit() }
async function approve(id:string,permission:PluginPermission,approved:boolean):Promise<void>{if(!setPluginPermission(id,permission,approved))return;await pluginRuntime.reload(id);commit()}
function contributionCount(id:string){return pluginState.contributions.filter(item=>item.pluginId===id).length}

async function importBundle(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  message.value = ''
  failed.value = false
  try {
    const manifestFile = files.find(file => file.name.toLowerCase().endsWith('.json'))
    const wasmFile = files.find(file => file.name.toLowerCase().endsWith('.wasm'))
    if (!manifestFile || !wasmFile) throw new Error(t('pluginPairRequired'))
    const declared = normalizePluginManifest(JSON.parse(await manifestFile.text()))
    const manifest = await validateWasmPluginPackage(declared, await wasmFile.arrayBuffer())
    if (manifest.entry.split('/').pop()?.toLowerCase() !== wasmFile.name.toLowerCase()) throw new Error(t('pluginEntryMismatch'))
    const [asset] = await importAssetFiles([wasmFile], 'Assets/Plugins')
    if (!asset) throw new Error(t('pluginAssetFailed'))
    const configured = attachPluginAsset({...manifest,approvedPermissions:[],enabled:false}, asset.uuid)
    const existing = pluginState.manifests.findIndex(item => item.id === configured.id)
    if (existing === -1) pluginState.manifests.push(configured)
    else pluginState.manifests.splice(existing, 1, configured)
    pushHistory('Import WASM plugin')
    message.value = t('pluginImportedAwaitingReview', { name: configured.name })
  } catch (error) {
    failed.value = true
    message.value = error instanceof Error ? error.message : String(error)
  }
}
</script>

<style scoped>
.plugin-settings > p { margin: 0 0 9px; }.plugin-summary { display: grid; grid-template-columns: 1fr auto; gap: 5px 12px; padding: 8px; border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--text-muted); font-size:11px; }.plugin-summary strong { color: var(--accent); }.plugin-list { margin-top: 8px; display: grid; gap: 5px; }.plugin-list article { min-height: 42px; padding: 5px 7px; display: grid; grid-template-columns: minmax(0, 1fr) auto 25px; gap: 7px; align-items: center; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-2); }.plugin-list article > div { min-width: 0; display: flex; flex-direction: column; }.plugin-list strong, .plugin-list small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.plugin-list strong { font-size:11px; }.plugin-list small { color: var(--text-muted); font-size:11px; }.plugin-list label { display: flex; align-items: center; gap: 4px; color: var(--text-muted); font-size:11px; }.plugin-list button { width: 24px; height: 24px; border: 0; border-radius: 6px; color: var(--danger); background: transparent; }.plugin-list button:hover { background: var(--danger-soft); }.import-button { width: 100%; min-height: 31px; margin-top: 8px; border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--accent); background: var(--surface-2); font-size:11px; }.empty { color: var(--text-muted); font-size:11px; }.message { color: var(--accent) !important; font-size:11px !important; }.message.error { color: var(--danger) !important; }
.plugin-summary { font-size: 11px; }.plugin-list article { min-height: 46px; }.plugin-list strong { font-size: 11px; }.plugin-list small, .plugin-list label { font-size:11px; }
.import-button { min-height: 34px; font-size: 11px; }.empty { font-size: 11px; }.message { font-size:11px !important; }
.plugin-list article { grid-template-columns: minmax(0, 1fr) auto 25px 25px; padding: 7px; }
.plugin-identity { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.plugin-identity span { color: var(--accent); font-size: var(--type-caption); }
.permission-review { grid-column: 1 / -1; display: flex !important; flex-flow: row wrap !important; align-items: center; gap: 6px 12px; padding-top: 7px; border-top: 1px solid var(--border-subtle); }
.permission-review > strong { flex: 0 0 100%; font-size: var(--type-caption); color: var(--text-muted); text-transform: uppercase; letter-spacing: .06em; }
.permission-review label { min-height: 24px; padding: 2px 7px; border: 1px solid var(--border-subtle); border-radius: 999px; background: var(--surface-1); }
@media (max-width: 520px) { .plugin-list article { grid-template-columns: minmax(0, 1fr) 25px 25px; }.plugin-list article > label { grid-column: 1 / -1; grid-row: 2; } }
</style>

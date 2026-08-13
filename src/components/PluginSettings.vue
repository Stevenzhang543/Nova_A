<template>
  <section class="plugin-settings">
    <p>{{ t('pluginDescription') }}</p>
    <div class="plugin-summary"><span>{{ t('pluginApi') }}</span><strong>WASM API {{ NOVA_PLUGIN_API_VERSION }}</strong><span>{{ t('activePlugins') }}</span><strong>{{ pluginState.active }}</strong></div>
    <div v-if="pluginState.manifests.length" class="plugin-list">
      <article v-for="manifest in pluginState.manifests" :key="manifest.id">
        <div><strong>{{ manifest.name }}</strong><small>{{ manifest.id }} · {{ manifest.version }}</small></div>
        <label><input v-model="manifest.enabled" type="checkbox" @change="commit">{{ t('enabled') }}</label>
        <button :title="t('removePlugin')" @click="remove(manifest.id)">×</button>
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
import { NOVA_PLUGIN_API_VERSION, attachPluginAsset, instantiateWasmPlugin, normalizePluginManifest, pluginState } from '../runtime/plugins'

const fileInput = ref<HTMLInputElement | null>(null)
const message = ref('')
const failed = ref(false)

function commit(): void { pushHistory('Configure plugins') }
function remove(id: string): void { const index = pluginState.manifests.findIndex(item => item.id === id); if (index !== -1) pluginState.manifests.splice(index, 1); commit() }

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
    const manifest = normalizePluginManifest(JSON.parse(await manifestFile.text()))
    if (manifest.entry.split('/').pop()?.toLowerCase() !== wasmFile.name.toLowerCase()) throw new Error(t('pluginEntryMismatch'))
    const bytes = await wasmFile.arrayBuffer()
    await instantiateWasmPlugin(manifest, bytes)
    const [asset] = await importAssetFiles([wasmFile], 'Assets/Plugins')
    if (!asset) throw new Error(t('pluginAssetFailed'))
    const configured = attachPluginAsset(manifest, asset.uuid)
    const existing = pluginState.manifests.findIndex(item => item.id === configured.id)
    if (existing === -1) pluginState.manifests.push(configured)
    else pluginState.manifests.splice(existing, 1, configured)
    pushHistory('Import WASM plugin')
    message.value = t('pluginImported', { name: configured.name })
  } catch (error) {
    failed.value = true
    message.value = error instanceof Error ? error.message : String(error)
  }
}
</script>

<style scoped>
.plugin-settings > p { margin: 0 0 9px; }.plugin-summary { display: grid; grid-template-columns: 1fr auto; gap: 5px 12px; padding: 8px; border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--text-muted); font-size: 9px; }.plugin-summary strong { color: var(--accent); }.plugin-list { margin-top: 8px; display: grid; gap: 5px; }.plugin-list article { min-height: 42px; padding: 5px 7px; display: grid; grid-template-columns: minmax(0, 1fr) auto 25px; gap: 7px; align-items: center; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-2); }.plugin-list article > div { min-width: 0; display: flex; flex-direction: column; }.plugin-list strong, .plugin-list small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.plugin-list strong { font-size: 9.5px; }.plugin-list small { color: var(--text-muted); font-size: 7.5px; }.plugin-list label { display: flex; align-items: center; gap: 4px; color: var(--text-muted); font-size: 8px; }.plugin-list button { width: 24px; height: 24px; border: 0; border-radius: 6px; color: var(--danger); background: transparent; }.plugin-list button:hover { background: var(--danger-soft); }.import-button { width: 100%; min-height: 31px; margin-top: 8px; border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--accent); background: var(--surface-2); font-size: 9px; }.empty { color: var(--text-muted); font-size: 9px; }.message { color: var(--accent) !important; font-size: 8.5px !important; }.message.error { color: var(--danger) !important; }
.plugin-summary { font-size: 11px; }.plugin-list article { min-height: 46px; }.plugin-list strong { font-size: 11px; }.plugin-list small, .plugin-list label { font-size: 10px; }
.import-button { min-height: 34px; font-size: 11px; }.empty { font-size: 11px; }.message { font-size: 10.5px !important; }
</style>

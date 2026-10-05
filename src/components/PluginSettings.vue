<!-- 插件配置：导入验证后的 WASM 插件，管理启停、权限与贡献统计。 -->
<template>
  <section class="plugin-settings">
    <p>{{ t('pluginDescription') }}</p>
    <div class="plugin-summary"><span>{{ t('pluginApi') }}</span><strong>WASM API {{ NOVA_PLUGIN_API_VERSION }}</strong><span>{{ t('activePlugins') }}</span><strong>{{ pluginState.active }}</strong></div>
    <div v-if="pluginState.manifests.length" class="plugin-list">
      <article v-for="manifest in pluginState.manifests" :key="manifest.id">
        <div class="plugin-identity"><strong>{{ manifest.name }}</strong><small>{{ manifest.id }} · {{ manifest.version }}</small><span>{{ contributionCount(manifest.id) }} {{ t('pluginContributions') }}</span></div>
        <label><input v-model="manifest.enabled" type="checkbox" @change="toggle(manifest.id,manifest.enabled)">{{ t('enabled') }}</label>
        <UiButton icon="refresh" :label="t('reloadPlugin')" @click="pluginRuntime.reload(manifest.id)" /><UiButton icon="remove" :label="t('removePlugin')" @click="remove(manifest.id)" />
        <div class="permission-review"><strong>{{ t('permissionReview') }}</strong><label v-for="permission in manifest.permissions" :key="permission"><input :checked="manifest.approvedPermissions.includes(permission)" type="checkbox" @change="approve(manifest.id,permission,($event.target as HTMLInputElement).checked)"><span>{{ permission }}</span></label><small v-if="!manifest.permissions.length">{{ t('noPermissionsRequested') }}</small></div>
      </article>
    </div>
    <p v-else class="empty">{{ t('noPlugins') }}</p>
    <button class="import-button" @click="fileInput?.click()"><EditorIcon name="upload" /> {{ t('importWasmPlugin') }}</button>
    <p v-if="message" :class="['message', { error: failed }]" role="status">{{ message }}</p>
    <input ref="fileInput" hidden type="file" multiple accept=".json,.wasm,application/json,application/wasm" @change="importBundle">
  </section>
</template>

<script setup lang="ts">
import UiButton from '../ui/components/UiButton.vue'
import EditorIcon from './EditorIcon.vue'
import { ref } from 'vue'
import { t } from '../i18n'
import { importAssetFiles } from '../assets/AssetDatabase'
import { pushHistory } from '../store/physics'
import { NOVA_PLUGIN_API_VERSION, attachPluginAsset, normalizePluginManifest, pluginRuntime, pluginState, setPluginPermission, validateWasmPluginPackage, type PluginPermission } from '../runtime/plugins'

const fileInput = ref<HTMLInputElement | null>(null)
const message = ref('')
const failed = ref(false)

/** 记录插件设置历史。 */ function commit(): void { pushHistory('Configure plugins') }
/** 启用时等待重新加载，禁用时卸载插件，随后记录历史。 */ async function toggle(id:string,enabled:boolean):Promise<void>{if(enabled)await pluginRuntime.reload(id);else pluginRuntime.unload(id);commit()}
/** 卸载插件并移除对应清单，再记录配置历史。 */ function remove(id: string): void { pluginRuntime.unload(id);const index = pluginState.manifests.findIndex(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id); if (index !== -1) pluginState.manifests.splice(index, 1); commit() }
/** 权限变更成功后重载插件并记录历史。 */ async function approve(id:string,permission:PluginPermission,approved:boolean):Promise<void>{if(!setPluginPermission(id,permission,approved))return;await pluginRuntime.reload(id);commit()}
/** 统计指定插件注册的贡献数量。 */ function contributionCount(id:string){return pluginState.contributions.filter(/* 比较 item.pluginId 与 id，返回严格相等的判断结果。 */ item=>item.pluginId===id).length}

/** 验证清单与 WASM 配对及入口名称，导入资源后以禁用和未授权状态注册，记录历史并提示待审核；失败显示错误。 */ async function importBundle(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  message.value = ''
  failed.value = false
  try {
    const manifestFile = files.find(/** 查找文件名以 JSON 扩展名结尾的清单文件。 */ file => file.name.toLowerCase().endsWith('.json'))
    const wasmFile = files.find(/** 查找文件名以 WASM 扩展名结尾的二进制文件。 */ file => file.name.toLowerCase().endsWith('.wasm'))
    if (!manifestFile || !wasmFile) throw new Error(t('pluginPairRequired'))
    const declared = normalizePluginManifest(JSON.parse(await manifestFile.text()))
    const manifest = await validateWasmPluginPackage(declared, await wasmFile.arrayBuffer())
    if (manifest.entry.split('/').pop()?.toLowerCase() !== wasmFile.name.toLowerCase()) throw new Error(t('pluginEntryMismatch'))
    const [asset] = await importAssetFiles([wasmFile], 'Assets/Plugins')
    if (!asset) throw new Error(t('pluginAssetFailed'))
    const configured = attachPluginAsset({...manifest,approvedPermissions:[],enabled:false}, asset.uuid)
    const existing = pluginState.manifests.findIndex(/* 比较 item.id 与 configured.id，返回严格相等的判断结果。 */ item => item.id === configured.id)
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

<style scoped> .plugin-settings{display:grid;gap:var(--ui-space-sm)}.plugin-settings>p{margin:0;color:var(--text-muted)}.plugin-summary{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:var(--ui-space-xs);padding-block:var(--ui-space-sm);border-block:1px solid var(--border-subtle)}.plugin-summary strong{color:var(--accent)}.plugin-list>article{display:grid;grid-template-columns:minmax(0,1fr) auto repeat(2,var(--ui-control-height));gap:var(--ui-space-xs);align-items:center;padding-block:var(--ui-space-sm);border-bottom:1px solid var(--border-subtle)}.plugin-identity{display:grid;min-width:0}.plugin-identity strong,.plugin-identity small{overflow-wrap:anywhere}.plugin-identity small,.plugin-identity span{font-size:var(--type-caption);color:var(--text-muted)}.plugin-list label{display:flex;gap:var(--ui-control-gap);align-items:center}.permission-review{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:var(--ui-space-sm)}.permission-review>strong{flex-basis:100%;color:var(--text-muted);font-size:var(--type-caption)}.import-button{justify-self:start}.message{color:var(--success)}.message.error{color:var(--danger)}</style>

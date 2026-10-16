/** 项目插件运行：加载插件描述、注册扩展能力并管理启用与清理。 */
import { reactive } from 'vue'
import { onPackageLifecycle } from './packages'
import { addEditorLog } from '../store/editor'
import { assetReference, resolveAsset } from '../assets/AssetDatabase'
import { createPluginRuntimeOwner } from './pluginRuntimeOwner'

export { NOVA_PLUGIN_API_VERSION, MAX_PLUGIN_BYTES, MAX_PLUGIN_CALL_MS, PLUGIN_API_MATRIX } from './pluginRuntimeOwner'
export type { PluginPermission, PluginContributionKind, PluginContributionDescriptor, PluginContribution, PluginManifest } from './pluginRuntimeOwner'
import type { PluginManifest, PluginContribution } from './pluginRuntimeOwner'

const startupSafeMode = typeof location !== 'undefined' && new URLSearchParams(location.search).get('safe-mode') === '1'
  || typeof localStorage !== 'undefined' && localStorage.getItem('nova-a-plugin-safe-mode') === 'true'
export const pluginState = reactive({
  manifests: [] as PluginManifest[], active: 0, errors: [] as string[], safeMode: startupSafeMode,
  activePluginIds: [] as string[],
  safeModeRecommended: typeof localStorage !== 'undefined' && localStorage.getItem('nova-a-plugin-crashed') === 'true',
  contributions: [] as Array<PluginContribution & { pluginId: string; pluginName: string }>,
  generation: 0, reloads: 0, unloads: 0, isolatedFailures: 0
})

export const { pluginRuntime, normalizePluginManifest, preparePackagePluginManifest, refreshPluginContributions, setPluginSafeMode, loadPluginManifests, serializePluginManifests, validateWasmPluginPackage, instantiateWasmPlugin, attachPluginAsset, setPluginPermission } = createPluginRuntimeOwner({
  state: pluginState, log: addEditorLog, clock: performance, crypto, atob, assetReference, resolveAsset,
  storage: typeof localStorage !== 'undefined' ? localStorage : undefined, fetch: source => fetch(source)
})

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

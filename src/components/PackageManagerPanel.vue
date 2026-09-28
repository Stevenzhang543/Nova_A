<!-- 资源包管理面板：浏览、启用和检查项目扩展包。 -->
<template>
  <section class="package-manager" data-doc="manual/package-security">
    <UiPanelHeader class="package-header" :title="t('packageManager')" :description="t('packageManagerHint')">
      <template #actions>
      <label class="offline"><input v-model="packages.offlineMode" type="checkbox">{{ t('offlineMode') }}</label>
      <UiButton icon="search" :label="t('browsePackages')" :aria-pressed="registryOpen" @click="pluginToolsOpen = false; registryOpen = !registryOpen" />
      <UiButton icon="settings" :label="t('pluginApi')" :aria-pressed="pluginToolsOpen" @click="pluginToolsOpen = !pluginToolsOpen; registryOpen = false" />
      <UiButton icon="upload" :label="t('importPackageManifest')" @click="manifestInput?.click()" />
      <input ref="manifestInput" hidden type="file" accept=".json,application/json" @change="importManifest">
      </template>
    </UiPanelHeader>
    <PluginSettings v-if="pluginToolsOpen" class="plugin-manager-tools" />
    <UiTabs v-if="!registryOpen && !pluginToolsOpen" :model-value="packages.selectedStatus" :items="statusTabs" :aria-label="t('packageManager')" @change="selectStatus" />
    <div v-if="registryOpen && !pluginToolsOpen" class="registry-layout">
      <section class="registry-list">
        <header><select v-model="packages.selectedRegistry" :aria-label="t('registry')"><option v-for="registry in packages.registries" :key="registry.id" :value="registry.id">{{ registry.name }}</option></select><input v-model="packages.registryQuery" type="search" :placeholder="t('searchRegistry')"></header>
        <article v-for="manifest in catalog" :key="`${manifest.id}:${manifest.version}`" :class="{ selected: selectedRegistryId === manifest.id }" tabindex="0" @keydown.enter.self="selectedRegistryId = manifest.id" @keydown.space.self.prevent="selectedRegistryId = manifest.id" @click="selectedRegistryId = manifest.id">
          <div class="package-mark">{{ manifest.pluginApi === 2 ? 'P' : 'N' }}</div><div><strong>{{ manifest.name }}</strong><small>{{ manifest.id }} · {{ manifest.version }}</small><p>{{ manifest.description }}</p></div><span v-if="manifest.publisherVerified" class="verified"><EditorIcon name="check" /> {{ t('verifiedPublisher') }}</span>
        </article>
        <p v-if="!catalog.length" class="empty">{{ t('noResults') }}</p>
      </section>
      <aside v-if="selectedRegistry" class="registry-inspector">
        <header><div><strong>{{ selectedRegistry.name }}</strong><small>{{ selectedRegistry.id }}</small></div><span>{{ selectedRegistry.rating ?? '—' }} / 5</span></header>
        <p>{{ selectedRegistry.description }}</p>
        <dl><div><dt>{{ t('publisher') }}</dt><dd>{{ selectedRegistry.publisher }} <EditorIcon v-if="selectedRegistry.publisherVerified" name="check" /></dd></div><div><dt>{{ t('engineVersion') }}</dt><dd>{{ selectedRegistry.engine }}</dd></div><div><dt>{{ t('packageType') }}</dt><dd>{{ selectedRegistry.entryPointType }}</dd></div><div><dt>{{ t('pluginApiCompatibility') }}</dt><dd>{{ installReviewRegistry.pluginApiCompatibility }} · {{ installReviewRegistry.certification }}</dd></div><div><dt>{{ t('license') }}</dt><dd>{{ installReviewRegistry.license }}</dd></div><div><dt>{{ t('provenance') }}</dt><dd>{{ installReviewRegistry.provenance }}</dd></div><div><dt>SHA-256</dt><dd>{{ selectedRegistry.sha256 }}</dd></div></dl>
        <p :class="reviewRegistry.status === 'verified' ? 'success' : 'problem'">{{ reviewRegistry.status }}<template v-if="reviewRegistry.blocking.length"> · {{ reviewRegistry.blocking.join(' ') }}</template><template v-if="reviewRegistry.warnings.length"> · {{ reviewRegistry.warnings.join(' ') }}</template> <button v-if="reviewRegistry.blocking.length || reviewRegistry.warnings.length" @click="openBundledManual('package-sdk')">{{ t('documentation') }}</button></p>
        <section><strong>{{ t('permissionReview') }}</strong><div class="chips"><span v-for="permission in selectedRegistry.permissions" :key="permission">{{ permission }}</span><p v-if="!selectedRegistry.permissions.length">{{ t('none') }}</p></div></section>
        <section class="registry-links"><strong>{{ t('security') }} / {{ t('documentation') }}</strong><button :disabled="!selectedRegistry.securityUrl" @click="openPackageUrl(selectedRegistry.securityUrl)">{{ t('security') }}</button><button :disabled="!selectedRegistry.documentationUrl" @click="openPackageUrl(selectedRegistry.documentationUrl)">{{ t('documentation') }}</button></section>
        <p>{{ t('packageBrowsingSafety') }}</p>
        <p v-if="!installReviewRegistry.executionAllowed" class="problem">{{ installReviewRegistry.blocking.join(' ') }}</p>
        <button class="install" :disabled="installedRegistry || !installReviewRegistry.executionAllowed" @click="installSelectedRegistry">{{ installedRegistry ? t('installed') : t('installPackage') }}</button>
      </aside>
    </div>
    <div v-else-if="!pluginToolsOpen" class="package-layout">
      <div class="package-list">
        <article v-for="item in visiblePackages" :key="item.manifest.id" :class="{ selected: selectedId === item.manifest.id }" tabindex="0" @keydown.enter.self="selectedId = item.manifest.id" @keydown.space.self.prevent="selectedId = item.manifest.id" @click="selectedId = item.manifest.id">
          <div class="package-mark">{{ item.manifest.native ? 'N' : item.manifest.pluginApi === 2 ? 'P' : 'A' }}</div>
          <div class="package-name"><strong>{{ item.manifest.name }}</strong><small>{{ item.manifest.id }} · {{ item.manifest.version }}</small></div>
          <span class="source">{{ item.source.kind }}</span>
          <label @click.stop><input :checked="item.enabled" :disabled="item.manifest.native" type="checkbox" @change="setEnabled(item, ($event.target as HTMLInputElement).checked)">{{ t('enabled') }}</label>
        </article>
        <p v-if="!visiblePackages.length" class="empty">{{ t('noPackagesInView') }}</p>
      </div>
      <aside v-if="selected" class="package-inspector">
        <div class="package-title"><strong>{{ selected.manifest.name }}</strong><span>{{ selected.manifest.version }}</span></div>
        <p>{{ selected.manifest.description || t('noDescription') }}</p>
        <dl>
          <div><dt>{{ t('source') }}</dt><dd :title="selected.source.location">{{ selected.source.kind }} · {{ selected.source.location }}</dd></div>
          <div><dt>{{ t('engineVersion') }}</dt><dd>{{ selected.manifest.engine }}</dd></div>
          <div><dt>{{ t('pluginApi') }}</dt><dd>{{ selected.manifest.pluginApi ?? t('none') }}</dd></div>
          <div><dt>{{ t('pluginApiCompatibility') }}</dt><dd>{{ selected.manifest.certification }} · {{ selected.manifest.apiCompatibility }}</dd></div>
          <div><dt>{{ t('packageType') }}</dt><dd>{{ selected.manifest.entryPointType }}</dd></div>
          <div><dt>{{ t('license') }}</dt><dd>{{ selected.manifest.license }}</dd></div>
          <div><dt>{{ t('provenance') }}</dt><dd>{{ selected.manifest.provenance }}</dd></div>
          <div><dt>{{ t('security') }}</dt><dd :class="selected.securityStatus === 'verified' ? 'success' : 'problem'">{{ selected.securityStatus }}</dd></div>
          <div><dt>SHA-256</dt><dd>{{ selected.manifest.sha256 || t('unsigned') }}</dd></div>
        </dl>
        <section>
          <strong>{{ t('compatibilityReport') }}</strong>
          <ul v-if="compatibility.length"><li v-for="problem in compatibility" :key="problem" class="problem">{{ problem }}</li></ul>
          <p v-else class="success">{{ t('packageCompatible') }}</p>
        </section>
        <section>
          <strong>{{ t('dependencies') }}</strong>
          <ul v-if="Object.keys(selected.manifest.dependencies).length"><li v-for="(range,id) in selected.manifest.dependencies" :key="id"><code>{{ id }}</code><span>{{ range }}</span></li></ul>
          <p v-else>{{ t('noDependencies') }}</p>
        </section>
        <section v-if="selected.manifest.pluginApi === 2">
          <strong>{{ t('pluginCapabilities') }}</strong>
          <div class="chips"><span v-for="permission in pluginManifest?.permissions ?? []" :key="permission">{{ permission }}</span></div>
          <p v-if="pluginManifest?.entryType === 'native'" class="problem">{{ t('nativeExtensionBlocked') }}</p>
        </section>
        <section v-if="update"><strong>{{ t('updatePreview') }}</strong><p>{{ selected.manifest.version }} → {{ update.version }}</p><p v-if="updatePermissions.length" class="problem">{{ t('permissionChanges') }}: {{ updatePermissions.join(', ') }}</p><button class="primary-action" @click="applyUpdate">{{ t('applyPackageUpdate') }}</button></section>
        <section v-if="rollbackAvailable"><strong>{{ t('packageRollback') }}</strong><button class="primary-action" @click="performRollback">{{ t('rollback') }}</button></section>
        <button class="danger" @click="requestUninstall">{{ t('uninstallPackage') }}</button>
      </aside>
      <aside v-else class="package-inspector safety">
        <strong>{{ t('extensionSafety') }}</strong>
        <label><input :checked="plugins.safeMode" type="checkbox" @change="setPluginSafeMode(($event.target as HTMLInputElement).checked)">{{ t('pluginSafeMode') }}</label>
        <p>{{ t('pluginSafeModeHint') }}</p>
        <p v-if="plugins.safeModeRecommended" class="problem">{{ t('safeModeRecommended') }}</p>
        <dl><div><dt>{{ t('packageLockfile') }}</dt><dd>{{ packages.lockfile.length }}</dd></div><div><dt>{{ t('offlineCache') }}</dt><dd>{{ packages.offlineCache.length }}</dd></div><div><dt>{{ t('quarantine') }}</dt><dd>{{ packages.quarantine.length }}</dd></div></dl>
        <button class="primary-action" @click="verifyCache">{{ t('verifyCache') }}</button><p v-if="cacheProblems.length" class="problem">{{ cacheProblems.join(' ') }}</p>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../i18n'
import { requestConfirmation } from '../store/dialog'
import { pushHistory } from '../store/physics'
import { setPackageEnabled, approvePackageUpdatePermissions, installPackageManifest, installRegistryPackage, normalizePackageManifest, packageCompatibility, packageInstallReview, packageState as packages, packageUninstallImpact, packageUpdate, registryPackages, reviewPackageSecurity, rollbackPackage, uninstallPackage, verifyPackageCache, type InstalledPackage } from '../runtime/packages'
import { preparePackagePluginManifest, pluginRuntime, pluginState as plugins, setPluginSafeMode } from '../runtime/plugins'
import { completeTask, failTask, startTask } from '../runtime/editorFeedback'
import { openBundledManual } from '../runtime/openManual'
import EditorIcon from './EditorIcon.vue'
import PluginSettings from './PluginSettings.vue'

const statuses = ['installed', 'project', 'updates', 'incompatible', 'disabled'] as const
const statusTabs = computed(() => statuses.map(id => ({ id, label: `${t(`packageStatus_${id}`)} (${count(id)})` })))
function selectStatus(id: string): void { if (statuses.includes(id as typeof statuses[number])) packages.selectedStatus = id as typeof statuses[number] }
const selectedId = ref(''), manifestInput = ref<HTMLInputElement | null>(null)
const registryOpen = ref(false), selectedRegistryId = ref('')
const pluginToolsOpen = ref(false)
const cacheProblems = ref<string[]>([])
const selected = computed(/** 查找当前选中的已安装包。 */ () => packages.installed.find(/* 比较 item.manifest.id 与 selectedId.value，返回严格相等的判断结果。 */ item => item.manifest.id === selectedId.value) ?? null)
const compatibility = computed(/* 根据 selected.value 的真假，分别返回 packageCompatibility(selected.value) 或 []。 */ () => selected.value ? packageCompatibility(selected.value) : [])
const update = computed(/* 根据 selected.value 的真假，分别返回 packageUpdate(selected.value) 或 null。 */ () => selected.value ? packageUpdate(selected.value) : null)
const pluginManifest = computed(/** 查找所选包对应插件清单。 */ () => plugins.manifests.find(/* 比较 item.id 与 selected.value?.manifest.id，返回严格相等的判断结果。 */ item => item.id === selected.value?.manifest.id) ?? null)
const catalog = computed(/* 调用 registryPackages() 并返回调用结果。 */ () => registryPackages())
const selectedRegistry = computed(/** 查找选中目录条目，否则回退首项或空值。 */ () => catalog.value.find(/* 比较 item.id 与 selectedRegistryId.value，返回严格相等的判断结果。 */ item => item.id === selectedRegistryId.value) ?? catalog.value[0] ?? null)
const installedRegistry = computed(/** 检查所选目录包是否已经安装。 */ () => packages.installed.some(/* 比较 item.manifest.id 与 selectedRegistry.value?.id，返回严格相等的判断结果。 */ item => item.manifest.id === selectedRegistry.value?.id))
const reviewRegistry = computed(/** 存在目录选择时生成安全审核，否则返回未验证空结果。 */ () => selectedRegistry.value ? reviewPackageSecurity(selectedRegistry.value) : { status: 'unverified', blocking: [], warnings: [] })
const installReviewRegistry = computed(/** 存在选择时生成安装审核，否则返回禁止执行的未认证空结果。 */ () => selectedRegistry.value ? packageInstallReview(selectedRegistry.value) : { pluginApiCompatibility: '', certification: 'uncertified', license: '', provenance: '', executionAllowed: false, blocking: [], warnings: [] })
const updatePermissions = computed(/** 比较更新权限与已授予权限，列出新增权限。 */ () => selected.value && update.value ? update.value.permissions.filter(/* 返回 selected.value!.grantedPermissions.includes(permission) 的逻辑取反结果。 */ permission => !selected.value!.grantedPermissions.includes(permission)) : [])
const rollbackAvailable = computed(/* 调用 Boolean(selected.value && packages.rollback[selected.value.manifest.id]?.length) 并返回调用结果。 */ () => Boolean(selected.value && packages.rollback[selected.value.manifest.id]?.length))
/** 根据项目、更新、不兼容或禁用状态过滤已安装包。 */ function matches(item: InstalledPackage, status: typeof statuses[number]): boolean {
  if (status === 'project') return item.project
  if (status === 'updates') return packageUpdate(item) !== null
  if (status === 'incompatible') return packageCompatibility(item).length > 0
  if (status === 'disabled') return !item.enabled
  return true
}
const visiblePackages = computed(/* 调用 packages.installed.filter(item => matches(item, packages.selectedStatus)) 并返回调用结果。 */ () => packages.installed.filter(/* 调用 matches(item, packages.selectedStatus) 并返回调用结果。 */ item => matches(item, packages.selectedStatus)))
/* 返回 packages.installed.filter(item => matches(item, status)).length 的当前值。 */ function count(status: typeof statuses[number]): number { return packages.installed.filter(/* 调用 matches(item, status) 并返回调用结果。 */ item => matches(item, status)).length }
/** 读取并验证包清单与可选插件，经权限确认后安装并登记历史，失败写入任务和包错误。 */ async function importManifest(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement, file = input.files?.[0]; input.value = ''
  if (!file) return
  const task = startTask(t('importPackageManifest'), { detail: file.name })
  try {
    const raw = JSON.parse(await file.text()) as Record<string, unknown>
    const preview = normalizePackageManifest(raw.package ?? raw), review = reviewPackageSecurity(preview)
    if (review.status !== 'verified') throw new Error(review.blocking.join(' '))
    const plugin = raw.plugin ? preparePackagePluginManifest(raw.plugin, preview) : null
    const approved = await requestConfirmation({ title: t('permissionReview'), message: `${preview.name} · ${preview.entryPointType}\n${preview.permissions.length ? preview.permissions.join(', ') : t('none')}\nSHA-256 ${preview.sha256}`, confirmLabel: t('installPackage'), cancelLabel: t('cancel'), destructive: false })
    if (!approved) { completeTask(task, t('cancel')); return }
    const item = installPackageManifest(raw.package ?? raw, raw.source)
    if (plugin && item.manifest.version === plugin.version) {
      pluginRuntime.unload(plugin.id)
      const index = plugins.manifests.findIndex(/* 比较 candidate.id 与 plugin.id，返回严格相等的判断结果。 */ candidate => candidate.id === plugin.id)
      if (index >= 0) plugins.manifests.splice(index, 1, plugin); else plugins.manifests.push(plugin)
    }
    selectedId.value = item.manifest.id; pushHistory('Install package'); completeTask(task, item.manifest.name)
  } catch (error) { packages.errors.push(error instanceof Error ? error.message : String(error)); failTask(task, error) }
}
/** 计算卸载影响并请求确认，确认后重新检查选择身份再卸载、记录历史及任务结果。 */ async function requestUninstall(): Promise<void> {
  if (!selected.value) return
  const reviewed = selected.value
  const impact = packageUninstallImpact(reviewed.manifest.id)
  const approved = await requestConfirmation({ title: t('uninstallPackage'), message: impact.length ? `${t('uninstallImpact')}: ${impact.join('; ')}` : t('uninstallNoImpact'), confirmLabel: t('uninstallPackage'), cancelLabel: t('cancel'), destructive: true })
  if (!approved) return
  if (selected.value !== reviewed || !packages.installed.includes(reviewed)) return
  const packageName = reviewed.manifest.name
  const task = startTask(t('uninstallPackage'), { detail: packageName })
  try {
    if (!uninstallPackage(reviewed.manifest.id)) throw new Error(t('operationFailed'))
    selectedId.value = ''; pushHistory('Uninstall package'); completeTask(task, packageName)
  } catch (error) { failTask(task, error) }
}
/** 更新包启用状态，同步插件项目开关并记录对应历史。 */ function setEnabled(item: InstalledPackage, enabled: boolean): void {
  if (!setPackageEnabled(item.manifest.id, enabled)) return
  const plugin = plugins.manifests.find(/* 比较 candidate.id 与 item.manifest.id，返回严格相等的判断结果。 */ candidate => candidate.id === item.manifest.id)
  if (plugin) plugin.projectEnabled = enabled
  pushHistory(enabled ? 'Enable package' : 'Disable package', `package:${item.manifest.id}`)
}
/** 审核新增权限，等待后重新检查包与更新身份，批准后更新并记录任务结果。 */ async function applyUpdate(): Promise<void> {
  if (!selected.value) return
  const reviewed = selected.value, candidate = update.value, permissions = [...updatePermissions.value]
  const task = startTask(t('applyPackageUpdate'), { detail: reviewed.manifest.name })
  if (updatePermissions.value.length) {
    const approved = await requestConfirmation({ title: t('permissionChanges'), message: updatePermissions.value.join(', '), confirmLabel: t('approve'), cancelLabel: t('cancel'), destructive: false })
    if (!approved) { completeTask(task, t('cancel')); return }
  }
  if (selected.value !== reviewed || update.value !== candidate || !packages.installed.includes(reviewed)) { failTask(task, new Error(t('operationFailed'))); return }
  if (!approvePackageUpdatePermissions(reviewed.manifest.id, permissions)) { failTask(task, new Error(t('operationFailed'))); return }
  pushHistory('Update package', `package:${selected.value.manifest.id}`); completeTask(task, selected.value.manifest.version)
}
/** 审核目录包的可执行性和权限，确认后重新检查选择与目录再安装并记录历史。 */ async function installSelectedRegistry(): Promise<void> {
  if (!selectedRegistry.value) return
  const reviewed = selectedRegistry.value, registry = packages.selectedRegistry
  const task = startTask(t('installPackage'), { detail: reviewed.name })
  const review = packageInstallReview(selectedRegistry.value)
  if (!review.executionAllowed) { failTask(task, new Error(review.blocking.join(' '))); return }
  const approved = await requestConfirmation({ title: t('permissionReview'), message: `${selectedRegistry.value.name} · ${selectedRegistry.value.entryPointType}\n${t('publisher')}: ${review.publisher}\n${t('license')}: ${review.license}\n${t('provenance')}: ${review.provenance}\n${t('permissions')}: ${review.permissions.length ? review.permissions.join(', ') : t('none')}\nSHA-256 ${review.archiveSha256}`, confirmLabel: t('installPackage'), cancelLabel: t('cancel'), destructive: false })
  if (!approved) { completeTask(task, t('cancel')); return }
  if (selectedRegistry.value !== reviewed || packages.selectedRegistry !== registry) { failTask(task, new Error(t('operationFailed'))); return }
  try { const item = installRegistryPackage(reviewed.id); selectedId.value = item.manifest.id; pushHistory('Install registry package'); completeTask(task, item.manifest.name) }
  catch (error) { failTask(task, error) }
}
/** 回滚所选包成功后记录资源范围历史。 */ function performRollback(): void { if (!selected.value || !rollbackPackage(selected.value.manifest.id)) return; pushHistory('Rollback package', `package:${selected.value.manifest.id}`) }
/** 校验资源包缓存并更新问题列表。 */ function verifyCache(): void { cacheProblems.value = verifyPackageCache() }
/** 仅处理 HTTPS 地址；原生环境交给外部链接插件并捕获错误，Web 以隔离来源的新窗口打开。 */ async function openPackageUrl(url: string): Promise<void> {
  if (!/^https:\/\//i.test(url)) return
  if ('__TAURI_INTERNALS__' in window) { try { const { openUrl } = await import('@tauri-apps/plugin-opener'); await openUrl(url); return } catch (error) { packages.errors.push(error instanceof Error ? error.message : String(error)); return } }
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.package-manager{height:100%;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden;container-type:inline-size}
.plugin-manager-tools{min-height:0;flex:1;padding:var(--space-3);overflow:auto}
.offline,.package-list label{display:flex;align-items:center;gap:var(--space-1);color:var(--text-secondary)}
.package-layout,.registry-layout{min-height:0;flex:1;display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);overflow:hidden}
.package-list,.registry-list,.package-inspector,.registry-inspector{min-width:0;min-height:0;overflow:auto;scrollbar-gutter:stable}
.package-list,.registry-list{padding:var(--space-2)}
.package-list article,.registry-list>article{min-width:0;padding:var(--space-2);display:grid;grid-template-columns:var(--ui-control-height) minmax(0,1fr) auto auto;align-items:center;gap:var(--space-2);border-bottom:1px solid var(--border-subtle);cursor:pointer}
.registry-list>article{grid-template-columns:var(--ui-control-height) minmax(0,1fr) auto;align-items:start}
.package-list article:hover,.registry-list>article:hover{background:var(--surface-hover)}
.package-list article.selected,.registry-list>article.selected{background:var(--selection-bg);box-shadow:inset var(--space-0) 0 var(--accent)}
.package-mark{height:var(--ui-control-height);display:grid;place-items:center;color:var(--accent);font-weight:700}
.package-name,.registry-list>article>div:nth-child(2),.registry-inspector>header>div{min-width:0;display:grid;overflow-wrap:anywhere}
.package-name small,.registry-list small,.source,.registry-list p,.registry-inspector p,.package-inspector p{color:var(--text-muted)}
.source,.verified{font-size:var(--type-caption)}
.verified{display:flex;align-items:center;gap:var(--space-1);color:var(--success)}
.package-inspector,.registry-inspector{padding:var(--space-3);border-left:1px solid var(--border-subtle);background:var(--surface-1)}
.package-title,.registry-inspector>header{display:flex;justify-content:space-between;flex-wrap:wrap;gap:var(--space-2);overflow-wrap:anywhere}
.package-title span{color:var(--accent)}
.package-inspector section,.registry-inspector section{margin-top:var(--space-3);padding-top:var(--space-3);border-top:1px solid var(--border-subtle)}
dl{margin:var(--space-3) 0}dl>div{min-width:0;padding:var(--space-1) 0;display:grid;grid-template-columns:minmax(0,var(--ui-label-width)) minmax(0,1fr);gap:var(--space-2);border-bottom:1px solid var(--border-subtle)}dt{color:var(--text-muted)}dd{margin:0;overflow-wrap:anywhere}
ul{padding-left:var(--space-4)}li{margin:var(--space-1) 0}li span{margin-left:var(--space-2);color:var(--text-muted)}
.problem{color:var(--danger)}.success{color:var(--success)}
.chips{margin-top:var(--space-2);display:flex;flex-wrap:wrap;gap:var(--space-1)}.chips span{padding:var(--space-0) var(--space-1);background:var(--surface-2);color:var(--text-secondary);font-size:var(--type-caption)}
.danger{margin-top:var(--space-3);color:var(--danger)}.safety label{margin-top:var(--space-3);display:flex;align-items:center;gap:var(--space-2)}.empty{padding:var(--space-4);color:var(--text-muted);text-align:center}
.primary-action,.install{color:var(--accent);border-color:var(--accent)}
.registry-list>header{padding-bottom:var(--space-2);display:flex;flex-wrap:wrap;gap:var(--space-2)}
.registry-links{display:flex;flex-wrap:wrap;gap:var(--space-1)}.registry-links strong{flex-basis:100%}.registry-inspector>.install{margin-top:var(--space-3)}
@container(max-width:700px){.package-layout,.registry-layout{grid-template-columns:minmax(0,1fr);overflow:auto;align-content:start}.package-list,.registry-list,.package-inspector,.registry-inspector{overflow:visible}.package-inspector,.registry-inspector{border-left:0;border-top:1px solid var(--border-subtle)}.package-list article{grid-template-columns:var(--ui-control-height) minmax(0,1fr) auto}.source{grid-column:2}.package-list label{grid-column:3;grid-row:auto}.registry-list>article{grid-template-columns:var(--ui-control-height) minmax(0,1fr)}.verified{grid-column:2}}
</style>

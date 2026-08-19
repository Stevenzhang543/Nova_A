<template>
  <section class="package-manager" data-doc="manual/package-security">
    <header class="package-header">
      <div><strong>{{ t('packageManager') }}</strong><small>{{ t('packageManagerHint') }}</small></div>
      <label class="offline"><input v-model="packages.offlineMode" type="checkbox">{{ t('offlineMode') }}</label>
      <button :class="{ active: registryOpen }" @click="pluginToolsOpen = false; registryOpen = !registryOpen">{{ t('browsePackages') }}</button>
      <button :class="{ active: pluginToolsOpen }" @click="pluginToolsOpen = !pluginToolsOpen; registryOpen = false">{{ t('pluginApi') }}</button>
      <button @click="manifestInput?.click()">+ {{ t('importPackageManifest') }}</button>
      <input ref="manifestInput" hidden type="file" accept=".json,application/json" @change="importManifest">
    </header>
    <PluginSettings v-if="pluginToolsOpen" class="plugin-manager-tools" />
    <nav v-if="!registryOpen && !pluginToolsOpen" class="package-tabs" role="tablist">
      <button v-for="tab in statuses" :key="tab" :class="{ active: packages.selectedStatus === tab }" @click="packages.selectedStatus = tab">
        {{ t(`packageStatus_${tab}`) }} <span>{{ count(tab) }}</span>
      </button>
    </nav>
    <div v-if="registryOpen && !pluginToolsOpen" class="registry-layout">
      <section class="registry-list">
        <header><select v-model="packages.selectedRegistry"><option v-for="registry in packages.registries" :key="registry.id" :value="registry.id">{{ registry.name }}</option></select><input v-model="packages.registryQuery" type="search" :placeholder="t('searchRegistry')"></header>
        <article v-for="manifest in catalog" :key="`${manifest.id}:${manifest.version}`" :class="{ selected: selectedRegistryId === manifest.id }" @click="selectedRegistryId = manifest.id">
          <div class="package-mark">{{ manifest.pluginApi === 2 ? 'P' : 'N' }}</div><div><strong>{{ manifest.name }}</strong><small>{{ manifest.id }} · {{ manifest.version }}</small><p>{{ manifest.description }}</p></div><span v-if="manifest.publisherVerified" class="verified">✓ {{ t('verifiedPublisher') }}</span>
        </article>
        <p v-if="!catalog.length" class="empty">{{ t('noResults') }}</p>
      </section>
      <aside v-if="selectedRegistry" class="registry-inspector">
        <header><div><strong>{{ selectedRegistry.name }}</strong><small>{{ selectedRegistry.id }}</small></div><span>{{ selectedRegistry.rating ?? '—' }} / 5</span></header>
        <p>{{ selectedRegistry.description }}</p>
        <dl><div><dt>{{ t('publisher') }}</dt><dd>{{ selectedRegistry.publisher }} <b v-if="selectedRegistry.publisherVerified">✓</b></dd></div><div><dt>{{ t('engineVersion') }}</dt><dd>{{ selectedRegistry.engine }}</dd></div><div><dt>{{ t('packageType') }}</dt><dd>{{ selectedRegistry.entryPointType }}</dd></div><div><dt>SHA-256</dt><dd>{{ selectedRegistry.sha256 }}</dd></div></dl>
        <p :class="reviewRegistry.status === 'verified' ? 'success' : 'problem'">{{ reviewRegistry.status }}<template v-if="reviewRegistry.blocking.length"> · {{ reviewRegistry.blocking.join(' ') }}</template></p>
        <section><strong>{{ t('permissionReview') }}</strong><div class="chips"><span v-for="permission in selectedRegistry.permissions" :key="permission">{{ permission }}</span><p v-if="!selectedRegistry.permissions.length">{{ t('none') }}</p></div></section>
        <section class="registry-links"><strong>{{ t('security') }} / {{ t('documentation') }}</strong><button :disabled="!selectedRegistry.securityUrl" @click="openPackageUrl(selectedRegistry.securityUrl)">{{ t('security') }}</button><button :disabled="!selectedRegistry.documentationUrl" @click="openPackageUrl(selectedRegistry.documentationUrl)">{{ t('documentation') }}</button></section>
        <p>{{ t('packageBrowsingSafety') }}</p>
        <button class="install" :disabled="installedRegistry" @click="installSelectedRegistry">{{ installedRegistry ? t('installed') : t('installPackage') }}</button>
      </aside>
    </div>
    <div v-else-if="!pluginToolsOpen" class="package-layout">
      <div class="package-list">
        <article v-for="item in visiblePackages" :key="item.manifest.id" :class="{ selected: selectedId === item.manifest.id }" @click="selectedId = item.manifest.id">
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
          <div><dt>{{ t('packageType') }}</dt><dd>{{ selected.manifest.entryPointType }}</dd></div>
          <div><dt>{{ t('security') }}</dt><dd :class="selected.securityStatus === 'verified' ? 'success' : 'problem'">{{ selected.securityStatus }}</dd></div>
          <div><dt>SHA-256</dt><dd>{{ selected.manifest.sha256 ? `${selected.manifest.sha256.slice(0, 14)}…` : t('unsigned') }}</dd></div>
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
import { approvePackageUpdatePermissions, installPackageManifest, installRegistryPackage, normalizePackageManifest, packageCompatibility, packageState as packages, packageUninstallImpact, packageUpdate, registryPackages, reviewPackageSecurity, rollbackPackage, uninstallPackage, verifyPackageCache, type InstalledPackage } from '../runtime/packages'
import { normalizePluginManifest, pluginState as plugins, setPluginSafeMode } from '../runtime/plugins'
import { completeTask, failTask, startTask } from '../runtime/editorFeedback'
import PluginSettings from './PluginSettings.vue'

const statuses = ['installed', 'project', 'updates', 'incompatible', 'disabled'] as const
const selectedId = ref(''), manifestInput = ref<HTMLInputElement | null>(null)
const registryOpen = ref(false), selectedRegistryId = ref('')
const pluginToolsOpen = ref(false)
const cacheProblems = ref<string[]>([])
const selected = computed(() => packages.installed.find(item => item.manifest.id === selectedId.value) ?? null)
const compatibility = computed(() => selected.value ? packageCompatibility(selected.value) : [])
const update = computed(() => selected.value ? packageUpdate(selected.value) : null)
const pluginManifest = computed(() => plugins.manifests.find(item => item.id === selected.value?.manifest.id) ?? null)
const catalog = computed(() => registryPackages())
const selectedRegistry = computed(() => catalog.value.find(item => item.id === selectedRegistryId.value) ?? catalog.value[0] ?? null)
const installedRegistry = computed(() => packages.installed.some(item => item.manifest.id === selectedRegistry.value?.id))
const reviewRegistry = computed(() => selectedRegistry.value ? reviewPackageSecurity(selectedRegistry.value) : { status: 'unverified', blocking: [], warnings: [] })
const updatePermissions = computed(() => selected.value && update.value ? update.value.permissions.filter(permission => !selected.value!.grantedPermissions.includes(permission)) : [])
const rollbackAvailable = computed(() => Boolean(selected.value && packages.rollback[selected.value.manifest.id]?.length))
function matches(item: InstalledPackage, status: typeof statuses[number]): boolean {
  if (status === 'project') return item.project
  if (status === 'updates') return packageUpdate(item) !== null
  if (status === 'incompatible') return packageCompatibility(item).length > 0
  if (status === 'disabled') return !item.enabled
  return true
}
const visiblePackages = computed(() => packages.installed.filter(item => matches(item, packages.selectedStatus)))
function count(status: typeof statuses[number]): number { return packages.installed.filter(item => matches(item, status)).length }
async function importManifest(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement, file = input.files?.[0]; input.value = ''
  if (!file) return
  const task = startTask(t('importPackageManifest'), { detail: file.name })
  try {
    const raw = JSON.parse(await file.text()) as Record<string, unknown>
    const preview = normalizePackageManifest(raw.package ?? raw), review = reviewPackageSecurity(preview)
    if (review.status !== 'verified') throw new Error(review.blocking.join(' '))
    const approved = await requestConfirmation({ title: t('permissionReview'), message: `${preview.name} · ${preview.entryPointType}\n${preview.permissions.length ? preview.permissions.join(', ') : t('none')}\nSHA-256 ${preview.sha256}`, confirmLabel: t('installPackage'), cancelLabel: t('cancel'), destructive: false })
    if (!approved) { completeTask(task, t('cancel')); return }
    const item = installPackageManifest(raw.package ?? raw, raw.source)
    if (item.manifest.pluginApi === 2 && raw.plugin) {
      const plugin = normalizePluginManifest(raw.plugin), index = plugins.manifests.findIndex(candidate => candidate.id === plugin.id)
      if (index >= 0) plugins.manifests.splice(index, 1, plugin); else plugins.manifests.push(plugin)
    }
    selectedId.value = item.manifest.id; pushHistory('Install package'); completeTask(task, item.manifest.name)
  } catch (error) { packages.errors.push(error instanceof Error ? error.message : String(error)); failTask(task, error) }
}
async function requestUninstall(): Promise<void> {
  if (!selected.value) return
  const impact = packageUninstallImpact(selected.value.manifest.id)
  const approved = await requestConfirmation({ title: t('uninstallPackage'), message: impact.length ? `${t('uninstallImpact')}: ${impact.join('; ')}` : t('uninstallNoImpact'), confirmLabel: t('uninstallPackage'), cancelLabel: t('cancel'), destructive: true })
  if (!approved) return
  const packageName = selected.value.manifest.name
  const task = startTask(t('uninstallPackage'), { detail: packageName })
  try {
    if (!uninstallPackage(selected.value.manifest.id)) throw new Error(t('operationFailed'))
    selectedId.value = ''; pushHistory('Uninstall package'); completeTask(task, packageName)
  } catch (error) { failTask(task, error) }
}
function setEnabled(item: InstalledPackage, enabled: boolean): void {
  item.enabled = enabled
  const plugin = plugins.manifests.find(candidate => candidate.id === item.manifest.id)
  if (plugin) plugin.projectEnabled = enabled
  pushHistory(enabled ? 'Enable package' : 'Disable package', `package:${item.manifest.id}`)
}
async function applyUpdate(): Promise<void> {
  if (!selected.value) return
  const task = startTask(t('applyPackageUpdate'), { detail: selected.value.manifest.name })
  if (updatePermissions.value.length) {
    const approved = await requestConfirmation({ title: t('permissionChanges'), message: updatePermissions.value.join(', '), confirmLabel: t('approve'), cancelLabel: t('cancel'), destructive: false })
    if (!approved) { completeTask(task, t('cancel')); return }
  }
  if (!approvePackageUpdatePermissions(selected.value.manifest.id, updatePermissions.value)) { failTask(task, new Error(t('operationFailed'))); return }
  const plugin = plugins.manifests.find(candidate => candidate.id === selected.value?.manifest.id)
  if (plugin) plugin.version = selected.value.manifest.version
  pushHistory('Update package', `package:${selected.value.manifest.id}`); completeTask(task, selected.value.manifest.version)
}
async function installSelectedRegistry(): Promise<void> {
  if (!selectedRegistry.value) return
  const task = startTask(t('installPackage'), { detail: selectedRegistry.value.name })
  const approved = await requestConfirmation({ title: t('permissionReview'), message: `${selectedRegistry.value.name} · ${selectedRegistry.value.entryPointType}\n${selectedRegistry.value.permissions.length ? selectedRegistry.value.permissions.join(', ') : t('none')}\nSHA-256 ${selectedRegistry.value.sha256}`, confirmLabel: t('installPackage'), cancelLabel: t('cancel'), destructive: false })
  if (!approved) { completeTask(task, t('cancel')); return }
  try { const item = installRegistryPackage(selectedRegistry.value.id); selectedId.value = item.manifest.id; pushHistory('Install registry package'); completeTask(task, item.manifest.name) }
  catch (error) { failTask(task, error) }
}
function performRollback(): void { if (!selected.value || !rollbackPackage(selected.value.manifest.id)) return; pushHistory('Rollback package', `package:${selected.value.manifest.id}`) }
function verifyCache(): void { cacheProblems.value = verifyPackageCache() }
async function openPackageUrl(url: string): Promise<void> {
  if (!/^https:\/\//i.test(url)) return
  if ('__TAURI_INTERNALS__' in window) { try { const { openUrl } = await import('@tauri-apps/plugin-opener'); await openUrl(url); return } catch (error) { packages.errors.push(error instanceof Error ? error.message : String(error)); return } }
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.plugin-manager-tools{min-height:0;flex:1;padding:12px;overflow:auto}
.package-manager{height:100%;min-width:0;display:flex;flex-direction:column;overflow:hidden}.package-header{min-height:48px;padding:7px 10px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border-subtle)}.package-header>div{min-width:0;flex:1;display:grid}.package-header strong{font-size:12px}.package-header small{overflow:hidden;color:var(--text-muted);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.package-header button{height:31px;padding:0 10px;flex:0 0 auto}.offline{display:flex;align-items:center;gap:5px;color:var(--text-muted);white-space:nowrap}.package-tabs{min-height:36px;padding:4px 8px 0;display:flex;gap:3px;overflow-x:auto;border-bottom:1px solid var(--border-subtle);scrollbar-width:thin}.package-tabs button{min-width:max-content;padding:0 10px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--text-muted)}.package-tabs button.active{border-bottom-color:var(--accent);color:var(--accent)}.package-tabs span{margin-left:4px;color:var(--text-muted)}.package-layout{min-height:0;flex:1;display:grid;grid-template-columns:minmax(300px,1fr) minmax(260px,32%)}.package-list,.package-inspector{min-height:0;overflow:auto;scrollbar-gutter:stable}.package-list{padding:8px}.package-list article{min-width:0;min-height:53px;padding:7px;display:grid;grid-template-columns:38px minmax(0,1fr) auto auto;align-items:center;gap:8px;border:1px solid transparent;border-radius:9px}.package-list article:hover,.package-list article.selected{border-color:var(--border-strong);background:var(--surface-2)}.package-mark{width:34px;height:34px;display:grid;place-items:center;border-radius:8px;background:var(--accent-soft);color:var(--accent);font-weight:750}.package-name{min-width:0;display:grid}.package-name strong,.package-name small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.package-name strong{font-size:11px}.package-name small{color:var(--text-muted);font-size:11px}.source{padding:3px 6px;border-radius:999px;background:var(--surface-3);color:var(--text-muted);font-size:11px}.package-list label{display:flex;align-items:center;gap:4px;white-space:nowrap}.package-inspector{padding:12px;border-left:1px solid var(--border-subtle);background:var(--surface-2)}.package-title{display:flex;justify-content:space-between;gap:8px}.package-title span{color:var(--accent)}.package-inspector>p,.package-inspector section p{color:var(--text-muted);line-height:1.45}.package-inspector section{margin-top:12px;padding-top:10px;border-top:1px solid var(--border-subtle)}.package-inspector section>strong{font-size:11px;text-transform:uppercase;letter-spacing:.06em}.package-inspector dl{margin:10px 0 0}.package-inspector dl div{min-width:0;padding:5px 0;display:grid;grid-template-columns:95px minmax(0,1fr);gap:8px;border-bottom:1px solid var(--border-subtle)}.package-inspector dt{color:var(--text-muted)}.package-inspector dd{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.package-inspector ul{padding-left:17px}.package-inspector li{margin:5px 0}.package-inspector li span{float:right;color:var(--text-muted)}.problem{color:var(--danger)!important}.success{color:var(--success)!important}.chips{margin-top:7px;display:flex;flex-wrap:wrap;gap:4px}.chips span{padding:3px 6px;border-radius:999px;background:var(--surface-3);color:var(--text-muted);font-size:11px}.danger{width:100%;min-height:32px;margin-top:12px;color:var(--danger)}.safety label{margin-top:12px;display:flex;align-items:center;gap:6px}.empty{padding:25px;color:var(--text-muted);text-align:center}@media(max-width:800px){.package-layout{grid-template-columns:1fr}.package-inspector{position:absolute;right:0;bottom:0;width:min(320px,75vw);height:calc(100% - 84px);box-shadow:var(--shadow-lg)}.package-header small{display:none}}
.primary-action{width:100%;min-height:30px;color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}
.registry-layout{min-height:0;flex:1;display:grid;grid-template-columns:minmax(300px,1fr) minmax(260px,34%);overflow:hidden}.registry-list,.registry-inspector{min-height:0;overflow:auto;scrollbar-gutter:stable}.registry-list{padding:8px}.registry-list>header{padding-bottom:7px;display:grid;grid-template-columns:minmax(130px,220px) minmax(140px,1fr);gap:6px}.registry-list>header>*{min-width:0}.registry-list>article{min-width:0;padding:9px;display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:start;gap:8px;border:1px solid transparent;border-radius:10px}.registry-list>article:hover,.registry-list>article.selected{border-color:var(--accent);background:var(--accent-soft)}.registry-list>article>div:nth-child(2){min-width:0;display:grid}.registry-list strong,.registry-list small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.registry-list small,.registry-list p,.registry-inspector p{color:var(--text-muted);font-size:11px}.registry-list p{margin:3px 0 0;line-height:1.4}.verified{color:var(--success);font-size:11px;white-space:nowrap}.registry-inspector{padding:12px;border-left:1px solid var(--border-subtle);background:var(--surface-2)}.registry-inspector>header{display:flex;justify-content:space-between;gap:8px}.registry-inspector>header>div{min-width:0;display:grid}.registry-inspector>header small{overflow:hidden;color:var(--text-muted);font-size:11px;text-overflow:ellipsis}.registry-inspector>header>span{color:var(--warning)}.registry-inspector dl div{padding:5px 0;display:grid;grid-template-columns:90px minmax(0,1fr);gap:6px;border-bottom:1px solid var(--border-subtle)}.registry-inspector dt{color:var(--text-muted)}.registry-inspector dd{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.registry-inspector dd b{color:var(--success)}.registry-inspector section{margin-top:11px;padding-top:9px;border-top:1px solid var(--border-subtle)}.registry-links{display:grid;grid-template-columns:1fr 1fr;gap:5px}.registry-links strong{grid-column:1/-1}.registry-links button,.registry-inspector>.install{min-height:30px;border:1px solid var(--border-subtle);border-radius:7px;background:var(--surface-3)}.registry-inspector>.install{width:100%;margin-top:10px;color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}
@media(max-width:800px){.package-header{flex-wrap:wrap}.package-header>div{flex-basis:100%}.package-tabs{flex-wrap:wrap;overflow:visible}.package-list article{grid-template-columns:38px minmax(0,1fr) auto}.package-list .source{display:none}}
@media(max-width:800px){.registry-layout{grid-template-columns:1fr}.registry-inspector{position:absolute;right:0;bottom:0;width:min(330px,78vw);height:calc(100% - 48px);box-shadow:var(--shadow-lg)}}
</style>

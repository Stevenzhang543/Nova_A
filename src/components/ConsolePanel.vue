<template>
  <section class="console-panel">
    <header>
      <input v-model="search" type="search" :placeholder="t('consoleSearch')">
      <select v-model="level"><option value="all">{{ t('allLevels') }}</option><option v-for="item in levels" :key="item" :value="item">{{ levelLabel(item) }}</option></select>
      <select v-model="category"><option value="all">{{ t('allCategories') }}</option><option v-for="item in categories" :key="item">{{ item }}</option></select>
      <span>{{ t('visibleMessages', { count: visible.length }) }}</span>
      <button @click="editorState.logs.splice(0)">{{ t('clearConsole') }}</button>
    </header>
    <div class="console-list">
      <p v-if="!visible.length" class="empty">{{ t('noConsoleMessages') }}</p>
      <button v-for="entry in visible" :key="entry.id" :class="['log-entry', entry.level]" @click="openSource(entry.source)">
        <time>{{ entry.timestamp }}</time><b>{{ levelLabel(entry.level) }}</b><strong>{{ entry.category }}</strong><span>{{ entry.message }}</span><code v-if="entry.source">{{ entry.source }}</code>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { assetGuid, assetState } from '../assets/AssetDatabase'
import { t } from '../i18n'
import { editorState, type EditorLogCategory, type EditorLogLevel } from '../store/editor'

const levels: EditorLogLevel[] = ['trace', 'debug', 'info', 'warning', 'error', 'fatal']
const categories: EditorLogCategory[] = ['Engine', 'Physics', 'Renderer', 'Script', 'Plugin', 'Save', 'Assets', 'Audio', 'Runtime', 'Project', 'Editor']
const search = ref(''), level = ref<EditorLogLevel | 'all'>('all'), category = ref<EditorLogCategory | 'all'>('all')
const visible = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return editorState.logs.filter(entry => (level.value === 'all' || entry.level === level.value)
    && (category.value === 'all' || entry.category === category.value)
    && (!query || `${entry.category} ${entry.message} ${entry.source ?? ''}`.toLocaleLowerCase().includes(query)))
})

function levelLabel(value: EditorLogLevel): string { return t(value === 'debug' ? 'debugLevel' : value) }
function openSource(source?: string) {
  if (!source) return
  const reference = source.match(/^asset:\/\/[0-9a-f-]+/i)?.[0] ?? source
  const guid = assetGuid(reference)
  if (!guid || !assetState.records.some(asset => asset.uuid === guid)) return
  assetState.selectedGuid = guid
  const asset = assetState.records.find(candidate => candidate.uuid === guid)!
  assetState.currentFolder = asset.path.slice(0, asset.path.lastIndexOf('/'))
  editorState.bottomPanelTab = 'assets'
}
</script>

<style scoped>
.console-panel { height: 100%; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }
header { min-height: 38px; padding: 5px 8px; display: flex; align-items: center; flex-wrap: wrap; gap: 5px; border-bottom: 1px solid var(--border-subtle); }
header input { min-width: 140px; flex: 1 1 240px; } header select { min-width: 105px; } header span { margin-left: auto; color: var(--text-muted); font-size: 11px; }
header button, header input, header select { min-height: 30px; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--text-secondary); background: var(--surface-2); font-size: 11px; }
.console-list { min-height: 0; flex: 1; overflow: auto; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
.log-entry { width: 100%; min-width: 0; min-height: 31px; padding: 4px 9px; display: grid; grid-template-columns: 76px 62px 78px minmax(0, 1fr) minmax(0, auto); gap: 7px; align-items: center; overflow: hidden; border: 0; border-bottom: 1px solid var(--border-subtle); border-radius: 0; color: var(--text-secondary); background: transparent; text-align: left; font-size: 11px; }
.log-entry:hover { background: var(--surface-hover); }.log-entry time, .log-entry code, .log-entry b, .log-entry strong, .log-entry span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.log-entry time, .log-entry code { color: var(--text-muted); }.log-entry b { color: var(--text-muted); }.log-entry strong { color: var(--accent); }.log-entry.warning b, .log-entry.warning strong { color: var(--warning); }.log-entry.error b, .log-entry.error strong, .log-entry.fatal b, .log-entry.fatal strong { color: var(--danger); }.log-entry.fatal { background: var(--danger-soft); }
.empty { padding: 18px; color: var(--text-muted); font: 10px Nunito Sans, sans-serif; }
@media (max-width: 760px) { .log-entry { grid-template-columns: 58px 48px 58px minmax(120px, 1fr); }.log-entry code { display: none; } }
</style>

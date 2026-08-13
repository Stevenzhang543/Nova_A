<template>
  <section class="bottom-panel" :class="{ collapsed: !estate.bottomPanelOpen }" :style="panelStyle">
    <div v-if="estate.bottomPanelOpen" class="resize-handle" @mousedown="startResize"></div>
    <header class="panel-tabs">
      <button v-for="tab in tabs" :key="tab.id" :class="{ active: estate.bottomPanelTab === tab.id }" @click="openTab(tab.id)">{{ t(tab.label) }}</button>
      <span></span>
      <button v-if="estate.bottomPanelTab === 'console' && estate.bottomPanelOpen" :title="t('clearConsole')" @click="estate.logs.splice(0)">⌫</button>
      <button :title="t(estate.bottomPanelOpen ? 'collapsePanel' : 'expandPanel')" @click="estate.bottomPanelOpen = !estate.bottomPanelOpen">{{ estate.bottomPanelOpen ? '⌄' : '⌃' }}</button>
    </header>

    <div v-if="estate.bottomPanelOpen" class="panel-content">
      <div v-if="estate.bottomPanelTab === 'assets'" class="asset-browser" :class="{ inspecting: selectedAsset }">
        <aside class="folder-tree">
          <strong>{{ t('projectFiles') }}</strong>
          <button
            v-for="folder in visibleFolders"
            :key="folder"
            :class="{ active: assets.currentFolder === folder }"
            @click="assets.currentFolder = folder"
            @dragover.prevent
            @drop="dropOnFolder($event, folder)"
          ><span>▸</span>{{ folder }}</button>
        </aside>

        <section class="asset-workspace">
          <header class="asset-toolbar">
            <div class="asset-actions-row">
              <button class="primary" :disabled="assets.importing" @click="assetInput?.click()">＋ {{ t('importAssets') }}</button>
              <button @click="createScriptAsset">+ {{ t('newScript') }}</button>
              <button @click="creatingFolder = !creatingFolder">{{ t('newFolder') }}</button>
              <button @click="exportFolder">{{ t('exportProjectFolder') }}</button>
              <input v-if="creatingFolder" v-model="newFolderName" class="folder-input" :placeholder="t('folderName')" @keydown.enter="createFolder" @keydown.escape="creatingFolder = false">
              <span class="path" :title="assets.currentFolder">{{ assets.currentFolder }}</span>
              <input v-model="assets.search" type="search" :placeholder="t('searchAssets')">
            </div>
            <nav class="asset-filters" :aria-label="t('assetType')">
              <button v-for="filter in assetFilters" :key="filter.type" :class="{ active: assets.typeFilter === filter.type }" @click="assets.typeFilter = filter.type">{{ t(filter.label) }}</button>
            </nav>
            <input ref="assetInput" hidden type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,audio/wav,audio/ogg,audio/mpeg,font/ttf,font/otf,font/woff,font/woff2,.ttf,.otf,.woff,.woff2,.rhai,.nova-prefab,.nova-scene,.nova-material,.nova-anim,.nova-controller,.nova-mask,.nova-rig,.nova-skin,.nova-timeline,.nova-tileset" @change="importFiles">
          </header>

          <div class="asset-grid">
            <article
              v-for="asset in displayedAssets"
              :key="asset.uuid"
              :class="{ selected: assets.selectedGuid === asset.uuid }"
              draggable="true"
              @dragstart="dragAsset($event, asset.uuid)"
              @click="assets.selectedGuid = asset.uuid"
              @dblclick="asset.assetType === 'script' ? openInScriptStudio(asset.uuid) : startRename(asset.uuid, asset.name)"
            >
              <span v-if="asset.assetType === 'image'" class="asset-preview" :style="{ backgroundImage: `url(${asset.source})`, imageRendering: asset.settings.filterMode === 'Nearest' ? 'pixelated' : 'auto' }"></span>
              <span v-else class="asset-preview asset-icon">{{ assetIcon(asset.assetType) }}</span>
              <input v-if="renamingGuid === asset.uuid" v-model="renameValue" @click.stop @keydown.enter="commitRename" @keydown.escape="renamingGuid = null" @blur="commitRename">
              <strong v-else>{{ asset.name }}</strong>
              <small>{{ asset.assetType }} · {{ formatBytes(asset.byteLength) }}</small>
            </article>
            <p v-if="!displayedAssets.length" class="empty">{{ t('noAssets') }}</p>
          </div>
        </section>

        <aside v-if="selectedAsset" class="asset-inspector" @change="assetSettingsChanged">
          <header><span>{{ t('assetInspector') }}</span><strong>{{ selectedAsset.name }}</strong></header>
          <div v-if="selectedAsset.assetType === 'image'" class="large-preview" :style="{ backgroundImage: `url(${selectedAsset.source})`, imageRendering: selectedAsset.settings.filterMode === 'Nearest' ? 'pixelated' : 'auto' }"></div>
          <label><span>GUID</span><code>{{ selectedAsset.uuid.slice(0, 13) }}…</code></label>
          <label><span>{{ t('assetPath') }}</span><code>{{ selectedAsset.path }}</code></label>
          <template v-if="selectedAsset.assetType === 'image'">
            <label><span>{{ t('dimensions') }}</span><b>{{ selectedAsset.width }} × {{ selectedAsset.height }}</b></label>
            <label><span>{{ t('filterMode') }}</span><select v-model="selectedAsset.settings.filterMode"><option value="Linear">{{ t('linear') }}</option><option value="Nearest">{{ t('nearest') }}</option></select></label>
            <label><span>{{ t('pixelArtMode') }}</span><input :checked="selectedAsset.settings.filterMode === 'Nearest'" type="checkbox" @change="setPixelArtMode"></label>
            <label><span>{{ t('compression') }}</span><select v-model="selectedAsset.settings.compression"><option value="None">{{ t('none') }}</option><option value="Lossless">{{ t('lossless') }}</option><option value="Optimized">{{ t('optimized') }}</option></select></label>
            <label><span>{{ t('colorSpace') }}</span><select v-model="selectedAsset.settings.colorSpace"><option>sRGB</option><option>Linear</option></select></label>
            <label><span>{{ t('pixelsPerUnit') }}</span><input v-model.number="selectedAsset.settings.pixelsPerUnit" type="number" min="0.000001" step="1"></label>
            <label><span>{{ t('pivot') }} X/Y</span><div><input v-model.number="selectedAsset.settings.pivot.x" type="number" min="0" max="1" step="0.05"><input v-model.number="selectedAsset.settings.pivot.y" type="number" min="0" max="1" step="0.05"></div></label>
            <label><span>{{ t('useSpriteRegion') }}</span><input :checked="selectedAsset.settings.spriteRegion !== null" type="checkbox" @change="toggleSpriteRegion"></label>
            <label v-if="selectedAsset.settings.spriteRegion" class="region-field"><span>{{ t('spriteRegion') }} X/Y/W/H</span><div><input v-model.number="selectedAsset.settings.spriteRegion.x" type="number" min="0" step="1"><input v-model.number="selectedAsset.settings.spriteRegion.y" type="number" min="0" step="1"><input v-model.number="selectedAsset.settings.spriteRegion.width" type="number" min="1" step="1"><input v-model.number="selectedAsset.settings.spriteRegion.height" type="number" min="1" step="1"></div></label>
            <label><span>{{ t('useTextureAtlas') }}</span><input v-model="selectedAsset.settings.atlas" type="checkbox"></label>
            <label v-for="platform in compressionPlatforms" :key="platform"><span>{{ t(platform) }} {{ t('compression') }}</span><select v-model="selectedAsset.settings.platformVariants[platform]"><option :value="undefined">{{ t('inherit') }}</option><option>None</option><option>Lossless</option><option>Optimized</option></select></label>
          </template>
          <label v-else-if="selectedAsset.assetType === 'audio'"><span>{{ t('duration') }}</span><b>{{ selectedAsset.duration.toFixed(2) }}s</b></label>
          <label v-else-if="selectedAsset.assetType === 'font'"><span>{{ t('fontFamily') }}</span><b :style="{ fontFamily: selectedAsset.fontFamily }">Nova_A</b></label>
          <template v-else-if="selectedAsset.assetType === 'script'">
            <p class="drag-hint">{{ t('scriptStudioAssetHint') }}</p>
            <button class="save-script" @click="openInScriptStudio(selectedAsset.uuid)">{{ t('openScriptStudio') }}</button>
          </template>
          <template v-else-if="selectedAsset.assetType === 'animation' && selectedAsset.animationImport">
            <p class="drag-hint">{{ t('animationImportHint') }}</p>
            <label><span>{{ t('sourceAnimation') }}</span><select v-model="selectedAsset.animationImport.sourceAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in animationSources" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
            <label><span>{{ t('sourceFrameRate') }}</span><input v-model.number="selectedAsset.animationImport.sourceFrameRate" type="number" min="1" max="240"></label>
            <label><span>{{ t('sampleRate') }}</span><input v-model.number="selectedAsset.animationImport.sampleRate" type="number" min="1" max="240"></label>
            <details class="mapping-editor"><summary>{{ t('trackMappings') }}</summary><label v-for="(mapping,index) in selectedAsset.animationImport.trackMappings" :key="index"><input v-model="mapping.source" :placeholder="t('sourceProperty')"><input v-model="mapping.target" :placeholder="t('targetProperty')"><button @click="selectedAsset.animationImport!.trackMappings.splice(index,1)">×</button></label><button @click="selectedAsset.animationImport.trackMappings.push({source:'Transform.position.x',target:'Transform.position.x'})">+ {{ t('trackMapping') }}</button></details>
            <button class="save-script" @click="reimportAnimation">{{ t('reimportAnimation') }}</button>
          </template>
          <button v-else-if="selectedAsset.assetType === 'prefab'" class="save-script" @click="instantiateSelectedPrefab">{{ t('instantiatePrefabAction') }}</button>
          <div class="asset-actions"><button @click="revealAsset">{{ t('revealAsset') }}</button><button class="danger" @click="removeSelectedAsset">{{ t('deleteAsset') }}</button></div>
          <p class="drag-hint">{{ t('dragAssetHint') }}</p>
        </aside>
      </div>

      <ConsolePanel v-else-if="estate.bottomPanelTab === 'console'" />
      <ProfilerPanel v-else-if="estate.bottomPanelTab === 'profiler'" />
      <RenderingPanel v-else-if="estate.bottomPanelTab === 'rendering'" />

      <AnimationPanel v-else-if="estate.bottomPanelTab === 'animation'" />
      <TilemapPanel v-else-if="estate.bottomPanelTab === 'tilemap'" />

      <div v-else-if="estate.bottomPanelTab === 'project'" class="project-summary">
        <article><span>{{ t('engineVersion') }}</span><strong>2.4.0</strong></article>
        <article><span>{{ t('formatVersion') }}</span><strong>{{ t('projectFormatTwo') }} · schema 17</strong></article>
        <article><span>{{ t('scenes') }}</span><strong>{{ sceneManager.scenes.length }}</strong></article>
        <article><span>{{ t('assets') }}</span><strong>{{ assets.records.length }}</strong></article>
        <article><span>{{ t('rendererBackend') }}</span><strong>{{ estate.rendererStats.backend }}</strong></article>
        <p>{{ t('runtimeIsolation') }}</p>
      </div>

      <BuildSettingsPanel v-else />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { t } from '../i18n'
import { addEditorLog, editorState as estate } from '../store/editor'
import { clearAssetReferences, countAssetReferences, getSceneJSON, physicsState as state, pushHistory, sceneManager } from '../store/physics'
import { requestConfirmation } from '../store/dialog'
import {
  assetReference, assetState as assets, createAssetFolder, createTextAsset, deleteAsset, filteredAssets, importAssetFiles,
  moveAsset, rebuildTextureAtlases, renameAsset
} from '../assets/AssetDatabase'
import type { AssetType } from '../assets/types'
import { exportProjectFolder } from '../assets/projectFolder'
import { DEFAULT_SCRIPT_SOURCE } from '../runtime/GameplayRuntime'
import { openScriptAsset } from '../editor/scriptStudioState'
import { applyEditorWorkspace } from '../editor/workspaces'
import { instantiatePrefab } from '../runtime/prefabs'
import { reimportAnimationClip } from '../runtime/animation'
import AnimationPanel from './AnimationPanel.vue'
import BuildSettingsPanel from './BuildSettingsPanel.vue'
import ConsolePanel from './ConsolePanel.vue'
import ProfilerPanel from './ProfilerPanel.vue'
import RenderingPanel from './RenderingPanel.vue'
import TilemapPanel from './TilemapPanel.vue'

const tabs = [
  { id: 'assets' as const, label: 'assets' as const }, { id: 'console' as const, label: 'console' as const },
  { id: 'animation' as const, label: 'animation' as const }, { id: 'profiler' as const, label: 'profiler' as const },
  { id: 'rendering' as const, label: 'renderingStudio' as const },
  { id: 'tilemap' as const, label: 'tilemap' as const },
  { id: 'project' as const, label: 'projectPanel' as const }, { id: 'build' as const, label: 'buildPanel' as const }
]
const assetFilters: Array<{ type: AssetType | 'all'; label: Parameters<typeof t>[0] }> = [
  { type: 'all', label: 'allAssets' }, { type: 'image', label: 'images' }, { type: 'audio', label: 'audioAssets' },
  { type: 'font', label: 'fontAssets' }, { type: 'scene', label: 'scenes' }, { type: 'prefab', label: 'prefabs' },
  { type: 'script', label: 'scripts' }, { type: 'material', label: 'materials' }, { type: 'animation', label: 'animations' },
  { type: 'controller', label: 'controllers' }, { type: 'animationMask', label: 'animationMasks' }, { type: 'rig', label: 'rigs' },
  { type: 'skin', label: 'skins' }, { type: 'timeline', label: 'timelines' }, { type: 'tileset', label: 'tileSets' }, { type: 'other', label: 'otherAssets' }
]
const compressionPlatforms = ['windows', 'linux', 'macos', 'web'] as const
const panelStyle = computed(() => ({ height: estate.bottomPanelOpen ? `${estate.bottomPanelHeight}px` : '34px' }))
const displayedAssets = computed(() => { void assets.generation; return filteredAssets() })
const visibleFolders = computed(() => assets.folders.filter(folder => !folder.startsWith('.nova/')))
const selectedAsset = computed(() => assets.records.find(asset => asset.uuid === assets.selectedGuid) ?? null)
const animationSources = computed(() => assets.records.filter(asset => asset.assetType === 'animation' && asset.uuid !== selectedAsset.value?.uuid))
const assetInput = ref<HTMLInputElement | null>(null)
const creatingFolder = ref(false), newFolderName = ref('')
const renamingGuid = ref<string | null>(null), renameValue = ref('')
function openTab(id: typeof tabs[number]['id']) { estate.bottomPanelTab = id; estate.bottomPanelOpen = true }
async function importFiles(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const imported = await importAssetFiles(input.files, assets.currentFolder === 'Assets' ? undefined : assets.currentFolder)
  if (imported.length) {
    const latest = imported[imported.length - 1]
    assets.selectedGuid = latest.uuid
    assets.currentFolder = latest.path.slice(0, latest.path.lastIndexOf('/'))
    pushHistory('Import assets')
    addEditorLog(t('assetsImported', { count: imported.length }), 'Assets')
  }
  input.value = ''
}
function dragAsset(event: DragEvent, guid: string) { event.dataTransfer?.setData('application/x-nova-asset-guid', guid); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copyMove' }
function dropOnFolder(event: DragEvent, folder: string) { const guid = event.dataTransfer?.getData('application/x-nova-asset-guid'); if (guid && moveAsset(guid, folder)) { pushHistory('Move asset'); addEditorLog(t('assetMoved'), 'Assets') } }
function createFolder() { if (createAssetFolder(assets.currentFolder, newFolderName.value)) { addEditorLog(t('folderCreated'), 'Assets'); newFolderName.value = ''; creatingFolder.value = false; pushHistory('Create asset folder') } }
function createScriptAsset() {
  const asset = createTextAsset(t('newScriptName'), 'script', DEFAULT_SCRIPT_SOURCE, 'Assets/Scripts')
  assets.selectedGuid = asset.uuid
  pushHistory('Create script asset')
  addEditorLog(t('scriptCreated', { name: asset.name }), 'Assets')
}
function openInScriptStudio(uuid: string) { openScriptAsset(uuid); applyEditorWorkspace('script') }
function instantiateSelectedPrefab() {
  const asset = selectedAsset.value
  if (!asset || asset.assetType !== 'prefab' || state.playMode !== 'editing') return
  const canvas = document.querySelector<HTMLElement>('.canvas-container')
  const rect = canvas?.getBoundingClientRect()
  const point = rect
    ? state.camera.screenToWorld({ x: rect.width / 2, y: rect.height / 2 })
    : { x: 0, y: 0 }
  const entities = instantiatePrefab(assetReference(asset.uuid), point)
  if (!entities.length) return
  pushHistory('Instantiate prefab')
  addEditorLog(t('prefabInstantiated', { name: asset.name }), 'Assets')
}
function startRename(guid: string, name: string) { renamingGuid.value = guid; renameValue.value = name; void nextTick(() => document.querySelector<HTMLInputElement>('.asset-grid article input')?.select()) }
function commitRename() { if (!renamingGuid.value) return; if (renameAsset(renamingGuid.value, renameValue.value)) { pushHistory('Rename asset'); addEditorLog(t('assetRenamed'), 'Assets') } renamingGuid.value = null }
async function removeSelectedAsset() {
  const asset = selectedAsset.value
  if (!asset) return
  const referenceCount = countAssetReferences(asset.uuid)
  const approved = await requestConfirmation({ title: t('deleteAsset'), message: t('deleteAssetConfirm', { name: asset.name, count: referenceCount }), confirmLabel: t('deleteAsset'), cancelLabel: t('cancel'), destructive: true })
  if (!approved) return
  clearAssetReferences(asset.uuid)
  deleteAsset(asset.uuid); pushHistory('Delete asset'); addEditorLog(t('assetDeleted'), 'Assets', 'warning')
}
function revealAsset() { const asset = selectedAsset.value; if (!asset) return; assets.currentFolder = asset.path.slice(0, asset.path.lastIndexOf('/')); estate.statusText = asset.path }
function setPixelArtMode(event: Event) { if (selectedAsset.value?.assetType === 'image') selectedAsset.value.settings.filterMode = (event.target as HTMLInputElement).checked ? 'Nearest' : 'Linear' }
function toggleSpriteRegion(event: Event) {
  const asset = selectedAsset.value
  if (!asset || asset.assetType !== 'image') return
  asset.settings.spriteRegion = (event.target as HTMLInputElement).checked
    ? { x: 0, y: 0, width: Math.max(1, asset.width), height: Math.max(1, asset.height) }
    : null
}
function assetSettingsChanged() { void rebuildTextureAtlases(); pushHistory('Change import settings', `asset:${selectedAsset.value?.uuid}`) }
function reimportAnimation() {
  const asset = selectedAsset.value
  if (!asset?.animationImport) return
  if (!reimportAnimationClip(asset)) { addEditorLog(t('animationReimportFailed'), 'Assets', 'error'); return }
  assets.generation++
  pushHistory('Reimport animation', `asset:${asset.uuid}`)
  addEditorLog(t('animationReimported', { name: asset.name }), 'Assets')
}
async function exportFolder() {
  try {
    const result = await exportProjectFolder(getSceneJSON(), assets.records, assets.folders)
    estate.statusText = t(result === 'saved' ? 'projectFolderExported' : result === 'unsupported' ? 'projectFolderUnsupported' : 'saveCancelled')
    if (result === 'saved') addEditorLog(t('projectFolderExported'), 'Project')
  } catch (error) {
    estate.statusText = t('projectFolderFailed', { message: error instanceof Error ? error.message : t('unknownError') })
    addEditorLog(estate.statusText, 'Project', 'error')
  }
}
function assetIcon(type: AssetType): string { return type === 'audio' ? '♫' : type === 'font' ? 'Aa' : type === 'scene' ? '◇' : type === 'prefab' ? '⬡' : type === 'animation' ? '▶' : type === 'controller' ? '⌘' : type === 'animationMask' ? '◐' : type === 'rig' ? '◍' : type === 'skin' ? '▧' : type === 'timeline' ? '⏱' : type === 'material' ? '◩' : '◆' }
function formatBytes(value: number): string { return value < 1024 ? `${value} B` : value < 1024 ** 2 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 ** 2).toFixed(1)} MB` }

let startY = 0, startHeight = 0
function startResize(event: MouseEvent) { startY = event.clientY; startHeight = estate.bottomPanelHeight; document.addEventListener('mousemove', resizePanel); document.addEventListener('mouseup', stopResize); document.body.style.cursor = 'ns-resize' }
function resizePanel(event: MouseEvent) { estate.bottomPanelHeight = Math.min(520, Math.max(120, startHeight + startY - event.clientY)) }
function stopResize() { document.removeEventListener('mousemove', resizePanel); document.removeEventListener('mouseup', stopResize); document.body.style.cursor = 'default' }
onBeforeUnmount(stopResize)
</script>

<style scoped>
.asset-inspector label.region-field { padding: 6px 0; flex-direction: column; align-items: stretch; }.asset-inspector label.region-field > div { max-width: none; }.asset-inspector label.region-field input { width: 25%; min-width: 0; }
.bottom-panel { position: relative; flex: 0 0 auto; min-height: 34px; display: flex; flex-direction: column; border-top: 1px solid var(--border-subtle); background: var(--surface-1); }
.resize-handle { position: absolute; inset: -4px 0 auto; height: 8px; cursor: ns-resize; z-index: 5; }
.panel-tabs { min-height: 34px; flex: 0 0 auto; padding: 3px 5px; display: flex; align-items: center; flex-wrap: wrap; gap: 2px; overflow: hidden; border-bottom: 1px solid var(--border-subtle); }
.panel-tabs span { min-width: 4px; flex: 1; }.panel-tabs button { height: 29px; padding: 0 clamp(7px, .9vw, 12px); flex: 0 1 auto; border: 0; border-radius: 7px; color: var(--text-muted); background: transparent; font-size: clamp(10px, .82vw, 12px); white-space: nowrap; word-break: keep-all; writing-mode: horizontal-tb; }.panel-tabs button:hover, .panel-tabs button.active { color: var(--text-primary); background: var(--surface-hover); }.panel-tabs button.active { color: var(--accent); }
.panel-content { flex: 1; min-width: 0; min-height: 0; overflow: hidden; }.asset-browser { height: 100%; min-height: 120px; display: grid; grid-template-columns: minmax(145px,18%) minmax(180px,1fr); overflow: hidden; }.asset-browser.inspecting { grid-template-columns: minmax(145px,18%) minmax(160px,1fr) minmax(205px,25%); }.folder-tree, .asset-inspector { min-height: 0; padding: 9px; overflow: auto; background: var(--surface-2); }.folder-tree { border-right: 1px solid var(--border-subtle); }.folder-tree strong { display: block; padding: 3px 7px 8px; color: var(--text-muted); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }.folder-tree button { width: 100%; min-height: 29px; padding: 0 7px; display: flex; align-items: center; gap: 5px; border: 0; border-radius: 7px; color: var(--text-muted); background: transparent; font-size: 12px; text-align: left; }.folder-tree button.active, .folder-tree button:hover { color: var(--accent); background: var(--accent-soft); }
.asset-workspace { min-width: 0; overflow: hidden; display: flex; flex-direction: column; }.asset-toolbar { min-height: 86px; padding: 6px 8px; display: grid; grid-template-rows: auto auto; gap: 5px; overflow: visible; border-bottom: 1px solid var(--border-subtle); }.asset-actions-row, .asset-filters { min-width: 0; display: flex; align-items: center; flex-wrap: wrap; gap: 5px; }.asset-toolbar button { height: 31px; padding: 0 8px; flex: 0 0 auto; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--text-secondary); background: var(--surface-2); font-size: 11px; white-space: nowrap; word-break: keep-all; writing-mode: horizontal-tb; }.asset-toolbar button.primary { color: var(--accent-contrast); border-color: var(--accent); background: var(--accent); }.asset-toolbar .path { min-width: 45px; flex: 1 1 80px; overflow: hidden; color: var(--text-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.asset-toolbar input { width: 140px; min-width: 100px; min-height: 31px; flex: 0 1 140px; font-size: 11px; }.asset-toolbar .folder-input { width: 105px; }.asset-filters button { height: 25px; padding-inline: 8px; border-radius: 999px; font-size: 11px; }.asset-filters button.active { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 65%, var(--border-subtle)); background: var(--accent-soft); }
.asset-grid { min-height: 0; flex: 1; padding: 9px; display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); grid-auto-rows: 58px; gap: 7px; overflow: auto; }.asset-grid article { min-width: 0; padding: 7px; display: grid; grid-template-columns: 42px 1fr; grid-template-rows: 1fr 1fr; column-gap: 7px; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-2); cursor: grab; }.asset-grid article:hover, .asset-grid article.selected { border-color: color-mix(in srgb, var(--accent) 60%, var(--border-subtle)); background: var(--accent-soft); }.asset-preview { grid-row: 1 / 3; width: 42px; height: 42px; border-radius: 7px; background-color: var(--surface-3); background-position: center; background-repeat: no-repeat; background-size: contain; }.asset-icon { display: grid; place-items: center; color: var(--accent); font-size: 17px; font-weight: 650; }.asset-grid strong, .asset-grid small, .asset-grid input { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.asset-grid strong { align-self: end; font-size: 11px; }.asset-grid small { color: var(--text-muted); font-size: 10px; }.asset-grid input { width: 100%; height: 22px; min-height: 22px; font-size: 10px; }
.asset-inspector { border-left: 1px solid var(--border-subtle); }.asset-inspector header { padding: 2px 2px 8px; display: flex; flex-direction: column; gap: 2px; }.asset-inspector header span { color: var(--accent); font-size: 10px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }.asset-inspector header strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.large-preview { width: 100%; aspect-ratio: 16 / 9; margin-bottom: 7px; border: 1px solid var(--border-subtle); border-radius: 8px; background-color: var(--surface-3); background-position: center; background-repeat: no-repeat; background-size: contain; }.asset-inspector label { min-height: 29px; display: flex; align-items: center; justify-content: space-between; gap: 7px; border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 10px; }.asset-inspector label > *:last-child { max-width: 58%; }.asset-inspector label code { overflow: hidden; color: var(--accent); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.asset-inspector label input:not([type='checkbox']), .asset-inspector label select { width: 105px; min-height: 24px; font-size: 10px; }.asset-inspector label div { display: flex; gap: 3px; }.asset-inspector label div input { width: 50%; }.asset-actions { margin-top: 8px; display: flex; gap: 5px; }.asset-actions button { min-height: 32px; flex: 1; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--text-secondary); background: var(--surface-3); font-size: 10px; }.asset-actions button.danger { color: var(--danger); }.drag-hint { color: var(--text-muted); font-size: 10px; line-height: 1.45; }
.script-source { padding: 6px 0; flex-direction: column; align-items: stretch !important; }.script-source textarea { width: 100%; min-height: 130px; resize: vertical; font: 9px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; white-space: pre; }.script-validation { margin: 5px 0; color: var(--success); font-size: 10px; }.script-validation.error { color: var(--danger); }.save-script { width: 100%; min-height: 32px; border: 1px solid var(--accent); border-radius: 7px; color: var(--accent); background: var(--accent-soft); font-size: 10px; }
.mapping-editor{margin:7px 0}.mapping-editor label{display:grid;grid-template-columns:1fr 1fr 24px}.mapping-editor input{width:100%!important}.mapping-editor button{min-height:26px;border:1px solid var(--border-subtle);border-radius:6px;background:var(--surface-3);color:var(--text-secondary)}
:global(html[lang='zh-CN']) .asset-toolbar, :global(html[lang='zh-CN']) .panel-tabs { line-height: 1; writing-mode: horizontal-tb; }
.console-list { min-width: 600px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10px; }.log-entry { min-height: 29px; padding: 4px 10px; display: grid; grid-template-columns: 72px 70px 1fr; gap: 8px; align-items: center; border-bottom: 1px solid var(--border-subtle); }.log-entry time { color: var(--text-muted); }.log-entry strong { color: var(--accent); }.log-entry.warning strong { color: var(--warning); }.log-entry.error strong { color: var(--danger); }
.metric-grid { padding: 10px; display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 8px; }.metric-grid article, .project-summary article { padding: 9px; display: flex; justify-content: space-between; gap: 10px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-2); font-size: 10px; }.metric-grid span, .project-summary span { color: var(--text-muted); }.metric-grid strong, .project-summary strong { color: var(--accent); }.project-summary { height: 100%; padding: 10px; display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; overflow: auto; }.project-summary p { grid-column: 1 / -1; margin: 2px; color: var(--text-muted); font-size: 10px; }.future-panel, .empty { padding: 18px; color: var(--text-muted); font-size: 11px; }.future-panel strong { color: var(--text-primary); }.future-panel p { margin: 5px 0 0; }
@media (max-width: 1050px) {
  .asset-browser { grid-template-columns: 105px minmax(140px, 1fr); }
  .asset-browser.inspecting { grid-template-columns: 105px minmax(140px, 1fr) 195px; }
  .folder-tree, .asset-inspector { padding: 6px; }
  .folder-tree button { padding-inline: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .asset-toolbar .path { flex-basis: 60px; }
}
@media (max-width: 760px) {
  .asset-browser { position: relative; grid-template-columns: 92px minmax(130px, 1fr); }
  .asset-browser.inspecting { grid-template-columns: 92px minmax(130px, 1fr); }
  .asset-inspector { position: absolute; inset: 0 0 0 auto; z-index: 4; display: block; width: min(230px, 70%); box-shadow: var(--shadow-lg); }
}
</style>

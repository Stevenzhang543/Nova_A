<template>
  <aside class="sidebar-container" :style="{ width: isCollapsed ? '0px' : `${panelWidth}px` }" :class="{ 'jelly-slide': !isDragging, 'no-transition': isDragging }">
    <button v-if="isCollapsed" class="expand" :title="t('expandPanel')" @click="expandPanel">›</button>
    <div v-show="!isCollapsed" class="scene-sidebar">
      <section class="scene-manager">
        <div class="list-header">
          <span>{{ t('scenes') }}</span>
          <div class="header-actions">
            <button :title="t('reloadScene')" :disabled="!canEdit" @click="reloadScene">↻</button>
            <button :title="t('addScene')" :disabled="!canEdit" @click="addScene">+</button>
          </div>
        </div>
        <div class="scene-list">
          <div v-for="scene in sceneManager.scenes" :key="scene.uuid" class="scene-item" :class="{ active: scene.uuid === sceneManager.activeSceneUuid, unloaded: !scene.loaded }">
            <div class="scene-main" role="button" tabindex="0" @click="activateScene(scene.uuid, scene.loaded)" @keyup.enter="activateScene(scene.uuid, scene.loaded)">
              <i></i><span v-if="editingSceneUuid !== scene.uuid" @dblclick.stop="startSceneEdit(scene.uuid, scene.name)">{{ scene.name }}</span>
              <input v-else v-model="sceneName" v-focus @click.stop @blur="finishSceneEdit(scene.uuid)" @keyup.enter="finishSceneEdit(scene.uuid)">
            </div>
            <button v-if="scene.uuid !== sceneManager.activeSceneUuid" class="load-toggle" :title="scene.loaded ? t('unloadScene') : t('loadScene')" :disabled="!canEdit" @click="toggleLoaded(scene.uuid, scene.loaded)">{{ scene.loaded ? '●' : '○' }}</button>
          </div>
        </div>
      </section>

      <div class="hierarchy-header">
        <div><span>{{ t('hierarchy') }}</span><small>{{ state.world.entities.length }}</small></div>
        <label class="search"><span>⌕</span><input v-model="searchQuery" type="search" :placeholder="t('searchEntities')"></label>
      </div>

      <div class="entity-list" @dragover.prevent @drop="dropOnRoot">
        <div
          v-for="row in hierarchyRows"
          :key="row.entity.uuid"
          class="entity-item"
          :class="{
            selected: state.selectedEntityIds.includes(row.entity.id),
            primary: state.selectedEntityId === row.entity.id,
            disabled: !row.entity.enabled,
            hidden: !row.entity.editorVisible,
            locked: row.entity.editorLocked,
            'drop-target': dropTargetUuid === row.entity.uuid
          }"
          :style="{ paddingLeft: `${6 + row.depth * 15}px` }"
          :draggable="canEdit && !row.entity.editorLocked"
          @click="selectEntity($event, row.entity)"
          @contextmenu.prevent="openContextMenu($event, 'sidebar-entity', row.entity.id)"
          @dragstart="startEntityDrag($event, row.entity)"
          @dragend="finishEntityDrag"
          @dragenter.prevent.stop="dropTargetUuid = row.entity.uuid"
          @dragleave.stop="leaveDropTarget($event, row.entity.uuid)"
          @dragover.prevent.stop
          @drop.prevent.stop="dropOnEntity(row.entity)"
        >
          <button class="disclosure" :class="{ placeholder: !row.hasChildren }" :aria-label="row.expanded ? t('collapsePanel') : t('expandPanel')" @click.stop="toggleExpanded(row.entity.uuid)">{{ row.hasChildren ? (row.expanded ? '⌄' : '›') : '' }}</button>
          <span class="shape-icon">{{ getIcon(row.entity.shapeType) }}</span>
          <span v-if="editingId !== row.entity.id" class="name" :title="t('renameHint')" @dblclick.stop="startEdit(row.entity)">{{ row.entity.name }}<small>{{ row.entity.id }}</small></span>
          <input v-else v-model="editName" v-focus class="edit-input" @click.stop @blur="finishEdit(row.entity)" @keyup.enter="finishEdit(row.entity)" @keyup.escape="editingId = null">
          <button class="state-button" :title="row.entity.editorVisible ? t('hideEntity') : t('showEntity')" @click.stop="toggleVisibility(row.entity)">{{ row.entity.editorVisible ? '◉' : '○' }}</button>
          <button class="state-button" :title="row.entity.editorLocked ? t('unlockEntity') : t('lockEntity')" @click.stop="toggleLock(row.entity)">{{ row.entity.editorLocked ? '▣' : '▢' }}</button>
          <button class="state-button power" :title="row.entity.enabled ? t('disableEntity') : t('enableEntity')" @click.stop="toggleEnabled(row.entity)">●</button>
        </div>
        <p v-if="!hierarchyRows.length" class="empty-state">{{ t('noEntitiesFound') }}</p>
        <button v-if="draggingIds.length" class="root-drop" @dragover.prevent @drop.prevent.stop="dropOnRoot">{{ t('reparentToRoot') }}</button>
      </div>
    </div>
    <div v-show="!isCollapsed" class="resize-handle" @mousedown="startDrag"></div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { t } from '../i18n'
import { addEditorLog, editorState, openContextMenu, setActiveLayer } from '../store/editor'
import { createScene, physicsState as state, pushHistory, reloadActiveScene, sceneManager, selectEntities, setActiveScene, setSceneLoaded, synchronizeHistoryBaseline } from '../store/physics'
import type { Entity } from '../world/Entity'
import { setParent } from '../world/hierarchy'
import { selectionRoots } from '../editor/selection'

const panelWidth = ref(236)
const isCollapsed = ref(false)
const isDragging = ref(false)
const editingId = ref<number | null>(null)
const editName = ref('')
const editingSceneUuid = ref<string | null>(null)
const sceneName = ref('')
const searchQuery = ref('')
const expandedUuids = ref(new Set<string>())
const draggingIds = ref<number[]>([])
const dropTargetUuid = ref<string | null>(null)
let lastSelectedId: number | null = null
const canEdit = computed(() => state.playMode === 'editing')
const vFocus = { mounted: (element: HTMLInputElement) => { element.focus(); element.select() } }

const hierarchyRows = computed(() => {
  const rows: Array<{ entity: Entity; depth: number; hasChildren: boolean; expanded: boolean }> = []
  const children = new Map<string | null, Entity[]>()
  const known = new Set(state.world.entities.map(entity => entity.uuid))
  for (const entity of state.world.entities) {
    const parent = entity.parentUuid && known.has(entity.parentUuid) ? entity.parentUuid : null
    const siblings = children.get(parent) ?? []
    siblings.push(entity)
    children.set(parent, siblings)
  }

  const query = searchQuery.value.trim().toLocaleLowerCase()
  const included = new Set<string>()
  if (query) {
    for (const entity of state.world.entities) {
      if (!`${entity.name} ${entity.id} ${entity.tags.join(' ')}`.toLocaleLowerCase().includes(query)) continue
      included.add(entity.uuid)
      let parentUuid = entity.parentUuid
      while (parentUuid) {
        included.add(parentUuid)
        parentUuid = state.world.entities.find(candidate => candidate.uuid === parentUuid)?.parentUuid ?? null
      }
    }
  }

  const visit = (entity: Entity, depth: number, visited: Set<string>) => {
    if (visited.has(entity.uuid) || (query && !included.has(entity.uuid))) return
    visited.add(entity.uuid)
    const entityChildren = children.get(entity.uuid) ?? []
    const expanded = query ? true : expandedUuids.value.has(entity.uuid)
    rows.push({ entity, depth, hasChildren: entityChildren.length > 0, expanded })
    if (expanded) for (const child of entityChildren) visit(child, depth + 1, visited)
  }
  const visited = new Set<string>()
  for (const root of children.get(null) ?? []) visit(root, 0, visited)
  for (const entity of state.world.entities) visit(entity, 0, visited)
  return rows
})

function addScene() { if (canEdit.value && createScene()) { pushHistory('Create scene'); editorState.statusText = t('sceneCreated') } }
function reloadScene() {
  if (canEdit.value && reloadActiveScene()) {
    synchronizeHistoryBaseline()
    editorState.statusText = t('sceneReloaded')
  }
}
function activateScene(uuid: string, loaded: boolean) {
  if (!canEdit.value) return
  if (!loaded && !setSceneLoaded(uuid, true)) return
  if (setActiveScene(uuid)) {
    synchronizeHistoryBaseline()
    editorState.statusText = t('sceneActivated')
  }
}
function toggleLoaded(uuid: string, loaded: boolean) {
  if (canEdit.value && setSceneLoaded(uuid, !loaded)) {
    pushHistory(loaded ? 'Unload scene' : 'Load scene')
    editorState.statusText = t(loaded ? 'sceneUnloaded' : 'sceneLoaded')
  }
}
function startSceneEdit(uuid: string, name: string) { if (!canEdit.value) return; editingSceneUuid.value = uuid; sceneName.value = name }
function finishSceneEdit(uuid: string) { if (editingSceneUuid.value !== uuid) return; const scene = sceneManager.scenes.find(candidate => candidate.uuid === uuid); const name = sceneName.value.trim(); if (scene && name && name !== scene.name) { scene.name = name.slice(0, 80); pushHistory('Rename scene') } editingSceneUuid.value = null }
function startEdit(entity: Entity) { if (!canEdit.value || entity.editorLocked) return; editingId.value = entity.id; editName.value = entity.name }
function finishEdit(entity: Entity) { if (editingId.value !== entity.id) return; const name = editName.value.trim(); if (name && name !== entity.name) { entity.name = name.slice(0, 80); pushHistory('Rename entity', `rename:${entity.uuid}`) } editingId.value = null; editorState.renameRequestId = null }
function getIcon(type: string) { return type === 'Circle' ? '○' : type === 'Triangle' ? '△' : type === 'Box' ? '□' : '·' }

function selectEntity(event: MouseEvent, entity: Entity) {
  if (event.shiftKey && lastSelectedId !== null) {
    const rows = hierarchyRows.value
    const start = rows.findIndex(row => row.entity.id === lastSelectedId)
    const end = rows.findIndex(row => row.entity.id === entity.id)
    if (start !== -1 && end !== -1) selectEntities(rows.slice(Math.min(start, end), Math.max(start, end) + 1).map(row => row.entity.id), 'add', entity.id)
  } else {
    selectEntities([entity.id], event.ctrlKey || event.metaKey ? 'toggle' : 'replace', entity.id)
  }
  lastSelectedId = entity.id
  if (entity.layer !== editorState.activeLayer) setActiveLayer(entity.layer)
}

function toggleExpanded(uuid: string) { const next = new Set(expandedUuids.value); if (next.has(uuid)) next.delete(uuid); else next.add(uuid); expandedUuids.value = next }
function toggleVisibility(entity: Entity) { if (!canEdit.value) return; entity.editorVisible = !entity.editorVisible; pushHistory('Toggle editor visibility', `visibility:${entity.uuid}`) }
function toggleLock(entity: Entity) { if (!canEdit.value) return; entity.editorLocked = !entity.editorLocked; pushHistory('Toggle editor lock', `lock:${entity.uuid}`) }
function toggleEnabled(entity: Entity) { if (!canEdit.value) return; entity.enabled = !entity.enabled; pushHistory('Toggle entity', `enabled:${entity.uuid}`) }

function startEntityDrag(event: DragEvent, entity: Entity) {
  if (!canEdit.value || entity.editorLocked) { event.preventDefault(); return }
  if (!state.selectedEntityIds.includes(entity.id)) selectEntities([entity.id], 'replace', entity.id)
  draggingIds.value = selectionRoots(state.selectedEntityIds, state.world.entities).map(candidate => candidate.id)
  event.dataTransfer?.setData('text/plain', entity.uuid)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
function finishEntityDrag() { draggingIds.value = []; dropTargetUuid.value = null }
function leaveDropTarget(event: DragEvent, uuid: string) { if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null) && dropTargetUuid.value === uuid) dropTargetUuid.value = null }
function reparentDragged(parentUuid: string | null) {
  if (!canEdit.value || !draggingIds.value.length) return
  let changed = false
  for (const entity of selectionRoots(draggingIds.value, state.world.entities)) {
    if (entity.uuid === parentUuid || entity.editorLocked) continue
    changed = setParent(entity, parentUuid, state.world.entities) || changed
  }
  if (changed) { pushHistory('Reparent entities'); addEditorLog(parentUuid ? 'Entities reparented' : 'Entities moved to scene root') }
  finishEntityDrag()
}
function dropOnEntity(parent: Entity) { reparentDragged(parent.uuid) }
function dropOnRoot() { reparentDragged(null) }

watch(() => editorState.renameRequestId, id => { if (id === null) return; const entity = state.world.entities.find(candidate => candidate.id === id); if (entity) startEdit(entity) })
watch(() => state.world.entities.map(entity => entity.uuid), uuids => { if (!expandedUuids.value.size) expandedUuids.value = new Set(uuids) }, { immediate: true })

const collapseThreshold = 118
let startX = 0
let startWidth = 0
function startDrag(event: MouseEvent) { isDragging.value = true; startX = event.clientX; startWidth = panelWidth.value; document.addEventListener('mousemove', onDrag); document.addEventListener('mouseup', stopDrag); document.body.style.cursor = 'ew-resize' }
function onDrag(event: MouseEvent) { if (!isDragging.value) return; const width = startWidth + event.clientX - startX; panelWidth.value = width < collapseThreshold ? 0 : Math.min(Math.max(width, collapseThreshold), 500) }
function stopDrag() { isDragging.value = false; document.removeEventListener('mousemove', onDrag); document.removeEventListener('mouseup', stopDrag); document.body.style.cursor = 'default'; if (panelWidth.value < collapseThreshold) isCollapsed.value = true }
function expandPanel() { isCollapsed.value = false; panelWidth.value = 236 }
onUnmounted(() => { document.removeEventListener('mousemove', onDrag); document.removeEventListener('mouseup', stopDrag) })
</script>

<style scoped>
.sidebar-container { position: relative; height: 100%; flex-shrink: 0; display: flex; border-right: 1px solid var(--border-subtle); background: var(--surface-1); backdrop-filter: var(--glass-blur); z-index: 130; }
.scene-sidebar { min-width: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.scene-manager { flex: 0 0 auto; border-bottom: 1px solid var(--border-subtle); }
.list-header, .hierarchy-header > div { height: 35px; padding: 0 10px; display: flex; align-items: center; justify-content: space-between; color: var(--text-muted); font-size: 9px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }
.list-header small, .hierarchy-header small { padding: 2px 6px; border-radius: 99px; background: var(--surface-3); font-size: 8px; }
.header-actions { display: flex; gap: 3px; }.header-actions button, .load-toggle { width: 24px; height: 24px; padding: 0; border: 0; border-radius: 7px; color: var(--text-muted); background: transparent; }.header-actions button:hover, .load-toggle:hover { color: var(--accent); background: var(--surface-hover); }
.scene-list { max-height: 110px; padding: 4px 6px; overflow: auto; }.scene-item { display: flex; align-items: center; border-radius: 7px; }.scene-item:hover { background: var(--surface-hover); }.scene-item.active { background: var(--accent-soft); }.scene-item.unloaded { opacity: .52; }
.scene-main { min-width: 0; height: 28px; padding: 0 7px; flex: 1; display: flex; align-items: center; gap: 7px; color: var(--text-secondary); font-size: 11px; }.scene-main i { width: 7px; height: 7px; flex: 0 0 7px; border: 1px solid var(--accent); border-radius: 50%; }.scene-item.active .scene-main i { background: var(--accent); box-shadow: 0 0 6px var(--accent); }.scene-main span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.scene-main input { width: 100%; min-height: 24px; }
.hierarchy-header { flex: 0 0 auto; padding-bottom: 7px; border-bottom: 1px solid var(--border-subtle); }.search { height: 29px; margin: 0 7px; padding: 0 7px; display: flex; align-items: center; gap: 5px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--input-bg); }.search span { color: var(--text-muted); }.search input { min-width: 0; width: 100%; min-height: 25px; padding: 0; border: 0; background: transparent; font-size: 10px; }.search input:focus-visible { outline: 0; }
.entity-list { min-height: 0; flex: 1; padding: 5px; overflow: auto; }.entity-item { position: relative; height: 29px; display: flex; align-items: center; gap: 4px; border: 1px solid transparent; border-radius: 7px; color: var(--text-secondary); font-size: 10.5px; }.entity-item:hover { background: var(--surface-hover); }.entity-item.selected { background: var(--accent-soft); }.entity-item.primary { border-color: color-mix(in srgb, var(--accent) 42%, transparent); }.entity-item.disabled { opacity: .5; }.entity-item.hidden .name { text-decoration: line-through; opacity: .6; }.entity-item.locked .shape-icon { color: var(--warning); }.entity-item.drop-target { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.disclosure, .state-button { width: 19px; height: 22px; padding: 0; flex: 0 0 19px; display: grid; place-items: center; border: 0; border-radius: 5px; color: var(--text-muted); background: transparent; font-size: 10px; }.disclosure:hover, .state-button:hover { color: var(--accent); background: var(--surface-3); }.disclosure.placeholder { pointer-events: none; }.shape-icon { width: 15px; flex: 0 0 15px; color: var(--accent); text-align: center; }.name { min-width: 0; flex: 1; display: flex; align-items: center; gap: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.name small { color: var(--text-muted); font-size: 8px; }.edit-input { min-width: 0; height: 23px; min-height: 23px; flex: 1; padding: 2px 5px; }.state-button { opacity: .25; }.entity-item:hover .state-button, .entity-item.selected .state-button, .entity-item.hidden .state-button, .entity-item.locked .state-button, .entity-item.disabled .power { opacity: .9; }.power { color: var(--success); }
.empty-state { padding: 18px 8px; color: var(--text-muted); font-size: 10px; text-align: center; }.root-drop { width: calc(100% - 8px); min-height: 31px; margin: 6px 4px; border: 1px dashed var(--accent); border-radius: 8px; color: var(--accent); background: var(--accent-soft); font-size: 10px; }
.resize-handle { position: absolute; inset: 0 -4px 0 auto; width: 8px; cursor: ew-resize; z-index: 4; }.expand { position: absolute; left: 0; top: 48%; z-index: 5; width: 20px; height: 54px; border: 1px solid var(--border-subtle); border-left: 0; border-radius: 0 9px 9px 0; color: var(--accent); background: var(--surface-1); }
</style>

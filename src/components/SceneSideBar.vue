<template>
  <aside class="sidebar-container" :style="{ width: isCollapsed ? '0px' : `${panelWidth}px` }" :class="{ 'jelly-slide': !isDragging, 'no-transition': isDragging }">
    <button v-if="isCollapsed" class="expand" :title="t('expandEntities')" @click="expandPanel">›</button>
    <div v-show="!isCollapsed" class="scene-sidebar">
      <section class="scene-manager">
        <div class="list-header">
          <span>{{ t('scenes') }}</span>
          <div class="header-actions">
            <button :title="t('reloadScene')" @click="reloadScene">↻</button>
            <button :title="t('addScene')" @click="addScene">+</button>
          </div>
        </div>
        <div class="scene-list">
          <div v-for="scene in sceneManager.scenes" :key="scene.uuid" class="scene-item" :class="{ active: scene.uuid === sceneManager.activeSceneUuid, unloaded: !scene.loaded }">
            <div class="scene-main" role="button" tabindex="0" @click="activateScene(scene.uuid, scene.loaded)" @keyup.enter="activateScene(scene.uuid, scene.loaded)">
              <i></i><span v-if="editingSceneUuid !== scene.uuid" @dblclick.stop="startSceneEdit(scene.uuid, scene.name)">{{ scene.name }}</span>
              <input v-else v-model="sceneName" v-focus @click.stop @blur="finishSceneEdit(scene.uuid)" @keyup.enter="finishSceneEdit(scene.uuid)">
            </div>
            <button v-if="scene.uuid !== sceneManager.activeSceneUuid" class="load-toggle" :title="scene.loaded ? t('unloadScene') : t('loadScene')" @click="toggleLoaded(scene.uuid, scene.loaded)">
              {{ scene.loaded ? '●' : '○' }}
            </button>
          </div>
        </div>
      </section>

      <div class="list-header"><span>{{ t('entities') }}</span><small>{{ state.world.entities.length }}</small></div>
      <div class="entity-list">
        <div v-for="row in hierarchyRows" :key="row.entity.id" class="entity-item" :class="{ selected: state.selectedEntityId === row.entity.id }" :style="{ paddingLeft: `${8 + row.depth * 14}px` }" @click="selectEntity(row.entity)" @contextmenu.prevent="openContextMenu($event, 'sidebar-entity', row.entity.id)">
          <span class="shape-icon">{{ getIcon(row.entity.shapeType) }}</span>
          <span v-if="editingId !== row.entity.id" class="name" :title="t('renameHint')" @dblclick.stop="startEdit(row.entity)">{{ row.entity.name }}_<small>{{ row.entity.id }}</small></span>
          <input v-else v-model="editName" v-focus class="edit-input" @click.stop @blur="finishEdit(row.entity)" @keyup.enter="finishEdit(row.entity)">
        </div>
      </div>
    </div>
    <div v-show="!isCollapsed" class="resize-handle" @mousedown="startDrag"></div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { t } from '../i18n'
import { editorState, openContextMenu, setActiveLayer } from '../store/editor'
import { createScene, enterEditMode, physicsState as state, pushHistory, reloadActiveScene, sceneManager, setActiveScene, setSceneLoaded } from '../store/physics'
import type { Entity } from '../world/Entity'

const panelWidth = ref(190)
const isCollapsed = ref(false)
const isDragging = ref(false)
const editingId = ref<number | null>(null)
const editName = ref('')
const editingSceneUuid = ref<string | null>(null)
const sceneName = ref('')
const vFocus = { mounted: (element: HTMLInputElement) => element.focus() }

const hierarchyRows = computed(() => {
  const rows: Array<{ entity: Entity; depth: number }> = []
  const children = new Map<string | null, Entity[]>()
  const known = new Set(state.world.entities.map(entity => entity.uuid))
  for (const entity of state.world.entities) {
    const parent = entity.parentUuid && known.has(entity.parentUuid) ? entity.parentUuid : null
    const siblings = children.get(parent) ?? []
    siblings.push(entity)
    children.set(parent, siblings)
  }
  const visit = (entity: Entity, depth: number, visited: Set<string>) => {
    if (visited.has(entity.uuid)) return
    visited.add(entity.uuid)
    rows.push({ entity, depth })
    for (const child of children.get(entity.uuid) ?? []) visit(child, depth + 1, visited)
  }
  const visited = new Set<string>()
  for (const root of children.get(null) ?? []) visit(root, 0, visited)
  for (const entity of state.world.entities) visit(entity, 0, visited)
  return rows
})

function addScene() {
  if (createScene()) editorState.statusText = t('sceneCreated')
}
function reloadScene() {
  if (reloadActiveScene()) editorState.statusText = t('sceneReloaded')
}
function activateScene(uuid: string, loaded: boolean) {
  if (!loaded && !setSceneLoaded(uuid, true)) return
  if (setActiveScene(uuid)) editorState.statusText = t('sceneActivated')
}
function toggleLoaded(uuid: string, loaded: boolean) {
  if (setSceneLoaded(uuid, !loaded)) editorState.statusText = t(loaded ? 'sceneUnloaded' : 'sceneLoaded')
}
function startSceneEdit(uuid: string, name: string) { editingSceneUuid.value = uuid; sceneName.value = name }
function finishSceneEdit(uuid: string) {
  if (editingSceneUuid.value !== uuid) return
  const scene = sceneManager.scenes.find(candidate => candidate.uuid === uuid)
  const name = sceneName.value.trim()
  if (scene && name) { scene.name = name.slice(0, 80); pushHistory() }
  editingSceneUuid.value = null
}
function startEdit(entity: Entity) { editingId.value = entity.id; editName.value = entity.name }
function selectEntity(entity: Entity) { if (entity.layer !== editorState.activeLayer) setActiveLayer(entity.layer); enterEditMode(entity.id) }
function finishEdit(entity: Entity) { if (editingId.value !== entity.id) return; const name = editName.value.trim(); if (name && name !== entity.name) { entity.name = name.slice(0, 80); pushHistory() } editingId.value = null }
function getIcon(type: string) { return type === 'Circle' ? '○' : type === 'Triangle' ? '△' : type === 'Box' ? '□' : '·' }

const collapseThreshold = 92
let startX = 0
let startWidth = 0
function startDrag(event: MouseEvent) { isDragging.value = true; startX = event.clientX; startWidth = panelWidth.value; document.addEventListener('mousemove', onDrag); document.addEventListener('mouseup', stopDrag); document.body.style.cursor = 'ew-resize' }
function onDrag(event: MouseEvent) { if (!isDragging.value) return; const width = startWidth + event.clientX - startX; panelWidth.value = width < collapseThreshold ? 0 : Math.min(Math.max(width, collapseThreshold), 460) }
function stopDrag() { isDragging.value = false; document.removeEventListener('mousemove', onDrag); document.removeEventListener('mouseup', stopDrag); document.body.style.cursor = 'default'; if (panelWidth.value < collapseThreshold) isCollapsed.value = true }
function expandPanel() { isCollapsed.value = false; panelWidth.value = 190 }
onUnmounted(() => { document.removeEventListener('mousemove', onDrag); document.removeEventListener('mouseup', stopDrag) })
</script>

<style scoped>
.sidebar-container { position: relative; height: 100%; flex-shrink: 0; display: flex; border-right: 1px solid var(--border-subtle); background: var(--surface-1); backdrop-filter: var(--glass-blur); z-index: 130; }
.scene-sidebar { min-width: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.scene-manager { border-bottom: 1px solid var(--border-subtle); }
.list-header { height: 42px; padding: 0 12px; display: flex; align-items: center; justify-content: space-between; color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); font-size: 9px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }
.list-header small { padding: 2px 6px; border-radius: 99px; background: var(--surface-3); font-size: 8px; }
.header-actions { display: flex; gap: 3px; }
.header-actions button, .load-toggle { width: 24px; height: 24px; padding: 0; border: 0; border-radius: 7px; color: var(--text-muted); background: transparent; }
.header-actions button:hover, .load-toggle:hover { color: var(--accent); background: var(--surface-hover); }
.scene-list { max-height: 122px; padding: 5px 6px; overflow: auto; }
.scene-item { display: flex; align-items: center; border-radius: 8px; }
.scene-item:hover { background: var(--surface-hover); }
.scene-item.active { background: var(--accent-soft); }
.scene-item.unloaded { opacity: .52; }
.scene-main { min-width: 0; height: 30px; padding: 0 7px; flex: 1; display: flex; align-items: center; gap: 7px; border: 0; background: transparent; color: var(--text-secondary); text-align: left; }
.scene-main i { width: 7px; height: 7px; flex: 0 0 7px; border: 1px solid var(--accent); border-radius: 50%; }
.scene-item.active .scene-main i { background: var(--accent); box-shadow: 0 0 7px var(--accent); }
.scene-main span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
.scene-main input { min-width: 0; width: 100%; height: 23px; font-size: 10px; }
.entity-list { flex: 1; padding: 6px; overflow: auto; }
.entity-item { min-height: 36px; padding-right: 8px; display: flex; align-items: center; gap: 8px; border: 1px solid transparent; border-radius: 9px; color: var(--text-secondary); cursor: pointer; font-size: 11.5px; transition: padding-left 160ms ease, background 140ms ease; }
.entity-item:hover { color: var(--text-primary); background: var(--surface-hover); }
.entity-item.selected { color: var(--text-primary); border-color: color-mix(in srgb, var(--accent) 22%, transparent); background: var(--accent-soft); }
.shape-icon { flex: 0 0 18px; color: var(--accent); font-size: 16px; text-align: center; }
.name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.name small { color: var(--text-muted); }
.edit-input { min-width: 0; width: 100%; }
.resize-handle { position: absolute; inset: 0 -3px 0 auto; width: 6px; cursor: ew-resize; transition: background 130ms ease; }
.resize-handle:hover, .no-transition .resize-handle { background: var(--accent); }
.expand { position: absolute; top: 12px; left: 10px; width: 30px; height: 38px; z-index: 20; border: 1px solid var(--border-subtle); border-radius: 0 10px 10px 0; color: var(--text-secondary); background: var(--surface-1); box-shadow: var(--shadow-sm); font-size: 22px; }
</style>

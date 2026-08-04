<template>
  <aside class="sidebar-container" :style="{ width: isCollapsed ? '0px' : `${panelWidth}px` }" :class="{ 'jelly-slide': !isDragging, 'no-transition': isDragging }">
    <button v-if="isCollapsed" class="expand" :title="t('expandEntities')" @click="expandPanel">›</button>
    <div v-show="!isCollapsed" class="scene-sidebar"><div class="list-header"><span>{{ t('entities') }}</span><small>{{ state.world.entities.length }}</small></div><div class="entity-list">
      <div v-for="entity in state.world.entities" :key="entity.id" class="entity-item" :class="{ selected: state.selectedEntityId === entity.id }" @click="selectEntity(entity)" @contextmenu.prevent="openContextMenu($event, 'sidebar-entity', entity.id)">
        <span class="shape-icon">{{ getIcon(entity.shapeType) }}</span>
        <span v-if="editingId !== entity.id" class="name" :title="t('renameHint')" @dblclick.stop="startEdit(entity)">{{ entity.name }}_<small>{{ entity.id }}</small></span>
        <input v-else v-model="editName" v-focus class="edit-input" @click.stop @blur="finishEdit(entity)" @keyup.enter="finishEdit(entity)">
      </div>
    </div></div>
    <div v-show="!isCollapsed" class="resize-handle" @mousedown="startDrag"></div>
  </aside>
</template>
<script setup lang="ts">
import { onUnmounted, ref } from 'vue'; import { t } from '../i18n'; import { editorState, openContextMenu, setActiveLayer } from '../store/editor'; import { enterEditMode, physicsState as state, pushHistory } from '../store/physics'; import type { Entity } from '../world/Entity'
const panelWidth = ref(176), isCollapsed = ref(false), isDragging = ref(false), editingId = ref<number | null>(null), editName = ref(''); const vFocus = { mounted: (element: HTMLInputElement) => element.focus() }
function startEdit(entity: Entity) { editingId.value = entity.id; editName.value = entity.name }
function selectEntity(entity: Entity) { if (entity.layer !== editorState.activeLayer) setActiveLayer(entity.layer); enterEditMode(entity.id) }
function finishEdit(entity: Entity) { if (editingId.value !== entity.id) return; const name = editName.value.trim(); if (name && name !== entity.name) { entity.name = name.slice(0, 80); pushHistory() } editingId.value = null }
function getIcon(type: string) { return type === 'Circle' ? '○' : type === 'Triangle' ? '△' : type === 'Box' ? '□' : '?' }
const collapseThreshold = 92; let startX = 0, startWidth = 0
function startDrag(event: MouseEvent) { isDragging.value = true; startX = event.clientX; startWidth = panelWidth.value; document.addEventListener('mousemove', onDrag); document.addEventListener('mouseup', stopDrag); document.body.style.cursor = 'ew-resize' }
function onDrag(event: MouseEvent) { if (!isDragging.value) return; const width = startWidth + event.clientX - startX; panelWidth.value = width < collapseThreshold ? 0 : Math.min(Math.max(width, collapseThreshold), 460) }
function stopDrag() { isDragging.value = false; document.removeEventListener('mousemove', onDrag); document.removeEventListener('mouseup', stopDrag); document.body.style.cursor = 'default'; if (panelWidth.value < collapseThreshold) isCollapsed.value = true }
function expandPanel() { isCollapsed.value = false; panelWidth.value = 176 }
onUnmounted(() => { document.removeEventListener('mousemove', onDrag); document.removeEventListener('mouseup', stopDrag) })
</script>
<style scoped>
.sidebar-container { position: relative; height: 100%; flex-shrink: 0; display: flex; border-right: 1px solid var(--border-subtle); background: var(--surface-1); backdrop-filter: var(--glass-blur); z-index: 130; }.scene-sidebar { min-width: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }.list-header { height: 42px; padding: 0 12px; display: flex; align-items: center; justify-content: space-between; color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); font-size: 9px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }.list-header small { padding: 2px 6px; border-radius: 99px; background: var(--surface-3); font-size: 8px; }.entity-list { flex: 1; padding: 6px; overflow: auto; }.entity-item { min-height: 36px; padding: 0 8px; display: flex; align-items: center; gap: 8px; border: 1px solid transparent; border-radius: 9px; color: var(--text-secondary); cursor: pointer; font-size: 11.5px; }.entity-item:hover { color: var(--text-primary); background: var(--surface-hover); }.entity-item.selected { color: var(--text-primary); border-color: color-mix(in srgb, var(--accent) 22%, transparent); background: var(--accent-soft); }.shape-icon { flex: 0 0 18px; color: var(--accent); font-size: 16px; text-align: center; }.name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.name small { color: var(--text-muted); }.edit-input { min-width: 0; width: 100%; }.resize-handle { position: absolute; inset: 0 -3px 0 auto; width: 6px; cursor: ew-resize; transition: background 130ms ease; }.resize-handle:hover, .no-transition .resize-handle { background: var(--accent); }.expand { position: absolute; top: 12px; left: 10px; width: 30px; height: 38px; z-index: 20; border: 1px solid var(--border-subtle); border-radius: 0 10px 10px 0; color: var(--text-secondary); background: var(--surface-1); box-shadow: var(--shadow-sm); font-size: 22px; }
</style>

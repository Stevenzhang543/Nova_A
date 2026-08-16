<template>
  <Transition name="context">
    <div v-if="state.contextMenu.visible" class="context-menu" :style="position" @contextmenu.prevent @click.stop>
      <template v-if="state.contextMenu.type === 'sidebar-entity' || state.contextMenu.type === 'grid-entity'">
        <button @click="handleEntity('rename')">{{ t('rename') }}<kbd>F2</kbd></button>
        <button @click="handleEntity('copy')">{{ t('copy') }}<kbd>Ctrl C</kbd></button>
        <button :disabled="!canEdit" @click="handleEntity('duplicate')">{{ t('duplicate') }}<kbd>Ctrl D</kbd></button>
        <hr>
        <button @click="handleEntity('visibility')">{{ targetEntity?.editorVisible ? t('hideEntity') : t('showEntity') }}</button>
        <button :disabled="!canEdit" @click="handleEntity('lock')">{{ targetEntity?.editorLocked ? t('unlockEntity') : t('lockEntity') }}</button>
        <button :disabled="!canEdit" @click="handleEntity('enabled')">{{ targetEntity?.enabled ? t('disableEntity') : t('enableEntity') }}</button>
        <button :disabled="!canEdit || !targetEntity?.parentUuid" @click="handleEntity('root')">{{ t('reparentToRoot') }}</button>
        <hr>
        <button :disabled="!canEdit" @click="handleEntity('front')">{{ t('moveFront') }}</button>
        <button :disabled="!canEdit" @click="handleEntity('back')">{{ t('moveBack') }}</button>
        <button class="danger" :disabled="!canEdit" @click="handleEntity('delete')">{{ t('deleteObject') }}<kbd>Del</kbd></button>
      </template>
      <template v-else-if="state.contextMenu.type === 'layer'">
        <button @click="handleLayer('show')">{{ t('focusLayer') }}</button>
        <button :disabled="!canEdit" @click="handleLayer('duplicate')">{{ t('duplicateLayer') }}</button>
        <button class="danger" :disabled="!canEdit" @click="handleLayer('delete')">{{ t('deleteLayer') }}</button>
        <hr>
        <button :disabled="!canEdit" @click="handleLayer('front')">{{ t('moveAllFront') }}</button>
        <button :disabled="!canEdit" @click="handleLayer('back')">{{ t('moveAllBack') }}</button>
      </template>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../i18n'
import { closeContextMenu, deleteLayer, duplicateLayer, editorState as state, moveLayerToBack, moveLayerToFront, setActiveLayer } from '../store/editor'
import { copySelectedEntities, deleteSelected, duplicateSelectedEntities, moveToBack, moveToFront, physicsState, pushHistory, selectEntities } from '../store/physics'
import { preferencesState } from '../store/preferences'
import { requestConfirmation } from '../store/dialog'
import { selectionRoots } from '../editor/selection'
import { setParent } from '../world/hierarchy'

const position = computed(() => ({ top: `${Math.min(state.contextMenu.y, window.innerHeight - 390)}px`, left: `${Math.min(state.contextMenu.x, window.innerWidth - 220)}px` }))
const targetEntity = computed(() => physicsState.world.entities.find(entity => entity.id === state.contextMenu.targetId) ?? null)
const canEdit = computed(() => physicsState.playMode === 'editing')

function ensureTargetSelection() {
  const id = state.contextMenu.targetId
  if (id !== null && !physicsState.selectedEntityIds.includes(id)) selectEntities([id], 'replace', id)
}

async function handleEntity(action: string) {
  const entity = targetEntity.value
  if (!entity) return
  ensureTargetSelection()
  if (action === 'rename') state.renameRequestId = entity.id
  else if (action === 'copy') copySelectedEntities()
  else if (!canEdit.value) return
  else if (action === 'delete') {
    if (preferencesState.confirmDestructiveActions && !await requestConfirmation({ title: t('deleteObjectTitle'), message: t('confirmDeleteObject'), confirmLabel: t('confirmAction'), cancelLabel: t('cancel'), destructive: true })) return
    deleteSelected(); pushHistory('Delete entities')
  } else if (action === 'duplicate') duplicateSelectedEntities()
  else if (action === 'front') { moveToFront(entity.id); pushHistory('Move entity to front') }
  else if (action === 'back') { moveToBack(entity.id); pushHistory('Move entity to back') }
  else if (action === 'visibility') { entity.editorVisible = !entity.editorVisible; pushHistory('Toggle editor visibility') }
  else if (action === 'lock') { entity.editorLocked = !entity.editorLocked; pushHistory('Toggle editor lock') }
  else if (action === 'enabled') { entity.enabled = !entity.enabled; pushHistory('Toggle entity') }
  else if (action === 'root') {
    for (const selected of selectionRoots(physicsState.selectedEntityIds, physicsState.world.entities)) setParent(selected, null, physicsState.world.entities)
    pushHistory('Reparent entities')
  }
  closeContextMenu()
}

async function handleLayer(action: string) {
  const layer = state.contextMenu.targetId
  if (layer === null) return
  if (action === 'show') setActiveLayer(layer)
  else if (!canEdit.value) return
  else if (action === 'duplicate') duplicateLayer(layer)
  else if (action === 'delete') {
    if (preferencesState.confirmDestructiveActions && !await requestConfirmation({ title: t('deleteLayerTitle'), message: t('confirmLayerDelete'), confirmLabel: t('confirmAction'), cancelLabel: t('cancel'), destructive: true })) return
    deleteLayer(layer)
  } else if (action === 'front') moveLayerToFront(layer)
  else if (action === 'back') moveLayerToBack(layer)
  closeContextMenu()
}
</script>

<style scoped>
.context-menu { position: fixed; z-index: 2000; min-width: 205px; padding: 6px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-1); backdrop-filter: var(--glass-blur); box-shadow: var(--shadow-lg); }
.context-menu button { min-height: 33px; padding: 0 9px; display: flex; align-items: center; justify-content: space-between; gap: 20px; border: 0; border-radius: 7px; color: var(--text-secondary); background: transparent; text-align: left; font-size: 11px; }.context-menu button:hover:not(:disabled) { color: var(--text-primary); background: var(--accent-soft); }.context-menu button.danger { color: var(--danger); }.context-menu button.danger:hover:not(:disabled) { background: var(--danger-soft); }.context-menu hr { width: 100%; margin: 5px 0; border: 0; border-top: 1px solid var(--border-subtle); }kbd { color: var(--text-muted); font-family: inherit; font-size:11px; }
.context-enter-active, .context-leave-active { transition: opacity 110ms ease, transform 120ms ease; transform-origin: top left; }.context-enter-from, .context-leave-to { opacity: 0; transform: scale(.97); }
</style>

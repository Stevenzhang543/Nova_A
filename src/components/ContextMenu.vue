<template>
  <div v-if="state.contextMenu.visible" 
       class="context-menu" 
       :style="{ top: state.contextMenu.y + 'px', left: state.contextMenu.x + 'px' }"
       @contextmenu.prevent>
    
    <template v-if="state.contextMenu.type === 'sidebar-entity' || state.contextMenu.type === 'grid-entity'">
      <button @click="handleEntity('delete')">Delete Object</button>
      <button v-if="state.contextMenu.type === 'grid-entity'" @click="handleEntity('duplicate')">Duplicate Object</button>
      <hr />
      <button @click="handleEntity('front')">Move to Front</button>
      <button @click="handleEntity('back')">Move to Back</button>
    </template>

    <template v-if="state.contextMenu.type === 'layer'">
      <button @click="handleLayer('show')">Focus / Select Layer</button>
      <button @click="handleLayer('duplicate')">Duplicate Layer</button>
      <button @click="handleLayer('delete')" class="danger">Delete Layer</button>
      <hr />
      <button @click="handleLayer('front')">Move All to Front</button>
      <button @click="handleLayer('back')">Move All to Back</button>
    </template>

  </div>
</template>

<script setup lang="ts">
import { editorState as state, closeContextMenu, setActiveLayer, deleteLayer, duplicateLayer, moveLayerToFront, moveLayerToBack } from '../store/editor'
import { physicsState, enterEditMode, duplicateEntity, moveToFront, moveToBack } from '../store/physics'

function handleEntity(action: string) {
  const id = state.contextMenu.targetId
  if (id === null) return

  if (action === 'delete') {
    const idx = physicsState.world.entities.findIndex(e => e.id === id)
    if (idx !== -1) physicsState.world.entities.splice(idx, 1)
    if (physicsState.selectedEntityId === id) enterEditMode(null) // FIX: Uses correct clear call
  }
  else if (action === 'duplicate') duplicateEntity(id)
  else if (action === 'front') moveToFront(id)
  else if (action === 'back') moveToBack(id)

  closeContextMenu()
}

function handleLayer(action: string) {
  const l = state.contextMenu.targetId
  if (l === null) return

  if (action === 'show') setActiveLayer(l)
  else if (action === 'delete') deleteLayer(l)
  else if (action === 'duplicate') duplicateLayer(l)
  else if (action === 'front') moveLayerToFront(l)
  else if (action === 'back') moveLayerToBack(l)

  closeContextMenu()
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: #252526;
  border: 1px solid #444;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  min-width: 160px;
  z-index: 9999;
  padding: 4px 0;
}

.context-menu button { background: transparent; border: none; color: #ccc; padding: 8px 12px; text-align: left; cursor: pointer; font-size: 13px; }
.context-menu button:hover { background: #007acc; color: white; }
.context-menu button.danger:hover { background: #d32f2f; }
hr { border: none; border-top: 1px solid #444; margin: 4px 0; }
</style>
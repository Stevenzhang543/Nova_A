<template>
  <div class="layer-bar-wrapper">
    <div class="layer-bar">
      <div class="layer-header">{{ state.currentPage === 'render' ? 'RENDER LAYERS' : 'LAYERS' }}</div>
      
      <div class="layer-list">
        <button 
          v-if="state.currentPage === 'render'"
          class="layer-btn" 
          :class="{ active: state.renderLayer === 'all' }"
          @click="setRenderLayer('all')"
        >
          <img src="../assets/icons/layers.svg" alt="Layer" />
          <span>All</span>
        </button>

        <button 
          v-for="l in state.layers" 
          :key="l" 
          class="layer-btn" 
          :class="{ active: (state.currentPage === 'scene' ? state.activeLayer : state.renderLayer) === l }"
          @click="state.currentPage === 'scene' ? setActiveLayer(l) : setRenderLayer(l)"
          @contextmenu.prevent="openContextMenu($event, 'layer', l)"
          :title="`Right-Click for options`"
        >
          <img src="../assets/icons/layers.svg" alt="Layer" />
          <span>{{ l }}</span>
        </button>
      </div>

      <button v-if="state.currentPage === 'scene'" class="add-layer-btn" @click="addLayer" title="Add New Layer">
        <img src="../assets/icons/addLayer.svg" alt="Add Layer" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { editorState as state, addLayer, setActiveLayer, setRenderLayer, openContextMenu } from '../store/editor'
</script>

<style scoped>
.layer-bar-wrapper { position: absolute; top: 32px; left: 10px; z-index: 100; pointer-events: none; }
.layer-bar {
  background: rgba(37, 37, 38, 0.95); border: 1px solid #333; border-radius: 8px;
  padding: 8px; display: flex; flex-direction: column; gap: 8px;
  pointer-events: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}
.layer-header { font-size: 10px; font-weight: bold; color: #888; text-align: center; letter-spacing: 1px; }
.layer-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 300px;

  overflow-y: auto;
  overflow-x: hidden;
}

.layer-btn {
  background: transparent;
  border: 1px solid transparent;
  color: #ccc;

  display: flex;
  align-items: center;
  gap: 6px;

  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  outline: none;
  min-width: 0;

  -webkit-tap-highlight-color: transparent;
}

.layer-btn span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.layer-btn:focus, .layer-btn:active { outline: none; }

/* FIX: SVGs stay white, un-inverted. */
.layer-btn img { width: 16px; height: 16px; opacity: 0.6; }
.layer-btn:hover { background: #333; }
.layer-btn:hover img { opacity: 1; }

.layer-btn.active { background: #0078d4; color: white; border-color: #0078d4; font-weight: bold; }
.layer-btn.active img { opacity: 1; }

.add-layer-btn {
  background: #333; border: 1px dashed #555; border-radius: 4px; padding: 6px;
  display: flex; justify-content: center; cursor: pointer; transition: all 0.2s;
  outline: none;
}
.add-layer-btn img { width: 16px; height: 16px; opacity: 0.8; }
.add-layer-btn:hover { background: #444; border-color: #777; }
.add-layer-btn:hover img { opacity: 1; }
</style>
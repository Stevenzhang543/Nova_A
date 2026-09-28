<!-- 图层快捷栏：显示图层名称和颜色，支持选择、新增及上下文操作。 -->
<template><aside class="layer-bar"><div class="layer-header">{{ t('layers') }}</div><div class="layer-list"><button v-for="layer in state.layers" :key="layer" :class="{ active: state.activeLayer === layer }" :title="`${layerName(layer)} · ${t('rightClickOptions')}`" @click="setActiveLayer(layer)" @contextmenu.prevent="openContextMenu($event, 'layer', layer)"><i class="layer-color" :style="{ background: layerColorCss(layer) }"></i><span>{{ layerName(layer) }}</span></button></div><UiButton class="add" :label="t('addLayer')" @click="addLayer" icon="add" /></aside></template>
<script setup lang="ts">
import UiButton from '../ui/components/UiButton.vue'
import { t } from '../i18n'
import { addLayer, editorState as state, openContextMenu, setActiveLayer } from '../store/editor'
import { sceneManager } from '../store/physics'
import { layerColorCss } from '../world/layers'
/** 优先返回活动场景中已命名图层的名称，否则显示图层编号。 */ function layerName(id: number): string { return sceneManager.activeScene.settings.namedLayers.find(/* 比较 layer.id 与 id，返回严格相等的判断结果。 */ layer => layer.id === id)?.name ?? String(id) }
</script>
<style scoped>
.layer-bar{position:absolute;inset-block-start:var(--ui-space-sm);inset-inline-start:var(--ui-space-sm);z-index:140;display:flex;align-items:center;gap:var(--ui-space-xs);max-width:calc(100% - var(--ui-space-lg));background:var(--surface-1);border:1px solid var(--border-subtle);padding:var(--ui-space-micro)}.layer-header{display:none}.layer-list{display:flex;min-width:0;overflow:auto;gap:var(--ui-space-micro)}.layer-list button{display:flex;align-items:center;gap:var(--ui-space-xs);white-space:nowrap}.layer-color{width:var(--ui-space-sm);height:var(--ui-space-sm);flex:none;border-radius:50%}.layer-list button.active{background:var(--accent-soft);color:var(--accent)}
</style>

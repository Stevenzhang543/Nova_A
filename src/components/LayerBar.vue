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
.layer-bar{position:absolute;inset-block-start:var(--space-2);inset-inline-start:var(--space-2);z-index:140;display:flex;align-items:center;gap:2px;max-width:calc(100% - var(--ui-space-lg));padding:2px;border:var(--ui-border-width) solid var(--border-subtle);border-radius:calc(var(--radius-control) + 2px);background:color-mix(in srgb,var(--surface-1) 88%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:var(--shadow-sm)}
.layer-header{display:none}
.layer-list{display:flex;min-width:0;overflow:auto;gap:2px;scrollbar-width:none}
.layer-list button{display:flex;align-items:center;gap:var(--space-2);min-height:calc(var(--ui-control-height) - 6px);padding-inline:var(--space-2);white-space:nowrap;font-size:var(--type-dense);color:var(--text-secondary)}
.layer-color{width:7px;height:7px;flex:none;border-radius:50%}
.layer-list button.active{background:var(--surface-raised);color:var(--text-primary);box-shadow:var(--shadow-xs)}
.add{width:calc(var(--ui-control-height) - 6px);height:calc(var(--ui-control-height) - 6px);min-height:0;color:var(--text-muted)}
</style>

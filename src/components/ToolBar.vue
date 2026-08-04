<template><div class="toolbar" role="toolbar"><button v-for="tool in tools" :key="tool.id" :class="{ active: state.activeTool === tool.id }" :title="t(tool.title)" @click="state.activeTool = tool.id"><span>{{ tool.glyph }}</span></button></div></template>
<script setup lang="ts">
import { t } from '../i18n'; import { physicsState as state } from '../store/physics'
const tools = [{ id: 'triangle' as const, glyph: '△', title: 'drawTriangle' as const }, { id: 'circle' as const, glyph: '○', title: 'drawCircle' as const }, { id: 'rectangle' as const, glyph: '□', title: 'drawRectangle' as const }]
</script>
<style scoped>
.toolbar { position: absolute; top: 54px; left: calc(50% + 34px); z-index: 170; transform: translateX(-50%); padding: 5px; display: flex; gap: 4px; border: 1px solid var(--border-subtle); border-radius: 13px; background: var(--surface-1); backdrop-filter: var(--glass-blur); box-shadow: var(--shadow-sm); }
button { width: 39px; height: 32px; display: grid; place-items: center; border: 1px solid transparent; border-radius: 9px; color: var(--text-muted); background: transparent; }
button span { font-size: 19px; line-height: 1; transition: transform 180ms cubic-bezier(.2,.8,.2,1); }button:hover { color: var(--text-primary); background: var(--surface-hover); }button:hover span { transform: translateY(-1px) scale(1.05); }button.active { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 24%, transparent); background: var(--accent-soft); }
</style>

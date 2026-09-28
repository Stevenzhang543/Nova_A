<!-- Original Nova outline icons share one 16px canvas, stroke weight and token size. -->
<template>
  <svg class="editor-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><g transform="scale(.6666667)"><path :d="editorIconPaths[name]" /></g></svg>
</template>
<script lang="ts">
export type { EditorIconName } from './editorIconPaths'
</script>
<script setup lang="ts">
import { editorIconPaths, type EditorIconName } from './editorIconPaths'
defineProps<{ name: EditorIconName }>()
</script>
<style scoped>
.editor-icon { display:inline-block; inline-size:var(--ui-icon-size,16px); block-size:var(--ui-icon-size,16px); flex:none; vertical-align:middle; pointer-events:none; }
</style>

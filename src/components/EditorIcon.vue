<!-- Theme-aware controls. Selected 16px geometry is adapted from Godot under MIT; see public/third-party/godot-editor-icons.json. -->
<template>
  <svg class="editor-icon" :viewBox="godotIcon ? godotIcon.viewBox : '0 0 24 24'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <rect v-if="name === 'stop'" x="3" y="3" width="10" height="10" rx="1" fill="currentColor" stroke="none" />
    <path v-else-if="godotIcon" :d="godotIcon.path" :fill="godotIcon.outline && name !== 'play' ? 'none' : 'currentColor'" :stroke="godotIcon.outline ? 'currentColor' : 'none'" stroke-width="2" />
    <path v-else :d="paths[name as keyof typeof paths]" />
  </svg>
</template>

<script lang="ts">
export type EditorIconName = 'maximize' | 'restore' | 'pin' | 'unpin' | 'clear' | 'up' | 'down' | 'grid' | 'list' | 'pause' | 'step' | 'design' | 'script' | 'animation' | 'ui' | 'debug' | 'manage' | 'custom' | 'back' | 'forward' | 'play' | 'stop' | 'search' | 'layout' | 'hierarchy' | 'inspector' | 'bottom' | 'command' | 'assets' | 'audio' | 'world' | 'network' | 'ecosystem' | 'profiler' | 'add' | 'folder' | 'more' | 'filter' | 'settings' | 'tools' | 'package' | 'check' | 'render' | 'build' | 'terminal' | 'plus' | 'physics' | 'learn' | 'graph'
</script>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ name: EditorIconName }>()
const godotIcons = {
  play: { path: 'M4 12V4l7 4z', outline: true },
  pause: { path: 'M4 3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zm6 0a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1z' },
  stop: { path: '' },
  pin: { path: 'm4 1v1l1 1v3h6v-3l1-1v-1zm1 6-2 3h10l-2-3zm2 4v2l1 2 1-2v-2z' },
  maximize: { path: 'm1 1v5l1.793-1.793 2.5 2.5 1.4141-1.4141-2.5-2.5 1.793-1.793h-5zm9 0 1.793 1.793-2.5 2.5 1.4141 1.4141 2.5-2.5 1.793 1.793v-5h-5zm-4.707 8.293-2.5 2.5-1.793-1.793v5h5l-1.793-1.793 2.5-2.5-1.4141-1.4141zm5.4141 0-1.4141 1.4141 2.5 2.5-1.793 1.793h5v-5l-1.793 1.793-2.5-2.5z' },
  back: { path: 'M9 2 L3 8 L9 14', outline: true, viewBox: '-2 0 16 16' },
  forward: { path: 'M3 2 L9 8 L3 14', outline: true, viewBox: '-2 0 16 16' },
  search: { path: 'M10.168 8.754a5 5 0 1 0-1.414 1.414l4.316 4.316 1.414-1.414zM6 3a3 3 0 0 1 0 6 3 3 0 0 1 0-6z' },
  list: { path: 'm2 2v2h2v-2zm4 0v2h8v-2zm-4 5v2h2v-2zm4 0v2h8v-2zm-4 5v2h2v-2zm4 0v2h8v-2z' },
  grid: { path: 'M1 1v14h14V1zm2 2h2v2H3zm4 0h2v2H7zm4 0h2v2h-2zM3 7h2v2H3zm4 0h2v2H7zm4 0h2v2h-2zm-8 4h2v2H3zm4 0h2v2H7zm4 0h2v2h-2z' },
} as const
const godotIcon = computed(() => {
  const icon = godotIcons[props.name as keyof typeof godotIcons] as { path: string; outline?: boolean; viewBox?: string } | undefined
  return icon ? { ...icon, viewBox: icon.viewBox ?? '0 0 16 16' } : undefined
})
const paths = {
  maximize: 'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6',
  restore: 'M3 9h6V3m6 0v6h6M9 21v-6H3m12 6v-6h6',
  pin: 'M8 3h8m-7 0v7l-3 4v2h12v-2l-3-4V3m-3 13v5',
  unpin: 'M3 3l18 18M9 3h7m-1 0v7l3 4v2M8 9l-2 5v2h8m-2 0v5',
  clear: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  up: 'M5 15l7-7 7 7',
  down: 'M5 9l7 7 7-7',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  list: 'M3 5h1m4 0h13M3 12h1m4 0h13M3 19h1m4 0h13',
  pause: 'M7 4v16M17 4v16',
  step: 'M5 4l11 8-11 8zM20 4v16',
  design: 'M12 3l9 9-9 9-9-9zM12 8l4 4-4 4-4-4z',
  script: 'M8 5l-6 7 6 7m8-14l6 7-6 7m-3-16-2 20',
  animation: 'M12 3l9 9-9 9-9-9z',
  ui: 'M3 3h18v18H3zM3 8h18M9 8v13',
  debug: 'M8 7h8v10l-4 4-4-4zM9 3l3 4 3-4M3 9h5m8 0h5M3 15h5m8 0h5',
  manage: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-5 0v6',
  custom: 'M12 3v18M3 12h18M5 5l14 14M5 19 19 5',
  back: 'M20 12H4m6-6-6 6 6 6',
  forward: 'M4 12h16m-6-6 6 6-6 6',
  layout: 'M3 3h18v18H3zM8 3v18M8 16h13',
  hierarchy: 'M4 4h6v5H4zM14 15h6v5h-6zM7 9v8h7',
  inspector: 'M3 4h18v16H3zM14 4v16M17 8h1m-1 4h1m-1 4h1',
  bottom: 'M3 4h18v16H3zM3 14h18',
  command: 'M4 5h16v14H4zM7 9l3 3-3 3m6 0h4',
  assets: 'M3 7h7l2-3h9v16H3z',
  audio: 'M9 5v12m0-12 11-2v12M9 15H6a3 3 0 1 0 3 3m11-5h-3a3 3 0 1 0 3 3',
  world: 'M3 3h18v18H3zM3 15l5-5 5 5 3-3 5 5M16 7h1',
  network: 'M9 3h6v6H9zM2 16h6v5H2zM16 16h6v5h-6zM12 9v4H5v3m7-3h7v3',
  ecosystem: 'M12 3l9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9',
  profiler: 'M3 18h3l4-12 4 15 4-11h3',
  add: 'M12 4v16M4 12h16',
  folder: 'M3 7V4h7l3 3h8v13H3z',
  more: 'M4 12h1m6 0h1m6 0h1',
  filter: 'M3 4h18l-7 8v7l-4 2v-9z',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-5 0v6',
  tools: 'M14 3a6 6 0 0 0-7 8l-5 6 5 5 6-6a6 6 0 0 0 8-7l-4 4-5-5z',
  package: 'M12 3l9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9M8 5l9 5',
  check: 'M4 12l5 5L20 6',
  render: 'M3 5h18v14H3zM7 15l4-5 4 5 3-3 3 3M6 8h1',
  build: 'M4 20l9-9M10 4l4-2 8 8-4 4-8-8zM2 18l4 4',
  terminal: 'M3 4h18v16H3zM6 8l4 4-4 4m7 0h5',
  plus: 'M12 4v16M4 12h16',
  physics: 'M12 3v4m0 10v4M3 12h4m10 0h4M8 8h8v8H8zM5 5l3 3m8 8 3 3M5 19l3-3m8-8 3-3',
  learn: 'M3 4h6l3 3 3-3h6v16h-6l-3 2-3-2H3zM12 7v15',
  graph: 'M3 3h6v6H3zM15 15h6v6h-6zM15 3h6v6h-6zM9 6h6M6 9v9h9',
} as const
</script>

<style scoped>
.editor-icon { display: inline-block; width: 1.15em; height: 1.15em; flex: 0 0 auto; vertical-align: middle; pointer-events: none; }
</style>

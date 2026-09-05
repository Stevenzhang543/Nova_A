<template>
  <section class="audio-system-panel">
    <PresentationPanel initial-tab="audio" />
  </section>
</template>

<script setup lang="ts">
import PresentationPanel from './PresentationPanel.vue'
</script>

<style scoped>
.audio-system-panel{height:100%;min-height:0;overflow:hidden}
.audio-system-panel :deep(.presentation-header nav){display:none}
.audio-system-panel :deep(.presentation-header p){display:none}
/* The audio-only host has no navigation choices; avoid reserving an empty header. */
.audio-system-panel{min-width:0;display:flex}.audio-system-panel :deep(.presentation-panel){min-width:0;flex:1}.audio-system-panel :deep(.presentation-header){display:none}
</style>

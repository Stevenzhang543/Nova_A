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
</style>

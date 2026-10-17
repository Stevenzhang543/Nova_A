<!-- 音频系统面板：提供项目音频配置和运行相关界面。 -->
<template>
  <section class="audio-system-panel">
    <PresentationPanel initial-tab="audio" />
  </section>
</template>

<script setup lang="ts">
import PresentationPanel from './PresentationPanel.vue'
</script>

<style scoped>
.audio-system-panel{height:100%;min-width:0;min-height:0;display:flex;overflow:hidden}.audio-system-panel :deep(.presentation-panel){min-width:0;flex:1}.audio-system-panel :deep(.presentation-panel>.ui-panel-header),.audio-system-panel :deep(.presentation-panel>.ui-tabs){display:none}
</style>

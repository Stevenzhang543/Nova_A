<template>
  <div class="renderer-panel">
    <LayerBar /> <div class="viewport-wrapper">
      <WorldCanvas class="readonly-canvas" />
    </div>
  </div>
</template>

<script setup lang="ts">
import WorldCanvas from "../components/WorldCanvas.vue"
import LayerBar from "../components/LayerBar.vue"
</script>

<style scoped>
.renderer-panel { display: flex; flex-direction: column; width: 100%; height: 100%; background: #1e1e1e; position: relative;}
.viewport-wrapper { flex: 1; position: relative; overflow: hidden; }
</style>
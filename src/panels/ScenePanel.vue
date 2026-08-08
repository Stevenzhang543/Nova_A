<template>
  <div class="scene-panel"><LayerBar /><WorldCanvas /></div>
</template>

<script setup lang="ts">
import WorldCanvas from "../components/WorldCanvas.vue"
import LayerBar from "../components/LayerBar.vue" // NEW
</script>

<style scoped>
.scene-panel { position: relative; width: 100%; height: 100%; }
</style>

<template>
  <div class="scene-panel">
    <SceneSidebar />
    <div class="content">
      <WorldCanvas />
    </div>
  </div>
</template>

<script setup lang="ts">
import WorldCanvas from "../components/WorldCanvas.vue"
import SceneSidebar from "../components/SceneSideBar.vue"
</script>

<style scoped>
.scene-panel { display: flex; width: 100%; height: 100%; }
.content { flex: 1; position: relative; }
</style>
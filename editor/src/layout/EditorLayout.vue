<template>
  <div class="editor-root">
    <TopBar />
    <div class="editor-main">
      <SideBars />
      <div class="editor-content">
        <WorldCanvas />
      </div>
    </div>
    <StatusBar />
  </div>
</template>

<script setup lang="ts">
import TopBar from './TopBar.vue'
import SideBars from './SideBars.vue'
import StatusBar from './StatusBar.vue'
import WorldCanvas from '../components/WorldCanvas.vue'
</script>

<style scoped>
.editor-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1e1e1e;
  color: #ddd;
}

.editor-main {
  flex: 1;
  display: flex;
}

.editor-content {
  flex: 1;
  position: relative;
  display: flex;
}
</style>

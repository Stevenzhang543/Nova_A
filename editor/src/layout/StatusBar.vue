<template>
  <div class="status-bar">
    <span>{{ state.statusText }}</span>
    <span class="tag">dev version of Nova_A</span>
  </div>
</template>

<script setup lang="ts">
import { editorState as state } from "../store/editor"
</script>

<style scoped>
.status-bar {
  height: 24px;
  background: #252526;
  color: #cccccc;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  font-size: 12px;
  border-top: 1px solid #2a2a2a;
}

.tag {
  opacity: 0.6;
  font-size: 11px;
}
</style>

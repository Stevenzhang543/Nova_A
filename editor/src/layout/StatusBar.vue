<script setup lang="ts">
import { editorState } from '../store/editor'
</script>

<template>
  <div class="status-bar">
    {{ editorState.statusText }}
  </div>
</template>

<style scoped>
.status-bar {
  height: 24px;
  background: #252526;
  color: #ccc;
  display: flex;
  align-items: center;
  padding: 0 10px;
  font-size: 12px;
}
</style>

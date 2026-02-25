<template>
  <div class="top-bar">
    <button>File</button>
    <button>Edit</button>
    <button>View</button>
    <input placeholder="Search" />
    <button>Min</button>
    <button>Max</button>
    <button>Close</button>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.top-bar {
  height: 32px;
  background: #1e1e1e;
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 6px;
  color: #ddd;
}
.top-bar button {
  background: #252526; border: none; color: #ccc; padding: 2px 6px;
}
.top-bar input { flex: 1; background: #252526; border: 1px solid #444; color: #fff; }
</style>

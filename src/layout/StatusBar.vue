<template><footer class="status-bar"><span class="status"><i></i>{{ state.statusText }}</span><span class="tag">{{ t('releaseLabel') }} &middot; Whitelist</span></footer></template>
<script setup lang="ts">
import { t } from '../i18n'
import { editorState as state } from '../store/editor'
</script>
<style scoped>
.status-bar { height: 27px; flex: 0 0 27px; padding: 0 11px; display: flex; align-items: center; justify-content: space-between; color: var(--text-muted); background: var(--surface-1); border-top: 1px solid var(--border-subtle); font-size: 10.5px; z-index: 200; }
.status { min-width: 0; display: flex; align-items: center; gap: 7px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status i { width: 6px; height: 6px; flex: 0 0 6px; border-radius: 50%; background: var(--success); box-shadow: 0 0 8px color-mix(in srgb, var(--success) 60%, transparent); }
.tag { opacity: .78; }
</style>

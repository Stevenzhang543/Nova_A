<template><footer class="status-bar"><span class="status"><i></i>{{ state.statusText }}</span><button class="task-status" :class="{ busy: activeTasks }" :title="t('statusCenter')" @click="state.statusCenterOpen = !state.statusCenterOpen"><span>{{ activeTasks ? `${activeTasks} ${t('activeTasks')}` : t('statusCenter') }}</span><b v-if="failedTasks">{{ failedTasks }}</b></button><span class="tag">{{ t('releaseLabel') }} &middot; Whitelist</span></footer></template>
<script setup lang="ts">
import { t } from '../i18n'
import { computed } from 'vue'
import { editorState as state } from '../store/editor'
import { feedbackState } from '../runtime/editorFeedback'
import { importPipelineState } from '../assets/importPipeline'
import { buildProgress } from '../runtime/buildSettings'
const activeTasks = computed(() => feedbackState.tasks.filter(item => ['running','queued'].includes(item.status)).length + importPipelineState.jobs.filter(item => !['complete','failed','cancelled'].includes(item.status)).length + (['validating','packing','exporting'].includes(buildProgress.phase) ? 1 : 0))
const failedTasks = computed(() => feedbackState.tasks.filter(item => item.status === 'failed').length + importPipelineState.jobs.filter(item => item.status === 'failed').length + (buildProgress.phase === 'failed' ? 1 : 0))
</script>
<style scoped>
.status-bar { height: 27px; flex: 0 0 27px; padding: 0 11px; display: flex; align-items: center; justify-content: space-between; color: var(--text-muted); background: var(--surface-1); border-top: 1px solid var(--border-subtle); font-size:11px; z-index: 200; }
.status { min-width: 0; display: flex; align-items: center; gap: 7px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status i { width: 6px; height: 6px; flex: 0 0 6px; border-radius: 50%; background: var(--success); box-shadow: 0 0 8px color-mix(in srgb, var(--success) 60%, transparent); }
.task-status{min-height:22px;margin-left:auto;padding:0 7px;display:flex;align-items:center;gap:5px;border:0;border-radius:6px;color:var(--text-muted);background:transparent;font-size:11px}.task-status:hover,.task-status.busy{color:var(--accent);background:var(--accent-soft)}.task-status b{min-width:16px;padding:1px 4px;border-radius:99px;color:white;background:var(--danger);font-size:11px}.tag { margin-left:8px; opacity: .78; }
</style>

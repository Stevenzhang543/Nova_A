<!-- 状态栏：显示运行指标、后台任务数量和任务中心入口。 -->
<template><footer class="status-bar"><span class="status"><i></i>{{ state.statusText }}</span><button class="task-status" :class="{ busy: activeTasks }" :title="t('statusCenter')" @click="state.statusCenterOpen = !state.statusCenterOpen"><span>{{ activeTasks ? `${activeTasks} ${t('activeTasks')}` : t('statusCenter') }}</span><b v-if="failedTasks">{{ failedTasks }}</b></button><span class="tag">{{ t('releaseLabel') }} &middot; Whitelist</span></footer></template>
<script setup lang="ts">
import { t } from '../i18n'
import { computed } from 'vue'
import { editorState as state } from '../store/editor'
import { feedbackState } from '../runtime/editorFeedback'
import { importPipelineState } from '../assets/importPipeline'
import { buildProgress } from '../runtime/buildSettings'
const activeTasks = computed(/** 合计运行或排队任务、未结束导入及进行中构建数量。 */ () => feedbackState.tasks.filter(/** 判断任务是否处于运行或排队状态。 */ item => ['running','queued'].includes(item.status)).length + importPipelineState.jobs.filter(/* 返回 ['complete','failed','cancelled'].includes(item.status) 的逻辑取反结果。 */ item => !['complete','failed','cancelled'].includes(item.status)).length + (['validating','packing','exporting'].includes(buildProgress.phase) ? 1 : 0))
const failedTasks = computed(/** 合计失败的后台任务、导入及构建。 */ () => feedbackState.tasks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed').length + importPipelineState.jobs.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed').length + (buildProgress.phase === 'failed' ? 1 : 0))
</script>
<style scoped>
.status-bar{min-height:var(--ui-control-height);flex:0 0 auto;padding:0 var(--space-2);display:flex;align-items:center;gap:var(--space-2);color:var(--text-muted);background:var(--surface-1);border-top:1px solid var(--border-subtle);font-size:var(--type-caption);z-index:200}
.status{min-width:0;display:flex;align-items:center;gap:var(--space-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.status i{width:var(--space-1);height:var(--space-1);flex:0 0 var(--space-1);border-radius:50%;background:var(--success)}
.task-status{margin-left:auto;display:flex;align-items:center;gap:var(--ui-control-gap);color:var(--text-muted);font-size:var(--type-body);line-height:var(--line-body)}.task-status.busy{color:var(--accent)}.task-status b{padding:0 var(--space-1);color:var(--danger);font-size:var(--type-caption)}.tag{white-space:nowrap}
@media(max-width:600px){.tag{display:none}}
</style>

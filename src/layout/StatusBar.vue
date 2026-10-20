<!-- 状态栏：显示运行指标、后台任务数量和任务中心入口。 -->
<template><footer class="status-bar"><span class="status" role="status" aria-live="polite" aria-atomic="true"><i aria-hidden="true"></i>{{ state.statusText }}</span><button class="task-status" :class="{ busy: activeTasks }" :title="t('statusCenter')" @click="state.statusCenterOpen = !state.statusCenterOpen"><span>{{ activeTasks ? `${activeTasks} ${t('activeTasks')}` : t('statusCenter') }}</span><b v-if="failedTasks">{{ failedTasks }}</b></button><button v-if="notificationCount" class="notification-status" :title="t('notifications')" @click="openNotifications">{{ t('notifications') }} <b>{{ notificationCount }}</b></button><span class="tag">Nova_A {{ NOVA_RELEASE_NAME }} &middot; Whitelist</span></footer></template>
<script setup lang="ts">
import { t } from '../i18n'
import { computed } from 'vue'
import { editorState as state } from '../store/editor'
import { feedbackState } from '../runtime/editorFeedback'
import { importPipelineState } from '../assets/importPipeline'
import { buildProgress } from '../runtime/buildSettings'
import { NOVA_RELEASE_NAME } from '../projects/projectFormat'
const activeTasks = computed(/** 合计运行或排队任务、未结束导入及进行中构建数量。 */ () => feedbackState.tasks.filter(/** 判断任务是否处于运行或排队状态。 */ item => ['running','queued'].includes(item.status)).length + importPipelineState.jobs.filter(/* 返回 ['complete','failed','cancelled'].includes(item.status) 的逻辑取反结果。 */ item => !['complete','failed','cancelled'].includes(item.status)).length + (['validating','packing','exporting'].includes(buildProgress.phase) ? 1 : 0))
const notificationCount = computed(() => feedbackState.notificationHistory.length + feedbackState.notificationHistoryDropped)
/** Opens the notification history owned by the feedback layer. */ function openNotifications() { window.dispatchEvent(new Event('nova:toggle-notifications')) }
const failedTasks = computed(/** 合计失败的后台任务、导入及构建。 */ () => feedbackState.tasks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed').length + importPipelineState.jobs.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed').length + (buildProgress.phase === 'failed' ? 1 : 0))
</script>
<style scoped>
.status-bar{min-height:var(--ui-statusbar-height);flex:0 0 auto;padding:0 var(--space-3);display:flex;align-items:center;gap:var(--space-3);color:var(--text-muted);background:var(--bg-base);font-size:var(--type-caption);z-index:200}
.status{min-width:0;display:flex;align-items:center;gap:var(--space-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.status i{width:6px;height:6px;flex:0 0 6px;border-radius:50%;background:var(--success)}
.task-status{margin-left:auto;display:flex;align-items:center;gap:var(--space-1);min-height:calc(var(--ui-statusbar-height) - 4px);padding:0 var(--space-2);color:var(--text-muted);font-size:var(--type-caption);font-weight:var(--weight-regular);line-height:1}
.task-status.busy{color:var(--accent)}
.notification-status{display:flex;align-items:center;gap:var(--space-1);min-height:calc(var(--ui-statusbar-height) - 4px);padding:0 var(--space-2);color:var(--text-muted);font-size:var(--type-caption);font-weight:var(--weight-regular);line-height:1}
.notification-status b{min-width:16px;padding:1px 5px;border-radius:var(--radius-pill);background:var(--surface-3);color:var(--text-secondary);font-size:var(--type-caption);font-weight:var(--weight-medium);text-align:center}
.task-status b{min-width:16px;padding:1px 5px;border-radius:var(--radius-pill);background:var(--danger-soft);color:var(--danger);font-size:var(--type-caption);text-align:center}
.tag{white-space:nowrap;color:var(--text-tertiary)}
@media(max-width:600px){.tag{display:none}}
</style>

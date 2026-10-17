<!-- 编辑器任务反馈：集中显示通知、构建与导入进度，提供取消、重试及诊断复制。 -->
<template>
  <Teleport to="body">
    <UiMotionTransition><div v-if="feedback.banner" class="feedback-banner" role="status"><span>{{ feedback.banner }}</span><UiButton :label="t('close')" @click="feedback.banner = ''" icon="close" /></div></UiMotionTransition>
    <div ref="toastRegion" class="toast-stack" @keydown="toastKeydown"><TransitionGroup tag="div" :css="false" @before-enter="toastRestore" @enter="toastEnter" @before-leave="toastDeactivate" @leave="toastLeave" @enter-cancelled="toastCancel" @leave-cancelled="toastCancel" class="toast-items" aria-live="polite" aria-atomic="false"><article v-for="toast in visibleToasts" :key="toast.id" :data-toast-id="toast.id" :class="toast.kind"><span>{{ toast.message }}<small v-if="toast.repeatCount > 1" class="notification-repeat"> · {{ t('notificationRepeated', { count: toast.repeatCount }) }}</small></span><button v-if="toast.action" @click="runToastAction(toast)">{{ toast.actionLabel }}</button><UiButton :label="t('close')" @click="dismissToast(toast.id)" icon="close" /></article></TransitionGroup><button v-if="feedback.notificationHistory.length || feedback.toasts.length" key="notification-summary" ref="notificationSummary" class="notification-summary" :aria-expanded="notificationsOpen" aria-controls="editor-notification-history" @click="toggleNotifications">{{ t('notificationSummary', { count: Math.max(feedback.toasts.length, feedback.notificationHistory.length + feedback.notificationHistoryDropped) }) }}</button></div>
    <UiMotionTransition><section v-if="notificationsOpen" id="editor-notification-history" ref="notificationPanel" class="status-center notification-center" role="dialog" :aria-label="t('notifications')" tabindex="-1" @keydown="notificationKeydown"><header><strong>{{ t('notifications') }}</strong><UiButton :label="t('close')" @click="closeNotifications" icon="close" /></header><div class="notification-list"><h3 v-if="feedback.toasts.length">{{ t('currentNotifications') }}</h3><article v-for="toast in feedback.toasts" :key="`current-${toast.id}`" :class="toast.kind"><span>{{ toast.message }}<small v-if="toast.repeatCount > 1" class="notification-repeat"> · {{ t('notificationRepeated', { count: toast.repeatCount }) }}</small></span><button v-if="toast.action" @click="runToastAction(toast)">{{ toast.actionLabel }}</button><UiButton :label="t('close')" @click="dismissToast(toast.id)" icon="close" /></article><h3 v-if="pastNotifications.length">{{ t('recentNotifications') }}</h3><article v-for="entry in pastNotifications" :key="`history-${entry.id}`" :class="[entry.kind, 'notification-history']"><span>{{ entry.message }}<small v-if="entry.repeatCount > 1" class="notification-repeat"> · {{ t('notificationRepeated', { count: entry.repeatCount }) }}</small></span></article><p v-if="feedback.notificationHistoryDropped">{{ t('notificationHistoryDropped', { count: feedback.notificationHistoryDropped }) }}</p><p v-if="!feedback.notificationHistory.length && !feedback.toasts.length">{{ t('noNotifications') }}</p></div><footer><button @click="clearNotificationHistory">{{ t('clearNotificationHistory') }}</button></footer></section></UiMotionTransition>
    <UiMotionTransition><section v-if="state.statusCenterOpen" class="status-center" role="dialog" :aria-label="t('statusCenter')">
      <header><div><strong>{{ t('statusCenter') }}</strong><small>{{ activeCount }} {{ t('activeTasks') }}</small></div><UiButton :label="t('close')" @click="state.statusCenterOpen = false" icon="close" /></header>
      <div class="task-list">
        <article v-if="build.phase !== 'idle'" :class="build.phase"><div><strong>{{ t('build') }}</strong><small>{{ build.message }}</small></div><progress :value="build.percent" max="100"></progress><span>{{ build.percent }}%</span></article>
        <article v-for="job in imports.jobs" :key="`import-${job.id}`" :class="job.status"><div><strong>{{ job.name }}</strong><small>{{ t(`importStatus_${job.status}`) }}</small></div><progress :value="job.progress" max="1"></progress><button v-if="!['complete','failed','cancelled'].includes(job.status)" @click="cancelAssetImport(job.id)">{{ t('cancel') }}</button><code v-else-if="job.error">{{ job.error }}</code></article>
        <article v-for="task in feedback.tasks" :key="task.id" :class="task.status"><div><strong>{{ task.title }}</strong><small>{{ task.detail || task.status }}</small></div><progress v-if="task.progress !== null" :value="task.progress" max="1"></progress><span v-else-if="['queued','running'].includes(task.status)" class="spinner"></span><div class="task-actions"><button v-if="task.cancel && ['queued','running'].includes(task.status)" @click="cancelTask(task.id)">{{ t('cancel') }}</button><button v-if="task.retry && task.status === 'failed'" @click="retryTask(task.id)">{{ t('retry') }}</button></div><details data-ui-motion-disclosure v-if="task.error || task.logs.length || task.resources.length"><summary>{{ t('taskDetails') }}</summary><code v-if="task.error">{{ task.error }}</code><pre v-if="task.logs.length">{{ task.logs.join('\n') }}</pre><nav v-if="task.resources.length"><button v-for="resource in task.resources" :key="resource.label" @click="openResource(resource)">{{ resource.label }}</button></nav></details></article>
        <p v-if="!hasTasks">{{ t('noBackgroundTasks') }}</p>
      </div>
      <footer><button @click="copy">{{ copied ? t('copied') : t('copyDiagnostics') }}</button><button @click="clearFinishedTasks">{{ t('clearFinished') }}</button></footer>
    </section></UiMotionTransition>
  </Teleport>
</template>
<script setup lang="ts">
import UiMotionTransition from '../ui/components/UiMotionTransition.vue'
import { animatePresence, cancelMotion, captureRects, animateReorder, hasActiveMotion } from '../ui/motion'
import UiButton from '../ui/components/UiButton.vue'
import { computed, ref, nextTick, onBeforeUnmount, onBeforeUpdate, onUpdated } from 'vue'
import { t } from '../i18n'
import { editorState as state } from '../store/editor'
import { importPipelineState as imports, cancelAssetImport } from '../assets/importPipeline'
import { buildProgress as build } from '../runtime/buildSettings'
import { cancelTask, clearFinishedTasks, clearNotificationHistory, dismissToast, disposeFeedbackNotifications, feedbackDiagnostics, feedbackState as feedback, retryTask } from '../runtime/editorFeedback'
import { faultDiagnostics, reportRecoverableError } from '../runtime/faultCenter'
import type { EditorToast, TaskResourceLink } from '../runtime/editorFeedback'
const copied = ref(false)
const notificationsOpen = ref(false)
const toastRegion = ref<HTMLElement | null>(null)
const notificationSummary = ref<HTMLButtonElement | null>(null)
const notificationPanel = ref<HTMLElement | null>(null)
let feedbackMounted = true
let notificationFocusEpoch = 0
let copyTimer: ReturnType<typeof globalThis.setTimeout> | undefined
const visibleToasts = computed(() => notificationsOpen.value ? [] : feedback.toasts.slice(-1))
const pastNotifications = computed(() => feedback.notificationHistory.filter(entry => !feedback.toasts.some(toast => toast.id === entry.id)))
function runToastAction(toast: EditorToast): void { const current = feedback.toasts.find(item => item.id === toast.id); if (!current) return; current.action?.(); dismissToast(current.id) }
async function toggleNotifications(): Promise<void> { if (notificationsOpen.value) { closeNotifications(); return } const epoch = ++notificationFocusEpoch; notificationsOpen.value = true; await nextTick(); if (feedbackMounted && notificationFocusEpoch === epoch) notificationPanel.value?.focus({ preventScroll: true }) }
function closeNotifications(): void { const epoch = ++notificationFocusEpoch; notificationsOpen.value = false; void nextTick(() => { if (feedbackMounted && notificationFocusEpoch === epoch) notificationSummary.value?.focus({ preventScroll: true }) }) }
function notificationKeydown(event: KeyboardEvent): void { if (event.key !== 'Escape' || event.defaultPrevented) return; event.preventDefault(); event.stopPropagation(); closeNotifications() }
function toastKeydown(event: KeyboardEvent): void { if (event.key !== 'Escape' || event.defaultPrevented) return; const article = (event.target as HTMLElement | null)?.closest<HTMLElement>('article[data-toast-id]'); if (!article || !toastRegion.value?.contains(article)) return; event.preventDefault(); event.stopPropagation(); dismissToast(Number(article.dataset.toastId)); void nextTick(() => { if (feedbackMounted) notificationSummary.value?.focus({ preventScroll: true }) }) }
const activeCount = computed(/** 合计运行或排队的后台任务、未结束导入以及正在工作的构建任务。 */ () => feedback.tasks.filter(/** 判断后台任务是否仍在运行或等待执行。 */ item => ['running','queued'].includes(item.status)).length + imports.jobs.filter(/* 返回 ['complete','failed','cancelled'].includes(item.status) 的逻辑取反结果。 */ item => !['complete','failed','cancelled'].includes(item.status)).length + (['validating','packing','exporting'].includes(build.phase) ? 1 : 0))
const hasTasks = computed(/** 判断后台任务、导入记录或构建状态中是否存在可展示的内容。 */ () => feedback.tasks.length > 0 || imports.jobs.length > 0 || build.phase !== 'idle')
/** Copy feedback without scheduling a late update after this host unmounts. */ async function copy() { try { await navigator.clipboard.writeText(`${feedbackDiagnostics()}\n\n${faultDiagnostics()}`); if (!feedbackMounted) return; copied.value = true; if (copyTimer !== undefined) globalThis.clearTimeout(copyTimer); copyTimer = globalThis.setTimeout(() => { copyTimer = undefined; if (feedbackMounted) copied.value = false }, 1500) } catch (error) { reportRecoverableError(error, 'Copy status diagnostics') } }
/** 优先执行任务资源自带操作，否则以隔离来源的新窗口打开资源链接。 */ function openResource(resource: TaskResourceLink) { if (resource.action) resource.action(); else if (resource.href) window.open(resource.href, '_blank', 'noopener,noreferrer') }
const toastStyles=new WeakMap<HTMLElement,{position:string;top:string;left:string;width:string}>()
let toastRects= new Map<HTMLElement,{left:number;top:number;width:number;height:number}>()
const toastElements=()=>Array.from(toastRegion.value?.querySelectorAll<HTMLElement>(':scope > .toast-items > article') ?? [])
function toastRestore(element:Element){const el=element as HTMLElement,s=toastStyles.get(el);if(s){Object.assign(el.style,s);toastStyles.delete(el)}el.inert=false;el.style.pointerEvents='auto'}
function toastEnter(element:Element,done:()=>void){animatePresence(element as HTMLElement,'enter',done,{preset:'smooth',distance:8,scale:1})}
function toastDeactivate(element:Element){const el=element as HTMLElement,rect=el.getBoundingClientRect(),parent=el.parentElement?.getBoundingClientRect();toastStyles.set(el,{position:el.style.position,top:el.style.top,left:el.style.left,width:el.style.width});el.inert=true;el.style.pointerEvents='none';if(parent)Object.assign(el.style,{position:'absolute',left:(rect.left-parent.left)+'px',top:(rect.top-parent.top)+'px',width:rect.width+'px'})}
function toastLeave(element:Element,done:()=>void){animatePresence(element as HTMLElement,'leave',done,{preset:'snappy',distance:6,scale:1,duration:'fast'})}
function toastCancel(element:Element){cancelMotion(element as HTMLElement);toastRestore(element)}
onBeforeUpdate(()=>{toastRects=captureRects(toastElements())})
onUpdated(()=>{animateReorder(toastRects,toastElements().filter(el=>!hasActiveMotion(el)))})
onBeforeUnmount(()=>{feedbackMounted=false; notificationFocusEpoch++; if(copyTimer!==undefined)globalThis.clearTimeout(copyTimer); copyTimer=undefined; for(const el of toastElements())cancelMotion(el); disposeFeedbackNotifications(); toastRects.clear()})
</script>
<style scoped>
.feedback-banner{position:fixed;top:calc(var(--ui-titlebar-height) + var(--space-2));left:50%;transform:translateX(-50%);z-index:2250;width:min(80ch,calc(100vw - var(--ui-space-xl)));display:flex;gap:var(--space-2);align-items:center;padding:var(--space-2) var(--space-2) var(--space-2) var(--space-4);border:var(--ui-border-width) solid color-mix(in srgb,var(--warning) 45%,transparent);border-radius:var(--radius-floating);background:var(--surface-popover);box-shadow:var(--shadow-md)}
.feedback-banner>span{flex:1;min-width:0;overflow-wrap:anywhere}
.toast-stack{position:fixed;right:var(--space-3);bottom:calc(var(--ui-statusbar-height) + var(--space-3));z-index:2200;width:min(40ch,calc(100vw - var(--ui-space-xl)));display:grid;justify-items:end;gap:var(--space-1);pointer-events:none}
.toast-items{display:grid;gap:var(--space-1);justify-items:end;width:100%}
/* Toasts are small floating capsules: a status dot, the message, and quiet actions. */
.toast-stack article{position:relative;display:flex;align-items:center;gap:var(--space-2);max-width:100%;min-height:calc(var(--ui-control-height) + var(--space-2));padding:var(--space-1) var(--space-1) var(--space-1) var(--space-3);border:var(--ui-border-width) solid var(--border-subtle);border-radius:var(--radius-floating);background:var(--surface-popover);box-shadow:var(--shadow-md),var(--hairline-highlight);pointer-events:auto}
.toast-stack article::before{content:'';flex:none;inline-size:8px;block-size:8px;border-radius:50%;background:var(--accent)}
.toast-stack article.success::before{background:var(--success)}
.toast-stack article.warning::before{background:var(--warning)}
.toast-stack article.error::before{background:var(--danger)}
.toast-stack span{min-width:0;flex:1;overflow-wrap:anywhere;font-size:var(--type-body)}
.toast-stack article>button:not(.ui-icon-button){color:var(--accent);font-weight:var(--weight-medium)}
.toast-stack article .ui-icon-button{width:calc(var(--ui-control-height) - 4px);height:calc(var(--ui-control-height) - 4px);min-height:0;color:var(--text-muted)}
.toast-stack .notification-summary{pointer-events:auto;min-height:calc(var(--ui-control-height) - 4px);padding:0 var(--space-3);border:var(--ui-border-width) solid var(--border-subtle);border-radius:var(--radius-pill);background:var(--surface-popover);box-shadow:var(--shadow-sm);font-size:var(--type-dense);color:var(--text-secondary)}
.status-center{position:fixed;right:var(--space-3);bottom:calc(var(--ui-statusbar-height) + var(--space-2));z-index:2100;width:min(60ch,calc(100vw - var(--ui-space-xl)));max-height:calc(100vh - 3 * var(--ui-titlebar-height));display:flex;flex-direction:column;border:var(--ui-border-width) solid var(--border-subtle);border-radius:var(--radius-dialog);background:var(--surface-popover);box-shadow:var(--shadow-lg),var(--hairline-highlight);overflow:hidden}
.status-center>header{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);padding:var(--space-2) var(--space-2) var(--space-2) var(--space-4);border-bottom:var(--ui-border-width) solid var(--border-separator)}
.status-center>header>div{display:grid}
.status-center small{color:var(--text-muted);font-size:var(--type-caption)}
.task-list{min-height:0;overflow:auto;padding:var(--space-1) var(--space-4)}
.task-list>article{display:grid;grid-template-columns:minmax(0,1fr) minmax(8ch,25%) auto;gap:var(--space-2);align-items:center;padding-block:var(--space-2);border-bottom:var(--ui-border-width) solid var(--border-separator)}
.task-list>article:last-of-type{border-bottom:0}
.task-list>article>div:first-child{min-width:0;display:grid}
.task-list>article.failed strong{color:var(--danger)}
.task-list small{overflow-wrap:anywhere}
.task-list progress{width:100%;height:4px;appearance:none;border:0;border-radius:var(--radius-pill);background:var(--surface-3);overflow:hidden}
.task-list progress::-webkit-progress-bar{background:var(--surface-3);border-radius:var(--radius-pill)}
.task-list progress::-webkit-progress-value{background:var(--accent-fill);border-radius:var(--radius-pill)}
.task-list code,.task-list details{grid-column:1/-1;overflow-wrap:anywhere;font-size:var(--type-caption)}
.task-list>p{text-align:center;color:var(--text-muted);padding:var(--space-5)}
.task-list details pre{max-height:180px;overflow:auto;padding:var(--space-3);border-radius:var(--radius-sm);background:var(--input-bg);white-space:pre-wrap}
.task-list details nav,.status-center>footer{display:flex;gap:var(--space-1);flex-wrap:wrap}
.status-center>footer{padding:var(--space-2) var(--space-3);justify-content:flex-end;border-top:var(--ui-border-width) solid var(--border-separator)}
.spinner{width:14px;height:14px;border:2px solid var(--border-strong);border-top-color:var(--accent);border-radius:50%;animation:spin .9s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.spinner{animation:none}}
.notification-center{z-index:2220}
.notification-list{min-height:0;overflow:auto;padding:var(--space-3);display:grid;gap:var(--space-1)}
.notification-list h3,.notification-list p{margin:var(--space-1) 0 0;font-size:var(--type-caption);font-weight:var(--weight-medium);color:var(--text-muted)}
.notification-list article{display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-1) var(--space-2) var(--space-3);border-radius:var(--radius-md);background:var(--surface-2);overflow-wrap:anywhere}
.notification-list article::before{content:'';flex:none;inline-size:7px;block-size:7px;border-radius:50%;background:var(--accent)}
.notification-list article.success::before{background:var(--success)}
.notification-list article.error::before{background:var(--danger)}
.notification-list article.warning::before{background:var(--warning)}
.notification-list article>span{flex:1;min-width:0}
.notification-repeat{white-space:nowrap;font-size:inherit;color:var(--text-muted)}
.notification-list .notification-history{opacity:.8}
</style>

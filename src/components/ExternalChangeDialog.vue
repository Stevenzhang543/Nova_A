<!-- 项目外部变更对话框：展示磁盘与编辑器差异，允许选择保留版本或重新载入。 -->
<template>
  <Teleport to="body"><UiDialog v-if="state.visible" :title="t('externalChanges')" @close="keepEditorProjectVersion"><p>{{ state.fileName }} · {{ t(state.kind==='branch-switch'?'externalKind_branchSwitch':state.kind==='large-update'?'externalKind_largeUpdate':'externalKind_external') }}</p><p class="notice">{{ t('externalChangeChoice') }}</p><div class="summary"><span>{{ state.changes.length }} {{ t('diskChanges') }}</span><span>{{ state.conflicts.length }} {{ t('editorDifferences') }}</span><code>{{ state.incomingChecksum }}</code></div><details open><summary>{{ t('compare') }}</summary><ol><li v-for="change in compared.slice(0,100)" :key="`${change.kind}:${change.uuid}`"><b>{{ change.kind }}</b><span>{{ change.resourceType }}</span><code>{{ change.path }}</code></li></ol></details><footer><button @click="keepEditorProjectVersion">{{ t('keepEditor') }}</button><button @click="compare">{{ t('compare') }}</button><button class="disk" @click="keepDisk">{{ t('keepDisk') }}</button><button class="primary" @click="reload">{{ t('reload') }}</button></footer></UiDialog></Teleport>
</template>
<script setup lang="ts">
import UiDialog from '../ui/components/UiDialog.vue'
import { ref } from 'vue'
import { t } from '../i18n'
import { compareExternalProject, externalChangeState as state, keepDiskProjectVersion, keepEditorProjectVersion, reloadExternalProject } from '../runtime/projectExternalChanges'
import type { SemanticProjectChange } from '../projects/projectData'
import { notify } from '../runtime/editorFeedback'
const compared=ref<SemanticProjectChange[]>([])
/** 计算当前项目外部差异并更新对比列表。 */ function compare(){compared.value=compareExternalProject()}
/** 采用磁盘版本；操作失败时显示本地化错误通知。 */ function keepDisk(){if(!keepDiskProjectVersion())notify(t('externalReloadFailed'),'error')}
/** 重新载入外部项目；操作失败时显示本地化错误通知。 */ function reload(){if(!reloadExternalProject())notify(t('externalReloadFailed'),'error')}
</script>
<style scoped>.notice{color:var(--text-muted)}.summary{display:flex;gap:var(--ui-space-sm);flex-wrap:wrap;padding-block:var(--ui-space-sm);border-bottom:1px solid var(--border-subtle)}.summary code{flex-basis:100%;overflow-wrap:anywhere}li{display:grid;grid-template-columns:10ch 10ch minmax(0,1fr);gap:var(--ui-space-xs);padding-block:var(--ui-space-xs)}li code{overflow-wrap:anywhere}footer{display:flex;gap:var(--ui-space-xs);flex-wrap:wrap;justify-content:flex-end;padding-top:var(--ui-space-sm)}.disk{color:var(--warning)}</style>

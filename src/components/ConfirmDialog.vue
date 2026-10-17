<!-- 确认对话框：呈现共享确认请求，管理默认取消焦点、退出键和确认结果。 -->
<template>
  <Teleport to="body"><UiMotionTransition modal><UiDialog motion-owner="parent" role="alertdialog" v-if="state.visible" :title="state.title" class="confirm-dialog" dismiss-on-backdrop @close="finish(false)">
    <div class="confirm-copy"><EditorIcon :name="state.destructive ? 'warning' : 'help'" /><p>{{ state.message }}</p></div>
    <template #footer><button ref="cancelButton" @click="finish(false)">{{ state.cancelLabel }}</button><UiButton :variant="state.destructive ? 'danger' : 'primary'" @click="finish(true)">{{ state.confirmLabel }}</UiButton></template>
  </UiDialog></UiMotionTransition></Teleport>
</template>

<script setup lang="ts">
import UiMotionTransition from '../ui/components/UiMotionTransition.vue'

import UiDialog from '../ui/components/UiDialog.vue'
import UiButton from '../ui/components/UiButton.vue'
import EditorIcon from './EditorIcon.vue'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { confirmDialogState as state, resolveConfirmation } from '../store/dialog'

const cancelButton = ref<HTMLButtonElement | null>(null)

/** 把确认或取消结果交回共享确认请求的等待方。 */ function finish(confirmed: boolean) { resolveConfirmation(confirmed) }
/** 对话框打开时拦截 Escape，并按取消结束当前请求。 */ function onKeyDown(event: KeyboardEvent) {
  if (!state.visible) return
  if (event.key === 'Escape') { event.preventDefault(); finish(false) }
}

watch(/* 返回 state.visible 的当前值。 */ () => state.visible, /** 对话框显示后等待 DOM 更新，再将焦点放在取消按钮。 */ visible => {
  if (visible) void nextTick(/** 取消按钮仍存在时为其设置键盘焦点。 */ () => cancelButton.value?.focus())
})

window.addEventListener('keydown', onKeyDown)
onBeforeUnmount(/** 卸载时移除本组件注册的全局按键监听。 */ () => window.removeEventListener('keydown', onKeyDown))
</script>

<style scoped>.confirm-copy{display:flex;align-items:flex-start;gap:var(--ui-space-sm)}.confirm-copy p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.confirm-dialog :deep(.ui-dialog){width:min(48ch,calc(100vw - var(--ui-space-xl)))}</style>

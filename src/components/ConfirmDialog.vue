<!-- 确认对话框：呈现共享确认请求，管理默认取消焦点、退出键和确认结果。 -->
<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div v-if="state.visible" class="confirm-scrim" @mousedown.self="finish(false)">
        <section class="confirm-card" role="alertdialog" aria-modal="true" v-modal-focus :aria-labelledby="titleId" :aria-describedby="messageId">
          <span class="confirm-icon" :class="{ destructive: state.destructive }" aria-hidden="true">!</span>
          <div class="confirm-copy">
            <h2 :id="titleId">{{ state.title }}</h2>
            <p :id="messageId">{{ state.message }}</p>
          </div>
          <div class="confirm-actions">
            <button ref="cancelButton" class="secondary" @click="finish(false)">{{ state.cancelLabel }}</button>
            <button :class="state.destructive ? 'danger' : 'primary'" @click="finish(true)">{{ state.confirmLabel }}</button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { vModalFocus } from '../editor/modalFocus'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { confirmDialogState as state, resolveConfirmation } from '../store/dialog'

const cancelButton = ref<HTMLButtonElement | null>(null)
const titleId = 'nova-confirm-title'
const messageId = 'nova-confirm-message'

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

<style scoped>
.confirm-scrim { position: fixed; inset: 0; z-index: 4000; display: grid; place-items: center; padding: 22px; background: var(--scrim); backdrop-filter: blur(9px); }
.confirm-card { width: min(430px, 100%); padding: 22px; display: grid; grid-template-columns: 42px 1fr; gap: 14px; border: 1px solid var(--border-strong); border-radius: 18px; color: var(--text-primary); background: var(--surface-2); box-shadow: var(--shadow-lg); }
.confirm-icon { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; color: var(--accent); background: var(--accent-soft); font-size: 19px; font-weight: 760; }
.confirm-icon.destructive { color: var(--danger); background: var(--danger-soft); }
.confirm-copy h2 { margin: 1px 0 7px; font-size: 16px; font-weight: 680; letter-spacing: -.015em; }
.confirm-copy p { margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.55; }
.confirm-actions { grid-column: 1 / -1; margin-top: 7px; display: flex; justify-content: flex-end; gap: 8px; }
.confirm-actions button { min-width: 100px; min-height: 36px; padding: 0 14px; border: 1px solid var(--border-subtle); border-radius: 9px; color: var(--text-secondary); background: var(--surface-3); font-size: 11px; }
.confirm-actions button.primary { color: var(--accent-contrast); border-color: var(--accent); background: var(--accent); }
.confirm-actions button.danger { color: white; border-color: var(--danger); background: var(--danger); }
.confirm-enter-active, .confirm-leave-active { transition: opacity 150ms ease; }.confirm-enter-active .confirm-card, .confirm-leave-active .confirm-card { transition: transform 180ms cubic-bezier(.2,.8,.2,1), opacity 150ms ease; }
.confirm-enter-from, .confirm-leave-to { opacity: 0; }.confirm-enter-from .confirm-card, .confirm-leave-to .confirm-card { opacity: 0; transform: translateY(8px) scale(.98); }
</style>

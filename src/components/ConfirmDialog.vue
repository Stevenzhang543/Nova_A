<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div v-if="state.visible" class="confirm-scrim" @mousedown.self="finish(false)">
        <section class="confirm-card" role="alertdialog" aria-modal="true" :aria-labelledby="titleId" :aria-describedby="messageId">
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
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { confirmDialogState as state, resolveConfirmation } from '../store/dialog'

const cancelButton = ref<HTMLButtonElement | null>(null)
const titleId = 'nova-confirm-title'
const messageId = 'nova-confirm-message'

function finish(confirmed: boolean) { resolveConfirmation(confirmed) }
function onKeyDown(event: KeyboardEvent) {
  if (!state.visible) return
  if (event.key === 'Escape') { event.preventDefault(); finish(false) }
}

watch(() => state.visible, visible => {
  if (visible) void nextTick(() => cancelButton.value?.focus())
})

window.addEventListener('keydown', onKeyDown)
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))
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

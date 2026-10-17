<!-- 内置手册查看器：在模态窗口中加载本地手册，支持章节定位与重新加载。 -->
<template>
  <Teleport to="body">
    <section v-if="state.visible" class="manual-viewer" role="dialog" aria-modal="true" v-modal-focus :aria-label="t('manual')" @keydown.esc="closeBundledManual">
      <header><div><strong>{{ t('manual') }}</strong><span>{{ t('bundledManual') }}</span></div><nav><UiButton icon="refresh" :label="t('reload')" @click="reloadBundledManual" /><UiButton icon="close" :label="t('close')" @click="closeBundledManual" /></nav></header>
      <iframe :key="state.reloadToken" :src="manualSource" :title="t('manual')" @load="loaded = true"></iframe>
      <div v-if="!loaded" class="manual-loading">{{ t('loadingManual') }}</div>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import UiButton from '../ui/components/UiButton.vue'
import { vModalFocus } from '../editor/modalFocus'
import { computed, ref, watch } from 'vue'
import { t } from '../i18n'
import { closeBundledManual, manualViewerState as state, reloadBundledManual } from '../runtime/openManual'

const loaded = ref(false)
const manualSource = computed(/** 根据可选章节标识生成本地手册页面地址与锚点。 */ () => `./manual/index.html${state.section ? `#${state.section}` : ''}`)
watch(/* 返回 state.reloadToken 的当前值。 */ () => state.reloadToken, /** 重新加载标识变化时恢复加载提示，等待嵌入页面完成加载。 */ () => { loaded.value = false })
</script>

<style scoped>.manual-viewer{position:fixed;inset:var(--ui-space-sm);z-index:5000;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border-strong);border-radius:var(--radius-dialog);background:var(--surface-1);box-shadow:var(--shadow-lg)}.manual-viewer>header{display:flex;align-items:center;justify-content:space-between;gap:var(--ui-space-sm);padding:var(--ui-space-xs) var(--ui-space-sm);border-bottom:1px solid var(--border-subtle);flex:none}.manual-viewer>header>div{display:flex;align-items:baseline;gap:var(--ui-space-sm)}.manual-viewer span{font-size:var(--type-caption);color:var(--text-muted)}.manual-viewer nav{display:flex;gap:var(--ui-space-xs)}iframe{display:block;width:100%;flex:1;min-height:0;border:0;background:var(--surface-1)}.manual-loading{position:absolute;inset:var(--ui-control-height) 0 0;display:grid;place-items:center;background:var(--surface-1);color:var(--text-muted)}</style>

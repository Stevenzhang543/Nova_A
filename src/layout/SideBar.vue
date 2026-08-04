<template>
  <aside class="sidebar">
    <div class="nav-group">
      <button :class="{ active: state.currentPage === 'scene' }" @click="switchPage('scene')" :title="t('scene')"><img :src="sceneIcon" :alt="t('scene')"><span>{{ t('scene') }}</span></button>
      <button :class="{ active: state.currentPage === 'render' }" @click="switchPage('render')" :title="t('render')"><img :src="renderIcon" :alt="t('render')"><span>{{ t('render') }}</span></button>
    </div>
    <div class="nav-group">
      <button :class="{ active: state.currentPage === 'settings' }" @click="switchPage('settings')" :title="t('settings')"><img :src="settingsIcon" :alt="t('settings')"><span>{{ t('settings') }}</span></button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { t } from '../i18n'
import { closeContextMenu, editorState as state } from '../store/editor'
import { enterEditMode, resetSimulation } from '../store/physics'
import sceneIcon from '../assets/icons/scene.svg'
import renderIcon from '../assets/icons/render.svg'
import settingsIcon from '../assets/icons/settings.svg'

function switchPage(page: 'scene' | 'render' | 'settings') {
  closeContextMenu()
  enterEditMode(null)
  if (state.currentPage === 'render' && page !== 'render') resetSimulation()
  state.currentPage = page
  state.statusText = t('switchedPage', { page: t(page) })
}
</script>

<style scoped>
.sidebar { width: 68px; flex: 0 0 68px; padding: 10px 8px; display: flex; flex-direction: column; justify-content: space-between; border-right: 1px solid var(--border-subtle); background: var(--surface-1); backdrop-filter: var(--glass-blur); z-index: 160; }
.nav-group { display: flex; flex-direction: column; gap: 6px; }
button { height: 50px; padding: 6px 3px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border: 1px solid transparent; border-radius: 12px; background: transparent; color: var(--text-muted); }
button img { width: 18px; height: 18px; opacity: .72; filter: var(--icon-filter); transition: opacity 160ms ease, transform 180ms cubic-bezier(.2,.8,.2,1); }
button span { font-size: 9px; letter-spacing: .01em; }
button:hover { color: var(--text-primary); background: var(--surface-hover); }
button:hover img { opacity: 1; transform: translateY(-1px); }
button.active { color: var(--accent); background: var(--accent-soft); border-color: color-mix(in srgb, var(--accent) 24%, transparent); }
button.active img { opacity: 1; filter: var(--icon-filter) drop-shadow(0 0 7px var(--accent)); }
</style>

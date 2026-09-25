<!-- 横屏保护层：旋转时保留编辑器实例和未保存字段，提示传送到页面根部。 -->
<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref } from 'vue'
import { preferencesState } from '../store/preferences'
import { mobileViewport } from '../runtime/mobileViewport'
const portrait = ref(false)
const prompt = ref<HTMLElement | null>(null)
const message = computed(/** 根据当前语言显示方向和联网提示。 */ () => ({
 en: ['Rotate your device', 'Nova_A edits in landscape. Your project, open panels and unsaved fields remain here.', 'iPhone home screen: open this HTTPS site in Safari, then Share → Add to Home Screen. Internet access is required to launch and load tools. Save before reloading for an update.'],
 de: ['Gerät drehen', 'Nova_A wird im Querformat bearbeitet. Projekt, Fenster und ungespeicherte Felder bleiben erhalten.', 'iPhone: HTTPS-Seite in Safari öffnen, dann Teilen → Zum Home-Bildschirm. Start und Werkzeuge benötigen Internet. Vor einem Update-Neuladen speichern.'],
 zh: ['请旋转设备', 'Nova_A 编辑器使用横屏。项目、面板和未保存字段均会保留。', 'iPhone 主屏幕：在 Safari 打开本 HTTPS 网站，选择“分享 → 添加到主屏幕”。启动及加载工具需要联网；更新前请先保存项目再刷新。'],
}[preferencesState.locale]))
let previousFocus: HTMLElement | null = null
let frame = 0
let coarse: MediaQueryList | undefined
/** 更新可视区域和交互保护，不重建任何编辑组件。 */
function synchronize() {
 frame = 0
 const viewport = window.visualViewport
 const touch = Boolean(coarse?.matches) && !('__TAURI_INTERNALS__' in window)
 const state = mobileViewport({ touch, orientation: screen.orientation?.type, width: innerWidth, height: innerHeight, visualWidth: viewport?.width, visualHeight: viewport?.height, offsetTop: viewport?.offsetTop, offsetLeft: viewport?.offsetLeft })
 const root = document.documentElement
 root.dataset.mobileEditor = String(touch)
 for (const key of ['width','height','top','left'] as const) root.style.setProperty(`--mobile-${key}`, `${state[key]}px`)
 if (state.portrait !== portrait.value) {
  if (state.portrait) previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  document.getElementById('app')?.toggleAttribute('inert', state.portrait)
  portrait.value = state.portrait
  if (state.portrait) void nextTick(/** 让键盘和屏幕阅读器进入旋转提示。 */ () => prompt.value?.focus({ preventScroll: true }))
  if (!state.portrait && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
 }
}
/** 每帧合并一次键盘、旋转和缩放布局更新。 */
function schedule() { if (!frame) frame = requestAnimationFrame(synchronize) }
onMounted(/** 安装方向和可视视口监听，不依赖方向锁。 */ () => {
 coarse = matchMedia('(pointer: coarse)')
 coarse.addEventListener('change', schedule)
 window.addEventListener('resize', schedule)
 screen.orientation?.addEventListener('change', schedule)
 window.visualViewport?.addEventListener('resize', schedule)
 window.visualViewport?.addEventListener('scroll', schedule)
 synchronize()
})
onBeforeUnmount(/** 释放监听和保护状态，播放器不继承横屏限制。 */ () => {
 cancelAnimationFrame(frame)
 coarse?.removeEventListener('change', schedule)
 window.removeEventListener('resize', schedule)
 screen.orientation?.removeEventListener('change', schedule)
 window.visualViewport?.removeEventListener('resize', schedule)
 window.visualViewport?.removeEventListener('scroll', schedule)
 document.getElementById('app')?.removeAttribute('inert')
 delete document.documentElement.dataset.mobileEditor
})
</script>
<template><Teleport to="body"><section v-if="portrait" ref="prompt" class="mobile-rotate" role="alertdialog" aria-modal="true" aria-labelledby="mobile-rotate-title" tabindex="-1" @keydown.tab.prevent data-testid="mobile-rotate"><h1 id="mobile-rotate-title">{{ message[0] }}</h1><p>{{ message[1] }}</p><p>{{ message[2] }}</p></section></Teleport></template>
<style>
.mobile-rotate{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:16px;padding:max(24px,env(safe-area-inset-top)) max(24px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(24px,env(safe-area-inset-left));background:var(--bg-base,#101116);color:var(--text-primary,#fff);text-align:center;overflow:auto}.mobile-rotate h1{font-size:24px}.mobile-rotate p{max-width:38em;line-height:1.6}
:root[data-mobile-editor='true'] .editor-root{inset:auto;top:var(--mobile-top,0px);left:var(--mobile-left,0px);width:var(--mobile-width,100vw);height:var(--mobile-height,100dvh);padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);box-sizing:border-box}
@media(pointer:coarse){:root[data-mobile-editor='true'] button,:root[data-mobile-editor='true'] select,:root[data-mobile-editor='true'] input:not([type='checkbox']):not([type='radio']){min-height:44px}:root[data-mobile-editor='true'] input,:root[data-mobile-editor='true'] textarea,:root[data-mobile-editor='true'] select{font-size:max(16px,1em)}:root[data-mobile-editor='true'] .workspace-control-row{flex-basis:52px}}
</style>


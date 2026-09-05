<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Entity } from '../world/Entity'
import type { UiDevicePreset } from '../runtime/uiProduction'
import type { UiThemeDocument } from '../runtime/uiTheme'
import { GameUiRuntime } from '../runtime/gameUi'
import { assetState } from '../assets/AssetDatabase'
import { localizationSettings } from '../runtime/localization'
import { runtimeAccessibilitySettings } from '../runtime/presentation'
import { interfaceCopy } from '../editor/interfaceCopy'
const props = defineProps<{ entities: Entity[]; preset: UiDevicePreset; dpi: number; safeArea: boolean; rtl: boolean; themeReference?: string; themeDraft?: UiThemeDocument | null }>()
const canvas = ref<HTMLCanvasElement | null>(null), failure = ref(''), runtime = new GameUiRuntime(), hasControls = computed(() => props.entities.some(entity => entity.hasComponent('RectTransform')))
let frame = 0, dirty = true, lastDraw = -Infinity
watch(() => [props.entities, props.preset, props.dpi, props.safeArea, props.rtl, props.themeReference, props.themeDraft, assetState.generation, localizationSettings, runtimeAccessibilitySettings], () => { dirty = true }, { deep: true })
function draw(now: number) {
  if (dirty && now - lastDraw >= 50 && canvas.value) {
    dirty = false; lastDraw = now
    const scale = Math.min(1, Math.sqrt(4_000_000 / Math.max(1, props.preset.width * props.preset.height)))
    canvas.value.width = Math.max(1, Math.round(props.preset.width * scale)); canvas.value.height = Math.max(1, Math.round(props.preset.height * scale))
    const context = canvas.value.getContext('2d')
    if (context) try { context.setTransform(scale, 0, 0, scale, 0, 0); context.clearRect(0, 0, props.preset.width, props.preset.height); runtime.render(context, props.preset.width, props.preset.height, props.entities, { editor: true, preview: true, layout: { dpiScale: props.dpi, safeArea: props.safeArea ? props.preset.safeArea : { left: 0, right: 0, top: 0, bottom: 0 }, direction: props.rtl ? 'rtl' : 'ltr', localeDirection: () => props.rtl ? 'rtl' : 'ltr' }, themeOverride: props.themeReference && props.themeDraft ? { reference: props.themeReference, theme: props.themeDraft } : undefined }); failure.value = runtime.layoutIssues.map(issue => issue.message).join(' ') } catch (error) { failure.value = error instanceof Error ? error.message : String(error) }
  }
  frame = requestAnimationFrame(draw)
}
onMounted(() => { frame = requestAnimationFrame(draw) })
onBeforeUnmount(() => { cancelAnimationFrame(frame); runtime.reset() })
</script>
<template>
  <figure class="ui-scene-preview">
    <figcaption>{{ interfaceCopy('preview') }}</figcaption>
    <canvas ref="canvas" :style="{ aspectRatio: `${preset.width}/${preset.height}` }" role="img" :aria-label="interfaceCopy('preview')" />
    <p v-if="!hasControls">{{ interfaceCopy('previewEmpty') }}</p>
    <p v-if="failure" role="alert">{{ failure }}</p>
    <small>{{ interfaceCopy('previewLimited') }}</small>
  </figure>
</template>
<style scoped>
.ui-scene-preview{margin:10px 0;min-width:0}.ui-scene-preview figcaption{font-size:12px;font-weight:650;margin-bottom:6px}.ui-scene-preview canvas{display:block;width:100%;max-height:380px;object-fit:contain;background:#151b24;border:1px solid var(--border-subtle);border-radius:9px}.ui-scene-preview p,.ui-scene-preview small{display:block;overflow-wrap:anywhere;line-height:1.45;color:var(--text-muted);margin-top:6px}.ui-scene-preview [role=alert]{color:var(--danger)}
</style>

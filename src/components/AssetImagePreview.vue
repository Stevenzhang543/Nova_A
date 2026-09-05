<template>
  <span ref="host" class="image-preview" role="img" :aria-label="`${copy('preview')}: ${asset.name}${problem ? '. ' + problem : ''}`" :title="problem || asset.name">
    <canvas ref="canvas" aria-hidden="true"></canvas>
    <span v-if="!ready" class="preview-placeholder" aria-hidden="true">{{ problem ? '!' : '…' }}</span>
    <span v-if="showError && problem" class="preview-problem">{{ problem }}</span>
  </span>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { assetState, assetTextureDiagnostic, resolveTexture } from '../assets/AssetDatabase'
import { assetWorkflowCopy as copy, textureProblemCopy } from '../assets/assetWorkflowCopy'
import type { AssetRecord } from '../assets/types'
const props = defineProps<{ asset: AssetRecord; showError?: boolean }>()
const host = ref<HTMLElement | null>(null), canvas = ref<HTMLCanvasElement | null>(null), ready = ref(false), diagnostic = ref('')
const problem = computed(() => textureProblemCopy(diagnostic.value))
let observer: ResizeObserver | null = null, pending = 0, deadline = 0, disposed = false
function schedule() { if (!disposed && !pending) pending = requestAnimationFrame(paint) }
function reset() { deadline = performance.now() + 5000; schedule() }
function paint() {
  pending = 0
  const element = host.value, output = canvas.value
  if (!element || !output || disposed) return
  const bounds = element.getBoundingClientRect()
  if (bounds.width < 1 || bounds.height < 1) return
  const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1))
  output.width = Math.max(1, Math.min(1024, Math.round(bounds.width * ratio)))
  output.height = Math.max(1, Math.min(768, Math.round(bounds.height * ratio)))
  const context = output.getContext('2d'); if (!context) { diagnostic.value = 'PREVIEW_CANVAS'; return }
  context.clearRect(0, 0, output.width, output.height)
  ready.value = false
  try {
    const texture = resolveTexture('asset://' + props.asset.uuid)
    diagnostic.value = assetTextureDiagnostic(props.asset.uuid)
    if (!texture) { if (!diagnostic.value && performance.now() < deadline) schedule(); else if (!diagnostic.value) diagnostic.value = 'PREVIEW_TIMEOUT'; return }
    const source = texture.source as HTMLImageElement | HTMLCanvasElement | ImageBitmap
    const sourceWidth = 'naturalWidth' in source ? source.naturalWidth : source.width, sourceHeight = 'naturalHeight' in source ? source.naturalHeight : source.height
    const sw = sourceWidth * texture.uv.width, sh = sourceHeight * texture.uv.height
    if (!sw || !sh) return
    const fit = Math.min(output.width / sw, output.height / sh), width = sw * fit, height = sh * fit
    context.imageSmoothingEnabled = props.asset.settings.filterMode !== 'Nearest'
    context.drawImage(source, texture.uv.x * sourceWidth, texture.uv.y * sourceHeight, sw, sh, (output.width - width) / 2, (output.height - height) / 2, width, height)
    ready.value = true
  } catch (error) { diagnostic.value = error instanceof Error ? error.message : String(error) }
}
watch(() => [props.asset.uuid, props.asset.source, props.asset.pipeline?.artifactHash, props.asset.settings.filterMode, JSON.stringify(props.asset.settings.spriteRegion), JSON.stringify(props.asset.derivedSprite), assetState.generation], reset, { flush: 'post' })
onMounted(() => { observer = new ResizeObserver(reset); if (host.value) observer.observe(host.value); reset() })
onBeforeUnmount(() => { disposed = true; observer?.disconnect(); if (pending) cancelAnimationFrame(pending); pending = 0 })
</script>
<style scoped>
.image-preview{position:relative;display:block;min-width:0;overflow:hidden;background-color:var(--surface-3);background-image:conic-gradient(var(--surface-2) 25%,transparent 0 50%,var(--surface-2) 0 75%,transparent 0);background-size:16px 16px}.image-preview canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.preview-placeholder{position:absolute;inset:0;display:grid;place-items:center;color:var(--text-muted);pointer-events:none}.preview-problem{position:absolute;inset:auto 0 0;padding:5px;color:var(--text-primary);background:var(--surface-1);font-size:var(--type-caption);overflow-wrap:anywhere;max-height:100%;overflow:auto}
</style>
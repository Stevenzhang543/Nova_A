<!-- 资源图片预览：按容器尺寸绘制纹理或精灵区域，限制画布像素并管理加载重试和观察器。 -->
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
import { editorPerformancePreferences } from '../store/preferences'
const props = defineProps<{ asset: AssetRecord; showError?: boolean }>()
const host = ref<HTMLElement | null>(null), canvas = ref<HTMLCanvasElement | null>(null), ready = ref(false), diagnostic = ref('')
const problem = computed(/** 把纹理诊断编号转换为当前语言的问题说明。 */ () => textureProblemCopy(diagnostic.value))
let observer: ResizeObserver | null = null, pending = 0, retryTimer = 0, deadline = 0, disposed = false
/** 组件仍有效且没有待执行帧时安排一次预览绘制，避免重复排队。 */ function schedule() { if (!disposed && !pending) pending = requestAnimationFrame(paint) }
/** 将纹理等待期限延后五秒，并请求绘制当前预览。 */ function reset() { if (retryTimer) window.clearTimeout(retryTimer); retryTimer = 0; deadline = performance.now() + 5000; schedule() }
/** 纹理尚未就绪时按编辑器预算延迟重试，避免每一帧都重新分配画布。 */
function retry() { if (!disposed && !retryTimer) retryTimer = window.setTimeout(/** 计时器结算后仅安排一帧，卸载状态仍由调度器验证。 */ () => { retryTimer = 0; schedule() }, editorPerformancePreferences.value.previewRetryMs) }
/** 根据可见容器和受限像素比调整画布，按纹理区域等比居中绘制；加载期间有界重试，失败记录诊断。 */ function paint() {
  pending = 0
  const element = host.value, output = canvas.value
  if (!element || !output || disposed) return
  const bounds = element.getBoundingClientRect()
  if (bounds.width < 1 || bounds.height < 1) return
  const policy = editorPerformancePreferences.value
  const ratio = Math.min(policy.previewPixelRatio, Math.max(1, window.devicePixelRatio || 1))
  const widthLimit = Math.max(1, Math.min(policy.previewMaxDimension, Math.round(bounds.width * ratio)))
  const heightLimit = Math.max(1, Math.min(policy.previewMaxHeight, Math.round(bounds.height * ratio)))
  if (output.width !== widthLimit) output.width = widthLimit
  if (output.height !== heightLimit) output.height = heightLimit
  const context = output.getContext('2d'); if (!context) { diagnostic.value = 'PREVIEW_CANVAS'; return }
  context.clearRect(0, 0, output.width, output.height)
  ready.value = false
  try {
    const texture = resolveTexture('asset://' + props.asset.uuid)
    diagnostic.value = assetTextureDiagnostic(props.asset.uuid)
    if (!texture) { if (!diagnostic.value && performance.now() < deadline) retry(); else if (!diagnostic.value) diagnostic.value = 'PREVIEW_TIMEOUT'; return }
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
watch(/** 监听资源身份、源内容、构建产物、滤镜、精灵区域和资源库代次，相关变化后重新加载预览。 */ () => [props.asset.uuid, props.asset.source, props.asset.pipeline?.artifactHash, props.asset.settings.filterMode, JSON.stringify(props.asset.settings.spriteRegion), JSON.stringify(props.asset.derivedSprite), assetState.generation], reset, { flush: 'post' })
watch(editorPerformancePreferences, reset, { flush: 'post' })
onMounted(/** 挂载时观察预览容器尺寸，并启动首次绘制。 */ () => { observer = new ResizeObserver(reset); if (host.value) observer.observe(host.value); reset() })
onBeforeUnmount(/** 卸载时标记失效、解除尺寸观察并取消待执行绘制帧。 */ () => { disposed = true; observer?.disconnect(); if (pending) cancelAnimationFrame(pending); pending = 0; if (retryTimer) window.clearTimeout(retryTimer); retryTimer = 0; if (canvas.value) { canvas.value.width = 0; canvas.value.height = 0 } })
</script>
<style scoped>
.image-preview{position:relative;display:block;min-width:0;overflow:hidden;background-color:var(--surface-3);background-image:conic-gradient(var(--surface-2) 25%,transparent 0 50%,var(--surface-2) 0 75%,transparent 0);background-size:16px 16px}.image-preview canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.preview-placeholder{position:absolute;inset:0;display:grid;place-items:center;color:var(--text-muted);pointer-events:none}.preview-problem{position:absolute;inset:auto 0 0;padding:5px;color:var(--text-primary);background:var(--surface-1);font-size:var(--type-caption);overflow-wrap:anywhere;max-height:100%;overflow:auto}
</style>
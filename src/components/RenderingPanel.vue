<template>
  <div class="rendering-panel">
    <aside class="render-settings">
      <header><strong>{{ t('renderingStudio') }}</strong><small>{{ t('renderingStudioHint') }}</small></header>
      <label><span>{{ t('lightingEnabled') }}</span><input v-model="settings.lightingEnabled" type="checkbox"></label>
      <label><span>{{ t('ambientIntensity') }}</span><input v-model.number="settings.ambientIntensity" type="range" min="0" max="2" step="0.05"></label>
      <label><span>{{ t('ambientColor') }}</span><input type="color" :value="hex(settings.ambientColor)" @input="setColor(settings.ambientColor, $event)"></label>
      <label><span>{{ t('shadowQuality') }}</span><select v-model="settings.shadowQuality"><option>Off</option><option>Hard</option><option>Soft</option><option>Ultra</option></select></label>
      <label><span>{{ t('colorSpace') }}</span><select v-model="settings.colorSpace"><option>sRGB</option><option>Linear</option></select></label>
      <label><span>{{ t('debugView') }}</span><select v-model="settings.debugView"><option>None</option><option>Overdraw</option><option>Lighting</option><option>Normals</option></select></label>
      <label><span>{{ t('postProcessing') }}</span><input v-model="settings.postProcessing.enabled" type="checkbox"></label>
      <template v-if="settings.postProcessing.enabled">
        <label><span>{{ t('postMaterial') }}</span><select v-model="settings.postProcessing.userMaterial"><option :value="null">{{ t('none') }}</option><option v-for="asset in materialAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
        <label><span>{{ t('exposure') }}</span><input v-model.number="settings.postProcessing.exposure" type="number" min="-8" max="8" step="0.1"></label>
        <label><span>{{ t('contrast') }}</span><input v-model.number="settings.postProcessing.contrast" type="number" min="0" max="4" step="0.05"></label>
        <label><span>{{ t('saturation') }}</span><input v-model.number="settings.postProcessing.saturation" type="number" min="0" max="4" step="0.05"></label>
        <label><span>{{ t('vignette') }}</span><input v-model.number="settings.postProcessing.vignette" type="range" min="0" max="1" step="0.05"></label>
        <label><span>{{ t('bloom') }}</span><input v-model.number="settings.postProcessing.bloom" type="range" min="0" max="2" step="0.05"></label>
        <label><span>{{ t('blur') }}</span><input v-model.number="settings.postProcessing.blur" type="range" min="0" max="16" step="0.25"></label>
      </template>
    </aside>

    <main class="material-editor">
      <div class="material-toolbar">
        <select v-model="selectedGuid"><option value="">{{ t('selectMaterial') }}</option><option v-for="asset in materialAssets" :key="asset.uuid" :value="asset.uuid">{{ asset.name }}</option></select>
        <button @click="createMaterial">+ {{ t('newMaterial') }}</button>
        <button :disabled="!selectedGuid || hasErrors" class="primary" @click="saveMaterial">{{ t('validateAndSave') }}</button>
      </div>
      <div class="material-grid">
        <section class="shader-source">
          <div class="material-properties">
            <label><span>{{ t('blendMode') }}</span><select v-model="material.blendMode"><option>Alpha</option><option>Additive</option><option>Multiply</option><option>Screen</option></select></label>
            <label><span>{{ t('filterMode') }}</span><select v-model="material.sampling"><option>Linear</option><option>Nearest</option></select></label>
            <label><span>{{ t('colorSpace') }}</span><select v-model="material.colorSpace"><option>sRGB</option><option>Linear</option></select></label>
            <label><span>{{ t('colorWrite') }}</span><input v-model="material.writeColor" type="checkbox"></label>
          </div>
          <textarea v-model="material.fragment" spellcheck="false" @input="schedulePreview"></textarea>
        </section>
        <aside class="shader-preview">
          <canvas ref="previewCanvas" width="420" height="240"></canvas>
          <div class="uniforms">
            <label>{{ t('uniformsJson') }}<textarea v-model="uniformsJson" rows="5" @change="applyUniforms"></textarea></label>
            <label>{{ t('texturesJson') }}<textarea v-model="texturesJson" rows="4" @change="applyTextures"></textarea></label>
          </div>
          <div class="diagnostics" :class="{ error: hasErrors }"><p v-if="!diagnostics.length">{{ t('shaderReady') }}</p><p v-for="item in diagnostics" :key="`${item.line}:${item.message}`">{{ item.severity.toUpperCase() }} · L{{ item.line }} · {{ item.message }}</p></div>
        </aside>
      </div>
    </main>

    <aside class="render-diagnostics">
      <header><strong>{{ t('renderDiagnostics') }}</strong><button @click="requestRenderCapture">{{ t('captureFrame') }}</button></header>
      <dl><template v-for="pass in graph.passes" :key="pass.name"><dt>{{ pass.name }}</dt><dd>{{ pass.enabled ? `${pass.durationMs.toFixed(2)} ms` : t('disabled') }}</dd></template></dl>
      <dl><dt>GPU</dt><dd>{{ stats.gpuMs === null ? 'n/a' : `${stats.gpuMs.toFixed(2)} ms` }}</dd><dt>{{ t('drawCalls') }}</dt><dd>{{ stats.drawCalls }}</dd><dt>{{ t('triangles') }}</dt><dd>{{ stats.triangles }}</dd><dt>{{ t('overdraw') }}</dt><dd>{{ stats.overdraw }}</dd><dt>{{ t('renderTargets') }}</dt><dd>{{ stats.renderTargets }}</dd></dl>
      <p class="allocation">{{ advancedRenderingActive() ? t('advancedPassesActive') : t('compactRenderPath') }}</p>
      <a v-for="capture in graph.captures" :key="capture.id" :href="capture.dataUrl" :download="`nova-frame-${capture.id}.png`">{{ capture.createdAt }} · {{ capture.width }}×{{ capture.height }}</a>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { assetReference, assetState, createTextAsset, readTextAsset, updateTextAsset } from '../assets/AssetDatabase'
import { t } from '../i18n'
import { defaultMaterial, normalizeMaterial, renderMaterialPreview, serializeMaterial, type Material2DResource, type ShaderDiagnostic } from '../renderer/materials'
import { advancedRenderingActive, renderingSettings as settings } from '../renderer/renderSettings'
import { renderGraphState as graph, requestRenderCapture } from '../renderer/renderGraph'
import { editorState } from '../store/editor'
import { pushHistory } from '../store/physics'

const previewCanvas = ref<HTMLCanvasElement | null>(null)
const materialAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'material'))
const selectedGuid = ref(assetState.selectedGuid && materialAssets.value.some(asset => asset.uuid === assetState.selectedGuid) ? assetState.selectedGuid : materialAssets.value[0]?.uuid ?? '')
const material = ref<Material2DResource>(defaultMaterial())
const diagnostics = ref<ShaderDiagnostic[]>([])
const uniformsJson = ref('{}'), texturesJson = ref('{}')
const stats = computed(() => editorState.rendererStats)
const hasErrors = computed(() => diagnostics.value.some(item => item.severity === 'error'))
let timer = 0

watch(selectedGuid, loadMaterial, { immediate: true })
function loadMaterial(guid: string) { const source = readTextAsset(guid); try { material.value = normalizeMaterial(source ? JSON.parse(source) : defaultMaterial()) } catch { material.value = defaultMaterial() } uniformsJson.value = JSON.stringify(material.value.uniforms, null, 2); texturesJson.value = JSON.stringify(material.value.textures, null, 2); schedulePreview() }
function schedulePreview() { clearTimeout(timer); timer = window.setTimeout(() => void nextTick(renderPreview), 120) }
function renderPreview() { diagnostics.value = previewCanvas.value ? renderMaterialPreview(previewCanvas.value, material.value) : [] }
function parseObject(source: string): Record<string, unknown> | null { try { const value = JSON.parse(source); return value && typeof value === 'object' && !Array.isArray(value) ? value : null } catch { return null } }
function applyUniforms() { const value = parseObject(uniformsJson.value); if (!value) { diagnostics.value = [{ line: 1, severity: 'error', message: 'Uniforms must be a JSON object.' }]; return } material.value = normalizeMaterial({ ...material.value, uniforms: value }); schedulePreview() }
function applyTextures() { const value = parseObject(texturesJson.value); if (!value) { diagnostics.value = [{ line: 1, severity: 'error', message: 'Textures must be a JSON object.' }]; return } material.value = normalizeMaterial({ ...material.value, textures: value }); schedulePreview() }
function createMaterial() { const asset = createTextAsset(t('newMaterial'), 'material', serializeMaterial(defaultMaterial()), 'Assets/Materials'); selectedGuid.value = asset.uuid; assetState.selectedGuid = asset.uuid; pushHistory('Create material') }
function saveMaterial() { renderPreview(); if (!selectedGuid.value || hasErrors.value) return; updateTextAsset(selectedGuid.value, serializeMaterial(material.value)); assetState.selectedGuid = selectedGuid.value; pushHistory('Save material') }
function hex(color: { r: number; g: number; b: number }) { return `#${[color.r, color.g, color.b].map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}` }
function setColor(target: { r: number; g: number; b: number }, event: Event) { const value = (event.target as HTMLInputElement).value; target.r = parseInt(value.slice(1, 3), 16); target.g = parseInt(value.slice(3, 5), 16); target.b = parseInt(value.slice(5, 7), 16) }
</script>

<style scoped>
.rendering-panel{height:100%;min-height:170px;display:grid;grid-template-columns:minmax(180px,22%) minmax(360px,1fr) minmax(190px,24%);overflow:hidden}.render-settings,.render-diagnostics{min-width:0;padding:10px;overflow:auto;background:var(--surface-2)}.render-settings{border-right:1px solid var(--border-subtle)}.render-diagnostics{border-left:1px solid var(--border-subtle)}.render-settings header,.render-diagnostics header{display:flex;flex-direction:column;gap:3px;margin-bottom:8px}.render-settings header small{color:var(--text-muted);font-size:11px;line-height:1.35}.render-settings label,.material-properties label{min-height:31px;display:flex;align-items:center;justify-content:space-between;gap:7px;color:var(--text-muted);font-size:11px}.render-settings input:not([type=checkbox]):not([type=color]),.render-settings select{width:48%;min-width:0}.material-editor{min-width:0;display:flex;flex-direction:column;overflow:hidden}.material-toolbar{padding:7px;display:flex;gap:6px;border-bottom:1px solid var(--border-subtle)}.material-toolbar select{min-width:110px;flex:1}.material-toolbar button,.render-diagnostics button{min-height:30px;padding:0 9px;border:1px solid var(--border-subtle);border-radius:7px;color:var(--text-secondary);background:var(--surface-3);font-size:11px}.material-toolbar button.primary{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}.material-grid{min-height:0;flex:1;display:grid;grid-template-columns:minmax(250px,1fr) minmax(210px,40%)}.shader-source,.shader-preview{min-width:0;min-height:0;padding:8px;overflow:auto}.shader-source{display:flex;flex-direction:column}.material-properties{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.material-properties label{display:grid;gap:2px}.shader-source>textarea{min-height:120px;flex:1;resize:none;font:11px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}.shader-preview canvas{width:100%;aspect-ratio:7/4;display:block;border:1px solid var(--border-subtle);border-radius:8px;background:#161b23}.uniforms{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px}.uniforms label{color:var(--text-muted);font-size:11px}.uniforms textarea{width:100%;resize:vertical;font:9px/1.4 ui-monospace,monospace}.diagnostics{margin-top:7px;padding:6px;border:1px solid var(--success);border-radius:7px;color:var(--success);font-size:11px}.diagnostics.error{border-color:var(--danger);color:var(--danger)}.diagnostics p{margin:2px;line-height:1.4}.render-diagnostics header{flex-direction:row;align-items:center;justify-content:space-between}.render-diagnostics dl{margin:0 0 7px;display:grid;grid-template-columns:1fr auto;gap:4px 8px;font-size:11px}.render-diagnostics dt{color:var(--text-muted)}.render-diagnostics dd{margin:0;color:var(--accent)}.render-diagnostics a{display:block;margin-top:5px;overflow:hidden;color:var(--accent);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.allocation{padding:6px;border-radius:7px;color:var(--text-muted);background:var(--surface-3);font-size:11px;line-height:1.4}@media(max-width:900px){.rendering-panel{grid-template-columns:170px minmax(330px,1fr)}.render-diagnostics{display:none}.material-grid{grid-template-columns:1fr}.shader-preview{display:none}}
</style>

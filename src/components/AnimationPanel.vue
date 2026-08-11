<template>
  <section class="animation-editor">
    <header class="animation-toolbar">
      <button class="primary" @click="newClip">+ {{ t('animationClip') }}</button>
      <button @click="newController">+ {{ t('animatorController') }}</button>
      <select v-model="selectedGuid">
        <option value="">{{ t('selectAnimationAsset') }}</option>
        <option v-for="asset in animationAssets" :key="asset.uuid" :value="asset.uuid">{{ asset.name }}</option>
      </select>
      <span></span>
      <button :disabled="!document" @click="save">{{ t('saveAsset') }}</button>
    </header>

    <div v-if="clip" class="clip-editor">
      <aside>
        <label>{{ t('loop') }} <input v-model="clip.loop" type="checkbox"></label>
        <label>{{ t('frameRate') }} <input v-model.number="clip.frameRate" type="number" min="1" max="240"></label>
        <button @click="addSpriteFrame">+ {{ t('spriteFrame') }}</button>
        <button @click="addTrack">+ {{ t('propertyTrack') }}</button>
      </aside>
      <main class="timeline">
        <div class="time-ruler"><i v-for="tick in 12" :key="tick">{{ (tick - 1) / clip.frameRate }}s</i></div>
        <article v-if="clip.spriteFrames.length" class="timeline-row">
          <strong>{{ t('spriteFrames') }}</strong>
          <div class="frame-strip">
            <label v-for="(frame, index) in clip.spriteFrames" :key="index" class="sprite-frame">
              <span>#{{ index + 1 }}</span>
              <select v-model="frame.spriteAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in imageAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select>
              <input v-model.number="frame.duration" type="number" min="0.001" step="0.01" :title="t('frameDuration')">
              <button @click="clip.spriteFrames.splice(index, 1)">×</button>
            </label>
          </div>
        </article>
        <article v-for="(track, trackIndex) in clip.tracks" :key="trackIndex" class="timeline-row">
          <select v-model="track.property"><option v-for="property in properties" :key="property" :value="property">{{ property }}</option></select>
          <div class="keyframes">
            <label v-for="(keyframe, keyIndex) in track.keyframes" :key="keyIndex">
              <input v-model.number="keyframe.time" type="number" min="0" step="0.01" :title="t('keyframeTime')">
              <input v-model.number="keyframe.value" type="number" step="0.01" :title="t('keyframeValue')">
              <button @click="track.keyframes.splice(keyIndex, 1)">×</button>
            </label>
            <button @click="track.keyframes.push({ time: nextKeyTime(track), value: 0 })">+ {{ t('keyframe') }}</button>
            <button class="danger" @click="clip.tracks.splice(trackIndex, 1)">× {{ t('track') }}</button>
          </div>
        </article>
        <p v-if="!clip.spriteFrames.length && !clip.tracks.length" class="empty">{{ t('emptyAnimation') }}</p>
      </main>
    </div>

    <div v-else-if="controller" class="controller-editor">
      <aside class="controller-sidebar">
        <strong>{{ t('parameters') }}</strong>
        <label v-for="(parameter, index) in controller.parameters" :key="parameter.name">
          <input v-model="parameter.name" maxlength="80">
          <select v-model="parameter.type"><option>Bool</option><option>Float</option><option>Integer</option><option>Trigger</option></select>
          <input v-if="parameter.type === 'Bool' || parameter.type === 'Trigger'" v-model="parameter.defaultValue" type="checkbox">
          <input v-else v-model.number="parameter.defaultValue" type="number">
          <button @click="controller.parameters.splice(index, 1)">×</button>
        </label>
        <button @click="addParameter">+ {{ t('parameter') }}</button>
        <strong>{{ t('transitions') }}</strong>
        <article v-for="(transition, index) in controller.transitions" :key="transition.id" class="transition-card">
          <label class="transition-row">
            <select v-model="transition.from"><option v-for="state in controller.states" :key="state.id" :value="state.id">{{ state.name }}</option></select>
            <span>→</span>
            <select v-model="transition.to"><option v-for="state in controller.states" :key="state.id" :value="state.id">{{ state.name }}</option></select>
            <button @click="controller.transitions.splice(index, 1)">×</button>
          </label>
          <label><span>{{ t('exitTime') }}</span><input v-model="transition.hasExitTime" type="checkbox"><input v-if="transition.hasExitTime" v-model.number="transition.exitTime" type="number" min="0" max="1" step="0.05"></label>
          <label><span>{{ t('duration') }}</span><input v-model.number="transition.duration" type="number" min="0" step="0.05"></label>
          <label v-for="(condition, conditionIndex) in transition.conditions" :key="conditionIndex" class="condition-row">
            <select v-model="condition.parameter"><option v-for="parameter in controller.parameters" :key="parameter.name" :value="parameter.name">{{ parameter.name }}</option></select>
            <select v-model="condition.operator"><option v-for="operator in conditionOperators" :key="operator">{{ operator }}</option></select>
            <input v-if="condition.operator !== 'trigger'" v-model="condition.value" :type="conditionType(condition.parameter)">
            <button @click="transition.conditions.splice(conditionIndex, 1)">×</button>
          </label>
          <button :disabled="!controller.parameters.length" @click="addCondition(transition)">+ {{ t('condition') }}</button>
        </article>
        <button :disabled="controller.states.length < 2" @click="addTransition">+ {{ t('transition') }}</button>
      </aside>
      <main class="state-machine">
        <svg aria-hidden="true"><line v-for="transition in controller.transitions" :key="transition.id" v-bind="transitionLine(transition)" /></svg>
        <button
          v-for="stateNode in controller.states" :key="stateNode.id"
          :class="['state-node', { default: controller.defaultState === stateNode.id, selected: selectedStateId === stateNode.id }]"
          :style="{ left: `${stateNode.x}px`, top: `${stateNode.y}px` }"
          @click="selectedStateId = stateNode.id"
        >{{ stateNode.name }}</button>
        <button class="add-state" @click="addState">+ {{ t('state') }}</button>
      </main>
      <aside v-if="selectedState" class="state-inspector">
        <label>{{ t('stateName') }} <input v-model="selectedState.name"></label>
        <label>{{ t('animationClip') }} <select v-model="selectedState.clipAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in clipAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
        <label>{{ t('speed') }} <input v-model.number="selectedState.speed" type="number" step="0.1"></label>
        <label>{{ t('defaultState') }} <input :checked="controller.defaultState === selectedState.id" type="checkbox" @change="controller.defaultState = selectedState!.id"></label>
        <button class="danger" :disabled="controller.states.length <= 1" @click="removeState">{{ t('deleteState') }}</button>
      </aside>
    </div>
    <p v-else class="empty">{{ t('selectAnimationAsset') }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { assetReference, assetState, readTextAsset, updateTextAsset } from '../assets/AssetDatabase'
import { addEditorLog } from '../store/editor'
import { pushHistory } from '../store/physics'
import { t } from '../i18n'
import {
  createAnimationClipAsset, createAnimatorControllerAsset, defaultAnimatorController,
  normalizeAnimationClip, normalizeAnimatorController,
  type AnimatableProperty, type AnimationClipDocument, type AnimationTrack,
  type AnimatorControllerDocument, type AnimatorTransition, type TransitionCondition
} from '../runtime/animation'

const properties: AnimatableProperty[] = ['Transform.position.x', 'Transform.position.y', 'Transform.rotation', 'SpriteRenderer.opacity', 'UI.opacity']
const conditionOperators: TransitionCondition['operator'][] = ['==', '!=', '>', '<', '>=', '<=', 'trigger']
const selectedGuid = ref('')
const clip = ref<AnimationClipDocument | null>(null)
const controller = ref<AnimatorControllerDocument | null>(null)
const selectedStateId = ref('')
const animationAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'animation' || asset.assetType === 'controller'))
const clipAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'animation'))
const imageAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'image'))
const selectedAsset = computed(() => assetState.records.find(asset => asset.uuid === selectedGuid.value) ?? null)
const document = computed(() => clip.value ?? controller.value)
const selectedState = computed(() => controller.value?.states.find(state => state.id === selectedStateId.value) ?? null)

watch(selectedGuid, guid => {
  clip.value = null; controller.value = null; selectedStateId.value = ''
  const asset = assetState.records.find(candidate => candidate.uuid === guid)
  const source = readTextAsset(guid)
  if (!asset || !source) return
  try {
    if (asset.assetType === 'animation') clip.value = normalizeAnimationClip(JSON.parse(source))
    if (asset.assetType === 'controller') {
      controller.value = normalizeAnimatorController(JSON.parse(source))
      selectedStateId.value = controller.value.states[0]?.id ?? ''
    }
  } catch { /* Invalid documents remain closed and cannot overwrite the source. */ }
}, { immediate: true })

function newClip() { const asset = createAnimationClipAsset(t('newAnimationName')); selectedGuid.value = asset.uuid; assetState.selectedGuid = asset.uuid; pushHistory('Create animation clip') }
function newController() { const asset = createAnimatorControllerAsset(t('newControllerName')); selectedGuid.value = asset.uuid; assetState.selectedGuid = asset.uuid; pushHistory('Create animator controller') }
function save() {
  const asset = selectedAsset.value; if (!asset || !document.value) return
  const normalized = asset.assetType === 'animation' ? normalizeAnimationClip(document.value) : normalizeAnimatorController(document.value)
  if (!updateTextAsset(asset.uuid, JSON.stringify(normalized, null, 2))) return
  if (asset.assetType === 'animation') clip.value = normalized as AnimationClipDocument
  else controller.value = normalized as AnimatorControllerDocument
  pushHistory('Edit animation asset', `animation:${asset.uuid}`); addEditorLog(t('animationSaved', { name: asset.name }), 'Editor')
}
function addSpriteFrame() { clip.value?.spriteFrames.push({ spriteAsset: null, duration: 1 / Math.max(1, clip.value.frameRate) }) }
function addTrack() { clip.value?.tracks.push({ property: 'Transform.position.x', keyframes: [{ time: 0, value: 0 }] }) }
function nextKeyTime(track: AnimationTrack) { return (track.keyframes[track.keyframes.length - 1]?.time ?? -1 / (clip.value?.frameRate ?? 12)) + 1 / (clip.value?.frameRate ?? 12) }
function addParameter() { controller.value?.parameters.push({ name: `parameter_${(controller.value?.parameters.length ?? 0) + 1}`, type: 'Bool', defaultValue: false }) }
function addState() {
  const document = controller.value; if (!document) return
  const id = `state_${Date.now().toString(36)}`
  document.states.push({ id, name: `State ${document.states.length + 1}`, clipAsset: null, speed: 1, x: 80 + (document.states.length % 4) * 150, y: 80 + Math.floor(document.states.length / 4) * 90 })
  selectedStateId.value = id
}
function removeState() {
  const document = controller.value; const state = selectedState.value
  if (!document || !state || document.states.length <= 1) return
  document.states = document.states.filter(candidate => candidate.id !== state.id)
  document.transitions = document.transitions.filter(transition => transition.from !== state.id && transition.to !== state.id)
  if (document.defaultState === state.id) document.defaultState = document.states[0].id
  selectedStateId.value = document.states[0].id
}
function addTransition() {
  const document = controller.value; if (!document || document.states.length < 2) return
  document.transitions.push({ id: `transition_${Date.now().toString(36)}`, from: document.states[0].id, to: document.states[1].id, hasExitTime: true, exitTime: 1, duration: .1, conditions: [] })
}
function addCondition(transition: AnimatorTransition) {
  const parameter = controller.value?.parameters[0]; if (!parameter) return
  transition.conditions.push({ parameter: parameter.name, operator: parameter.type === 'Trigger' ? 'trigger' : '==', value: parameter.defaultValue })
}
function conditionType(parameterName: string) { return controller.value?.parameters.find(parameter => parameter.name === parameterName)?.type === 'Bool' ? 'checkbox' : 'number' }
function transitionLine(transition: AnimatorTransition) {
  const document = controller.value ?? defaultAnimatorController(); const from = document.states.find(state => state.id === transition.from); const to = document.states.find(state => state.id === transition.to)
  return { x1: (from?.x ?? 0) + 55, y1: (from?.y ?? 0) + 18, x2: (to?.x ?? 0) + 55, y2: (to?.y ?? 0) + 18 }
}
</script>

<style scoped>
.animation-editor { height: 100%; min-height: 150px; display: flex; flex-direction: column; overflow: hidden; }.animation-toolbar { min-height: 38px; padding: 5px 8px; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid var(--border-subtle); }.animation-toolbar span { flex: 1; }.animation-toolbar button, .animation-toolbar select, .clip-editor button, .controller-editor button { min-height: 27px; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--text-secondary); background: var(--surface-2); font-size: 9px; }.animation-toolbar button.primary { color: var(--accent-contrast); border-color: var(--accent); background: var(--accent); }.clip-editor, .controller-editor { flex: 1; min-height: 0; display: grid; grid-template-columns: 190px 1fr; }.clip-editor > aside, .controller-sidebar, .state-inspector { padding: 8px; display: flex; flex-direction: column; gap: 7px; overflow: auto; border-right: 1px solid var(--border-subtle); background: var(--surface-2); }.clip-editor aside label, .controller-sidebar label, .state-inspector label { display: flex; align-items: center; gap: 5px; color: var(--text-muted); font-size: 9px; }.clip-editor aside label input { margin-left: auto; max-width: 82px; }.timeline { min-width: 0; overflow: auto; }.time-ruler { min-width: 720px; height: 23px; display: grid; grid-template-columns: repeat(12, 1fr); border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 8px; }.time-ruler i { padding: 5px; border-left: 1px solid var(--border-subtle); font-style: normal; }.timeline-row { min-width: 720px; min-height: 51px; padding: 6px; display: grid; grid-template-columns: 150px 1fr; gap: 7px; border-bottom: 1px solid var(--border-subtle); }.frame-strip, .keyframes { display: flex; align-items: center; gap: 5px; overflow-x: auto; }.sprite-frame, .keyframes label { padding: 3px; display: flex; align-items: center; gap: 3px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--surface-2); }.sprite-frame select { width: 90px; }.sprite-frame input, .keyframes input { width: 54px; }.controller-editor { grid-template-columns: 230px minmax(280px, 1fr) 190px; }.controller-sidebar strong { margin-top: 5px; color: var(--text-primary); font-size: 9px; }.controller-sidebar label { display: grid; grid-template-columns: 1fr 66px 45px 22px; }.controller-sidebar .transition-row { grid-template-columns: 1fr auto 1fr 22px; }.transition-card { padding: 5px; display: grid; gap: 4px; border: 1px solid var(--border-subtle); border-radius: 7px; }.transition-card > label { padding: 0; }.transition-card .condition-row { grid-template-columns: 1fr 50px 45px 22px; }.state-machine { position: relative; min-height: 180px; overflow: auto; background-image: radial-gradient(var(--border-subtle) 1px, transparent 1px); background-size: 16px 16px; }.state-machine svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }.state-machine line { stroke: var(--accent); stroke-width: 2; }.state-node { position: absolute; width: 110px; height: 36px; }.state-node.default { border-color: var(--success); }.state-node.selected { outline: 2px solid var(--accent); }.add-state { position: sticky; top: 8px; left: 8px; margin: 8px; }.state-inspector { border: 0; border-left: 1px solid var(--border-subtle); }.state-inspector label { align-items: stretch; flex-direction: column; }.danger { color: var(--danger) !important; }.empty { padding: 18px; color: var(--text-muted); font-size: 10px; }
</style>

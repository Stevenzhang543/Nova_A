<template>
  <section v-if="animator" class="runtime-component">
    <header><strong>{{ t('animator') }}</strong><button @click="remove('Animator')">×</button></header>
    <label><span>{{ t('controller') }}</span><select v-model="animator.controllerAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in controllerAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <label><span>{{ t('speed') }}</span><input v-model.number="animator.speed" type="number" step="0.1"></label>
    <label><span>{{ t('autoplay') }}</span><input v-model="animator.autoplay" type="checkbox"></label>
    <label><span>{{ t('currentState') }}</span><code>{{ animator.currentState || '—' }}</code></label>
    <label v-for="(value, name) in animator.parameters" :key="name"><span>{{ name }}</span><input v-if="typeof value === 'boolean'" v-model="animator.parameters[name]" type="checkbox"><input v-else v-model.number="animator.parameters[name]" type="number" step="0.01"></label>
  </section>

  <section v-if="audioSource" class="runtime-component">
    <header><strong>{{ t('audioSource') }}</strong><button @click="remove('AudioSource')">×</button></header>
    <label><span>{{ t('audioClip') }}</span><select v-model="audioSource.audioClip"><option :value="null">{{ t('none') }}</option><option v-for="asset in audioAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <label><span>{{ t('volume') }}</span><input v-model.number="audioSource.volume" type="number" min="0" max="1" step="0.01"></label>
    <label><span>{{ t('pitch') }}</span><input v-model.number="audioSource.pitch" type="number" min="0.25" max="4" step="0.05"></label>
    <label><span>{{ t('loop') }}</span><input v-model="audioSource.loop" type="checkbox"></label>
    <label><span>{{ t('autoplay') }}</span><input v-model="audioSource.autoplay" type="checkbox"></label>
    <label><span>{{ t('audioBus') }}</span><select v-model="audioSource.bus"><option>Master</option><option>Music</option><option>SFX</option><option>UI</option></select></label>
    <label><span>{{ t('spatialBlend') }}</span><input v-model.number="audioSource.spatialBlend" type="range" min="0" max="1" step="0.01"></label>
    <label><span>{{ t('distanceRange') }}</span><div><input v-model.number="audioSource.minDistance" type="number" min="0" step="0.1"><input v-model.number="audioSource.maxDistance" type="number" min="0" step="1"></div></label>
  </section>

  <section v-if="audioListener" class="runtime-component">
    <header><strong>{{ t('audioListener') }}</strong><button @click="remove('AudioListener')">×</button></header>
    <label><span>{{ t('active') }}</span><input v-model="audioListener.active" type="checkbox"></label>
  </section>

  <section v-if="tileMap" class="runtime-component">
    <header><strong>{{ t('tileMap2D') }}</strong><button @click="remove('TileMap2D')">×</button></header>
    <label><span>{{ t('tileSet') }}</span><select v-model="tileMap.tileSetAsset" @change="tileMapChanged"><option :value="null">{{ t('none') }}</option><option v-for="asset in tileSetAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <label><span>{{ t('mapSize') }}</span><div><input :value="tileMap.width" type="number" min="1" max="2048" @change="resizeMap('width', $event)"><input :value="tileMap.height" type="number" min="1" max="2048" @change="resizeMap('height', $event)"></div></label>
    <label><span>{{ t('tileWorldSize') }}</span><div><input v-model.number="tileMap.tileSize.x" type="number" min="0.000001" step="0.1" @change="tileMapChanged"><input v-model.number="tileMap.tileSize.y" type="number" min="0.000001" step="0.1" @change="tileMapChanged"></div></label>
    <label><span>{{ t('chunkSize') }}</span><input v-model.number="tileMap.chunkSize" type="number" min="4" max="128" @change="tileMapChanged"></label>
    <label><span>{{ t('opacity') }}</span><input v-model.number="tileMap.opacity" type="number" min="0" max="100"></label>
    <label><span>{{ t('sortingLayer') }}</span><input v-model.number="tileMap.sortingLayer" type="number"></label>
    <label><span>{{ t('orderInLayer') }}</span><input v-model.number="tileMap.orderInLayer" type="number"></label>
    <label><span>{{ t('filterMode') }}</span><select v-model="tileMap.filterMode"><option>Nearest</option><option>Linear</option></select></label>
    <label><span>{{ t('physicsLayer') }}</span><input v-model.number="tileMap.physicsLayer" type="number" min="0" max="31" @change="tileMapChanged"></label>
    <label><span>{{ t('collisionMask') }}</span><input v-model.number="tileMap.collisionMask" type="number" min="0" max="4294967295" @change="tileMapChanged"></label>
    <button class="open-editor" @click="openTilemapEditor">{{ t('openTilemapEditor') }}</button>
  </section>

  <section v-if="particleEmitter" class="runtime-component">
    <header><strong>{{ t('particleEmitter2D') }}</strong><button @click="remove('ParticleEmitter2D')">×</button></header>
    <label><span>{{ t('particleTexture') }}</span><select v-model="particleEmitter.textureAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in imageAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <label><span>{{ t('emissionRate') }}</span><input v-model.number="particleEmitter.emissionRate" type="number" min="0"></label>
    <label><span>{{ t('burst') }}</span><input v-model.number="particleEmitter.burst" type="number" min="0"></label>
    <label><span>{{ t('lifetime') }}</span><input v-model.number="particleEmitter.lifetime" type="number" min="0.0001" step="0.1"></label>
    <label><span>{{ t('velocityMin') }}</span><div><input v-model.number="particleEmitter.initialVelocityMin.x" type="number"><input v-model.number="particleEmitter.initialVelocityMin.y" type="number"></div></label>
    <label><span>{{ t('velocityMax') }}</span><div><input v-model.number="particleEmitter.initialVelocityMax.x" type="number"><input v-model.number="particleEmitter.initialVelocityMax.y" type="number"></div></label>
    <label><span>{{ t('particleGravity') }}</span><div><input v-model.number="particleEmitter.gravity.x" type="number"><input v-model.number="particleEmitter.gravity.y" type="number"></div></label>
    <label><span>{{ t('rotationRange') }}</span><div><input v-model.number="particleEmitter.rotationMin" type="number" step="0.1"><input v-model.number="particleEmitter.rotationMax" type="number" step="0.1"></div></label>
    <label><span>{{ t('angularVelocityRange') }}</span><div><input v-model.number="particleEmitter.angularVelocityMin" type="number" step="0.1"><input v-model.number="particleEmitter.angularVelocityMax" type="number" step="0.1"></div></label>
    <label><span>{{ t('scaleOverLifetime') }}</span><div><input v-model.number="particleEmitter.startScale" type="number" min="0"><input v-model.number="particleEmitter.endScale" type="number" min="0"></div></label>
    <label><span>{{ t('colorOverLifetime') }}</span><div><input type="color" :value="rgbHex(particleEmitter.startColor)" @input="setColor(particleEmitter.startColor, $event)"><input type="color" :value="rgbHex(particleEmitter.endColor)" @input="setColor(particleEmitter.endColor, $event)"></div></label>
    <label><span>{{ t('opacityOverLifetime') }}</span><div><input v-model.number="particleEmitter.startOpacity" type="number" min="0" max="100"><input v-model.number="particleEmitter.endOpacity" type="number" min="0" max="100"></div></label>
    <label><span>{{ t('maxParticles') }}</span><input v-model.number="particleEmitter.maxParticles" type="number" min="0" max="100000"></label>
    <label><span>{{ t('autoplay') }}</span><input v-model="particleEmitter.autoplay" type="checkbox"></label>
    <label><span>{{ t('loop') }}</span><input v-model="particleEmitter.looping" type="checkbox"></label>
    <label><span>{{ t('worldSpace') }}</span><input v-model="particleEmitter.worldSpace" type="checkbox"></label>
    <label><span>{{ t('blendMode') }}</span><select v-model="particleEmitter.blendMode"><option>Alpha</option><option>Additive</option></select></label>
  </section>

  <section v-for="joint in joints" :key="joint.uuid" class="runtime-component">
    <header><strong>{{ t(joint.kind) }}</strong><button @click="remove(joint.kind)">×</button></header>
    <label><span>{{ t('connectedBody') }}</span><select v-model="joint.targetEntityUuid" @change="joint.initialized = false"><option :value="null">{{ t('none') }}</option><option v-for="entity in jointTargets" :key="entity.uuid" :value="entity.uuid">{{ entity.name }}_{{ entity.id }}</option></select></label>
    <label><span>{{ t('anchor') }}</span><div><input v-model.number="joint.anchor.x" type="number"><input v-model.number="joint.anchor.y" type="number"></div></label>
    <label><span>{{ t('connectedAnchor') }}</span><div><input v-model.number="joint.connectedAnchor.x" type="number"><input v-model.number="joint.connectedAnchor.y" type="number"></div></label>
    <label><span>{{ t('collideConnected') }}</span><input v-model="joint.collideConnected" type="checkbox"></label>
    <label v-if="joint.kind === 'DistanceJoint2D' || joint.kind === 'SpringJoint2D'"><span>{{ t('jointDistance') }}</span><input v-model.number="joint.distance" type="number" min="0"></label>
    <label v-if="joint.kind === 'SpringJoint2D'"><span>{{ t('stiffness') }}</span><input v-model.number="joint.stiffness" type="number" min="0"></label>
    <label v-if="joint.kind === 'SpringJoint2D'"><span>{{ t('connectionDamping') }}</span><input v-model.number="joint.damping" type="number" min="0"></label>
    <label v-if="joint.kind === 'PrismaticJoint2D'"><span>{{ t('jointAxis') }}</span><div><input v-model.number="joint.axis.x" type="number"><input v-model.number="joint.axis.y" type="number"></div></label>
    <label v-if="joint.kind === 'PrismaticJoint2D'"><span>{{ t('jointLimits') }}</span><input v-model="joint.limitsEnabled" type="checkbox"></label>
    <label v-if="joint.kind === 'PrismaticJoint2D' && joint.limitsEnabled"><span>{{ t('limitRange') }}</span><div><input v-model.number="joint.lowerLimit" type="number"><input v-model.number="joint.upperLimit" type="number"></div></label>
  </section>

  <section v-if="rectTransform" class="runtime-component">
    <header><strong>{{ t('rectTransform') }}</strong><button @click="remove('RectTransform')">×</button></header>
    <label><span>{{ t('anchorPreset') }}</span><select v-model="rectTransform.anchorPreset"><option v-for="preset in anchorPresets" :key="preset" :value="preset">{{ anchorLabel(preset) }}</option></select></label>
    <label><span>{{ t('pivot') }}</span><div><input v-model.number="rectTransform.pivot.x" type="number" min="0" max="1" step="0.05"><input v-model.number="rectTransform.pivot.y" type="number" min="0" max="1" step="0.05"></div></label>
    <label><span>{{ t('uiPosition') }}</span><div><input v-model.number="rectTransform.position.x" type="number" step="1"><input v-model.number="rectTransform.position.y" type="number" step="1"></div></label>
    <label><span>{{ t('uiSize') }}</span><div><input v-model.number="rectTransform.size.x" type="number" min="0" step="1"><input v-model.number="rectTransform.size.y" type="number" min="0" step="1"></div></label>
    <label v-if="rectTransform.anchorPreset === 'stretch'"><span>{{ t('margins') }}</span><div class="quad"><input v-model.number="rectTransform.margins.left" type="number"><input v-model.number="rectTransform.margins.top" type="number"><input v-model.number="rectTransform.margins.right" type="number"><input v-model.number="rectTransform.margins.bottom" type="number"></div></label>
  </section>

  <section v-if="canvas" class="runtime-component">
    <header><strong>{{ t('uiCanvas') }}</strong><button @click="remove('Canvas')">×</button></header>
    <label><span>{{ t('referenceSize') }}</span><div><input v-model.number="canvas.referenceSize.x" type="number" min="1"><input v-model.number="canvas.referenceSize.y" type="number" min="1"></div></label>
    <label><span>{{ t('scaleWithScreen') }}</span><input v-model="canvas.scaleWithScreen" type="checkbox"></label>
    <label><span>{{ t('sortingOrder') }}</span><input v-model.number="canvas.sortingOrder" type="number"></label>
  </section>

  <section v-if="panel" class="runtime-component">
    <header><strong>{{ t('uiPanel') }}</strong><button @click="remove('Panel')">×</button></header>
    <label><span>{{ t('color') }}</span><input type="color" :value="rgbHex(panel.color)" @input="setColor(panel.color, $event)"></label>
    <label><span>{{ t('opacity') }}</span><input v-model.number="panel.opacity" type="number" min="0" max="100"></label>
    <label><span>{{ t('cornerRadius') }}</span><input v-model.number="panel.cornerRadius" type="number" min="0"></label>
  </section>

  <section v-if="image" class="runtime-component"><header><strong>{{ t('uiImage') }}</strong><button @click="remove('Image')">×</button></header><label><span>{{ t('spriteAsset') }}</span><select v-model="image.spriteAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in imageAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label><label><span>{{ t('tint') }}</span><input type="color" :value="rgbHex(image.tint)" @input="setColor(image.tint, $event)"></label><label><span>{{ t('opacity') }}</span><input v-model.number="image.opacity" type="number" min="0" max="100"></label><label><span>{{ t('preserveAspect') }}</span><input v-model="image.preserveAspect" type="checkbox"></label></section>
  <section v-if="text" class="runtime-component"><header><strong>{{ t('uiText') }}</strong><button @click="remove('Text')">×</button></header><label class="stacked"><span>{{ t('textContent') }}</span><textarea v-model="text.text" rows="2"></textarea></label><label><span>{{ t('fontAsset') }}</span><select v-model="text.fontAsset"><option :value="null">{{ t('defaultFont') }}</option><option v-for="asset in fontAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label><label><span>{{ t('textColor') }}</span><input type="color" :value="rgbHex(text.color)" @input="setColor(text.color, $event)"></label><label><span>{{ t('opacity') }}</span><input v-model.number="text.opacity" type="number" min="0" max="100"></label><label><span>{{ t('fontSize') }}</span><input v-model.number="text.fontSize" type="number" min="1"></label><label><span>{{ t('fontWeight') }}</span><input v-model.number="text.fontWeight" type="number" min="100" max="900" step="100"></label><label><span>{{ t('alignment') }}</span><select v-model="text.align"><option value="left">{{ t('left') }}</option><option value="center">{{ t('center') }}</option><option value="right">{{ t('right') }}</option></select></label></section>
  <section v-if="button" class="runtime-component"><header><strong>{{ t('uiButton') }}</strong><button @click="remove('Button')">×</button></header><label><span>{{ t('interactable') }}</span><input v-model="button.interactable" type="checkbox"></label><label><span>on_pressed</span><input v-model="button.onPressed"></label><label><span>on_hover_enter</span><input v-model="button.onHoverEnter"></label><label><span>on_hover_exit</span><input v-model="button.onHoverExit"></label><label><span>{{ t('normalColor') }}</span><input type="color" :value="rgbHex(button.normalColor)" @input="setColor(button.normalColor, $event)"></label><label><span>{{ t('hoveredColor') }}</span><input type="color" :value="rgbHex(button.hoveredColor)" @input="setColor(button.hoveredColor, $event)"></label><label><span>{{ t('pressedColor') }}</span><input type="color" :value="rgbHex(button.pressedColor)" @input="setColor(button.pressedColor, $event)"></label><label><span>{{ t('disabledColor') }}</span><input type="color" :value="rgbHex(button.disabledColor)" @input="setColor(button.disabledColor, $event)"></label></section>
  <section v-if="slider" class="runtime-component"><header><strong>{{ t('uiSlider') }}</strong><button @click="remove('Slider')">×</button></header><ValueRange :component="slider" /><label><span>{{ t('wholeNumbers') }}</span><input v-model="slider.wholeNumbers" type="checkbox"></label><label><span>{{ t('interactable') }}</span><input v-model="slider.interactable" type="checkbox"></label></section>
  <section v-if="progress" class="runtime-component"><header><strong>{{ t('uiProgressBar') }}</strong><button @click="remove('ProgressBar')">×</button></header><ValueRange :component="progress" /><label><span>{{ t('fillColor') }}</span><input type="color" :value="rgbHex(progress.fillColor)" @input="setColor(progress.fillColor, $event)"></label><label><span>{{ t('backgroundColor') }}</span><input type="color" :value="rgbHex(progress.backgroundColor)" @input="setColor(progress.backgroundColor, $event)"></label></section>
  <section v-if="checkbox" class="runtime-component"><header><strong>{{ t('uiCheckbox') }}</strong><button @click="remove('Checkbox')">×</button></header><label><span>{{ t('label') }}</span><input v-model="checkbox.label"></label><label><span>{{ t('checked') }}</span><input v-model="checkbox.checked" type="checkbox"></label><label><span>{{ t('interactable') }}</span><input v-model="checkbox.interactable" type="checkbox"></label></section>
  <section v-if="textInput" class="runtime-component"><header><strong>{{ t('uiTextInput') }}</strong><button @click="remove('TextInput')">×</button></header><label><span>{{ t('value') }}</span><input v-model="textInput.value"></label><label><span>{{ t('placeholder') }}</span><input v-model="textInput.placeholder"></label><label><span>{{ t('maxLength') }}</span><input v-model.number="textInput.maxLength" type="number" min="0"></label><label><span>{{ t('password') }}</span><input v-model="textInput.password" type="checkbox"></label></section>

  <section class="ui-palette">
    <strong>{{ t('createGameUi') }}</strong>
    <div><button v-for="kind in uiKinds" :key="kind" @click="create(kind)">+ {{ t(`create${kind}`) }}</button></div>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, watch, type PropType } from 'vue'
import { assetReference, assetState } from '../assets/AssetDatabase'
import { t } from '../i18n'
import { createUiEntity, physicsState, pushHistory, type UiElementKind } from '../store/physics'
import type { Entity } from '../world/Entity'
import type {
  Animator, AudioListener, AudioSource, Button, Canvas, Checkbox, ComponentKind, Image, Joint2D, Panel,
  ParticleEmitter2D, ProgressBar, RectTransform, Slider, Text, TextInput, TileMap2D
} from '../world/components'
import { readAnimatorController } from '../runtime/animation'
import { requestConfirmation } from '../store/dialog'
import { editorState } from '../store/editor'
import { invalidateTileMap, resizeTileMap, tilemapEditorState } from '../runtime/tilemap'

const props = defineProps<{ entity: Entity }>()
const ValueRange = defineComponent({ props: { component: { type: Object as PropType<Slider | ProgressBar>, required: true } }, setup(componentProps) { return () => h('div', { class: 'range-values' }, [['min', 'Min'], ['max', 'Max'], ['value', t('value')]].map(([key, label]) => h('label', [h('span', label), h('input', { type: 'number', value: componentProps.component[key as 'min'], onInput: (event: Event) => { componentProps.component[key as 'min'] = Number((event.target as HTMLInputElement).value) } })])) ) } })
const anchorPresets = ['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right', 'stretch'] as const
const uiKinds: UiElementKind[] = ['Canvas', 'Panel', 'Image', 'Text', 'Button', 'Slider', 'ProgressBar', 'Checkbox', 'TextInput']
const imageAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'image'))
const fontAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'font'))
const audioAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'audio'))
const controllerAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'controller'))
const tileSetAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'tileset'))
const animator = computed(() => props.entity.getComponent<Animator>('Animator'))
const audioSource = computed(() => props.entity.getComponent<AudioSource>('AudioSource'))
const audioListener = computed(() => props.entity.getComponent<AudioListener>('AudioListener'))
const rectTransform = computed(() => props.entity.getComponent<RectTransform>('RectTransform'))
const canvas = computed(() => props.entity.getComponent<Canvas>('Canvas'))
const panel = computed(() => props.entity.getComponent<Panel>('Panel'))
const image = computed(() => props.entity.getComponent<Image>('Image'))
const text = computed(() => props.entity.getComponent<Text>('Text'))
const button = computed(() => props.entity.getComponent<Button>('Button'))
const slider = computed(() => props.entity.getComponent<Slider>('Slider'))
const progress = computed(() => props.entity.getComponent<ProgressBar>('ProgressBar'))
const checkbox = computed(() => props.entity.getComponent<Checkbox>('Checkbox'))
const textInput = computed(() => props.entity.getComponent<TextInput>('TextInput'))
const tileMap = computed(() => props.entity.getComponent<TileMap2D>('TileMap2D'))
const particleEmitter = computed(() => props.entity.getComponent<ParticleEmitter2D>('ParticleEmitter2D'))
const jointKinds = ['FixedJoint2D', 'DistanceJoint2D', 'RevoluteJoint2D', 'PrismaticJoint2D', 'SpringJoint2D'] as const
const joints = computed(() => jointKinds.flatMap(kind => { const component = props.entity.getComponent<Joint2D>(kind); return component ? [component] : [] }))
const jointTargets = computed(() => physicsState.world.entities.filter(entity => entity !== props.entity && entity.hasComponent('RigidBody2D') && entity.getCollider()))
watch(() => animator.value?.controllerAsset, reference => {
  if (!animator.value) return
  const document = readAnimatorController(reference ?? null)
  if (!document) { animator.value.parameters = {}; animator.value.currentState = ''; return }
  animator.value.parameters = Object.fromEntries(document.parameters.map(parameter => [parameter.name, animator.value!.parameters[parameter.name] ?? parameter.defaultValue]))
  animator.value.currentState = document.defaultState
})
async function remove(kind: ComponentKind) {
  const approved = await requestConfirmation({ title: t('removeComponent'), message: `${t('removeComponent')}: ${kind}?`, confirmLabel: t('confirmAction'), cancelLabel: t('cancel'), destructive: true })
  if (approved && props.entity.removeComponent(kind)) pushHistory(`Remove ${kind}`)
}
function create(kind: UiElementKind) { createUiEntity(kind, props.entity.hasComponent('RectTransform') ? props.entity.uuid : null) }
function rgbHex(value: { r: number; g: number; b: number }) { return `#${[value.r, value.g, value.b].map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')}` }
function setColor(target: { r: number; g: number; b: number }, event: Event) { const value = (event.target as HTMLInputElement).value; target.r = parseInt(value.slice(1, 3), 16); target.g = parseInt(value.slice(3, 5), 16); target.b = parseInt(value.slice(5, 7), 16) }
function anchorLabel(preset: typeof anchorPresets[number]) { return t(`anchor_${preset.replace(/-/g, '_')}` as Parameters<typeof t>[0]) }
function resizeMap(axis: 'width' | 'height', event: Event) { if (!tileMap.value) return; const value = Number((event.target as HTMLInputElement).value); resizeTileMap(tileMap.value, axis === 'width' ? value : tileMap.value.width, axis === 'height' ? value : tileMap.value.height); pushHistory('Resize TileMap') }
function tileMapChanged() { if (!tileMap.value) return; tileMap.value.revision++; invalidateTileMap(tileMap.value); pushHistory('Edit TileMap') }
function openTilemapEditor() { tilemapEditorState.selectedEntityUuid = props.entity.uuid; tilemapEditorState.active = true; editorState.bottomPanelTab = 'tilemap'; editorState.bottomPanelOpen = true }
</script>

<style scoped>
.runtime-component { margin-bottom: 8px; border: 1px solid var(--border-subtle); border-radius: 10px; overflow: hidden; background: var(--surface-2); }.runtime-component header { min-height: 31px; padding: 0 8px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); }.runtime-component header strong { color: var(--text-primary); font-size: 10px; }.runtime-component header button { border: 0; color: var(--danger); background: transparent; }.runtime-component label, .range-values label { min-height: 31px; padding: 4px 8px; display: flex; align-items: center; justify-content: space-between; gap: 7px; border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 9px; }.runtime-component label:last-child { border-bottom: 0; }.runtime-component label > input:not([type='checkbox']):not([type='color']), .runtime-component label > select { width: 54%; min-width: 0; }.runtime-component label > div { width: 54%; display: flex; gap: 4px; }.runtime-component label > div input { min-width: 0; width: 50%; }.runtime-component label > .quad { display: grid; grid-template-columns: 1fr 1fr; }.runtime-component .stacked { align-items: stretch; flex-direction: column; }.runtime-component textarea { width: 100%; resize: vertical; }.range-values { display: grid; }.ui-palette { padding: 10px; border: 1px dashed var(--border-strong); border-radius: 10px; }.ui-palette > strong { color: var(--text-muted); font-size: 9px; }.ui-palette > div { margin-top: 7px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }.ui-palette button { min-width: 0; min-height: 27px; overflow: hidden; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--accent); background: var(--surface-3); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.open-editor { width: calc(100% - 16px); min-height: 28px; margin: 8px; border: 1px solid var(--accent); border-radius: 7px; color: var(--accent); background: var(--accent-soft); font-size: 9px; }
</style>

<template>
  <div class="config-wrapper">
    <aside class="config-panel" :class="{ visible: selectedEntity !== null }">
      <div v-if="selectedEntity" class="settings-content" @change="onConfigChange">
        <header class="inspector-header"><span class="eyebrow">{{ t('entitySettings') }}</span><h3>{{ selectedEntity.name }}_<small>{{ selectedEntity.id }}</small></h3></header>

        <InspectorSection :title="t('bodyType')" open>
          <select v-model="bodyType"><option value="Dynamic">{{ t('dynamic') }}</option><option value="Kinematic">{{ t('kinematic') }}</option><option value="Static">{{ t('static') }}</option></select>
          <PropertyRow :label="t('collisionLayer')"><select v-model.number="selectedEntity.layer" @change="onLayerChange"><option v-for="layer in estate.layers" :key="layer" :value="layer">{{ t('layer') }} {{ layer }}</option></select></PropertyRow>
        </InspectorSection>

        <InspectorSection :title="t('connections')" open>
          <div v-if="selectedConnections.length" class="connection-list">
            <article v-for="connection in selectedConnections" :key="connection.id" class="connection-item" :class="connection.breakState">
              <button class="connection-main" :title="connection.binding ? t('boundAsCompound') : undefined" @click="openConnection(connection.id)">
                <span class="connection-dot"></span>
                <span>
                  <strong>{{ connection.name }}</strong>
                  <small>
                    {{ connection.binding ? t('compound') : !connectionSharesLayer(connection, state.world.entities) ? t('layerIsolated') : t(connection.breakState) }}
                    <template v-if="connection.breakState !== 'intact' && connection.breakLink >= 0"> · {{ t('breakLocation', { link: connection.breakLink + 1 }) }}</template>
                    · {{ connection.anchors.length }} {{ t('entities').toLowerCase() }}
                  </small>
                </span>
              </button>
              <button v-if="!connection.binding && connection.breakState !== 'intact'" class="mini-button" :title="t('repairConnection')" @click="repair(connection.id)">↻</button>
              <button v-if="connection.binding" class="mini-button separate" :title="t('separateBinding')" @click="separate(connection.id)">⇄</button>
              <button class="mini-button danger" :title="t('deleteConnection')" @click="removeConnection(connection.id)">×</button>
            </article>
          </div>
          <p v-else class="empty-state">{{ t('noConnections') }}</p>
          <button class="primary-action" @click="openConnection(null)"><span>＋</span>{{ t('addConnection') }}</button>
        </InspectorSection>

        <InspectorSection :title="t('appearance')">
          <PropertyRow :label="t('colorRgb')"><button class="color-well" :style="{ background: entityColor }" :aria-label="t('pickColor')" @click="openColorPicker"></button></PropertyRow>
          <PropertyRow :label="t('transparency')"><NumberRange v-model="selectedEntity.transparency" :min="0" :max="100" :step="1" /></PropertyRow>
          <label class="stacked-field"><span>{{ t('imageTexture') }}</span><input ref="textureInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" @change="applyTexture"></label>
          <button v-if="selectedEntity.texture" class="secondary-action" @click="clearTexture">{{ t('removeTexture') }}</button>
        </InspectorSection>

        <InspectorSection :title="t('shapeSize')">
          <PropertyRow :label="t('absoluteSize')"><div class="pair"><input v-model.number="absoluteSizeX" type="number" min="0.000001" step="0.1"><input v-model.number="absoluteSizeY" type="number" min="0.000001" step="0.1"></div></PropertyRow>
        </InspectorSection>

        <InspectorSection :title="t('transformMotion')" open>
          <PropertyRow :label="t('position')"><div class="pair"><input v-model.number="selectedEntity.transform.position.x" type="number" step="0.01"><input v-model.number="selectedEntity.transform.position.y" type="number" step="0.01"></div></PropertyRow>
          <PropertyRow :label="t('rotationDegrees')"><NumberRange v-model="rotationDegrees" :min="-180" :max="180" :step="1" /></PropertyRow>
          <PropertyRow :label="t('linearVelocity')"><div class="pair"><input v-model.number="selectedEntity.velocity.x" type="number" step="0.01"><input v-model.number="selectedEntity.velocity.y" type="number" step="0.01"></div></PropertyRow>
          <PropertyRow :label="t('accelerationXY')"><div class="pair"><input v-model.number="selectedEntity.acceleration.x" type="number" step="0.01"><input v-model.number="selectedEntity.acceleration.y" type="number" step="0.01"></div></PropertyRow>
          <PropertyRow :label="t('angularVelocity')"><input v-model.number="selectedEntity.angularVelocity" type="number" step="0.01"></PropertyRow>
        </InspectorSection>

        <InspectorSection :title="t('dampingFriction')">
          <PropertyRow :label="t('linearDamping')"><NumberRange v-model="selectedEntity.linearDamping" :min="0" :max="Math.max(1, selectedEntity.linearDamping)" :step="0.01" /></PropertyRow>
          <PropertyRow :label="t('angularDamping')"><NumberRange v-model="selectedEntity.angularDamping" :min="0" :max="Math.max(1, selectedEntity.angularDamping)" :step="0.01" /></PropertyRow>
          <PropertyRow :label="t('staticFriction')"><NumberRange v-model="selectedEntity.staticFriction" :min="0" :max="Math.max(1, selectedEntity.staticFriction)" :step="0.01" /></PropertyRow>
          <PropertyRow :label="t('dynamicFriction')"><NumberRange v-model="selectedEntity.dynamicFriction" :min="0" :max="Math.max(1, selectedEntity.dynamicFriction)" :step="0.01" /></PropertyRow>
        </InspectorSection>

        <InspectorSection :title="t('massProperties')">
          <DiagnosticRow :label="t('invMass')" :value="selectedEntity.mass > 0 && bodyType === 'Dynamic' ? (1 / selectedEntity.mass).toPrecision(6) : `0 (${t('infinite')})`" />
          <DiagnosticRow :label="t('invInertia')" :value="effectiveEntityInertia > 0 && bodyType === 'Dynamic' ? (1 / effectiveEntityInertia).toPrecision(6) : `0 (${t('infinite')})`" />
          <DiagnosticRow :label="t('surfaceArea')" :value="selectedEntityArea.toPrecision(7)" />
          <PropertyRow :label="t('density')"><NumberRange v-model="selectedEntity.density" :min="0.000001" :max="Math.max(10, selectedEntity.density)" :step="0.000001" @update:model-value="onDensityChange" /></PropertyRow>
          <PropertyRow :label="t('mass')"><NumberRange v-model="selectedEntity.mass" :min="0.000001" :max="Math.max(100, selectedEntity.mass)" :step="0.000001" @update:model-value="onMassChange" /></PropertyRow>
          <PropertyRow :label="t('automaticInertia')"><ToggleSwitch v-model="selectedEntity.autoInertia" /></PropertyRow>
          <PropertyRow v-if="!selectedEntity.autoInertia" :label="t('momentInertia')"><input v-model.number="selectedEntity.inertia" type="number" min="1e-24" step="0.1"></PropertyRow>
          <PropertyRow :label="t('gravityScale')"><NumberRange v-model="selectedEntity.gravityScale" :min="Math.min(0, selectedEntity.gravityScale)" :max="Math.max(5, selectedEntity.gravityScale)" :step="0.1" /></PropertyRow>
          <PropertyRow :label="t('localGravity')"><input v-model.number="selectedEntity.gravity" type="number" step="0.1"></PropertyRow>
        </InspectorSection>

        <InspectorSection :title="t('continuousForces')">
          <PropertyRow :label="t('forceXY')"><div class="pair"><input v-model.number="selectedEntity.force.x" type="number" step="0.01"><input v-model.number="selectedEntity.force.y" type="number" step="0.01"></div></PropertyRow>
          <PropertyRow :label="t('torque')"><input v-model.number="selectedEntity.torque" type="number" step="0.01"></PropertyRow>
        </InspectorSection>

        <InspectorSection :title="t('interactiveImpulses')">
          <div class="pair"><input v-model.number="impulseX" type="number" :placeholder="t('impulseX')"><input v-model.number="impulseY" type="number" :placeholder="t('impulseY')"></div>
          <div class="pair"><input v-model.number="offsetX" type="number" :placeholder="t('offsetX')"><input v-model.number="offsetY" type="number" :placeholder="t('offsetY')"></div>
          <button class="primary-action" :disabled="bodyType !== 'Dynamic'" @click="applyImpulse">{{ t('applyLinearImpulse') }}</button>
          <input v-model.number="angularImpulse" type="number" :placeholder="t('angularImpulse')">
          <button class="primary-action" :disabled="bodyType !== 'Dynamic'" @click="applyAngularImpulse">{{ t('applyAngularImpulse') }}</button>
        </InspectorSection>

        <InspectorSection :title="t('materialResponse')">
          <PropertyRow :label="t('isSensor')"><ToggleSwitch v-model="selectedEntity.isSensor" /></PropertyRow>
          <PropertyRow :label="t('restitution')"><NumberRange v-model="selectedEntity.restitution" :min="0" :max="1" :step="0.01" /></PropertyRow>
          <PropertyRow :label="t('restitutionThreshold')"><input v-model.number="selectedEntity.restitutionThreshold" type="number" min="0" step="0.1"></PropertyRow>
        </InspectorSection>

        <InspectorSection v-if="prefs.showDiagnostics" :title="t('collisionDiagnostics')">
          <DiagnosticRow :label="t('contacts')" :value="String(selectedEntity.contactCount)" :active="selectedEntity.contactCount > 0" />
          <DiagnosticRow v-if="selectedEntity.contactCount > 0" :label="t('normal')" :value="`[${selectedEntity.contactNormal.x.toFixed(3)}, ${selectedEntity.contactNormal.y.toFixed(3)}]`" />
          <DiagnosticRow v-if="selectedEntity.contactCount > 0" :label="t('penetration')" :value="`${selectedEntity.penetrationDepth.toPrecision(5)} m`" />
        </InspectorSection>
      </div>
    </aside>

    <div v-if="showColorPicker" class="modal-scrim" @mousedown.self="showColorPicker = false"><div class="color-modal"><h4>{{ t('selectColor') }}</h4><input v-model="tempColor" type="color"><div><button @click="showColorPicker = false">{{ t('cancel') }}</button><button class="primary" @click="applyColor">{{ t('apply') }}</button></div></div></div>
    <ConnectionBuilder v-if="selectedEntity && builderOpen" :selected-id="selectedEntity.id" :connection-id="editingConnectionId" @close="builderOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, watch } from 'vue'
import { t } from '../i18n'
import { editorState as estate } from '../store/editor'
import { deleteConnection, physicsState as state, pushHistory, repairConnection } from '../store/physics'
import { preferencesState as prefs } from '../store/preferences'
import { requestConfirmation } from '../store/dialog'
import { BoxEntity } from '../world/BoxEntity'
import { CircleEntity } from '../world/CircleEntity'
import { TriangleEntity } from '../world/TriangleEntity'
import { effectiveInertia, entityArea, finiteNumber, MIN_AREA, MIN_SIZE, normalizeEntity, syncDensityFromMass, syncMassFromDensity } from '../world/geometry'
import ConnectionBuilder from './ConnectionBuilder.vue'
import { connectionSharesLayer } from '../world/Connection'

const InspectorSection = defineComponent({ props: { title: { type: String, required: true }, open: Boolean }, setup(props, { slots }) { return () => h('details', { class: 'inspector-section', open: props.open }, [h('summary', [h('span', props.title), h('i', '⌄')]), h('div', { class: 'section-body' }, slots.default?.())]) } })
const PropertyRow = defineComponent({ props: { label: { type: String, required: true } }, setup(props, { slots }) { return () => h('label', { class: 'property-row' }, [h('span', props.label), h('div', { class: 'property-control' }, slots.default?.())]) } })
const DiagnosticRow = defineComponent({ props: { label: { type: String, required: true }, value: { type: String, required: true }, active: Boolean }, setup(props) { return () => h('div', { class: ['diagnostic-row', { active: props.active }] }, [h('span', props.label), h('code', props.value)]) } })
const ToggleSwitch = defineComponent({ props: { modelValue: { type: Boolean, required: true } }, emits: ['update:modelValue'], setup(props, { emit }) { return () => h('button', { class: ['toggle', { active: props.modelValue }], role: 'switch', 'aria-checked': props.modelValue, onClick: () => emit('update:modelValue', !props.modelValue) }, h('i')) } })
const NumberRange = defineComponent({ props: { modelValue: { type: Number, required: true }, min: { type: Number, required: true }, max: { type: Number, required: true }, step: { type: Number, required: true } }, emits: ['update:modelValue'], setup(props, { emit }) { const update = (event: Event) => emit('update:modelValue', Number((event.target as HTMLInputElement).value)); return () => h('div', { class: 'number-range' }, [h('input', { type: 'range', value: props.modelValue, min: props.min, max: props.max, step: props.step, onInput: update }), h('input', { type: 'number', value: props.modelValue, step: props.step, onChange: update })]) } })

const selectedEntity = computed(() => state.selectedEntityId === null ? null : state.world.entities.find(entity => entity.id === state.selectedEntityId) ?? null)
const selectedConnections = computed(() => selectedEntity.value ? state.world.connections.filter(connection => connection.anchors.some(anchor => anchor.entityId === selectedEntity.value!.id)) : [])
const entityColor = computed(() => selectedEntity.value ? `rgb(${selectedEntity.value.color.r}, ${selectedEntity.value.color.g}, ${selectedEntity.value.color.b})` : 'transparent')
const selectedEntityArea = computed(() => selectedEntity.value ? entityArea(selectedEntity.value) : 0)
const effectiveEntityInertia = computed(() => selectedEntity.value ? effectiveInertia(selectedEntity.value) : 0)

const builderOpen = ref(false)
const editingConnectionId = ref<number | null>(null)
function openConnection(id: number | null) { editingConnectionId.value = id; builderOpen.value = true }
async function confirmConnectionAction(title: string, message: string): Promise<boolean> { return !prefs.confirmDestructiveActions || requestConfirmation({ title, message, confirmLabel: t('confirmAction'), cancelLabel: t('cancel'), destructive: true }) }
async function removeConnection(id: number) { if (!await confirmConnectionAction(t('deleteConnectionTitle'), t('confirmConnectionDelete'))) return; deleteConnection(id); pushHistory(); estate.statusText = t('connectionDeleted') }
async function separate(id: number) { if (!await confirmConnectionAction(t('separateBindingTitle'), t('confirmSeparateBinding'))) return; deleteConnection(id); pushHistory(); estate.statusText = t('bindingSeparated') }
function repair(id: number) { repairConnection(id); pushHistory() }

function onConfigChange() { if (!selectedEntity.value) return; if (selectedEntity.value.isStatic) selectedEntity.value.isKinematic = false; normalizeEntity(selectedEntity.value); pushHistory() }
function onLayerChange() { if (selectedEntity.value) estate.activeLayer = selectedEntity.value.layer }
const bodyType = computed({ get: () => !selectedEntity.value ? 'Dynamic' : selectedEntity.value.isStatic ? 'Static' : selectedEntity.value.isKinematic ? 'Kinematic' : 'Dynamic', set: value => { if (!selectedEntity.value) return; selectedEntity.value.isStatic = value === 'Static'; selectedEntity.value.isKinematic = value === 'Kinematic'; normalizeEntity(selectedEntity.value) } })
function onDensityChange() { if (selectedEntity.value) syncMassFromDensity(selectedEntity.value) }
function onMassChange() { if (selectedEntity.value) syncDensityFromMass(selectedEntity.value) }
watch(selectedEntityArea, area => { if (selectedEntity.value && area > MIN_AREA) syncMassFromDensity(selectedEntity.value) })

const textureInput = ref<HTMLInputElement | null>(null)
function applyTexture(event: Event) { const entity = selectedEntity.value; const file = (event.target as HTMLInputElement).files?.[0]; if (!entity || !file) return; const reader = new FileReader(); reader.onload = () => { if (typeof reader.result !== 'string') return; entity.texture = reader.result; entity.textureImage = undefined; pushHistory() }; reader.onerror = () => { estate.statusText = t('textureFailed') }; reader.readAsDataURL(file) }
function clearTexture() { if (!selectedEntity.value) return; selectedEntity.value.texture = null; selectedEntity.value.textureImage = undefined; if (textureInput.value) textureInput.value.value = ''; pushHistory() }

const impulseX = ref(0), impulseY = ref(0), offsetX = ref(0), offsetY = ref(0), angularImpulse = ref(0)
function applyImpulse() { const entity = selectedEntity.value; if (!entity || bodyType.value !== 'Dynamic') return; normalizeEntity(entity); const x = finiteNumber(impulseX.value), y = finiteNumber(impulseY.value); entity.velocity.x += x / entity.mass; entity.velocity.y += y / entity.mass; entity.angularVelocity += (finiteNumber(offsetX.value) * y - finiteNumber(offsetY.value) * x) / effectiveInertia(entity); normalizeEntity(entity); pushHistory() }
function applyAngularImpulse() { const entity = selectedEntity.value; if (!entity || bodyType.value !== 'Dynamic') return; entity.angularVelocity += finiteNumber(angularImpulse.value) / effectiveInertia(entity); normalizeEntity(entity); pushHistory() }

const showColorPicker = ref(false), tempColor = ref('#ffffff')
function openColorPicker() { if (!selectedEntity.value) return; const { r, g, b } = selectedEntity.value.color; tempColor.value = `#${[r, g, b].map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`; showColorPicker.value = true }
function applyColor() { if (selectedEntity.value) { const value = Number.parseInt(tempColor.value.slice(1), 16); selectedEntity.value.color = { r: value >> 16 & 255, g: value >> 8 & 255, b: value & 255 }; pushHistory() } showColorPicker.value = false }

const rotationDegrees = computed({ get: () => selectedEntity.value ? Number((-selectedEntity.value.transform.rotation * 180 / Math.PI).toFixed(4)) : 0, set: value => { if (selectedEntity.value && Number.isFinite(value)) selectedEntity.value.transform.rotation = -value * Math.PI / 180 } })
function entityDimension(axis: 'x' | 'y'): number { const entity = selectedEntity.value; if (!entity) return 0; if (entity instanceof CircleEntity) return (axis === 'x' ? entity.radiusX * entity.transform.scale.x : entity.radiusY * entity.transform.scale.y) * 2; if (!(entity instanceof BoxEntity || entity instanceof TriangleEntity)) return 0; const values = entity.vertices.map(vertex => vertex[axis]); return (Math.max(...values) - Math.min(...values)) * entity.transform.scale[axis] }
function setEntityDimension(axis: 'x' | 'y', value: number) { const entity = selectedEntity.value; if (!entity || !Number.isFinite(value) || value < MIN_SIZE) return; if (entity instanceof CircleEntity) entity.transform.scale[axis] = value / ((axis === 'x' ? entity.radiusX : entity.radiusY) * 2); else if (entity instanceof BoxEntity || entity instanceof TriangleEntity) { const values = entity.vertices.map(vertex => vertex[axis]); entity.transform.scale[axis] = value / (Math.max(...values) - Math.min(...values)) } }
const absoluteSizeX = computed({ get: () => entityDimension('x'), set: value => setEntityDimension('x', value) })
const absoluteSizeY = computed({ get: () => entityDimension('y'), set: value => setEntityDimension('y', value) })
</script>

<style scoped>
.config-wrapper { position: absolute; inset: 42px 0 27px auto; width: min(340px, 38vw); z-index: 180; pointer-events: none; }
.config-panel { position: absolute; inset: 0; transform: translateX(calc(100% + 20px)); pointer-events: auto; overflow: auto; color: var(--text-secondary); background: var(--surface-1); border-left: 1px solid var(--border-subtle); backdrop-filter: var(--glass-blur); box-shadow: -14px 0 40px rgba(0,0,0,.16); transition: transform 260ms cubic-bezier(.2,.8,.2,1); }
.config-panel.visible { transform: translateX(0); }
.settings-content { min-height: 100%; padding: 16px 14px 28px; display: flex; flex-direction: column; gap: 8px; }
.inspector-header { padding: 4px 4px 10px; }.eyebrow { color: var(--accent); font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }h3 { margin: 4px 0 0; color: var(--text-primary); font-size: 18px; font-weight: 610; overflow: hidden; text-overflow: ellipsis; }h3 small { color: var(--text-muted); font-size: .7em; font-weight: 500; }
:deep(.inspector-section) { border: 1px solid var(--border-subtle); border-radius: 12px; background: color-mix(in srgb, var(--surface-2) 72%, transparent); overflow: hidden; }
:deep(.inspector-section summary) { min-height: 38px; padding: 0 11px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; list-style: none; color: var(--text-secondary); font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
:deep(.inspector-section summary::-webkit-details-marker) { display: none; }:deep(.inspector-section summary i) { font-style: normal; transition: transform 160ms ease; }:deep(.inspector-section[open] summary i) { transform: rotate(180deg); }
:deep(.section-body) { padding: 4px 11px 12px; display: flex; flex-direction: column; gap: 9px; border-top: 1px solid var(--border-subtle); }
:deep(.section-body > select), :deep(.section-body > input) { width: 100%; }
:deep(.property-row) { min-height: 39px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border-bottom: 1px solid var(--border-subtle); color: var(--text-secondary); font-size: 11.5px; }
:deep(.property-row:last-child) { border-bottom: 0; }:deep(.property-control) { width: 58%; display: flex; justify-content: flex-end; }:deep(.property-control > input), :deep(.property-control > select) { width: 100%; min-width: 0; }
.pair { width: 100%; display: flex; gap: 6px; }.pair input { width: 50%; min-width: 0; }
:deep(.number-range) { width: 100%; display: flex; align-items: center; gap: 7px; }:deep(.number-range input[type='range']) { min-width: 0; flex: 1; accent-color: var(--accent); }:deep(.number-range input[type='number']) { width: 72px; min-width: 60px; }
:deep(.toggle) { width: 38px; height: 22px; padding: 3px; border: 0; border-radius: 99px; background: var(--surface-3); }:deep(.toggle i) { display: block; width: 16px; height: 16px; border-radius: 50%; background: var(--text-muted); transition: transform 180ms ease; }:deep(.toggle.active) { background: var(--accent); }:deep(.toggle.active i) { transform: translateX(16px); background: var(--accent-contrast); }
:deep(.diagnostic-row) { min-height: 30px; display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--text-muted); font-size: 10.5px; }:deep(.diagnostic-row code) { color: var(--accent); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }:deep(.diagnostic-row.active code) { color: var(--warning); }
.stacked-field { display: flex; flex-direction: column; gap: 6px; color: var(--text-secondary); font-size: 11.5px; }.stacked-field input { width: 100%; color: var(--text-muted); font-size: 10px; }
.color-well { width: 48px; height: 25px; border: 3px solid var(--surface-3); border-radius: 8px; box-shadow: 0 0 0 1px var(--border-strong); }
.primary-action, .secondary-action { min-height: 33px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 8px; border: 1px solid var(--accent); color: var(--accent-contrast); background: var(--accent); font-size: 11px; }.secondary-action { border-color: var(--border-subtle); color: var(--text-secondary); background: var(--surface-3); }
.empty-state { margin: 5px 0; color: var(--text-muted); font-size: 11px; text-align: center; }.connection-list { display: flex; flex-direction: column; gap: 6px; }.connection-item { display: flex; align-items: center; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-1); }.connection-main { min-width: 0; flex: 1; padding: 7px; display: flex; align-items: center; gap: 8px; border: 0; background: transparent; text-align: left; }.connection-main > span:last-child { min-width: 0; display: flex; flex-direction: column; }.connection-main strong, .connection-main small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.connection-main strong { color: var(--text-primary); font-size: 11px; }.connection-main small { color: var(--text-muted); font-size: 9.5px; }.connection-dot { width: 8px; height: 8px; flex: 0 0 8px; border-radius: 50%; background: var(--connection); box-shadow: 0 0 7px var(--connection); }.connection-item.snapped .connection-dot, .connection-item.torn .connection-dot { background: var(--connection-broken); box-shadow: 0 0 7px var(--connection-broken); }.mini-button { width: 26px; height: 28px; border: 0; background: transparent; color: var(--text-muted); }.mini-button:hover { color: var(--accent); }.mini-button.danger:hover { color: var(--danger); }
.modal-scrim { position: fixed; inset: 0; z-index: 1300; display: grid; place-items: center; background: var(--scrim); pointer-events: auto; backdrop-filter: blur(6px); }.color-modal { width: 250px; padding: 18px; display: flex; flex-direction: column; align-items: center; gap: 14px; border: 1px solid var(--border-subtle); border-radius: 16px; background: var(--surface-2); box-shadow: var(--shadow-lg); }.color-modal h4 { margin: 0; }.color-modal input { width: 100px; height: 76px; border: 0; background: transparent; }.color-modal > div { width: 100%; display: flex; gap: 8px; }.color-modal button { flex: 1; min-height: 34px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-3); }.color-modal button.primary { color: var(--accent-contrast); border-color: var(--accent); background: var(--accent); }
@media (max-width: 760px) { .config-wrapper { width: min(330px, calc(100vw - 68px)); } }
</style>

<template>
  <div class="modal-scrim" @mousedown.self="emit('close')">
    <section class="builder" role="dialog" aria-modal="true" :aria-label="t('connectionBuilder')">
      <header><div><span class="eyebrow">{{ t('connections') }}</span><h2>{{ t('connectionBuilder') }}</h2></div><button class="icon-button" @click="emit('close')">×</button></header>
      <div class="builder-scroll">
        <label class="field"><span>{{ t('connectionName') }}</span><input v-model="draft.name" type="text" maxlength="80"></label>

        <div class="section-title">{{ t('connectedObjects') }}</div>
        <p class="hint">{{ t('selectAtLeastOne') }}</p>
        <div class="object-picker">
          <label v-for="entity in availableEntities" :key="entity.id" :class="{ selected: participantIds.includes(entity.id), fixed: entity.id === selectedId }">
            <input type="checkbox" :checked="participantIds.includes(entity.id)" :disabled="entity.id === selectedId" @change="toggleParticipant(entity.id)">
            <span class="shape">{{ shapeGlyph(entity.shapeType) }}</span><span>{{ entity.name }}_{{ entity.id }}</span>
          </label>
        </div>

        <div v-if="participantIds.length >= 2" class="anchor-list">
          <div v-for="(entityId, participantIndex) in participantIds" :key="entityId" class="anchor-card">
            <strong>{{ entityName(entityId) }}</strong>
            <label><span>{{ t('anchor') }}</span><select v-model="anchorDrafts[participantIndex].mode">
              <option value="center">{{ t('center') }}</option><option value="surface">{{ t('surface') }}</option>
              <option v-if="isPolygon(entityId)" value="vertex">{{ t('vertex') }}</option><option v-if="isPolygon(entityId)" value="side">{{ t('side') }}</option>
            </select></label>
            <label v-if="anchorDrafts[participantIndex].mode === 'vertex' || anchorDrafts[participantIndex].mode === 'side'"><span>{{ t('anchorIndex') }}</span><input v-model.number="anchorDrafts[participantIndex].index" type="number" min="0" step="1"></label>
            <label v-if="anchorDrafts[participantIndex].mode === 'side'"><span>{{ t('sidePosition') }}</span><input v-model.number="anchorDrafts[participantIndex].sideT" type="range" min="0" max="1" step="0.01"></label>
          </div>
        </div>

        <div class="section-title">{{ t('route') }}</div>
        <div class="segmented"><button v-for="style in styles" :key="style" :class="{ active: draft.style === style }" @click="draft.style = style">{{ t(style) }}</button></div>
        <label v-if="draft.style === 'curved'" class="field"><span>{{ t('routeCurvature') }}</span><div class="range-pair"><input v-model.number="draft.curvature" type="range" min="-1" max="1" step="0.01"><output>{{ draft.curvature.toFixed(2) }}</output></div></label>

        <div class="section-title">{{ t('materialResponse') }}</div>
        <label class="switch-row"><span>{{ t('stretchable') }}</span><button class="toggle" :class="{ active: draft.stretchable }" role="switch" :aria-checked="draft.stretchable" @click="draft.stretchable = !draft.stretchable"><i></i></button></label>
        <label class="switch-row"><span>{{ t('bendable') }}</span><button class="toggle" :class="{ active: draft.bendable }" role="switch" :aria-checked="draft.bendable" @click="draft.bendable = !draft.bendable"><i></i></button></label>
        <div class="parameter-grid">
          <label><span>{{ t('stiffness') }}</span><input v-model.number="draft.stiffness" type="number" min="0" step="10"></label>
          <label><span>{{ t('connectionDamping') }}</span><input v-model.number="draft.damping" type="number" min="0" step="1"></label>
          <label><span>{{ t('maxStretch') }}</span><input v-model.number="stretchPercent" type="number" min="0" step="1"></label>
          <label><span>{{ t('bendTolerance') }}</span><input v-model.number="draft.bendingToleranceMass" type="number" min="0" step="1"></label>
          <label><span>{{ t('stretchTolerance') }}</span><input v-model.number="draft.stretchingToleranceMass" type="number" min="0" step="1"></label>
        </div>
      </div>
      <footer><button class="secondary" @click="emit('close')">{{ t('cancel') }}</button><button class="primary" :disabled="participantIds.length < 2" @click="save">{{ t(connectionId === null ? 'createConnection' : 'saveConnection') }}</button></footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { t } from '../i18n'
import { editorState } from '../store/editor'
import { addConnection, physicsState, pushHistory } from '../store/physics'
import { BoxEntity } from '../world/BoxEntity'
import { TriangleEntity } from '../world/TriangleEntity'
import { createConnection as createConnectionModel, deriveAnchor, normalizeConnection, resolveAnchor, type AnchorMode, type Connection, type ConnectionStyle } from '../world/Connection'

const props = defineProps<{ selectedId: number; connectionId: number | null }>()
const emit = defineEmits<{ close: [] }>()
const existing = props.connectionId === null ? null : physicsState.world.connections.find(connection => connection.id === props.connectionId) ?? null
const participantIds = ref<number[]>(existing ? existing.anchors.map(anchor => anchor.entityId) : [props.selectedId])
if (!participantIds.value.includes(props.selectedId)) participantIds.value.unshift(props.selectedId)
const anchorDrafts = reactive<Array<{ mode: AnchorMode; index: number; sideT: number }>>(
  participantIds.value.map(entityId => {
    const anchor = existing?.anchors.find(candidate => candidate.entityId === entityId)
    return { mode: anchor?.mode ?? 'surface', index: anchor?.index ?? 0, sideT: anchor?.sideT ?? 0.5 }
  })
)
const draft = reactive({
  name: existing?.name ?? `Connection ${physicsState.world.connections.length + 1}`,
  style: existing?.style ?? 'straight' as ConnectionStyle,
  curvature: existing?.curvature ?? 0.18,
  stretchable: existing?.stretchable ?? false,
  bendable: existing?.bendable ?? true,
  stiffness: existing?.stiffness ?? 1200,
  damping: existing?.damping ?? 35,
  maxStretchRatio: existing?.maxStretchRatio ?? 1.25,
  bendingToleranceMass: existing?.bendingToleranceMass ?? 1e12,
  stretchingToleranceMass: existing?.stretchingToleranceMass ?? 1e12
})
const styles: ConnectionStyle[] = ['straight', 'curved', 'manual']
const availableEntities = computed(() => physicsState.world.entities.filter(entity => entity.id === props.selectedId || entity.id !== props.selectedId))
const stretchPercent = computed({ get: () => (draft.maxStretchRatio - 1) * 100, set: value => { draft.maxStretchRatio = 1 + Math.max(0, Number(value) || 0) / 100 } })

function toggleParticipant(entityId: number) {
  const index = participantIds.value.indexOf(entityId)
  if (index === -1) {
    participantIds.value.push(entityId)
    anchorDrafts.push({ mode: 'surface', index: 0, sideT: 0.5 })
  } else if (entityId !== props.selectedId) {
    participantIds.value.splice(index, 1)
    anchorDrafts.splice(index, 1)
  }
}
function entityName(id: number) { const entity = physicsState.world.entities.find(candidate => candidate.id === id); return entity ? `${entity.name}_${entity.id}` : String(id) }
function isPolygon(id: number) { const entity = physicsState.world.entities.find(candidate => candidate.id === id); return entity instanceof BoxEntity || entity instanceof TriangleEntity }
function shapeGlyph(type: string) { return type === 'Circle' ? '○' : type === 'Triangle' ? '△' : '□' }

function applyDraft(connection: Connection): void {
  connection.name = draft.name
  connection.style = draft.style
  connection.curvature = draft.curvature
  connection.stretchable = draft.stretchable
  connection.bendable = draft.bendable
  connection.stiffness = draft.stiffness
  connection.damping = draft.damping
  connection.maxStretchRatio = draft.maxStretchRatio
  connection.bendingToleranceMass = draft.bendingToleranceMass
  connection.stretchingToleranceMass = draft.stretchingToleranceMass
  connection.anchors = participantIds.value.map((entityId, index) => {
    const entity = physicsState.world.entities.find(candidate => candidate.id === entityId)!
    const neighborId = participantIds.value[index + 1] ?? participantIds.value[index - 1]
    const toward = physicsState.world.entities.find(candidate => candidate.id === neighborId)?.transform.position ?? entity.transform.position
    return deriveAnchor(entity, anchorDrafts[index].mode, anchorDrafts[index].index, anchorDrafts[index].sideT, toward)
  })
  connection.restLengths = connection.anchors.slice(0, -1).map((anchor, index) => {
    const a = resolveAnchor(anchor, physicsState.world.entities)!
    const b = resolveAnchor(connection.anchors[index + 1], physicsState.world.entities)!
    return Math.max(1e-6, Math.hypot(b.x - a.x, b.y - a.y))
  })
  connection.manualSegments = connection.restLengths.map((_, index) => existing?.manualSegments[index] ?? [{ x: 0, y: 0 }, { x: 1, y: 0 }])
  normalizeConnection(connection, physicsState.world.entities)
}

function save() {
  if (participantIds.value.length < 2) return
  let connection: Connection
  if (existing) {
    connection = createConnectionModel(existing.id, physicsState.world.entities, participantIds.value, anchorDrafts.map(anchor => anchor.mode))
    applyDraft(connection)
    connection.breakState = existing.breakState
    const index = physicsState.world.connections.findIndex(candidate => candidate.id === existing.id)
    physicsState.world.connections.splice(index, 1, connection)
  } else {
    connection = addConnection(participantIds.value, anchorDrafts.map(anchor => anchor.mode))
    applyDraft(connection)
  }
  pushHistory()
  editorState.statusText = t(existing ? 'connectionUpdated' : 'connectionCreated')
  if (connection.style === 'manual') {
    editorState.manualConnectionId = connection.id
    editorState.manualConnectionPoints.splice(0)
    editorState.statusText = t('drawingInstructions')
  }
  emit('close')
}
</script>

<style scoped>
.modal-scrim { position: fixed; inset: 0; z-index: 1200; display: grid; place-items: center; padding: 24px; background: var(--scrim); backdrop-filter: blur(7px); }
.builder { width: min(720px, 100%); max-height: min(780px, calc(100vh - 48px)); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-subtle); border-radius: 20px; background: var(--surface-2); box-shadow: var(--shadow-lg); }
header, footer { flex: 0 0 auto; padding: 16px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--border-subtle); }
footer { justify-content: flex-end; border-top: 1px solid var(--border-subtle); border-bottom: 0; }
.eyebrow { color: var(--accent); font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
h2 { margin: 2px 0 0; font-size: 18px; letter-spacing: -.02em; }
.icon-button { width: 30px; height: 30px; border: 0; border-radius: 9px; background: var(--surface-3); color: var(--text-secondary); font-size: 20px; }
.builder-scroll { padding: 18px; overflow: auto; display: flex; flex-direction: column; gap: 12px; }
.field, .anchor-card label, .parameter-grid label { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--text-secondary); font-size: 12px; }
.field input[type='text'] { width: min(330px, 60%); }
.section-title { margin-top: 7px; color: var(--text-muted); font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.hint { margin: -7px 0 0; color: var(--text-muted); font-size: 11px; }
.object-picker { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
.object-picker label { min-height: 38px; padding: 8px 10px; display: flex; align-items: center; gap: 8px; border: 1px solid var(--border-subtle); border-radius: 10px; color: var(--text-secondary); background: var(--surface-1); font-size: 12px; }
.object-picker label.selected { color: var(--text-primary); border-color: color-mix(in srgb, var(--accent) 45%, transparent); background: var(--accent-soft); }
.object-picker input { accent-color: var(--accent); }
.shape { color: var(--accent); font-size: 17px; }
.anchor-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.anchor-card { padding: 12px; display: flex; flex-direction: column; gap: 9px; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-1); }
.anchor-card strong { overflow: hidden; text-overflow: ellipsis; font-size: 12px; }
.anchor-card input, .anchor-card select { width: 130px; }
.segmented { display: grid; grid-template-columns: repeat(3, 1fr); padding: 4px; border-radius: 11px; background: var(--surface-3); }
.segmented button { min-height: 31px; border: 0; border-radius: 8px; background: transparent; color: var(--text-muted); font-size: 11px; }
.segmented button.active { color: var(--accent-contrast); background: var(--accent); }
.range-pair { width: min(330px, 60%); display: flex; align-items: center; gap: 10px; }
.range-pair input { flex: 1; accent-color: var(--accent); }
.range-pair output { width: 40px; text-align: right; font-variant-numeric: tabular-nums; }
.switch-row { min-height: 39px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); color: var(--text-secondary); font-size: 12px; }
.toggle { width: 38px; height: 22px; padding: 3px; border: 0; border-radius: 99px; background: var(--surface-3); }
.toggle i { display: block; width: 16px; height: 16px; border-radius: 50%; background: var(--text-muted); transition: transform 180ms ease; }
.toggle.active { background: var(--accent); }.toggle.active i { transform: translateX(16px); background: var(--accent-contrast); }
.parameter-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 18px; }
.parameter-grid label { min-height: 38px; border-bottom: 1px solid var(--border-subtle); }
.parameter-grid input { width: 125px; }
footer button { min-width: 105px; min-height: 35px; border-radius: 9px; }
.secondary { border: 1px solid var(--border-subtle); background: var(--surface-3); }
.primary { border: 1px solid var(--accent); color: var(--accent-contrast); background: var(--accent); }
@media (max-width: 620px) { .object-picker, .anchor-list, .parameter-grid { grid-template-columns: 1fr; } }
</style>

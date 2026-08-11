<template>
  <div class="settings-page">
    <header class="page-header">
      <div>
        <span class="eyebrow">Nova_A 1.8.0</span>
        <h1>{{ t('settings') }}</h1>
      </div>
      <div class="theme-switch" :aria-label="t('theme')">
        <button :class="{ active: prefs.theme === 'dark' }" @click="setTheme('dark')">☾ {{ t('dark') }}</button>
        <button :class="{ active: prefs.theme === 'light' }" @click="setTheme('light')">☀ {{ t('light') }}</button>
      </div>
    </header>

    <div class="settings-grid">
      <section class="settings-card">
        <div class="card-heading"><span class="card-icon">◐</span><h2>{{ t('appearanceSettings') }}</h2></div>
        <SettingRow :label="t('language')">
          <select v-model="prefs.locale">
            <option value="en">{{ t('english') }}</option>
            <option value="de">{{ t('german') }}</option>
            <option value="zh">{{ t('chinese') }}</option>
          </select>
        </SettingRow>
        <SettingRow :label="t('interfaceScale')">
          <div class="value-control"><input v-model.number="prefs.uiScale" type="range" min="0.85" max="1.25" step="0.05"><output>{{ Math.round(prefs.uiScale * 100) }}%</output></div>
        </SettingRow>
        <SettingRow :label="t('compactMode')"><ToggleSwitch v-model="prefs.compactMode" /></SettingRow>
        <SettingRow :label="t('reduceMotion')"><ToggleSwitch v-model="prefs.reduceMotion" /></SettingRow>
        <SettingRow :label="t('highContrast')"><ToggleSwitch v-model="prefs.highContrast" /></SettingRow>
      </section>

      <section class="settings-card" @change="applyPhysicsSettings">
        <div class="card-heading"><span class="card-icon">⌁</span><h2>{{ t('physicsSettings') }}</h2></div>
        <p>{{ t('physicsDescription') }}</p>
        <SettingRow :label="t('globalGravity')"><input v-model.number="physics.globalSettings.gravity" type="number" step="0.1"></SettingRow>
        <SettingRow :label="t('globalAirDamping')"><input v-model.number="physics.globalSettings.airFriction" type="number" min="0" step="0.01"></SettingRow>
        <SettingRow :label="t('timeScale')"><input v-model.number="physics.globalSettings.timeScale" type="number" min="0" step="0.1"></SettingRow>
        <SettingRow :label="t('physicsTickRate')">
          <select v-model.number="physics.globalSettings.tickRate">
            <option :value="30">30 Hz</option><option :value="60">60 Hz</option><option :value="120">120 Hz</option>
            <option v-if="isCustomTickRate" :value="physics.globalSettings.tickRate">{{ t('customTickRate') }} · {{ physics.globalSettings.tickRate }} Hz</option>
          </select>
        </SettingRow>
        <SettingRow :label="t('customTickRate')"><input v-model.number="physics.globalSettings.tickRate" type="number" min="1" max="1000" step="1"></SettingRow>
        <SettingRow :label="t('maxCatchUpSteps')"><input v-model.number="physics.globalSettings.maxCatchUpSteps" type="number" min="1" max="240" step="1"></SettingRow>
      </section>

      <section class="settings-card" @change="commitAudioSettings">
        <div class="card-heading"><span class="card-icon">♫</span><h2>{{ t('audioSettings') }}</h2></div>
        <SettingRow :label="t('masterVolume')"><div class="value-control"><input v-model.number="physics.audioSettings.masterVolume" type="range" min="0" max="1" step="0.01"><output>{{ Math.round(physics.audioSettings.masterVolume * 100) }}%</output></div></SettingRow>
        <SettingRow :label="t('musicVolume')"><div class="value-control"><input v-model.number="physics.audioSettings.buses.Music" type="range" min="0" max="1" step="0.01"><output>{{ Math.round(physics.audioSettings.buses.Music * 100) }}%</output></div></SettingRow>
        <SettingRow :label="t('sfxVolume')"><div class="value-control"><input v-model.number="physics.audioSettings.buses.SFX" type="range" min="0" max="1" step="0.01"><output>{{ Math.round(physics.audioSettings.buses.SFX * 100) }}%</output></div></SettingRow>
        <SettingRow :label="t('uiVolume')"><div class="value-control"><input v-model.number="physics.audioSettings.buses.UI" type="range" min="0" max="1" step="0.01"><output>{{ Math.round(physics.audioSettings.buses.UI * 100) }}%</output></div></SettingRow>
        <SettingRow :label="t('sampleRate')"><select v-model.number="physics.audioSettings.sampleRate"><option :value="44100">44.1 kHz</option><option :value="48000">48 kHz</option><option :value="96000">96 kHz</option></select></SettingRow>
      </section>

      <section class="settings-card input-map-card">
        <div class="card-heading"><span class="card-icon">⌨</span><h2>{{ t('inputMap') }}</h2></div>
        <p>{{ t('inputMapDescription') }}</p>
        <div class="input-actions">
          <article v-for="(action, actionIndex) in physics.inputMap" :key="`${action.name}-${actionIndex}`" class="input-action">
            <div class="input-action-heading">
              <input v-model.trim="action.name" :aria-label="t('actionName')" maxlength="80" @change="commitInputMap">
              <select v-model="action.kind" :aria-label="t('actionType')" @change="commitInputMap">
                <option value="button">{{ t('inputButton') }}</option>
                <option value="axis">{{ t('inputAxis') }}</option>
                <option value="vector2">{{ t('inputVector') }}</option>
              </select>
              <button class="icon-action danger" :title="t('removeInputAction')" @click="removeInputAction(actionIndex)">×</button>
            </div>
            <div v-for="(binding, bindingIndex) in action.bindings" :key="bindingIndex" class="input-binding">
              <select v-model="binding.device" :aria-label="t('inputDevice')" @change="setBindingDevice(binding); commitInputMap()">
                <option value="keyboard">{{ t('keyboard') }}</option>
                <option value="mouse-button">{{ t('mouseButton') }}</option>
                <option value="mouse-wheel">{{ t('mouseWheel') }}</option>
                <option value="gamepad-button">{{ t('gamepadButton') }}</option>
                <option value="gamepad-axis">{{ t('gamepadAxis') }}</option>
              </select>
              <input v-model.trim="binding.code" :aria-label="t('bindingCode')" maxlength="80" @change="commitInputMap">
              <template v-if="action.kind === 'vector2'">
                <input v-model.number="binding.x" :aria-label="t('inputX')" type="number" min="-100" max="100" step="0.1" @change="commitInputMap">
                <input v-model.number="binding.y" :aria-label="t('inputY')" type="number" min="-100" max="100" step="0.1" @change="commitInputMap">
              </template>
              <input v-else v-model.number="binding.scale" :aria-label="t('inputScale')" type="number" min="-100" max="100" step="0.1" @change="commitInputMap">
              <input v-if="binding.device.startsWith('gamepad')" v-model.number="binding.gamepad" :aria-label="t('gamepadIndex')" type="number" min="0" max="15" step="1" @change="commitInputMap">
              <input v-if="binding.device === 'gamepad-axis'" v-model.number="binding.deadzone" :aria-label="t('deadzone')" type="number" min="0" max="0.99" step="0.01" @change="commitInputMap">
              <button class="icon-action danger" :title="t('removeBinding')" @click="removeInputBinding(actionIndex, bindingIndex)">×</button>
            </div>
            <button class="secondary-action compact-action" @click="addInputBinding(actionIndex)">+ {{ t('addBinding') }}</button>
          </article>
        </div>
        <button class="secondary-action" @click="addInputAction">+ {{ t('addInputAction') }}</button>
      </section>

      <section class="settings-card diagnostics-card">
        <div class="card-heading"><span class="card-icon">⌁</span><h2>{{ t('engineDiagnostics') }}</h2></div>
        <div class="metric-grid">
          <div><span>{{ t('runtimeBodies') }}</span><strong>{{ physics.engineDiagnostics.bodyCount }}</strong></div>
          <div><span>{{ t('runtimeConnections') }}</span><strong>{{ physics.engineDiagnostics.connectionCount }}</strong></div>
          <div><span>{{ t('stepsLastFrame') }}</span><strong>{{ physics.engineDiagnostics.stepsLastFrame }}</strong></div>
          <div><span>{{ t('totalPhysicsSteps') }}</span><strong>{{ physics.engineDiagnostics.totalPhysicsSteps }}</strong></div>
          <div><span>{{ t('interpolationAlpha') }}</span><strong>{{ physics.engineDiagnostics.interpolationAlpha.toFixed(3) }}</strong></div>
          <div><span>{{ t('droppedTime') }}</span><strong>{{ physics.engineDiagnostics.droppedSeconds.toFixed(4) }} s</strong></div>
          <div><span>{{ t('pendingEvents') }}</span><strong>{{ physics.engineDiagnostics.eventCount }}</strong></div>
          <div><span>{{ t('configurationRebuilds') }}</span><strong>{{ physics.engineDiagnostics.configurationRebuilds }}</strong></div>
          <div><span>{{ t('paused') }}</span><strong>{{ physics.simulationRunning ? t('no') : t('yes') }}</strong></div>
        </div>
      </section>

      <section class="settings-card matrix-card">
        <div class="card-heading"><span class="card-icon">#</span><h2>{{ t('collisionMatrix') }}</h2></div>
        <p>{{ t('collisionMatrixDescription') }}</p>
        <div class="matrix-scroll">
          <div class="matrix-header"><span></span><b v-for="column in physicsLayers" :key="column">{{ column }}</b></div>
          <div v-for="row in physicsLayers" :key="row" class="matrix-row">
            <b>{{ row }}</b>
            <button v-for="column in physicsLayers" :key="column" :class="{ active: layersCollide(row, column) }" :aria-label="`${row} / ${column}`" @click="toggleLayerCollision(row, column)"></button>
          </div>
        </div>
      </section>

      <section class="settings-card">
        <div class="card-heading"><span class="card-icon">⌗</span><h2>{{ t('canvasSettings') }}</h2></div>
        <SettingRow :label="t('gridSize')"><input v-model.number="prefs.gridSize" type="number" min="0.000001" step="1"></SettingRow>
        <SettingRow :label="t('snapToGrid')"><ToggleSwitch v-model="prefs.snapToGrid" /></SettingRow>
        <SettingRow :label="t('zoomSensitivity')">
          <div class="value-control"><input v-model.number="prefs.zoomSensitivity" type="range" min="0.2" max="3" step="0.1"><output>{{ prefs.zoomSensitivity.toFixed(1) }}×</output></div>
        </SettingRow>
        <SettingRow :label="t('showConnections')"><ToggleSwitch v-model="prefs.showConnections" /></SettingRow>
        <SettingRow :label="t('connectionThickness')">
          <div class="value-control"><input v-model.number="prefs.connectionThickness" type="range" min="0.5" max="8" step="0.5"><output>{{ prefs.connectionThickness }} px</output></div>
        </SettingRow>
        <SettingRow :label="t('showDiagnostics')"><ToggleSwitch v-model="prefs.showDiagnostics" /></SettingRow>
        <SettingRow :label="t('renderQuality')">
          <select v-model.number="prefs.maxPixelRatio"><option :value="1">1×</option><option :value="1.5">1.5×</option><option :value="2">2×</option><option :value="3">3×</option></select>
        </SettingRow>
      </section>

      <section class="settings-card">
        <div class="card-heading"><span class="card-icon">ⓘ</span><h2>{{ t('projectInformation') }}</h2></div>
        <SettingRow :label="t('formatVersion')"><output>v{{ physics.world.projectFormatVersion }}</output></SettingRow>
        <SettingRow :label="t('engineVersion')"><output>{{ physics.world.projectEngineVersion }}</output></SettingRow>
      </section>

      <section class="settings-card">
        <div class="card-heading"><span class="card-icon">↻</span><h2>{{ t('projectSettings') }}</h2></div>
        <SettingRow :label="t('autosave')"><ToggleSwitch v-model="prefs.autosave" /></SettingRow>
        <SettingRow :label="t('autosaveInterval')"><input v-model.number="prefs.autosaveInterval" type="number" min="5" max="600" step="5"></SettingRow>
        <SettingRow :label="t('confirmDestructive')"><ToggleSwitch v-model="prefs.confirmDestructiveActions" /></SettingRow>
        <button class="secondary-action" :disabled="!autosaveAvailable" @click="restoreSavedScene">{{ t('restoreAutosave') }}</button>
      </section>

      <section class="settings-card">
        <div class="card-heading"><span class="card-icon">◇</span><h2>{{ t('defaultsSettings') }}</h2></div>
        <SettingRow :label="t('defaultDensity')"><input v-model.number="prefs.defaultDensity" type="number" min="0.000001" step="0.1"></SettingRow>
        <SettingRow :label="t('defaultRestitution')"><input v-model.number="prefs.defaultRestitution" type="number" min="0" max="1" step="0.05"></SettingRow>
        <SettingRow :label="t('defaultFriction')"><input v-model.number="prefs.defaultFriction" type="number" min="0" step="0.05"></SettingRow>
        <button class="danger-action" @click="resetExperience">{{ t('resetSettings') }}</button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, watch } from 'vue'
import { t } from '../i18n'
import { editorState } from '../store/editor'
import { autosaveState, normalizeGlobalSettings, physicsState as physics, pushHistory, restoreAutosave } from '../store/physics'
import { preferencesState as prefs, resetPreferences } from '../store/preferences'
import type { ThemeMode } from '../store/preferences'
import { createInputBinding, normalizeInputMap, type InputBinding } from '../runtime/input'
import { normalizeAudioSettings } from '../runtime/audio'

function setTheme(theme: ThemeMode) {
  prefs.theme = theme
  if (theme === 'light') prefs.highContrast = false
}

const SettingRow = defineComponent({
  props: { label: { type: String, required: true } },
  setup(props, { slots }) {
    return () => h('label', { class: 'setting-row' }, [h('span', props.label), h('div', { class: 'setting-control' }, slots.default?.())])
  }
})

const ToggleSwitch = defineComponent({
  props: { modelValue: { type: Boolean, required: true } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('button', {
      class: ['toggle', { active: props.modelValue }],
      role: 'switch',
      'aria-checked': props.modelValue,
      onClick: () => emit('update:modelValue', !props.modelValue)
    }, h('span'))
  }
})

const autosaveAvailable = computed(() => autosaveState.available)
const isCustomTickRate = computed(() => ![30, 60, 120].includes(physics.globalSettings.tickRate))
const physicsLayers = Array.from({ length: 32 }, (_, index) => index)
watch(() => prefs.locale, () => { editorState.statusText = t('ready') })

function layerBit(layer: number): number { return (2 ** layer) >>> 0 }
function layersCollide(first: number, second: number): boolean {
  return (physics.globalSettings.collisionMatrix[first] & layerBit(second)) !== 0
    && (physics.globalSettings.collisionMatrix[second] & layerBit(first)) !== 0
}
function toggleLayerCollision(first: number, second: number) {
  const enabled = !layersCollide(first, second)
  const firstBit = layerBit(second)
  const secondBit = layerBit(first)
  physics.globalSettings.collisionMatrix[first] = enabled
    ? (physics.globalSettings.collisionMatrix[first] | firstBit) >>> 0
    : (physics.globalSettings.collisionMatrix[first] & ~firstBit) >>> 0
  physics.globalSettings.collisionMatrix[second] = enabled
    ? (physics.globalSettings.collisionMatrix[second] | secondBit) >>> 0
    : (physics.globalSettings.collisionMatrix[second] & ~secondBit) >>> 0
  pushHistory()
}

function applyPhysicsSettings() {
  normalizeGlobalSettings()
  pushHistory()
}

function commitAudioSettings() {
  Object.assign(physics.audioSettings, normalizeAudioSettings(physics.audioSettings))
  pushHistory('Edit audio settings')
}

function commitInputMap() {
  const normalized = normalizeInputMap(physics.inputMap)
  physics.inputMap.splice(0, physics.inputMap.length, ...normalized)
  pushHistory('Edit input map')
}

function addInputAction() {
  const used = new Set(physics.inputMap.map(action => action.name))
  let suffix = physics.inputMap.length + 1
  while (used.has(`Action${suffix}`)) suffix++
  physics.inputMap.push({ name: `Action${suffix}`, kind: 'button', bindings: [createInputBinding()] })
  pushHistory('Add input action')
}

function removeInputAction(index: number) {
  physics.inputMap.splice(index, 1)
  pushHistory('Remove input action')
}

function addInputBinding(actionIndex: number) {
  physics.inputMap[actionIndex]?.bindings.push(createInputBinding())
  pushHistory('Add input binding')
}

function removeInputBinding(actionIndex: number, bindingIndex: number) {
  physics.inputMap[actionIndex]?.bindings.splice(bindingIndex, 1)
  pushHistory('Remove input binding')
}

function setBindingDevice(binding: InputBinding) {
  binding.code = binding.device === 'keyboard' ? 'Space' : binding.device === 'mouse-wheel' ? 'y' : '0'
}

function restoreSavedScene() {
  if (restoreAutosave()) {
    pushHistory()
    editorState.statusText = t('autosaveRestored')
  } else editorState.statusText = t('noAutosave')
}

function resetExperience() {
  resetPreferences()
  editorState.statusText = t('settingsReset')
}
</script>

<style scoped>
.settings-page { height: 100%; overflow: auto; padding: clamp(22px, 4vw, 48px); background: radial-gradient(circle at 88% 0%, var(--accent-soft), transparent 32%), var(--bg-base); }
.page-header { width: min(1040px, 100%); margin: 0 auto 26px; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
.eyebrow { display: block; color: var(--accent); font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 5px; }
h1 { margin: 0; font-size: clamp(26px, 4vw, 38px); font-weight: 620; letter-spacing: -.035em; }
.theme-switch { display: flex; gap: 4px; padding: 4px; border: 1px solid var(--border-subtle); background: var(--surface-1); backdrop-filter: var(--glass-blur); border-radius: 999px; box-shadow: var(--shadow-sm); }
.theme-switch button { border: 0; background: transparent; color: var(--text-secondary); padding: 8px 13px; border-radius: 999px; }
.theme-switch button.active { color: var(--accent-contrast); background: var(--accent); box-shadow: 0 3px 10px var(--accent-soft); }
.settings-grid { width: min(1040px, 100%); margin: 0 auto; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; padding-bottom: 30px; }
.settings-card { align-self: start; display: flex; flex-direction: column; padding: 18px; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); background: var(--surface-1); backdrop-filter: var(--glass-blur); box-shadow: var(--shadow-sm); transition: transform 180ms ease, border-color 180ms ease; }
.settings-card:hover { transform: translateY(-2px); border-color: var(--border-strong); }
.matrix-card { grid-column: 1 / -1; }
.input-map-card { grid-column: 1 / -1; }
.input-actions { display: flex; flex-direction: column; gap: 9px; }
.input-action { padding: 9px; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-2); }
.input-action-heading, .input-binding { display: grid; grid-template-columns: minmax(120px, 1.3fr) minmax(110px, 1fr) repeat(4, minmax(64px, .6fr)) 28px; gap: 6px; align-items: center; }
.input-action-heading { margin-bottom: 7px; }
.input-action-heading > input { grid-column: span 3; }
.input-action-heading > select { grid-column: span 3; }
.input-binding { padding: 6px 0; border-top: 1px solid var(--border-subtle); }
.input-binding input, .input-binding select, .input-action-heading input, .input-action-heading select { width: 100%; min-width: 0; }
.icon-action { width: 28px; height: 28px; padding: 0; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--text-muted); background: var(--surface-3); }
.icon-action.danger:hover { color: var(--danger); border-color: var(--danger); }
.compact-action { min-height: 29px; margin-top: 6px; }
.matrix-card p { margin-bottom: 12px; }
.matrix-scroll { max-width: 100%; padding: 7px; overflow: auto; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-2); }
.matrix-header, .matrix-row { width: max-content; display: grid; grid-template-columns: 28px repeat(32, 18px); gap: 3px; align-items: center; }
.matrix-header { margin-bottom: 4px; }
.matrix-header b, .matrix-row > b { color: var(--text-muted); font-size: 8px; text-align: center; font-weight: 600; }
.matrix-row { margin-bottom: 3px; }
.matrix-row button { width: 18px; height: 18px; padding: 0; border: 1px solid var(--border-subtle); border-radius: 4px; background: var(--surface-3); }
.matrix-row button.active { border-color: color-mix(in srgb, var(--accent) 76%, white); background: var(--accent); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 65%, white); }
.card-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.card-icon { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--accent); background: var(--accent-soft); font-size: 16px; }
h2 { margin: 0; font-size: 15px; font-weight: 650; letter-spacing: -.01em; }
p { margin: 0 0 8px 40px; color: var(--text-muted); font-size: 12px; line-height: 1.55; }
:deep(.setting-row) { min-height: 47px; display: flex; align-items: center; justify-content: space-between; gap: 16px; border-top: 1px solid var(--border-subtle); color: var(--text-secondary); font-size: 12.5px; }
:deep(.setting-control) { display: flex; justify-content: flex-end; min-width: 150px; }
:deep(.setting-control > input[type='number']), :deep(.setting-control > select) { width: 150px; }
.value-control { width: 190px; display: flex; align-items: center; gap: 10px; }
.value-control input { min-width: 0; flex: 1; accent-color: var(--accent); }
.value-control output { min-width: 46px; text-align: right; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.metric-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 4px; }
.metric-grid > div { min-width: 0; padding: 10px; display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-2); }
.metric-grid span { overflow: hidden; color: var(--text-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.metric-grid strong, :deep(output) { color: var(--text-primary); font-size: 12px; font-variant-numeric: tabular-nums; }
:deep(.toggle) { width: 38px; height: 22px; padding: 3px; border: 0; border-radius: 99px; background: var(--surface-3); box-shadow: inset 0 0 0 1px var(--border-subtle); }
:deep(.toggle span) { display: block; width: 16px; height: 16px; border-radius: 50%; background: var(--text-muted); transition: transform 180ms cubic-bezier(.2,.8,.2,1), background 180ms ease; }
:deep(.toggle.active) { background: var(--accent); }
:deep(.toggle.active span) { transform: translateX(16px); background: var(--accent-contrast); }
.secondary-action, .danger-action { margin-top: 10px; min-height: 34px; border-radius: 9px; border: 1px solid var(--border-subtle); background: var(--surface-3); }
.secondary-action:hover { border-color: var(--accent); background: var(--accent-soft); }
.danger-action { color: var(--danger); background: var(--danger-soft); }
.danger-action:hover { border-color: var(--danger); }
@media (max-width: 800px) { .settings-grid { grid-template-columns: 1fr; } .page-header { align-items: flex-start; flex-direction: column; } .input-action-heading, .input-binding { grid-template-columns: repeat(2, minmax(0, 1fr)) 28px; } .input-action-heading > input, .input-action-heading > select { grid-column: auto; } }
</style>

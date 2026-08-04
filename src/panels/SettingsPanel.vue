<template>
  <div class="settings-page">
    <header class="page-header">
      <div>
        <span class="eyebrow">Nova_A 1.0</span>
        <h1>{{ t('settings') }}</h1>
      </div>
      <div class="theme-switch" :aria-label="t('theme')">
        <button :class="{ active: prefs.theme === 'dark' }" @click="prefs.theme = 'dark'">☾ {{ t('dark') }}</button>
        <button :class="{ active: prefs.theme === 'light' }" @click="prefs.theme = 'light'">☀ {{ t('light') }}</button>
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
watch(() => prefs.locale, () => { editorState.statusText = t('ready') })

function applyPhysicsSettings() {
  normalizeGlobalSettings()
  pushHistory()
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
:deep(.toggle) { width: 38px; height: 22px; padding: 3px; border: 0; border-radius: 99px; background: var(--surface-3); box-shadow: inset 0 0 0 1px var(--border-subtle); }
:deep(.toggle span) { display: block; width: 16px; height: 16px; border-radius: 50%; background: var(--text-muted); transition: transform 180ms cubic-bezier(.2,.8,.2,1), background 180ms ease; }
:deep(.toggle.active) { background: var(--accent); }
:deep(.toggle.active span) { transform: translateX(16px); background: var(--accent-contrast); }
.secondary-action, .danger-action { margin-top: 10px; min-height: 34px; border-radius: 9px; border: 1px solid var(--border-subtle); background: var(--surface-3); }
.secondary-action:hover { border-color: var(--accent); background: var(--accent-soft); }
.danger-action { color: var(--danger); background: var(--danger-soft); }
.danger-action:hover { border-color: var(--danger); }
@media (max-width: 800px) { .settings-grid { grid-template-columns: 1fr; } .page-header { align-items: flex-start; flex-direction: column; } }
</style>

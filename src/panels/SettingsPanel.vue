<template>
  <div class="settings-page">
    <header class="page-header">
      <div>
      <span class="eyebrow">Nova_A 6.4.0</span>
        <h1>{{ t('settings') }}</h1>
      </div>
      <div class="theme-switch" :aria-label="t('theme')">
        <button :class="{ active: prefs.theme === 'dark' }" @click="setTheme('dark')">☾ {{ t('dark') }}</button>
        <button :class="{ active: prefs.theme === 'light' }" @click="setTheme('light')">☀ {{ t('light') }}</button>
      </div>
    </header>

    <section class="settings-search" aria-label="Settings search">
      <label><span>⌕</span><input v-model="editorState.settingsSearch" type="search" :placeholder="t('searchSettings')"></label>
      <nav :aria-label="t('settingScope')"><button v-for="scope in settingScopes" :key="scope.id" :class="{ active: editorState.settingsScope === scope.id }" @click="editorState.settingsScope = scope.id">{{ t(scope.label) }}</button></nav>
    </section>

    <div class="settings-grid">
      <section v-show="showCard('appearanceSettings language interfaceScale compactMode reduceMotion highContrast launchMaximized workspaceLayoutScope shortcutEditor', 'editor')" class="settings-card">
        <div class="card-heading"><span class="card-icon">◐</span><h2>{{ t('appearanceSettings') }}</h2></div>
        <SettingRow :label="t('language')">
          <select v-model="prefs.locale">
            <option value="en">{{ t('english') }}</option>
            <option value="de">{{ t('german') }}</option>
            <option value="zh">{{ t('chinese') }}</option>
          </select>
        </SettingRow>
        <SettingRow :label="t('interfaceScale')">
          <div class="value-control"><input v-model.number="prefs.uiScale" type="range" min="1" max="2" step="0.05"><output>{{ Math.round(prefs.uiScale * 100) }}%</output></div>
        </SettingRow>
        <SettingRow :label="t('compactMode')"><ToggleSwitch v-model="prefs.compactMode" /></SettingRow>
        <SettingRow :label="t('reduceMotion')"><ToggleSwitch v-model="prefs.reduceMotion" /></SettingRow>
        <SettingRow :label="t('highContrast')"><ToggleSwitch v-model="prefs.highContrast" /></SettingRow>
        <SettingRow :label="t('performanceProfiles')"><select :value="prefs.performanceProfile" @change="applyCreatorPerformanceProfile(($event.target as HTMLSelectElement).value as PerformanceProfile)"><option value="balanced">Balanced</option><option value="low-end">Low-end</option><option value="quality">High quality</option></select></SettingRow>
        <SettingRow :label="t('launchMaximized')"><ToggleSwitch v-model="prefs.launchMaximized" /></SettingRow>
        <SettingRow :label="t('workspaceLayoutScope')"><select v-model="prefs.workspaceLayoutScope"><option value="user">{{ t('editorScope') }}</option><option value="project">{{ t('projectScope') }}</option></select></SettingRow>
        <button class="secondary-action" @click="editorState.shortcutEditorOpen = true">{{ t('shortcutEditor') }}</button>
      </section>

      <PhysicsSettingsPanel v-show="showCard('physicsSettings globalGravity collisionLayers physicsMaterials conformance', 'project')" />

      <section v-show="showCard('scriptingSettings scriptApiVersion debugger hotReload formatting lint indexing testing remoteDebugging', 'project')" class="settings-card">
        <div class="card-heading"><span class="card-icon">{ }</span><h2>{{ t('scriptingSettings') }}</h2></div>
        <SettingRow :label="t('scriptApiVersion')"><select v-model.number="scriptSettings.apiVersion"><option :value="2">API v2</option><option :value="1">API v1 · {{ t('compatibilityMode') }}</option></select></SettingRow>
        <SettingRow :label="t('scriptDebugger')"><ToggleSwitch v-model="scriptSettings.debuggerEnabled" /></SettingRow>
        <SettingRow :label="t('exceptionPolicy')"><select v-model="scriptSettings.exceptionPolicy"><option value="never">{{ t('never') }}</option><option value="uncaught">{{ t('uncaught') }}</option><option value="all">{{ t('allExceptions') }}</option></select></SettingRow>
        <SettingRow :label="t('hotReloadPolicy')"><ToggleSwitch v-model="scriptSettings.hotReloadEnabled" /></SettingRow>
        <SettingRow :label="t('formatIndent')"><select v-model.number="scriptSettings.formatting.indentSize"><option :value="2">2</option><option :value="4">4</option></select></SettingRow>
        <SettingRow :label="t('formatLineWidth')"><input v-model.number="scriptSettings.formatting.lineWidth" type="number" min="60" max="240"></SettingRow>
        <SettingRow :label="t('deprecatedLint')"><select v-model="scriptSettings.lint.deprecatedApi"><option value="off">{{ t('disabled') }}</option><option value="warning">{{ t('warning') }}</option><option value="error">{{ t('error') }}</option></select></SettingRow>
        <SettingRow :label="t('persistLanguageIndex')"><ToggleSwitch v-model="scriptSettings.indexing.persist" /></SettingRow>
        <SettingRow :label="t('languageBudget')"><input v-model.number="scriptSettings.indexing.interactiveBudgetMs" type="number" min="10" max="500"></SettingRow>
        <SettingRow :label="t('testParallelism')"><input v-model.number="scriptSettings.testing.parallelism" type="number" min="1" max="16"></SettingRow>
        <SettingRow :label="t('coverage')"><ToggleSwitch v-model="scriptSettings.testing.coverageEnabled" /></SettingRow>
        <SettingRow :label="t('remoteDebugging')"><ToggleSwitch v-model="scriptSettings.remoteDebug.enabled" /></SettingRow>
        <SettingRow :label="t('remoteDebugPort')"><input v-model.number="scriptSettings.remoteDebug.port" type="number" min="1024" max="65535"></SettingRow>
        <SettingRow :label="t('allowExportedPlayers')"><ToggleSwitch v-model="scriptSettings.remoteDebug.allowExportedPlayers" /></SettingRow>
        <SettingRow :label="t('authenticationTokenHash')"><input v-model="scriptSettings.remoteDebug.tokenHash" maxlength="128" autocomplete="off" spellcheck="false" placeholder="SHA-256"></SettingRow>
        <p>{{ t('remoteDebugSecurityHint') }}</p>
      </section>

      <section v-show="showCard('audioSettings masterVolume musicVolume sfxVolume uiVolume sampleRate', 'project')" class="settings-card" @change="commitAudioSettings">
        <div class="card-heading"><span class="card-icon">♫</span><h2>{{ t('audioSettings') }}</h2></div>
        <SettingRow :label="t('masterVolume')"><div class="value-control"><input v-model.number="physics.audioSettings.masterVolume" type="range" min="0" max="1" step="0.01"><output>{{ Math.round(physics.audioSettings.masterVolume * 100) }}%</output></div></SettingRow>
        <SettingRow :label="t('musicVolume')"><div class="value-control"><input v-model.number="physics.audioSettings.buses.Music" type="range" min="0" max="1" step="0.01"><output>{{ Math.round(physics.audioSettings.buses.Music * 100) }}%</output></div></SettingRow>
        <SettingRow :label="t('sfxVolume')"><div class="value-control"><input v-model.number="physics.audioSettings.buses.SFX" type="range" min="0" max="1" step="0.01"><output>{{ Math.round(physics.audioSettings.buses.SFX * 100) }}%</output></div></SettingRow>
        <SettingRow :label="t('uiVolume')"><div class="value-control"><input v-model.number="physics.audioSettings.buses.UI" type="range" min="0" max="1" step="0.01"><output>{{ Math.round(physics.audioSettings.buses.UI * 100) }}%</output></div></SettingRow>
        <SettingRow :label="t('sampleRate')"><select v-model.number="physics.audioSettings.sampleRate"><option :value="44100">44.1 kHz</option><option :value="48000">48 kHz</option><option :value="96000">96 kHz</option></select></SettingRow>
      </section>

      <section v-show="showCard('inputMap inputDevice bindingCode gamepad keyboard', 'project')" class="settings-card input-map-card">
        <div class="card-heading"><span class="card-icon">⌨</span><h2>{{ t('inputMap') }}</h2></div>
        <p>{{ t('inputMapDescription') }}</p>
        <div class="input-map-toolbar"><input v-model="inputSearch" type="search" :placeholder="t('searchActions')"><select v-model="inputDeviceFilter"><option value="all">{{ t('allDevices') }}</option><option v-for="device in inputDevices" :key="device">{{ device }}</option></select><label><input v-model="compactInputMap" type="checkbox"> {{ t('compactMode') }}</label><button :class="{ active: inputRecording }" @click="toggleInputRecording">{{ inputRecording ? t('stop') : t('record') }}</button><button :disabled="!lastInputRecording" @click="replayInputRecording">▶ {{ t('replay') }}</button></div>
        <div class="connected-devices"><span v-for="device in connectedInputDevices" :key="`${device.kind}:${device.index}`">{{ device.kind }} {{ device.index }} · {{ device.mapping }}</span></div>
        <div v-if="inputConflicts.length" class="input-conflicts" role="alert"><strong>{{ t('bindingConflicts') }} · {{ inputConflicts.length }}</strong><span v-for="conflict in inputConflicts" :key="`${conflict.signature}:${conflict.action}`">{{ conflict.conflictsWithAction }} ↔ {{ conflict.action }} · {{ conflict.signature }}</span></div>
        <div class="input-actions">
          <article v-for="({ action, actionIndex }) in visibleInputActions" :key="`${action.name}-${actionIndex}`" class="input-action" :class="{ compact: compactInputMap }">
            <div class="input-action-heading">
              <input v-model.trim="action.name" :aria-label="t('actionName')" maxlength="80" @change="commitInputMap">
              <select v-model="action.kind" :aria-label="t('actionType')" @change="commitInputMap">
                <option value="button">{{ t('inputButton') }}</option>
                <option value="axis">{{ t('inputAxis') }}</option>
                <option value="vector2">{{ t('inputVector') }}</option>
              </select>
              <button class="icon-action danger" :title="t('removeInputAction')" @click="removeInputAction(actionIndex)">×</button>
              <button class="icon-action" :title="t('duplicate')" @click="duplicateInputAction(actionIndex)">⧉</button>
            </div>
            <details v-if="!compactInputMap" class="action-advanced">
              <summary>{{ t('actionBehavior') }}</summary>
              <div class="action-advanced-grid">
                <label><span>{{ t('enabled') }}</span><input v-model="action.enabled" type="checkbox" @change="commitInputMap"></label>
                <label><span>{{ t('inputContext') }}</span><input v-model.trim="action.context" maxlength="80" @change="commitInputMap"></label>
                <label><span>{{ t('actionMap') }}</span><input v-model.trim="action.map" maxlength="80" @change="commitInputMap"></label>
                <label><span>{{ t('controlSchemes') }}</span><input :value="action.schemes.join(', ')" :placeholder="t('allSchemes')" @change="setActionSchemes(actionIndex, $event)"></label>
                <label><span>{{ t('interaction') }}</span><select v-model="action.interaction" @change="commitInputMap"><option value="press">{{ t('inputPress') }}</option><option value="hold">{{ t('inputHold') }}</option><option value="tap">{{ t('inputTap') }}</option><option value="multiTap">{{ t('inputMultiTap') }}</option></select></label>
                <label v-if="action.interaction === 'hold'"><span>{{ t('holdSeconds') }}</span><input v-model.number="action.holdSeconds" type="number" min="0.001" max="60" step="0.05" @change="commitInputMap"></label>
                <label v-if="action.interaction === 'tap' || action.interaction === 'multiTap'"><span>{{ t('tapSeconds') }}</span><input v-model.number="action.tapSeconds" type="number" min="0.001" max="10" step="0.05" @change="commitInputMap"></label>
                <label v-if="action.interaction === 'multiTap'"><span>{{ t('tapCount') }}</span><input v-model.number="action.multiTapCount" type="number" min="2" max="16" step="1" @change="commitInputMap"></label>
                <label><span>{{ t('consumeInput') }}</span><input v-model="action.consume" type="checkbox" @change="commitInputMap"></label>
                <label><span>{{ t('actionPriority') }}</span><input v-model.number="action.priority" type="number" min="-10000" max="10000" step="1" @change="commitInputMap"></label>
                <label><span>{{ t('callbackFunction') }}</span><input v-model.trim="action.callback" maxlength="80" placeholder="on_jump" @change="commitInputMap"></label>
              </div>
            </details>
            <div v-for="(binding, bindingIndex) in action.bindings" :key="bindingIndex" class="input-binding">
              <select v-model="binding.device" :aria-label="t('inputDevice')" @change="setBindingDevice(binding); commitInputMap()">
                <option v-for="device in inputDevices" :key="device" :value="device">{{ device }}</option>
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
              <details v-if="!compactInputMap" class="binding-advanced"><summary>{{ t('advanced') }}</summary><label>{{ t('threshold') }}<input v-model.number="binding.threshold" type="number" min="0" max="1" step="0.01" @change="commitInputMap"></label><label>{{ t('invert') }}<input v-model="binding.invert" type="checkbox" @change="commitInputMap"></label><label>{{ t('responseCurve') }}<select v-model="binding.responseCurve" @change="commitInputMap"><option>linear</option><option>square</option><option>cubic</option><option>exponential</option></select></label><label>{{ t('deviceIdentity') }}<input v-model="binding.deviceId" @change="commitInputMap"></label><label>{{ t('modifiers') }}<input :value="binding.modifiers.join(', ')" @change="setBindingList(binding,'modifiers',$event)"></label><label>{{ t('chord') }}<input :value="binding.chord.join(', ')" @change="setBindingList(binding,'chord',$event)"></label></details>
            </div>
            <button class="secondary-action compact-action" @click="addInputBinding(actionIndex)">+ {{ t('addBinding') }}</button>
          </article>
        </div>
        <button class="secondary-action" @click="addInputAction">+ {{ t('addInputAction') }}</button>
      </section>

      <section v-show="showCard('canvasSettings gridSize snapToGrid zoomSensitivity showConnections renderQuality', 'editor')" class="settings-card">
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

      <section v-show="showCard('packages plugins saveData engineDiagnostics projectHealth', 'all')" class="settings-card related-tools">
        <div class="card-heading"><span class="card-icon">↗</span><h2>{{ t('relatedTools') }}</h2></div>
        <p>{{ t('settingsRelocationHint') }}</p>
        <button class="secondary-action" @click="openTool('packages')">{{ t('openPackageManager') }}</button>
        <button class="secondary-action" @click="openTool('profiler')">{{ t('openDebugTools') }}</button>
        <button class="secondary-action" @click="openTool('project')">{{ t('openProjectHealth') }}</button>
      </section>

      <section v-show="showCard('projectSettings autosave autosaveInterval confirmDestructive restoreAutosave', 'project')" class="settings-card">
        <div class="card-heading"><span class="card-icon">↻</span><h2>{{ t('projectSettings') }}</h2></div>
        <SettingRow :label="t('autosave')"><ToggleSwitch v-model="prefs.autosave" /></SettingRow>
        <SettingRow :label="t('autosaveInterval')"><input v-model.number="prefs.autosaveInterval" type="number" min="5" max="600" step="5"></SettingRow>
        <SettingRow :label="t('confirmDestructive')"><ToggleSwitch v-model="prefs.confirmDestructiveActions" /></SettingRow>
        <button class="secondary-action" :disabled="!autosaveAvailable" @click="restoreSavedScene">{{ t('restoreAutosave') }}</button>
      </section>

      <section v-show="showCard('defaultsSettings defaultDensity defaultRestitution defaultFriction', 'editor')" class="settings-card">
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
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { t } from '../i18n'
import { editorState } from '../store/editor'
import { autosaveState, physicsState as physics, pushHistory, restoreAutosave } from '../store/physics'
import { preferencesState as prefs, resetPreferences } from '../store/preferences'
import type { ThemeMode } from '../store/preferences'
import type { PerformanceProfile } from '../store/preferences'
import { createInputAction, createInputBinding, detectInputConflicts, normalizeInputMap, type InputBinding, type InputDevice, type InputDeviceIdentity, type InputModifier, type InputRecording } from '../runtime/input'
import { gameplayRuntime } from '../runtime/GameplayRuntime'
import { normalizeAudioSettings } from '../runtime/audio'
import { openEditorTool } from '../editor/workspaces'
import PhysicsSettingsPanel from '../components/PhysicsSettingsPanel.vue'
import { scriptProjectSettings as scriptSettings } from '../runtime/scriptSettings'
import { applyCreatorPerformanceProfile } from '../runtime/creatorLearning'

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
const inputDevices: InputDevice[] = ['keyboard', 'physical-key', 'mouse-button', 'mouse-wheel', 'mouse-motion', 'gamepad-button', 'gamepad-axis', 'touch', 'gesture']
const inputSearch = ref(''), inputDeviceFilter = ref<InputDevice | 'all'>('all'), compactInputMap = ref(false), inputRecording = ref(false), lastInputRecording = ref<InputRecording | null>(null), connectedInputDevices = ref<InputDeviceIdentity[]>([])
const inputConflicts = computed(() => detectInputConflicts(physics.inputMap))
const visibleInputActions = computed(() => physics.inputMap.map((action, actionIndex) => ({ action, actionIndex })).filter(({ action }) => {
  const matchesSearch = !inputSearch.value.trim() || action.name.toLocaleLowerCase().includes(inputSearch.value.trim().toLocaleLowerCase()) || action.bindings.some(binding => `${binding.device} ${binding.code}`.toLocaleLowerCase().includes(inputSearch.value.trim().toLocaleLowerCase()))
  return matchesSearch && (inputDeviceFilter.value === 'all' || action.bindings.some(binding => binding.device === inputDeviceFilter.value))
}))
let inputDeviceTimer = 0
onMounted(() => { connectedInputDevices.value = gameplayRuntime.input.connectedDevices(); inputDeviceTimer = window.setInterval(() => { connectedInputDevices.value = gameplayRuntime.input.connectedDevices() }, 1000) })
onBeforeUnmount(() => window.clearInterval(inputDeviceTimer))
const settingScopes = [{ id: 'all' as const, label: 'all' }, { id: 'editor' as const, label: 'editorScope' }, { id: 'project' as const, label: 'projectScope' }, { id: 'runtime' as const, label: 'runtimeScope' }]
watch(() => prefs.locale, () => { editorState.statusText = t('ready') })

function showCard(keys: string, scope: 'all' | 'editor' | 'project' | 'runtime'): boolean {
  if (editorState.settingsScope !== 'all' && scope !== 'all' && editorState.settingsScope !== scope) return false
  const needle = editorState.settingsSearch.trim().toLocaleLowerCase()
  if (!needle) return true
  return keys.split(' ').some(key => t(key).toLocaleLowerCase().includes(needle) || key.toLocaleLowerCase().includes(needle))
}
function openTool(tab: 'packages' | 'profiler' | 'project') { openEditorTool(tab) }

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
  physics.inputMap.push(createInputAction(`Action${suffix}`))
  pushHistory('Add input action')
}

function duplicateInputAction(index: number) {
  const source = physics.inputMap[index]; if (!source || physics.inputMap.length >= 128) return
  const names = new Set(physics.inputMap.map(action => action.name)); let suffix = 2, name = `${source.name} Copy`; while (names.has(name)) name = `${source.name} Copy ${suffix++}`
  physics.inputMap.splice(index + 1, 0, { ...source, name, schemes: [...source.schemes], bindings: source.bindings.map(binding => ({ ...binding, modifiers: [...binding.modifiers], chord: [...binding.chord] })) }); pushHistory('Duplicate input action')
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
  binding.code = binding.device === 'keyboard' || binding.device === 'physical-key' ? 'Space' : binding.device === 'mouse-wheel' || binding.device === 'mouse-motion' ? 'y' : binding.device === 'touch' ? 'pressed' : binding.device === 'gesture' ? 'tap' : '0'
}

function setBindingList(binding: InputBinding, property: 'modifiers' | 'chord', event: Event) { const values = (event.target as HTMLInputElement).value.split(',').map(value => value.trim()).filter(Boolean); if (property === 'modifiers') binding.modifiers = values.filter((value): value is InputModifier => ['Control','Shift','Alt','Meta'].includes(value)).slice(0, 4); else binding.chord = [...new Set(values)].slice(0, 8); commitInputMap() }
function setActionSchemes(actionIndex: number, event: Event) { const action = physics.inputMap[actionIndex]; if (!action) return; action.schemes = [...new Set((event.target as HTMLInputElement).value.split(',').map(value => value.trim()).filter(Boolean))].slice(0, 16); commitInputMap() }
function toggleInputRecording() { if (!inputRecording.value) { gameplayRuntime.input.beginRecording(); inputRecording.value = true } else { lastInputRecording.value = gameplayRuntime.input.endRecording(); inputRecording.value = false } }
function replayInputRecording() { if (lastInputRecording.value) gameplayRuntime.input.playRecording(lastInputRecording.value) }

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
.settings-search{width:min(1040px,100%);margin:0 auto 16px;padding:8px;display:flex;align-items:center;gap:8px;border:1px solid var(--border-subtle);border-radius:12px;background:var(--surface-1)}.settings-search>label{min-width:220px;flex:1;display:flex;align-items:center;gap:7px;padding:0 8px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--input-bg)}.settings-search input{min-width:0;flex:1;border:0;background:transparent}.settings-search nav{display:flex;gap:4px;flex-wrap:wrap}.settings-search button{min-height:34px;padding:0 10px;border:1px solid transparent;border-radius:8px;background:transparent}.settings-search button.active{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}
.eyebrow { display: block; color: var(--accent); font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 5px; }
h1 { margin: 0; font-size: clamp(26px, 4vw, 38px); font-weight: 620; letter-spacing: -.035em; }
.theme-switch { display: flex; gap: 4px; padding: 4px; border: 1px solid var(--border-subtle); background: var(--surface-1); backdrop-filter: var(--glass-blur); border-radius: 999px; box-shadow: var(--shadow-sm); }
.theme-switch button { border: 0; background: transparent; color: var(--text-secondary); padding: 8px 13px; border-radius: 999px; }
.theme-switch button.active { color: var(--accent-contrast); background: var(--accent); box-shadow: 0 3px 10px var(--accent-soft); }
.settings-grid { width: min(1040px, 100%); margin: 0 auto; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; padding-bottom: 30px; }
.settings-card { align-self: start; display: flex; flex-direction: column; padding: 18px; contain: layout paint; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); background: var(--surface-1); box-shadow: var(--shadow-sm); transition: transform 180ms ease, border-color 180ms ease; }
.settings-card:hover { transform: translateY(-2px); border-color: var(--border-strong); }
.matrix-card { grid-column: 1 / -1; }.related-tools .secondary-action{margin-top:6px}.related-tools p{margin-left:40px}
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
.matrix-header b, .matrix-row > b { color: var(--text-muted); font-size:11px; text-align: center; font-weight: 600; }
.matrix-row { margin-bottom: 3px; }
.matrix-row button { width: 18px; height: 18px; padding: 0; border: 1px solid var(--border-subtle); border-radius: 4px; background: var(--surface-3); }
.matrix-row button.active { border-color: color-mix(in srgb, var(--accent) 76%, white); background: var(--accent); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 65%, white); }
.card-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.card-icon { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--accent); background: var(--accent-soft); font-size: 16px; }
h2 { margin: 0; font-size: 15px; font-weight: 650; letter-spacing: -.01em; }
p { margin: 0 0 8px 40px; color: var(--text-muted); font-size: 12px; line-height: 1.55; }
:deep(.setting-row) { min-height: 47px; display: flex; align-items: center; justify-content: space-between; gap: 16px; border-top: 1px solid var(--border-subtle); color: var(--text-secondary); font-size: 12.5px; }
:deep(.setting-row > span:first-child) { min-width: 0; flex: 1 1 auto; overflow-wrap: anywhere; line-height: 1.35; }
:deep(.setting-control) { width: 230px; max-width: 55%; min-width: 0; flex: 0 0 min(230px, 55%); display: flex; justify-content: flex-end; }
:deep(.setting-control > input[type='number']) { width: 150px; max-width: 100%; }
:deep(.setting-control > select) { width: 100%; }
.value-control { width: min(190px, 100%); min-width: 0; display: flex; align-items: center; gap: 10px; }
.value-control input { min-width: 0; flex: 1; accent-color: var(--accent); }
.value-control output { min-width: 46px; text-align: right; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.metric-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 4px; }
.metric-grid > div { min-width: 0; padding: 10px; display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-2); }
.metric-grid span { overflow: hidden; color: var(--text-muted); font-size:11px; text-overflow: ellipsis; white-space: nowrap; }
.metric-grid strong, :deep(output) { color: var(--text-primary); font-size: 12px; font-variant-numeric: tabular-nums; }
:deep(.toggle) { width: 38px; height: 22px; padding: 3px; border: 0; border-radius: 99px; background: var(--surface-3); box-shadow: inset 0 0 0 1px var(--border-subtle); }
:deep(.toggle span) { display: block; width: 16px; height: 16px; border-radius: 50%; background: var(--text-muted); transition: transform 180ms cubic-bezier(.2,.8,.2,1), background 180ms ease; }
:deep(.toggle.active) { background: var(--accent); }
:deep(.toggle.active span) { transform: translateX(16px); background: var(--accent-contrast); }
.secondary-action, .danger-action { margin-top: 10px; min-height: 34px; border-radius: 9px; border: 1px solid var(--border-subtle); background: var(--surface-3); }
.secondary-action:hover { border-color: var(--accent); background: var(--accent-soft); }
.danger-action { color: var(--danger); background: var(--danger-soft); }
.danger-action:hover { border-color: var(--danger); }
.input-map-toolbar{margin-bottom:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}.input-map-toolbar>input{min-width:160px;flex:1}.input-map-toolbar label{display:flex;align-items:center;gap:5px}.input-map-toolbar button.active{color:#fff;border-color:#d53b4c;background:#b92537}.connected-devices{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px}.connected-devices span{padding:3px 7px;border:1px solid var(--border-subtle);border-radius:99px;color:var(--text-muted);font-size:11px}.input-conflicts{margin-bottom:8px;padding:8px;display:grid;gap:3px;border:1px solid var(--warning);border-radius:8px;background:color-mix(in srgb,var(--warning) 8%,transparent);font-size:11px}.input-conflicts span{overflow-wrap:anywhere;color:var(--text-muted)}.input-action-heading{grid-template-columns:minmax(120px,3fr) minmax(100px,2fr) 28px 28px}.input-binding{grid-template-columns:minmax(150px,1.25fr) minmax(100px,1fr) repeat(4,minmax(64px,.6fr)) 28px}.binding-advanced{grid-column:1/-1;padding:5px;border:1px solid var(--border-subtle);border-radius:7px}.binding-advanced summary{cursor:pointer;color:var(--accent)}.binding-advanced>label{display:grid;grid-template-columns:100px minmax(100px,1fr);gap:6px;align-items:center;margin-top:4px;color:var(--text-muted);font-size:11px}.input-action.compact .input-binding{padding-block:2px}.input-action.compact .compact-action{margin-top:2px}
.binding-advanced summary{min-height:20px;display:flex;align-items:center;line-height:18px}
.action-advanced{margin-bottom:7px;padding:7px;border:1px solid var(--border-subtle);border-radius:8px;background:color-mix(in srgb,var(--surface-3) 55%,transparent)}.action-advanced>summary{min-height:24px;display:flex;align-items:center;cursor:pointer;color:var(--accent);font-size:12px;font-weight:620}.action-advanced-grid{display:grid;grid-template-columns:repeat(3,minmax(150px,1fr));gap:7px;padding-top:7px}.action-advanced-grid label{min-width:0;display:grid;grid-template-columns:minmax(88px,.8fr) minmax(0,1fr);gap:7px;align-items:center;color:var(--text-muted);font-size:11.5px}.action-advanced-grid input:not([type='checkbox']),.action-advanced-grid select{width:100%;min-width:0}.action-advanced-grid input[type='checkbox']{justify-self:end}
@media (max-width: 1400px) { .settings-grid { grid-template-columns: 1fr; } }
@media (max-width: 800px) { .page-header,.settings-search { align-items: flex-start; flex-direction: column; }.settings-search>label{width:100%}.settings-search nav{width:100%} .input-action-heading, .input-binding { grid-template-columns: repeat(2, minmax(0, 1fr)) 28px; } .input-action-heading > input, .input-action-heading > select { grid-column: auto; }.binding-advanced{grid-column:1/-1}.input-map-toolbar>*{flex:1 1 130px}.action-advanced-grid{grid-template-columns:1fr} }
</style>

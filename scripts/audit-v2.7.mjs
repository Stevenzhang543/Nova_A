import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const [components, inspector, panel, gameUi, localization, themes, audio, assets, database, build, presentation, physics, editor, workspaces, bottom, palette, i18n, manualViewer, manualOpen, app, capability, format, project, manualEn, manualDe, manualZh, manualHtml] = await Promise.all([
  read('src/world/components.ts'), read('src/components/RuntimeComponentsInspector.vue'), read('src/components/PresentationPanel.vue'), read('src/runtime/gameUi.ts'), read('src/runtime/localization.ts'), read('src/runtime/uiTheme.ts'), read('src/runtime/audio.ts'), read('src/assets/types.ts'), read('src/assets/AssetDatabase.ts'), read('src/runtime/novaPak.ts'), read('src/runtime/presentation.ts'), read('src/store/physics.ts'), read('src/store/editor.ts'), read('src/editor/workspaces.ts'), read('src/components/EditorBottomPanel.vue'), read('src/components/CommandPalette.vue'), read('src/i18n.ts'), read('src/components/ManualViewer.vue'), read('src/runtime/openManual.ts'), read('src/App.vue'), read('src-tauri/capabilities/default.json'), read('crates/nova_format/src/lib.rs'), read('src/projects/projectFormat.ts'), read('manual/MANUAL.en.md'), read('manual/MANUAL.de.md'), read('manual/MANUAL.zh-CN.md'), read('manual/index.html')
])
const assert = (condition, message) => { if (!condition) throw new Error(message) }

for (const feature of ['anchorPreset', 'horizontalPolicy', 'verticalPolicy', 'safeArea', 'aspectConstraint', 'breakpoints', 'layout', 'clipChildren', 'maskChildren', 'scrollHorizontal', 'scrollVertical']) {
  assert(components.includes(feature) && inspector.includes(feature) && gameUi.includes(feature), `responsive UI property ${feature} is not modeled, editable, and rendered`)
}
assert(gameUi.includes('wheel(') && gameUi.includes('drawScrollbars') && gameUi.includes('scrollOffset'), 'scroll views do not bind wheel input, offsets, and rendering')
assert(panel.includes('saveUiScene') && panel.includes('createPrefabFromEntities') && panel.includes("'Assets/Prefabs/UI'"), 'reusable UI scenes are not authorable')

for (const feature of ['parentTheme', 'variables', 'classes', 'hovered', 'pressed', 'disabled', 'focused']) assert(themes.includes(feature), `theme resources lack ${feature}`)
assert(assets.includes("'uiTheme'") && database.includes("extension === 'nova-theme'") && inspector.includes('styleOverrides.background') && gameUi.includes('themeStyle'), 'theme assets or per-control overrides are not connected')

for (const feature of ['focusNext', 'focusDirection', 'pollGamepads', 'drawFocusRing', 'accessibilityNodes', 'awaitingRemap', 'applyRemap']) assert(gameUi.includes(feature), `runtime UI accessibility lacks ${feature}`)
assert(presentation.includes('runtimeAccessibilitySettings') && physics.includes('serializeRuntimeAccessibility') && physics.includes('loadRuntimeAccessibility'), 'runtime accessibility is not persisted separately')

for (const feature of ['fallbackChain', 'pseudolocalization', 'buildLocales', 'Intl.PluralRules', 'Intl.NumberFormat', 'Intl.DateTimeFormat', "'rtl'", 'fontFallbacks']) assert(localization.includes(feature), `localization lacks ${feature}`)
assert(panel.includes('liveLocalePreview') && panel.includes('saveLocale') && gameUi.includes('localize('), 'localization authoring, live preview, or runtime rendering is disconnected')
assert(build.includes('selectedLocales') && build.includes("type === 'localization'") && build.includes('buildLocales'), 'unselected locales are not stripped from builds')

for (const feature of ['busInputs', 'sends', 'mute', 'solo', 'createEffect', 'busMeters', 'snapshots', 'updateDucking', 'attenuation', 'streaming', 'voiceLimit']) assert(audio.includes(feature), `audio runtime lacks ${feature}`)
for (const feature of ['waveform', 'loopStart', 'loopEnd', 'normalizationGain', 'targetPeakDb', 'activeVoices', 'bufferedVoices']) assert(`${panel}${assets}${audio}`.includes(feature), `audio authoring/profiler lacks ${feature}`)
assert(audio.includes('effect.wet') && audio.includes('effect.feedback'), 'visible effect wet/feedback settings are not applied')

assert(editor.includes("'presentation'") && workspaces.includes("'presentation'") && bottom.includes('PresentationPanel') && palette.includes("toolCommand('presentation'"), 'Presentation tools cannot be opened or restored')
for (const locale of ['Object.assign(en', 'Object.assign(de', 'Object.assign(zh']) assert(i18n.split(locale).slice(1).some(block => block.slice(0, 18_000).includes('presentationStudio') && block.slice(0, 18_000).includes('audioMixer')), `${locale} lacks v2.7 editor localization`)

assert(manualOpen.includes('manualViewerState.visible = true') && !manualOpen.includes('WebviewWindow') && !manualOpen.includes('openUrl('), 'manual still uses a Tauri URL-opening path')
assert(manualViewer.includes('./manual/index.html') && app.includes('<ManualViewer'), 'same-origin bundled manual viewer is not mounted')
assert(!capability.includes('nova-manual'), 'obsolete manual-window capability remains')
assert(!/[.]prompt\(|[.]confirm\(|[.]alert\(/.test(`${panel}${manualViewer}`), 'v2.7 UI uses browser-native dialogs')

assert(format.includes('CURRENT_FORMAT_VERSION: u32 = 22') && project.includes('NOVA_PROJECT_SCHEMA_VERSION = 22') && format.includes('projectSettings.presentation') && format.includes('audio.mixer'), 'current-schema presentation/audio settings are not authoritative')
for (const manual of [manualEn, manualDe, manualZh]) for (const topic of ['2.7', 'Audio', 'Accessibility']) assert(manual.includes(topic), `localized manual lacks ${topic}`)
assert(manualHtml.includes('<title>Nova_A 3.0 Manual</title>') && manualHtml.includes('data-section="presentation"'), 'HTML manual lacks presentation documentation')

console.log('v2.7 audit passed: responsive UI, themes, focus/remapping, localization, mixer/audio tooling, accessibility, same-origin manual, persistence, editor discovery, localization, and docs are connected.')

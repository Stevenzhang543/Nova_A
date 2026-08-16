import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const failures = []
const assert = (condition, message) => { if (!condition) failures.push(message) }
const read = path => readFile(join(root, path), 'utf8')

const [pkg, tauri, capability, workspaces, windowing, recovery, feedback, palette, settings, bottom, profiler, layout, workspaceBar, history, translations, references] = await Promise.all([
  read('package.json').then(JSON.parse), read('src-tauri/tauri.conf.json').then(JSON.parse), read('src-tauri/capabilities/default.json'), read('src/editor/workspaces.ts'), read('src/runtime/editorWindow.ts'),
  read('src/runtime/recovery.ts'), read('src/runtime/editorFeedback.ts'), read('src/components/CommandPalette.vue'), read('src/panels/SettingsPanel.vue'),
  read('src/components/EditorBottomPanel.vue'), read('src/components/ProfilerPanel.vue'), read('src/layout/EditorLayout.vue'), read('src/components/WorkspaceBar.vue'),
  read('src/store/physics.ts'), read('src/i18n.ts'), read('scripts/export-reference-projects.mjs')
])

assert(pkg.version === '3.2.0' && tauri.version === '3.2.0', 'Product and Tauri versions must be 3.2.0.')
assert(tauri.app.windows[0].fullscreen === false && tauri.app.windows[0].maximized === true && tauri.app.windows[0].decorations === true && tauri.app.windows[0].resizable === true, 'Desktop first launch is not a maximized, decorated, resizable window.')
for (const permission of ['allow-set-fullscreen', 'allow-set-size', 'allow-set-position', 'allow-center']) assert(capability.includes(permission), `Native window capability is missing ${permission}.`)
for (const value of ['launchMaximized', 'toggleEditorFullscreen', 'availableMonitors', 'lastWindowedState', 'onMoved', 'onResized']) assert(windowing.includes(value), `Window lifecycle is missing ${value}.`)
for (const value of ["id: 'design'", "id: 'script'", "id: 'animation'", "id: 'ui'", "id: 'debug'", "id: 'custom'", 'saveCurrentWorkspace', 'duplicateWorkspace', 'renameWorkspace', 'exportWorkspaces', 'importWorkspaces', 'safe-layout', 'workspaceLayoutScope', 'navigateHistory']) assert(workspaces.includes(value), `Workspace foundation is missing ${value}.`)
assert(workspaces.includes("parsed.activeWorkspace === 'interface' ? 'ui'") && workspaces.includes("tab === 'presentation'"), 'Legacy Interface/Presentation layout migration is missing.')
for (const value of ['checksum', 'invalidSnapshots', 'MAX_SNAPSHOTS', 'MAX_TOTAL_BYTES', 'previousSessionCrashed', 'applySafeModeRestrictions', 'readOnly']) assert(recovery.includes(value), `Recovery foundation is missing ${value}.`)
for (const value of ['startTask', 'cancelTask', 'retryTask', 'feedbackDiagnostics', "status: 'failed'"]) assert(feedback.includes(value), `Task/feedback center is missing ${value}.`)
for (const value of ['assetState.records.map', 'sceneManager.scenes.map', 'physicsState.world.entities.map', 'setting-', 'shortcutEditor', 'statusCenter', 'navigateBack']) assert(palette.includes(value), `Global command/search surface is missing ${value}.`)
assert(!settings.includes("import PluginSettings") && !settings.includes("import SaveDataSettings") && settings.includes("openTool('packages')") && settings.includes("openTool('profiler')") && settings.includes('settingsScope'), 'Settings relocation/search/scope is incomplete.')
assert(!bottom.includes("id: 'presentation'") && !bottom.includes('PresentationPanel') && bottom.includes("label: 'profiler'") && bottom.includes('ProjectHealthPanel'), 'Bottom dock still exposes deprecated Presentation/Production Lab surfaces.')
assert(profiler.includes('SaveDataSettings') && profiler.includes('engineDiagnostics') && profiler.includes('networkPackageEnabled.value ?'), 'Profiler does not own runtime diagnostics/save data or hide optional networking correctly.')
assert(layout.includes("activeWorkspace === 'ui'") && layout.includes('PresentationPanel') && layout.includes('hierarchyDock') && layout.includes('inspectorDock'), 'Central UI workspace or dockable side panels are missing.')
assert(!/>H<|>I<|>B</.test(workspaceBar) && workspaceBar.includes('data-doc=') && workspaceBar.includes('control-label'), 'Workspace toolbar still contains undocumented single-letter controls.')
for (const value of ['beginHistoryTransaction', 'commitHistoryTransaction', 'cancelHistoryTransaction', 'new CommandHistory(100)']) assert(history.includes(value), `Transactional 100-step history is missing ${value}.`)
for (const key of ['workspaceUi', 'manageWorkspaces', 'shortcutEditor', 'statusCenter', 'crashRecovery', 'searchSettings', 'projectHealth', 'readOnlyRecoveryBanner']) assert((translations.match(new RegExp(`${key}:`, 'g')) ?? []).length >= 3, `Localization key ${key} is not complete in EN/DE/ZH.`)
assert(references.includes('workspace-recovery-validation') && references.includes('nova-workspaces'), 'Workspace/recovery reference project generation is missing.')
const allSources = (await collectSources(join(root, 'src'))).map(item => item.source).join('\n')
assert(!/\b(?:window\.)?(?:confirm|prompt|alert)\s*\(/.test(allSources), 'Browser confirm/prompt/alert remains in the application.')
assert(existsSync(join(root, 'reference-projects', 'projects', 'workspace-recovery-validation.nova')), 'Generated workspace/recovery reference project is missing.')

if (failures.length) { console.error(`Nova_A v3.1 audit failed (${failures.length}):\n- ${failures.join('\n- ')}`); process.exit(1) }
console.log('Nova_A v3.1 audit passed: fullscreen recovery, workspace management/docking, global navigation/search/shortcuts, transactional history, task feedback, relocated tools, optional capability hiding, and tri-lingual editor foundations.')

async function collectSources(directory) {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) result.push(...await collectSources(path))
    else if (/\.(?:ts|vue|css)$/.test(entry.name)) result.push({ path: relative(root, path), source: await readFile(path, 'utf8') })
  }
  return result
}

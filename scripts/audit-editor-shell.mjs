import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const [state, workspaces, layout, actionBar, palette, inspector, runtimeInspector, i18n, templates, camera, bottomPanel] = await Promise.all([
  read('src/store/editor.ts'), read('src/editor/workspaces.ts'), read('src/layout/EditorLayout.vue'),
  read('src/components/ActionBar.vue'), read('src/components/CommandPalette.vue'), read('src/components/ConfigPanel.vue'),
  read('src/components/RuntimeComponentsInspector.vue'), read('src/i18n.ts'), read('src/projects/templates.ts'),
  read('src/world/Camera.ts'), read('src/components/EditorBottomPanel.vue')
])

function assert(condition, message) { if (!condition) throw new Error(message) }

for (const workspace of ['design', 'script', 'animation', 'ui', 'debug', 'manage']) {
  assert(workspaces.includes(`id: '${workspace}'`), `Missing ${workspace} workspace preset`)
}
for (const panel of ['hierarchyVisible', 'inspectorVisible', 'bottomPanelVisible', 'distractionFree']) {
  assert(state.includes(panel) && layout.includes(panel), `${panel} is not bound from state to layout`)
}
assert(layout.includes('workspace-control-row') && layout.indexOf('<WorkspaceBar') < layout.indexOf('<ActionBar'), 'workspace and playback controls are not structurally separated')
const actionBarRule = actionBar.match(/\.actionbar\s*\{([^}]*)\}/)?.[1] ?? ''
assert(actionBarRule && !actionBarRule.includes('position: absolute') && !actionBarRule.includes('translateX(-50%)'), 'playback controls can overlap editor navigation')
for (const tab of ['assets', 'packages', 'console', 'animation', 'profiler', 'rendering', 'project', 'build']) {
  assert(palette.includes(`toolCommand('${tab}'`), `Command palette cannot open ${tab}`)
}
assert(palette.includes("id: 'tool-tilemap'") && palette.includes("openEditorTool('tilemap')"), 'Command palette cannot select a map and open contextual Tilemap')
assert(workspaces.includes("'rendering'"), 'Rendering panel cannot be restored from saved workspace state')
assert(palette.includes('shortcutMatches') && ['commandPalette','quickOpen','globalSearch','contextSearch'].every(command => palette.includes(`'${command}'`)), 'Command palette shortcuts are incomplete')
assert(workspaces.includes('nova-a-editor-layout-v1') && workspaces.includes('try {') && workspaces.includes('localStorage'), 'Layout persistence is not guarded')
assert(inspector.includes('searchInspector') && inspector.includes('inspectorCategories') && inspector.includes('filteredAddableComponents'), 'Inspector discovery controls are incomplete')
assert(!inspector.includes('class="add-components"'), 'Legacy bottom-of-inspector component pile still exists')
assert(runtimeInspector.includes('componentVisible') && runtimeInspector.includes('visibleJoints'), 'Runtime component sections are not filter-aware')
assert(camera.includes('EDITOR_DEFAULT_SCALE = 40'), 'template-sized world objects are not opened at a readable editor scale')
assert(templates.includes("opacity: 100") && templates.includes("type === 'Box'") && templates.includes('auditTemplateProject'), 'template renderer visibility/geometry audit is incomplete')
assert(bottomPanel.includes('flex-wrap: wrap') && bottomPanel.includes('minmax(205px,25%)'), 'bottom-panel tools do not have the audited responsive layout')
for (const localeBlock of ['Object.assign(en', 'Object.assign(de', 'Object.assign(zh']) {
  const blocks = i18n.split(localeBlock).slice(1)
  assert(blocks.some(block => block.slice(0, 4_000).includes('commandPalette')), `${localeBlock} lacks editor-shell translations`)
}

const versions = await Promise.all([
  read('package.json'), read('Cargo.toml'), read('src-tauri/Cargo.toml'), read('src-tauri/tauri.conf.json'),
  read('crates/nova_format/src/lib.rs'), read('src/projects/projectFormat.ts')
])
const currentVersion = JSON.parse(versions[0]).version
assert(currentVersion === '6.1.0', `Expected the v6.1.0 release authority, found ${currentVersion}`)
for (const source of versions) assert(source.includes(currentVersion), `A primary release metadata file does not identify ${currentVersion}`)
assert(!bottomPanel.includes("id: 'world'") && bottomPanel.includes("id: 'tilemap'"), 'The monolithic World Tools dock was not removed or contextual Tilemap is missing')

console.log('Editor shell audit passed: 6 workspace targets, persistent panel layout, command coverage, and searchable component inspector.')

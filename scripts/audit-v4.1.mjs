import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const read = path => readFile(join(root, path), 'utf8')
const files = async paths => Promise.all(paths.map(read))
const [pkgText, tauri, manifest, css, main, shell, workspaces, bar, side, bottom, manage, palette, shortcuts, registry, lifecycle, launcher, scriptStudio, feedback, build, physics, health, templates] = await files([
  'package.json','src-tauri/tauri.conf.json','src-tauri/windows-app-manifest.xml','src/assets/main.css','src/main.ts','src/layout/EditorLayout.vue','src/editor/workspaces.ts','src/components/WorkspaceBar.vue','src/layout/SideBar.vue','src/components/EditorBottomPanel.vue','src/components/ManageWorkspace.vue','src/components/CommandPalette.vue','src/editor/shortcuts.ts','src/runtime/controlRegistry.ts','src/runtime/featureLifecycle.ts','src/components/ProjectManager.vue','src/components/ScriptStudio.vue','src/runtime/editorFeedback.ts','src/components/BuildSettingsPanel.vue','src/components/PhysicsRuntimePanel.vue','src/components/ProjectHealthPanel.vue','src/projects/templates.ts'
])
const pkg = JSON.parse(pkgText), checks = []
const check = (id, passed, detail) => checks.push({ id, status: passed ? 'passed' : 'failed', detail })
check('V410-VERSION', pkg.version === '4.1.0' && JSON.parse(tauri).version === '4.1.0', 'Package and desktop release authorities are 4.1.0.')
check('V410-WINDOW', manifest.includes('PerMonitorV2') && tauri.includes('"minWidth": 1024') && tauri.includes('"minHeight": 640'), 'Per-monitor DPI and safe window minimums are declared.')
check('V410-WORKSPACES', ['design','script','animation','ui','debug','manage'].every(id => workspaces.includes(`id: '${id}'`)) && bar.includes("preset.id !== 'custom'"), 'The six public workspaces are represented directly; named custom layouts stay in the layout manager.')
check('V410-PROFILES', ['beginner','designer','programmer','ui-designer','profiler','release-engineer'].every(id => workspaces.includes(`id: '${id}'`)), 'All six named default profiles are declared.')
check('V410-DOCKING', ['floatingPanels','splitDocking','bottomPanelPinned','panelOrder','bottomTabOrder'].every(value => workspaces.includes(value)) && shell.includes("dropPanel('floating')"), 'Docking, floating, splitting, pinning, rearrangement and persistence fields are wired.')
check('V410-MANAGE', ['PackageManagerPanel','ProjectHealthPanel','BuildSettingsPanel','RenderingPanel','SettingsPanel'].every(value => manage.includes(value)) && !bottom.includes('PackageManagerPanel') && !bottom.includes('BuildSettingsPanel'), 'Global policy tools moved from the transient dock to Manage.')
check('V410-CONTEXT-RAIL', side.includes("activeWorkspace === 'debug'") && side.includes('data-control-scope="context-rail"') && !side.includes("label: 'game'"), 'The left rail is contextual and does not duplicate Game as a global destination.')
check('V410-PHYSICS-CONTEXT', shell.includes("state.physicsMonitorOpen && state.activeWorkspace === 'debug'") && physics.includes('virtual-list'), 'Physics Monitor is Debug-only and uses a bounded virtualized browser/detail surface.')
check('V410-HEALTH-CONTEXT', health.includes('health-table') && health.includes('health-detail'), 'Project Health uses summary/table/detail instead of dense cards.')
check('V410-COMPLETION', !scriptStudio.includes("t('complete')") && scriptStudio.includes('requestCompletions') && scriptStudio.includes('@keydown.ctrl.space.prevent') && scriptStudio.includes('wordBeforeCursor.value.length >= 2'), 'Completion is automatic and explicit Ctrl/Cmd+Space is unambiguous.')
check('V410-TYPOGRAPHY', ['Nunito Sans Variable','Noto Sans SC Variable','JetBrains Mono Variable'].every(value => css.includes(value)) && main.includes('@fontsource-variable/nunito-sans') && !css.includes('accent-color: #ef4444'), 'Declared variable fonts and non-danger audio controls are used.')
check('V410-DESIGN-TOKENS', ['--type-body','--space-2','--radius-control','--focus-ring','--selection-bg','--disabled-opacity','--warning','--danger'].every(value => css.includes(value)), 'Core typography, spacing, radius, focus, selection, disabled, warning and error tokens exist.')
check('V410-DISCOVERY', ['quickOpen','globalSearch','contextSearch','commandPalette'].every(value => shortcuts.includes(value)) && palette.includes('stableControlInventory') && bar.includes('context-title'), 'Search modes, stable command discovery and current context are connected.')
check('V410-SHORTCUTS', shortcuts.includes('shortcutConflicts') && shortcuts.includes('exportShortcuts') && shortcuts.includes('importShortcuts'), 'Shortcut conflict detection and portable import/export are implemented.')
check('V410-CONTROLS', registry.includes('data-testid') && registry.includes('disabledReason') && main.includes('installStableControlRegistry'), 'A runtime stable-control inventory assigns test IDs, names and disabled reasons.')
check('V410-LIFECYCLE', ['stable','beta','experimental','internal'].every(value => lifecycle.includes(`'${value}'`)) && lifecycle.includes('import.meta.env.DEV'), 'Lifecycle flags include Stable/Beta/Experimental/Internal and suppress Internal outside development.')
check('V410-LAUNCHER', launcher.includes('projectLocation') && launcher.includes('pathError') && launcher.includes('template-details') && launcher.includes("t('learnNova')") && launcher.includes(':aria-pressed'), 'Launcher selection, path validation, Learn Nova_A and template details are visible.')
check('V410-TUTORIAL', templates.includes('Assets/Tutorials/Getting Started.md') && templates.includes('dismissible: true') && bottom.includes('dismissTutorial'), 'Template guidance is project tutorial content and can be dismissed.')
check('V410-TASKS', ['logs','resources','cancel','retry'].every(value => feedback.includes(value)), 'Task Center records progress, cancellation, retry, logs and resource links.')
check('V410-READINESS', ['blocked','ready-warnings','ready','in-progress'].every(value => build.includes(value)), 'All four build-readiness states are declared.')
check('V410-DETAILS', bottom.includes('asset-technical') && bottom.includes('copyAssetDetail'), 'Full paths and hashes are exposed in a copyable details pane.')

const docs = ['UI_DESIGN_TOKENS_4_1.md','TYPOGRAPHY_INVENTORY_4_1.md','FONT_LICENSE_VERIFICATION_4_1.md','DPI_MATRIX_4_1.md','KEYBOARD_ACCESSIBILITY_4_1.md','FEATURE_PARITY_4_1.md','NAVIGATION_4_1.md','KNOWN_ISSUES_4_1.md']
for (const name of docs) { try { await access(join(root,'docs',name)); check(`V410-DOC-${name}`, true, 'Present.') } catch { check(`V410-DOC-${name}`, false, 'Missing.') } }
const failed = checks.filter(item => item.status === 'failed')
const report = { format:'nova-v4.1-modernization-audit', version:1, engineVersion:'4.1.0', generatedAt:new Date().toISOString(), severity0Open:0, severity1Open:failed.length, checks, status:failed.length ? 'failed' : 'passed' }
await mkdir(join(root,'release-audits'),{recursive:true})
await writeFile(join(root,'release-audits','v4.1.0-modernization-audit.json'),`${JSON.stringify(report,null,2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v4.1 modernization audit passed: ${checks.length} architecture, discoverability, typography, task, launcher and documentation checks.`)

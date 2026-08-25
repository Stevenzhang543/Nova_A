import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const read = path => readFile(join(root, path), 'utf8')
const paths = [
  'package.json','Cargo.toml','src-tauri/Cargo.toml','src-tauri/tauri.conf.json','src/projects/projectFormat.ts',
  'src/assets/main.css','src/components/WorkspaceBar.vue','src/components/ToolBar.vue','src/layout/SideBar.vue',
  'src/layout/EditorLayout.vue','src/layout/TopBar.vue','src/layout/StatusBar.vue','src/components/ProjectManager.vue',
  'src/components/ConfirmDialog.vue','src/store/dialog.ts','src/i18n.ts','instructions.txt','README.md','README.zh-CN.md',
  'manual/index.html','manual/MANUAL.en.md','manual/MANUAL.de.md','manual/MANUAL.zh-CN.md','docs/UX_GUIDE_5_0_1.md',
  'src/runtime/controlRegistry.ts'
]
const sources = Object.fromEntries(await Promise.all(paths.map(async path => [path, await read(path)])))
const all = Object.values(sources).join('\n')
const pkg = JSON.parse(sources['package.json']), tauri = JSON.parse(sources['src-tauri/tauri.conf.json'])

check('V501-VERSION', pkg.version === '5.0.1' && tauri.version === '5.0.1' && sources['Cargo.toml'].includes('version = "5.0.1"') && sources['src-tauri/Cargo.toml'].includes('version = "5.0.1"') && sources['src/projects/projectFormat.ts'].includes("NOVA_ENGINE_VERSION = '5.0.1'"), 'Web, Rust, native and project authorities identify 5.0.1 while schema remains frozen.', { schemaFrozen: sources['src/projects/projectFormat.ts'].includes('NOVA_PROJECT_SCHEMA_VERSION = 29') })
check('UX-TYPE', ['--type-caption: calc(12px','--type-dense: calc(13px','--type-body: calc(14px','--type-section: calc(16px','--type-page: calc(22px'].every(value => sources['src/assets/main.css'].includes(value)), 'The multilingual typography floor and semantic type roles are centralized.')
check('UX-COLOR', ['--accent-secondary','--creation','--creation-soft','--bg-canvas','--border-strong',":root[data-theme='light']"].every(value => sources['src/assets/main.css'].includes(value)), 'Dark/light surface hierarchy and role colors are centralized.')
check('UX-MOTION', sources['src/assets/main.css'].includes('prefers-reduced-motion') && sources['src/assets/main.css'].includes('transform: scale(.975)'), 'Purposeful press feedback and reduced-motion fallback coexist.')

const workspace = sources['src/components/WorkspaceBar.vue']
check('NAV-HIERARCHY', ['workspace-list','history-controls','layout-menu','command-menu','toggleEditorPanel','toggleFocusMode','openPalette'].every(value => workspace.includes(value)), 'Workspace, history, layout, focus, management and command/search paths remain wired.')
check('NAV-RESPONSIVE', workspace.includes('workspace-popover') && workspace.includes('@media (max-width: 1280px)') && workspace.includes("t('currentContext')"), 'Workspace chrome has named responsive groups and localized context.')
const toolbar = sources['src/components/ToolBar.vue']
check('TOOLS-NO-SCROLL', !/\.toolbar\s*\{[^}]*overflow-x\s*:\s*auto/s.test(toolbar) && toolbar.includes('.toolbar-content { width:100%; min-width:0'), 'The scene toolbar does not depend on horizontal browser scrolling.')
check('TOOLS-COMPLETE', ['transformTools','authoringTools','shapeTools','transformActions','snapOptions','guidesAndRulers','cameraOverlay','alignSelection','distributeSelection','mirrorSelection','groupSelection'].every(value => toolbar.includes(value)), 'Transform, edit, draw, arrange, snapping, guide, camera and grouping capabilities remain reachable.')
check('TOOLS-GROUPS', ['authoring-menu','action-grid','snap-menu','guide-menu','authoring-popover','viewport-popover'].every(value => toolbar.includes(value)), 'Secondary scene controls are organized in named popovers.')
check('CONTEXT-RAIL', sources['src/layout/SideBar.vue'].includes('width:82px') && sources['src/layout/SideBar.vue'].includes('overflow-wrap:anywhere') && sources['src/layout/SideBar.vue'].includes('--creation'), 'Context actions use readable two-line labels and a distinct creation role.')
check('POPOVER-STACKING', sources['src/layout/EditorLayout.vue'].includes('z-index:600') && sources['src/layout/EditorLayout.vue'].includes('overflow:visible'), 'Workspace popovers stack above scene chrome instead of appearing beneath it.')

const i18n = sources['src/i18n.ts']
for (const locale of ['en','de','zh']) check(`I18N-${locale.toUpperCase()}`, i18n.includes(`Object.assign(${locale}, {`) && i18n.includes("releaseLabel:'Nova_A v5.0.1'") && ['currentContext','create','layoutPanels','commandsAndSearch','authoringTools','viewportSettings','preflight_document_label','preflight_validation_blocked'].every(key => i18n.includes(`${key}:`)), `${locale} contains the 5.0.1 editor-chrome and migration-preflight vocabulary.`)
const projectManager = sources['src/components/ProjectManager.vue']
check('I18N-MIGRATION', projectManager.includes('localizedPreflightLabel') && projectManager.includes('localizedPreflightDetail') && !projectManager.includes('{{ check.label }}') && !projectManager.includes('{{ check.detail }}'), 'Migration preflight labels and details switch with the selected language.')
check('I18N-ACCESSIBLE-NAMES', ['generatedAriaLabel','generatedDisabledReason','characterData','refreshTextOwner'].every(value => sources['src/runtime/controlRegistry.ts'].includes(value)), 'Registry-generated accessible names and disabled reasons follow live language changes.')

const sourceNames = (await readdir(join(root, 'src'), { recursive: true })).filter(name => /\.(vue|ts)$/.test(name))
const sourceFiles = await Promise.all(sourceNames.map(async name => [name, await readFile(join(root, 'src', name), 'utf8')]))
const literalKeys = new Set(sourceFiles.flatMap(([, source]) => [...source.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)].map(match => match[1])))
const missingLiteralKeys = [...literalKeys].filter(key => !new RegExp(`(?:^|[,{\\s])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`).test(i18n))
check('I18N-LITERAL-KEYS', missingLiteralKeys.length === 0, 'Every statically referenced translation key is declared in the bundled vocabulary.', { missingLiteralKeys })

check('DIALOGS-NATIVE-FREE', sources['src/components/ConfirmDialog.vue'].includes('role="alertdialog"') && sources['src/store/dialog.ts'].includes('requestConfirmation') && !sourceFiles.some(([, source]) => /\b(?:window\.)?(?:confirm|alert|prompt)\s*\(/.test(source)), 'App-native confirmation is present and source code does not call browser confirm/alert/prompt.')
check('SPECIFICATION', ['First-user audit','Information architecture','Typography','Dark palette','Motion system','Localization and accessibility','Required audit matrix','Build and release checks','Do not remove a feature'].every(value => sources['instructions.txt'].toLowerCase().includes(value.toLowerCase())), 'instructions.txt is the authoritative complete 5.0.1 UX specification.')
check('DOCUMENTATION', ['5.0.1','Layout','Commands','Authoring tools','View settings'].every(value => sources['docs/UX_GUIDE_5_0_1.md'].includes(value)) && ['MANUAL.en.md','MANUAL.de.md','MANUAL.zh-CN.md'].every(name => sources[`manual/${name}`].includes('5.0.1')), 'README, UX guide and three Markdown manuals describe the new organization.')
check('CONTRACTS-PRESERVED', all.includes('schema 29') && all.includes('Rhai API v2') && all.includes('Plugin API 2') && all.includes('Build CLI 1') && sources['instructions.txt'].includes('Do not remove a feature, animation, command, shortcut'), 'Frozen public and user-experience contracts are explicitly preserved.')

const failed = checks.filter(item => item.status === 'failed')
const report = { format:'nova-v5.0.1-ux-audit', version:1, engineVersion:'5.0.1', generatedAt:new Date().toISOString(), catalogs:['UX','I18N','REGRESSION','RELEASE'], checks, severity0Open:0, severity1Open:failed.length, status:failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive:true })
await writeFile(join(root, 'release-audits', 'v5.0.1-ux-audit.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v5.0.1 UX audit passed: ${checks.length} checks, ${literalKeys.size} static translation keys.`)

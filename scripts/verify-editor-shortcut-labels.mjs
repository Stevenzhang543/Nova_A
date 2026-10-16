/** 编辑器按键文案必须来自唯一绑定源，否则显示会与实际绑定不一致（C 组 G2：TopBar 曾把命令面板标成 Ctrl K）。 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const checks = []
async function test(name, run) {
  try { await run(); checks.push({ name, status: 'passed' }); console.log('PASS ' + name) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error && error.message || error) }); console.error('FAIL ' + name + ' :: ' + (error && error.message || error)) }
}

const opened = await openMediaAuditModules({ repository: process.cwd(), bases: [process.cwd()] }, { shortcuts: 'editor/shortcuts' })
const { shortcutLabel, shortcutState, setShortcut, resetShortcuts, shortcutMatches, shortcutAliases, SHORTCUT_DISPLAY_ALIASES } = opened.modules.shortcuts
const read = path => fs.readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
const topBar = read('src/layout/TopBar.vue')
const workspaceBar = read('src/components/WorkspaceBar.vue')

const bindingOf = (id) => shortcutState.definitions.find(/** 按 id 取当前绑定。 */ d => d.id === id)?.binding

await test('A label is derived from the live binding of the requested command', () => {
  for (const id of ['commandPalette', 'quickOpen', 'fullscreen', 'workspaceManager', 'shortcutEditor']) {
    assert.equal(shortcutLabel(id), bindingOf(id).replaceAll('+', ' '), id + ' kbd label must match its binding')
    assert.equal(shortcutLabel(id, 'inline'), bindingOf(id), id + ' inline label must match its binding')
  }
})

await test('The command palette default is Ctrl+Shift+P, so the old Ctrl K label was wrong', () => {
  assert.equal(bindingOf('commandPalette'), 'Ctrl+Shift+P')
  assert.equal(shortcutLabel('commandPalette'), 'Ctrl Shift P')
  assert.ok(!shortcutLabel('commandPalette').includes('K'), 'the palette label must not claim Ctrl K')
})

await test('Remapping a shortcut updates the displayed label', () => {
  const before = shortcutLabel('commandPalette')
  try {
    setShortcut('commandPalette', 'Ctrl+Alt+P')
    assert.equal(shortcutLabel('commandPalette'), 'Ctrl Alt P')
    assert.notEqual(shortcutLabel('commandPalette'), before)
  } finally { resetShortcuts() }
  assert.equal(shortcutLabel('commandPalette'), before, 'reset must restore the default label')
})

await test('An unknown command resolves to an empty label instead of throwing', () => {
  assert.equal(shortcutLabel('noSuchCommand'), '')
})

await test('Both shells import the single source and keep no hardcoded bindings', () => {
  for (const [name, source] of [['TopBar.vue', topBar], ['WorkspaceBar.vue', workspaceBar]]) {
    assert.ok(/import \{[^}]*shortcutLabel[^}]*\} from '\.\.\/editor\/shortcuts'/.test(source), name + ' must import the single source')
  }
  assert.ok(!/Ctrl K<\/kbd>/.test(topBar), 'TopBar must not hardcode the wrong palette key')
  assert.ok(!/data-shortcut="Ctrl/.test(workspaceBar), 'WorkspaceBar must not hardcode data-shortcut bindings')
  for (const id of ['commandPalette', 'fullscreen', 'workspaceManager', 'shortcutEditor']) {
    assert.ok(topBar.includes("shortcutLabel('" + id + "')"), 'TopBar must render ' + id + ' from the registry')
  }
})

await test('The core editing commands are registered, so they become editable', () => {
  const core = ['saveProject', 'undo', 'redo', 'undoHistory', 'copySelection', 'pasteSelection', 'duplicateSelection', 'renameSelection', 'deleteSelection', 'deselectAll']
  for (const id of core) {
    assert.ok(bindingOf(id), id + ' must be registered in the shortcut source')
    // Labels derive from the live binding, then pass through the exported compact display map.
    // The map is imported rather than copied so the assertion cannot drift from the implementation.
    const expected = bindingOf(id).split('+').join(' ').split(' ').map(/** 应用产品代码导出的紧凑显示映射。 */ part => SHORTCUT_DISPLAY_ALIASES[part] ?? part).join(' ')
    assert.equal(shortcutLabel(id), expected, id + ' label must derive from its binding')
  }
  assert.ok(!/Ctrl S<\/kbd>/.test(topBar), 'the save key must be rendered from the source, not hardcoded')
  assert.ok(SHORTCUT_DISPLAY_ALIASES && SHORTCUT_DISPLAY_ALIASES.Escape === 'Esc', 'the display map must be exported from the product source')
  assert.ok(topBar.includes("shortcutLabel('saveProject')"), 'TopBar must render the save key from the source')
})

await test('Save is dispatched through the shortcut source rather than a literal key test', () => {
  assert.ok(topBar.includes("shortcutMatches(event, 'saveProject')"), 'save must match through the registry')
  assert.ok(!/event\.key\.toLowerCase\(\) === 's'/.test(topBar), 'the literal save key test must be gone')
})

await test('Alias bindings survive the migration', () => {
  const press = (/** 构造只含匹配所需字段的按键对象。 */ over) => Object.assign({ ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, key: '' }, over)
  assert.deepEqual([...shortcutAliases('redo')], ['Ctrl+Shift+Z'])
  assert.deepEqual([...shortcutAliases('deleteSelection')], ['Backspace'])
  assert.ok(shortcutMatches(press({ ctrlKey: true, key: 'y' }), 'redo'), 'Ctrl+Y must still redo')
  assert.ok(shortcutMatches(press({ ctrlKey: true, shiftKey: true, key: 'z' }), 'redo'), 'Ctrl+Shift+Z must still redo')
  assert.ok(shortcutMatches(press({ ctrlKey: true, key: 'z' }), 'undo'), 'Ctrl+Z must still undo')
  assert.ok(shortcutMatches(press({ key: 'Delete' }), 'deleteSelection'), 'Delete must delete')
  assert.ok(shortcutMatches(press({ key: 'Backspace' }), 'deleteSelection'), 'Backspace must still delete')
  assert.ok(!shortcutMatches(press({ key: 'Backspace' }), 'undo'), 'aliases must not leak across commands')
})

await test('Display aliases keep the existing compact key chips', () => {
  assert.equal(shortcutLabel('deselectAll'), 'Esc')
  assert.equal(shortcutLabel('deleteSelection'), 'Del')
  assert.equal(shortcutLabel('renameSelection'), 'F2')
  assert.equal(shortcutLabel('saveProject'), 'Ctrl S')
})

await test('Every core command is dispatched through the shortcut source', () => {
  const core = ['saveProject', 'undo', 'redo', 'undoHistory', 'copySelection', 'pasteSelection', 'duplicateSelection', 'renameSelection', 'deleteSelection', 'deselectAll']
  for (const id of core) assert.ok(topBar.includes("shortcutMatches(event, '" + id + "')"), 'TopBar must dispatch ' + id + ' through the source')
  assert.ok(!/event\.key\.toLowerCase\(\) === '[a-z]'/.test(topBar), 'no literal letter key tests may remain')
  assert.ok(!/event\.key === 'F2'|event\.key === 'Delete'|event\.key === 'Escape'/.test(topBar), 'no literal special-key tests may remain')
})

await test('Navigation keys render from the source and keep their arrow chips', () => {
  assert.equal(shortcutLabel('navigateBack'), 'Alt ←')
  assert.equal(shortcutLabel('navigateForward'), 'Alt →')
  assert.equal(shortcutLabel('navigateBack', 'inline'), 'Alt+ArrowLeft')
  assert.ok(workspaceBar.includes("shortcutLabel('navigateBack')"), 'WorkspaceBar must render the back key from the source')
  assert.ok(workspaceBar.includes("shortcutLabel('navigateForward')"), 'WorkspaceBar must render the forward key from the source')
  const stripped = workspaceBar.split("shortcutLabel('navigateBack'").join('').split("shortcutLabel('navigateForward'").join('')
  assert.ok(!/Alt[+ ]?←|Alt[+ ]?→/.test(stripped), 'no hardcoded arrow bindings may remain')
})

const out = process.env.NOVA_SHORTCUT_LABEL_REPORT || 'reports/phase2/shortcut-labels.json'
fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true })
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), checks, status: checks.some(/** 任一失败即整体失败。 */ c => c.status === 'failed') ? 'failed' : 'passed' }, null, 2) + '\n')
console.log('shortcut label report -> ' + out)
if (checks.some(/** 任一失败即非零退出。 */ c => c.status === 'failed')) process.exitCode = 1

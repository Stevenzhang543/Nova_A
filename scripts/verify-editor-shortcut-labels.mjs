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
const { shortcutLabel, shortcutState, setShortcut, resetShortcuts } = opened.modules.shortcuts
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
    assert.ok(source.includes("import { shortcutLabel } from '../editor/shortcuts'"), name + ' must import the single source')
  }
  assert.ok(!/Ctrl K<\/kbd>/.test(topBar), 'TopBar must not hardcode the wrong palette key')
  assert.ok(!/data-shortcut="Ctrl/.test(workspaceBar), 'WorkspaceBar must not hardcode data-shortcut bindings')
  for (const id of ['commandPalette', 'fullscreen', 'workspaceManager', 'shortcutEditor']) {
    assert.ok(topBar.includes("shortcutLabel('" + id + "')"), 'TopBar must render ' + id + ' from the registry')
  }
})

const out = process.env.NOVA_SHORTCUT_LABEL_REPORT || 'reports/phase2/shortcut-labels.json'
fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true })
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), checks, status: checks.some(/** 任一失败即整体失败。 */ c => c.status === 'failed') ? 'failed' : 'passed' }, null, 2) + '\n')
console.log('shortcut label report -> ' + out)
if (checks.some(/** 任一失败即非零退出。 */ c => c.status === 'failed')) process.exitCode = 1

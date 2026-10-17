/** 验证脚本（v26.11-project-locks）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import assert from 'node:assert/strict'
import { build } from 'vite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const temporary = await mkdtemp(join(tmpdir(), 'nova-v2611-project-locks-'))
const storage = new Map(), checks = []
globalThis.localStorage = { getItem: /* 当 storage.get(key) 为 null 或 undefined 时返回 null，否则保留左侧值。 */ key => storage.get(key) ?? null, setItem: /* 调用 storage.set(key, String(value)) 并返回调用结果。 */ (key, value) => storage.set(key, String(value)), removeItem: /* 调用 storage.delete(key) 并返回调用结果。 */ key => storage.delete(key) }
const check = /** 执行同步检查并捕获异常，将通过状态或错误信息写入检查列表。 */ (id, run) => { try { run(); checks.push({ id, status: 'passed' }) } catch (error) { checks.push({ id, status: 'failed', error: error.message }) } }
const hide = /** 向目标界面派发带指定持久化标记的页面隐藏事件。 */ (surface, persisted = false) => { const event = new Event('pagehide'); Object.defineProperty(event, 'persisted', { value: persisted }); surface.dispatchEvent(event) }
let instance = 0

try {
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, build: { ssr: true, outDir: join(temporary, 'compiled'), rollupOptions: { input: join(root, 'src/runtime/teamWorkflow.ts'), output: { entryFileNames: 'team.mjs' } } } })
  const editor = /** 创建独立事件界面并以不同导入参数加载协作模块，模拟独立编辑器实例。 */ async () => {
    const surface = new EventTarget(); globalThis.window = surface
    const module = await import(`${pathToFileURL(join(temporary, 'compiled', 'team.mjs'))}?editor=${instance++}`)
    return { surface, module }
  }
  const first = await editor(), project = 'reload-fixture', key = `nova_a.project_lock.${project}`
  check('initial editor acquires project lease', /* 调用 assert.equal(first.module.acquireProjectLock(project, 'First editor'), true) 并返回调用结果。 */ () => assert.equal(first.module.acquireProjectLock(project, 'First editor'), true))
  check('normal pagehide releases exact owned lease before reload', /** 验证关闭首个编辑器后其项目锁从存储移除。 */ () => { hide(first.surface); assert.equal(storage.has(key), false) })
  const reloaded = await editor()
  check('fresh module after reload can reopen writable', /** 验证重载后的编辑器看到未锁定项目并能成功取得项目锁。 */ () => { assert.equal(reloaded.module.inspectProjectLock(project).locked, false); assert.equal(reloaded.module.acquireProjectLock(project, 'Reloaded editor'), true) })
  const token = reloaded.module.teamWorkflowState.lockToken
  const other = await editor()
  check('another editor remains blocked by active lease', /** 验证其它编辑器识别已有锁、无法抢占且保持原令牌。 */ () => { assert.equal(other.module.inspectProjectLock(project).locked, true); assert.equal(other.module.acquireProjectLock(project, 'Other editor'), false); assert.equal(JSON.parse(storage.get(key)).token, token) })
  check('unrelated project release does not lose current ownership', /** 验证释放不同项目不会清空当前编辑器的锁令牌。 */ () => { reloaded.module.releaseProjectLock('different-project'); assert.equal(reloaded.module.teamWorkflowState.lockToken, token); assert.equal(JSON.parse(storage.get(key)).token, token) })
  check('BFCache pagehide keeps ownership for the frozen document', /** 验证进入往返缓存的页面隐藏事件保留项目锁。 */ () => { hide(reloaded.surface, true); assert.equal(JSON.parse(storage.get(key)).token, token) })
  check('non-owner pagehide cannot release another editor lease', /** 验证其它编辑器隐藏页面时不会删除当前持有者的锁。 */ () => { hide(other.surface); assert.equal(JSON.parse(storage.get(key)).token, token) })
  check('owned pagehide releases after BFCache restoration', /** 验证持锁编辑器正常隐藏页面时移除项目锁。 */ () => { hide(reloaded.surface); assert.equal(storage.has(key), false) })
  const stale = await editor()
  stale.module.acquireProjectLock(project, 'Stale editor')
  const replacement = { token: 'replacement-token', owner: 'New owner', createdAt: Date.now(), expiresAt: Date.now() + 120_000 }
  storage.set(key, JSON.stringify(replacement))
  check('stale owner cannot remove a replacement lease on pagehide', /** 验证过期编辑器隐藏页面时不会删除新持有者替换后的锁。 */ () => { hide(stale.surface); assert.deepEqual(JSON.parse(storage.get(key)), replacement) })
  check('expired foreign lease can still be acquired', /** 验证过期项目锁可由另一个编辑器重新取得。 */ () => { storage.set(key, JSON.stringify({ ...replacement, expiresAt: Date.now() - 1 })); assert.equal(other.module.acquireProjectLock(project, 'Other editor'), true) })
  check('switching projects releases the previous owned lease', /** 验证切换项目取得新锁时释放旧锁，当前持有者不会被判定为外部锁定。 */ () => { assert.equal(other.module.acquireProjectLock('next-project', 'Other editor'), true); assert.equal(storage.has(key), false); assert.equal(other.module.inspectProjectLock('next-project').locked, false) })
  check('blocked switch preserves current project ownership', /** 验证获取被他人锁定的项目失败时仍保留当前项目锁和令牌。 */ () => { storage.set(key, JSON.stringify(replacement)); const current = other.module.teamWorkflowState.lockToken; assert.equal(other.module.acquireProjectLock(project, 'Other editor'), false); assert.equal(other.module.teamWorkflowState.lockToken, current); assert.equal(JSON.parse(storage.get('nova_a.project_lock.next-project')).token, current) })
  check('unreadable lease is never removed during owned-page cleanup', /** 验证页面隐藏时保留无法解析的锁内容，避免误删不确定归属的数据。 */ () => { storage.set('nova_a.project_lock.next-project', '{malformed'); hide(other.surface); assert.equal(storage.get('nova_a.project_lock.next-project'), '{malformed') })
  const report = { release: '26.11', status: checks.some(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed') ? 'failed' : 'passed', coverage: 'Production lease module with shared storage and separate page lifecycle event targets; actual browser reload is a separate UI check.', checks }
  await mkdir(join(root, 'release-audits'), { recursive: true })
  await writeFile(join(root, 'release-audits/v26.11-project-locks.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
  if (report.status === 'failed') process.exitCode = 1
} finally {
  // Remove only the exact temporary directory returned by mkdtemp.
  await rm(temporary, { recursive: true, force: true })
}

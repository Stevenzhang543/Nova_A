/** 变换拖动取消语义：Escape/pointercancel 必须恢复基准姿态，而不是把位移留成不可撤销的残留（§24）。 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const checks = []
async function test(name, run) {
  try { await run(); checks.push({ name, status: 'passed' }); console.log('PASS ' + name) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error && error.message || error) }); console.error('FAIL ' + name + ' :: ' + (error && error.message || error)) }
}

const opened = await openMediaAuditModules({ repository: process.cwd(), bases: [process.cwd()] },
  { gizmo: 'editor/gizmo', box: 'world/BoxEntity', hierarchy: 'world/hierarchy' })
const { gizmo, box, hierarchy } = opened.modules
const canvasSource = fs.readFileSync('src/components/WorldCanvas.vue', 'utf8').replaceAll('\r\n', '\n')

const makeWorld = () => [new box.BoxEntity(1, { x: 10, y: 20 }, { x: 1, y: 1 }), new box.BoxEntity(2, { x: -5, y: 7 }, { x: 2, y: 3 })]
const readAll = (entities) => entities.map(/** 读取实体的世界位置、旋转与缩放，作为可比较的基准。 */ entity => {
  const t = hierarchy.worldTransform(entity, entities)
  return { position: { ...t.position }, rotation: t.rotation, scale: { ...t.scale } }
})
const sameTransform = (left, right) => left.rotation === right.rotation &&
  left.position.x === right.position.x && left.position.y === right.position.y &&
  left.scale.x === right.scale.x && left.scale.y === right.scale.y

await test('A committed translation produces one snapshot per selection root', () => {
  const entities = makeWorld()
  const snapshots = gizmo.captureTransforms(entities.map(/** 取实体 id。 */ e => e.id), entities)
  assert.equal(snapshots.length, 2)
  for (const snapshot of snapshots) assert.ok(snapshot.entity && snapshot.position && snapshot.scale)
})

await test('Translation, rotation and scale each restore the exact captured baseline', () => {
  for (const apply of [
    (snapshots, entities) => gizmo.applyTranslation(snapshots, { x: 100, y: -50 }, entities),
    (snapshots, entities) => gizmo.applyRotation(snapshots, { x: 0, y: 0 }, Math.PI / 3, entities),
    (snapshots, entities) => gizmo.applyScale(snapshots, { x: 0, y: 0 }, { x: 2.5, y: 0.5 }, entities),
  ]) {
    const entities = makeWorld()
    const baseline = readAll(entities)
    const snapshots = gizmo.captureTransforms(entities.map(/** 取实体 id。 */ e => e.id), entities)
    apply(snapshots, entities)
    const moved = readAll(entities)
    assert.ok(moved.some(/** 至少一个实体确实被移动。 */ (t, i) => !sameTransform(t, baseline[i])), 'the drag must actually change the document')
    gizmo.restoreTransforms(snapshots, entities)
    const restored = readAll(entities)
    for (let i = 0; i < baseline.length; i++) assert.ok(sameTransform(restored[i], baseline[i]), 'restore must reproduce the baseline exactly for entity ' + i)
  }
})

await test('Restoring is idempotent and does not drift on repeated cancel', () => {
  const entities = makeWorld()
  const baseline = readAll(entities)
  const snapshots = gizmo.captureTransforms(entities.map(/** 取实体 id。 */ e => e.id), entities)
  gizmo.applyTranslation(snapshots, { x: 12.5, y: 3.25 }, entities)
  for (let i = 0; i < 5; i++) gizmo.restoreTransforms(snapshots, entities)
  assert.deepEqual(readAll(entities), baseline)
})

await test('Clearing the drag without restoring would strand the displacement (regression guard)', () => {
  const entities = makeWorld()
  const baseline = readAll(entities)
  const snapshots = gizmo.captureTransforms(entities.map(/** 取实体 id。 */ e => e.id), entities)
  gizmo.applyTranslation(snapshots, { x: 40, y: 0 }, entities)
  // This is what the Escape path used to do: drop the drag state and keep the written transforms.
  const stranded = readAll(entities)
  assert.ok(!sameTransform(stranded[0], baseline[0]), 'documents the defect the fix removes')
  gizmo.restoreTransforms(snapshots, entities)
  assert.ok(sameTransform(readAll(entities)[0], baseline[0]))
})

await test('The editor Escape path restores the baseline before finishing the drag', () => {
  const escapeBlock = canvasSource.slice(canvasSource.indexOf("if (event.key !== 'Escape') return"), canvasSource.indexOf("if (event.key !== 'Escape') return") + 900)
  assert.ok(escapeBlock.includes('restoreTransforms(gizmoDrag.snapshots, world.entities)'), 'Escape must restore the captured baseline')
  assert.ok(escapeBlock.includes('finishCanvasDrag()'), 'Escape must still clear the drag state')
  assert.ok(escapeBlock.indexOf('restoreTransforms') < escapeBlock.indexOf('finishCanvasDrag()'), 'restore must run before the drag state is cleared')
})

const out = process.env.NOVA_GIZMO_CANCEL_REPORT || 'reports/phase2/gizmo-cancel.json'
fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true })
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), checks, status: checks.some(/** 任一检查失败即判整体失败。 */ c => c.status === 'failed') ? 'failed' : 'passed' }, null, 2) + '\n')
console.log('gizmo cancel report -> ' + out)
if (checks.some(/** 任一检查失败即设置非零退出码。 */ c => c.status === 'failed')) process.exitCode = 1

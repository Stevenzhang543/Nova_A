import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { canonicalPhysicsBeforeEntityBuilder } from './entityBuilderContract.mjs'
const fixture = JSON.parse(readFileSync(new URL('../fixtures/entity-removal-transform-v1.json', import.meta.url), 'utf8'))
const sha = value => createHash('sha256').update(value).digest('hex')
const source = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
function inverse(value, record) {
  if (sha(value) === record.beforeSha256) return value
  assert.equal(sha(value), record.afterSha256, 'Entity removal source differs from the reviewed entire source: ' + record.path)
  let restored = value
  for (const [before, after, count] of [...record.edits].reverse()) {
    assert.equal(restored.split(after).length - 1, count, 'Entity removal inverse anchor must be exact and unique')
    restored = restored.replace(after, before)
  }
  assert.equal(sha(restored), record.beforeSha256, 'Entire original entity removal source must roundtrip byte for byte')
  return restored
}
function physicsAtEntityRemoval(value) {
  const digest = sha(value)
  if (digest === fixture.physics.beforeSha256 || digest === fixture.physics.afterSha256) return value
  return canonicalPhysicsBeforeEntityBuilder(value)
}
export function canonicalPhysicsBeforeEntityRemoval(value) { return inverse(physicsAtEntityRemoval(value), fixture.physics) }
export function canonicalEditorGameplayHostBeforeEntityRemoval(value) { return inverse(value, fixture.editor) }
function body(text, name) {
  const parsed = ts.createSourceFile('entityRemoval.ts', text, ts.ScriptTarget.Latest, true)
  const node = parsed.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name)
  assert(node?.body, 'Required complete original function: ' + name)
  return node.body.getText(parsed)
}
export function validateEntityRemovalMigration() {
  const physics = physicsAtEntityRemoval(source(fixture.physics.path)), editor = source(fixture.editor.path), helper = source(fixture.helper.path)
  const restoredPhysics = canonicalPhysicsBeforeEntityRemoval(physics), restoredEditor = canonicalEditorGameplayHostBeforeEntityRemoval(editor)
  assert.equal(sha(physics), fixture.physics.afterSha256)
  assert.equal(sha(editor), fixture.editor.afterSha256)
  assert.equal(sha(helper), fixture.helper.sha256, 'Pure helper must be the exact reviewed source')
  const originalDetach = body(restoredPhysics, 'detachEntityFromConnections'), originalDelete = body(restoredPhysics, 'deleteEntity')
  const detach = body(helper, 'detachEntityFromConnectionsInWorld'), remove = body(helper, 'deleteEntitySubtreeInWorld')
  assert.equal(detach, fixture.helper.detachBody)
  assert.equal(remove, fixture.helper.removalBody)
  const restoreEol = (value, old) => old.includes('\r\n') ? value.replaceAll('\n', '\r\n') : value
  const detachInverse = restoreEol(detach.replaceAll('world.', 'physicsState.world.'), originalDetach)
  assert.equal(detachInverse, originalDetach, 'Every original detach statement, filter and normalization order is retained')
  const originalSelectionTail = originalDelete.slice(originalDelete.indexOf('  const selection =')).replaceAll('\r\n', '\n')
  const removeInverse = restoreEol(remove
    .replace('if (!ids.size) return ids', 'if (!ids.size) return')
    .replace('detachEntityFromConnectionsInWorld(world, entityId)', 'detachEntityFromConnections(entityId)')
    .replaceAll('world.', 'physicsState.world.')
    .replace('\n  return ids\n}', '\n' + originalSelectionTail), originalDelete)
  assert.equal(removeInverse, originalDelete, 'Complete original subtree Set/order/splice structure and legacy selection tail are retained')
  for (const record of fixture.physicsFunctions) {
    assert.equal(sha(body(physics, record.name)), record.afterBodySha256, record.name)
    assert.equal(sha(body(restoredPhysics, record.name)), record.beforeBodySha256, record.name)
    if (!record.changed) assert.equal(record.beforeBodySha256, record.afterBodySha256, record.name)
  }
  return { physicsBeforeSha256: sha(restoredPhysics), editorBeforeSha256: sha(restoredEditor), helperSha256: sha(helper), physicsFunctions: fixture.physicsFunctions.length, originalPhysicsBodiesUnchanged: fixture.physicsFunctions.filter(row => !row.changed).length, completeOriginalDetachAndDeleteBodyInverse: true }
}

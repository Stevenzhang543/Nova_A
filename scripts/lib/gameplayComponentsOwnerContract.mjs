import { canonicalBeforeM1OwnerIntegration } from './m1OwnerIntegrationContract.mjs'
/** Strict whole-file migration proof; original gameplay bodies are never ignored. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { canonicalEditorWorldGameplayBeforeEvidence } from './simulationEvidenceEditorContract.mjs'
import { canonicalWorldGameplayBeforeRuntimeObjects } from './runtimeObjectsOwnerContract.mjs'
import { canonicalEditorWorldGameplayBeforeRuntimeObjects } from './runtimeObjectsEditorContract.mjs'

const hash = value => createHash('sha256').update(value).digest('hex')
const fixture = JSON.parse(await readFile(new URL('../fixtures/gameplay-components-owner-transform-v1.json', import.meta.url), 'utf8'))
assert.equal(hash(fixture.original), fixture.originalSha256)

function bodies(source) {
  const file = ts.createSourceFile('gameplayComponentsOwner.ts', source, ts.ScriptTarget.Latest, true)
  const result = new Map(), names = new Set(fixture.functions.map(row => row.name))
  for (const node of file.statements) {
    if (ts.isFunctionDeclaration(node) && names.has(node.name?.text)) {
      assert(!result.has(node.name.text)); result.set(node.name.text, node.body)
    }
    if (ts.isClassDeclaration(node) && node.name?.text === 'GameplayComponentsOwner') {
      for (const method of node.members) {
        if (!ts.isMethodDeclaration(method)) continue
        const name = method.name.getText(file)
        if (!names.has(name) || name === 'initializeGameplayEntities') continue
        assert(!result.has(name)); result.set(name, method.body)
      }
    }
  }
  assert.equal(result.size, 7, 'All seven actual original implementations are required')
  return { file, result }
}

export async function canonicalGameplayComponentsBeforeOwner(source, ownerSource) {
  if (hash(source) === fixture.originalSha256) return source
  assert.equal(hash(source), fixture.facadeSha256, 'Legacy facade differs from the reviewed exact migration')
  const actual = ownerSource ?? await readFile(new URL('../../src/runtime/gameplayComponentsOwner.ts', import.meta.url), 'utf8')
  const { file, result } = bodies(actual)
  let skeleton = actual
  for (const [name, body] of [...result].sort((a, b) => b[1].getStart(file) - a[1].getStart(file))) {
    skeleton = skeleton.slice(0, body.getStart(file)) + `/* ORIGINAL_BODY:${name} */` + skeleton.slice(body.end)
  }
  assert.equal(skeleton, fixture.ownerSkeleton, 'Owner declarations, cleanup and initializer wrapper changed')
  const restoredBodies = new Map()
  for (const row of fixture.functions) {
    let body = result.get(row.name).getText(file)
    for (const edit of [...row.edits].reverse()) {
      assert.equal(body.split(edit.after).length - 1, edit.count, `${row.name}: exact approved delta ${edit.after}`)
      body = body.replaceAll(edit.after, edit.before)
    }
    assert.equal(body, row.beforeBody, `${row.name}: original algorithm body differs`)
    restoredBodies.set(row.name, body)
  }
  let restored = fixture.original
  for (const row of [...fixture.functions].sort((a, b) => b.bodyStart - a.bodyStart)) {
    restored = restored.slice(0, row.bodyStart) + restoredBodies.get(row.name) + restored.slice(row.bodyEnd)
  }
  assert.equal(hash(restored), fixture.originalSha256, 'Entire original source must roundtrip byte for byte')
  return restored
}

function undoComposition(source, contract) {
  if (hash(source) === contract.beforeSha256) return source
  let restored = source
  for (const [before, after] of [...contract.edits].reverse()) {
    assert.equal(restored.split(after).length - 1, 1, 'Exact composition delta missing or duplicated: ' + after)
    restored = restored.replace(after, before)
  }
  assert.equal(hash(restored), contract.beforeSha256, 'Entire original composition source must roundtrip byte for byte')
  return restored
}
export function canonicalWorldGameplayBeforeComponents(source) {
  source = canonicalBeforeM1OwnerIntegration(source, 'src/runtime/worldGameplayOwner.ts')
  if (hash(source) === fixture.worldOwner.beforeSha256) return source
  return undoComposition(canonicalWorldGameplayBeforeRuntimeObjects(source), fixture.worldOwner)
}
export function canonicalEditorWorldGameplayBeforeComponents(source) {
  source = canonicalBeforeM1OwnerIntegration(source, 'src/editor/worldGameplayAdapter.ts')
  if (hash(source) === fixture.editorAdapter.beforeSha256) return source
  // Retain the exact independently qualified pre-Evidence composition.
  if (hash(source) !== '18064f05767f8a1b6aa3c2be13f0a15ac6abdde5f15a9f875a44c921b682a420') source = canonicalEditorWorldGameplayBeforeRuntimeObjects(source)
  return undoComposition(canonicalEditorWorldGameplayBeforeEvidence(source), fixture.editorAdapter)
}

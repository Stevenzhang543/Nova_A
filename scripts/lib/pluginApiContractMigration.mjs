/** Exact inverse of the unchanged plugin-version value migration. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const fixture = JSON.parse(readFileSync(new URL('../fixtures/plugin-api-pure-import-transform-v1.json', import.meta.url), 'utf8'))
const sha = value => createHash('sha256').update(value).digest('hex')
export function canonicalBeforePluginApiContract(source, path) {
  const change = fixture.changes.find(row => row.path === path)
  if (!change || sha(source) === change.beforeSha256) return source
  assert.equal(sha(source), change.afterSha256, 'Exact reviewed plugin-version dependency source: ' + path)
  let restored = source
  for (const edit of [...change.edits].reverse()) {
    assert.equal(restored.split(edit.after).length - 1, 1, 'Unique version import/reexport delta')
    restored = restored.replace(edit.after, edit.before)
  }
  assert.equal(sha(restored), change.beforeSha256, 'Whole prior version dependency source must roundtrip')
  return restored
}
export function validatePluginApiContractValue(source) {
  assert.equal(sha(source), fixture.valueSha256, 'Single frozen plugin API declaration remains exact')
  assert(source.includes(fixture.declaration))
  return true
}

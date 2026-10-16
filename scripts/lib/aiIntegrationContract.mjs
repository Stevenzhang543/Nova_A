/** Exact Root composition inverse; prior migration guards still inspect their complete input. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { canonicalWorldGameplayBeforeNavigation, canonicalEditorWorldGameplayBeforeNavigation } from './navigationOwnerContract.mjs'

const fixture = JSON.parse(readFileSync(new URL('../fixtures/ai-root-integration-transform-v1.json', import.meta.url), 'utf8'))
assert.equal(fixture.schema, 'nova-ai-root-integration-transform-v1')
assert.equal(fixture.files.length, 3)
const sha = value => createHash('sha256').update(value).digest('hex')
const earlier = {
  'src/runtime/worldGameplayOwner.ts': ['5420d96c2dbe4a54c8eb2fb213542be7ad5b452c8e3692f5a9e4c21cc6c6c401', '767465af7a9b2ab00964187410726388ea383e492b9fc881fb92bf5d2ef62ab5'],
  'src/editor/worldGameplayAdapter.ts': ['6cd86c8685fe93283eebbe4279b415d481431ca142a4731016b537397700c50a', '18064f05767f8a1b6aa3c2be13f0a15ac6abdde5f15a9f875a44c921b682a420', 'f29375bfd920e23b7780d7361ab585dcd9fe1f591283b07a2c256bf8d05e236e'],
  'src/editor/simulationEvidenceAdapter.ts': []
}
function inverse(path, source) {
  const row = fixture.files.find(item => item.path === path); assert.ok(row)
  if (path === 'src/runtime/worldGameplayOwner.ts') source = canonicalWorldGameplayBeforeNavigation(source)
  else if (path === 'src/editor/worldGameplayAdapter.ts') source = canonicalEditorWorldGameplayBeforeNavigation(source)
  const digest = sha(source)
  if (digest === row.beforeSha256 || earlier[path].includes(digest)) return source
  assert.equal(digest, row.afterSha256, path + ': entire reviewed AI composition is required')
  let restored = source
  for (const edit of [...row.edits].reverse()) {
    if (edit.after === '') {
      assert.ok(edit.inverseBoundary)
      const { prefix, suffix } = edit.inverseBoundary, boundary = prefix + suffix
      assert.equal(restored.split(boundary).length - 1, 1, path + ': exact removed-line boundary')
      restored = restored.replace(boundary, prefix + edit.before + suffix)
    } else {
      assert.equal(restored.split(edit.after).length - 1, 1, path + ': exact AI delta')
      restored = restored.replace(edit.after, edit.before)
    }
  }
  assert.equal(sha(restored), row.beforeSha256, path + ': whole prior source must roundtrip byte for byte')
  return restored
}
export const canonicalWorldGameplayBeforeAi = source => inverse('src/runtime/worldGameplayOwner.ts', source)
export const canonicalEditorWorldGameplayBeforeAi = source => inverse('src/editor/worldGameplayAdapter.ts', source)
export const canonicalEditorSimulationEvidenceBeforeAi = source => inverse('src/editor/simulationEvidenceAdapter.ts', source)

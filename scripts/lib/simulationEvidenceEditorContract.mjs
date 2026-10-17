import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const fixture = JSON.parse(readFileSync(new URL('../fixtures/simulation-evidence-editor-transform-v1.json', import.meta.url), 'utf8'))
const sha = value => createHash('sha256').update(value).digest('hex')
export function canonicalEditorWorldGameplayBeforeEvidence(source) {
  if (sha(source) === fixture.beforeSha256) return source
  assert.equal(sha(source), fixture.afterSha256, 'Evidence Editor composition differs from the reviewed entire source')
  let restored = source
  for (const [before, after] of [...fixture.edits].reverse()) {
    if (after) { assert.equal(restored.split(after).length - 1, 1); restored = restored.replace(after, before) }
    else { assert.equal(restored.split(fixture.removedEvidenceAnchor).length - 1, 1); restored = restored.replace(fixture.removedEvidenceAnchor, before + fixture.removedEvidenceAnchor) }
  }
  assert.equal(sha(restored), fixture.beforeSha256, 'Entire original Editor composition must roundtrip byte for byte')
  return restored
}

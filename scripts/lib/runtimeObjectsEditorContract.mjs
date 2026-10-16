import { canonicalBeforeM1OwnerIntegration } from './m1OwnerIntegrationContract.mjs'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { canonicalEditorWorldGameplayBeforeAi } from './aiIntegrationContract.mjs'
const fixture = JSON.parse(readFileSync(new URL('../fixtures/runtime-objects-editor-transform-v1.json', import.meta.url), 'utf8'))
const sha = value => createHash('sha256').update(value).digest('hex')
export function canonicalEditorWorldGameplayBeforeRuntimeObjects(source) {
  source = canonicalBeforeM1OwnerIntegration(source, 'src/editor/worldGameplayAdapter.ts')
  source = canonicalEditorWorldGameplayBeforeAi(source)
  if (sha(source) === fixture.beforeSha256) return source
  assert.equal(sha(source), fixture.afterSha256, 'Runtime object Editor composition differs from reviewed whole source')
  let restored = source
  for (const [before, after] of [...fixture.edits].reverse()) { assert.equal(restored.split(after).length - 1, 1); restored = restored.replace(after, before) }
  assert.equal(sha(restored), fixture.beforeSha256, 'Entire prior Evidence Editor adapter must roundtrip byte for byte')
  return restored
}

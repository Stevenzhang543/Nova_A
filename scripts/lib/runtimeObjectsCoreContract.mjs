import { canonicalBeforeM1OwnerIntegration } from './m1OwnerIntegrationContract.mjs'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { canonicalCoreBeforeGraphHotReload } from './graphHotReloadCoreContract.mjs'
const fixture = JSON.parse(readFileSync(new URL('../fixtures/runtime-objects-core-transform-v1.json', import.meta.url), 'utf8'))
const sha = value => createHash('sha256').update(value).digest('hex')
export function canonicalCoreBeforeRuntimeObjects(source) {
  source = canonicalBeforeM1OwnerIntegration(source, 'src/runtime/GameplayRuntimeCore.ts')
  source = canonicalCoreBeforeGraphHotReload(source)
  if (sha(source) === fixture.beforeSha256) return source
  assert.equal(sha(source), fixture.afterSha256, 'Runtime objects Core differs from reviewed whole source')
  let restored = source
  for (const [before, after, count] of [...fixture.edits].reverse()) {
    if (after) { assert.equal(restored.split(after).length - 1, count); restored = restored.replaceAll(after, before) }
    else { const removed = fixture.removedImports.find(item => item.value === before); assert(removed); assert.equal(restored.split(removed.anchor).length - 1, 1); restored = restored.replace(removed.anchor, before + removed.anchor) }
  }
  assert.equal(sha(restored), fixture.beforeSha256, 'Entire reviewed Core must roundtrip byte for byte')
  return restored
}

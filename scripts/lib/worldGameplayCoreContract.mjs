import { canonicalBeforeM1OwnerIntegration } from './m1OwnerIntegrationContract.mjs'
/** Exact inverse of the explicit WorldGameplay capability and Core wiring. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { canonicalEditorGameplayHostBeforeEntityRemoval } from './entityRemovalContract.mjs'
async function inverse(source, path, marker) {
  source = canonicalBeforeM1OwnerIntegration(source, path)
  if (!source.includes(marker)) return source
  const contract = JSON.parse(await readFile(new URL('../fixtures/world-gameplay-core-transform-v1.json', import.meta.url), 'utf8'))
  const change = contract.changes.find(item => item.path === path)
  assert.ok(change, `Recorded exact transformation: ${path}`)
  for (const { from, to, count } of [...change.steps].reverse()) {
    assert.equal(source.split(to).length - 1, count, `Exact WorldGameplay wiring count: ${to}`)
    source = source.split(to).join(from)
  }
  assert.equal(createHash('sha256').update(source).digest('hex'), change.beforeSha256, `Entire ${path} remains exact outside WorldGameplay wiring`)
  return source
}
export const canonicalCoreBeforeWorldGameplay = source => inverse(source, 'src/runtime/GameplayRuntimeCore.ts', "import { WorldGameplayOwner } from './worldGameplayOwner'")
export const canonicalGameplayWorldHostBeforeWorldGameplay = source => inverse(source, 'src/runtime/gameplayWorldHost.ts', "from './worldGameplayOwner'")
export const canonicalEditorGameplayWorldHostBeforeWorldGameplay = source => {
  source = canonicalBeforeM1OwnerIntegration(source, 'src/editor/gameplayWorldHost.ts')
  return inverse(source.includes("from './worldGameplayAdapter'") ? canonicalEditorGameplayHostBeforeEntityRemoval(source) : source, 'src/editor/gameplayWorldHost.ts', "from './worldGameplayAdapter'")
}

/** Strict inverse of the authorized direct-host migration; all other Core bytes must match. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { canonicalCoreBeforeGameFlow, canonicalCompatBeforeGameFlow } from './gameFlowCoreContract.mjs'
import { canonicalCoreBeforeWorldGameplay } from './worldGameplayCoreContract.mjs'
import { canonicalCoreBeforeGameplayComponents } from './gameplayComponentsCoreContract.mjs'
import { canonicalCoreBeforeRuntimeObjects } from './runtimeObjectsCoreContract.mjs'
import { canonicalBeforeAnimationTimelineOwner } from './animationOwnerContract.mjs'

export async function canonicalCoreBeforeWorldHost(source) {
  source = canonicalCoreBeforeRuntimeObjects(source)
  source = await canonicalCoreBeforeGameplayComponents(source)
  source = await canonicalCoreBeforeWorldGameplay(source)
  source = await canonicalCoreBeforeGameFlow(source)
  const contract = JSON.parse(await readFile(new URL('../fixtures/gameplay-world-host-transform-v1.json', import.meta.url), 'utf8'))
  const sha = value => createHash('sha256').update(value).digest('hex')
  if (sha(source) === contract.beforeSha256) return source
  const replaceExact = (from, to, expected = 1) => {
    assert.equal(source.split(from).length - 1, expected, `Exact migration occurrence count: ${from}`)
    source = source.split(from).join(to)
  }
  // Constructor admission/binding has an exact whitelist, not an ignored body region.
  replaceExact(contract.constructorInsertion, '')
  replaceExact(contract.newConstructor, contract.oldConstructor)
  replaceExact(contract.newImports, contract.oldImports)
  replaceExact(contract.newQuit, contract.oldQuit)
  replaceExact('let transaction: PreparedRuntimeSceneTransition', 'let transaction: ReturnType<typeof prepareRuntimeSceneTransition>')
  for (const { from, to, count } of contract.inverseMappings) replaceExact(from, to, count)
  assert.equal(sha(source), contract.beforeSha256, 'Entire Core must remain byte-exact after inverse host migration')
  return source
}

export async function canonicalCompatBeforeWorldHost(source) {
  source = canonicalBeforeAnimationTimelineOwner(source, 'src/runtime/GameplayRuntime.ts')
  source = await canonicalCompatBeforeGameFlow(source)
  const contract = JSON.parse(await readFile(new URL('../fixtures/gameplay-world-host-transform-v1.json', import.meta.url), 'utf8'))
  const restored = source.replace("import { createEditorGameplayScriptServices } from '../editor/gameplayScriptServices'\nimport { createEditorGameplayWorldHost } from '../editor/gameplayWorldHost'\r\n", "import { createEditorGameplayScriptServices } from '../editor/gameplayScriptServices'\r\n").replace('super(scriptServices, createEditorGameplayWorldHost())', 'super(scriptServices)')
  assert.equal(createHash('sha256').update(restored).digest('hex'), contract.beforeCompatSha256, 'Before Core must use its exact matching old compatibility composition')
  return restored
}

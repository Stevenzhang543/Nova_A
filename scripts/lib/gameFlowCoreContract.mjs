/** Exact inverse of the explicitly recorded GameFlow Owner wiring; no ignored body regions. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
async function inverse(source, kind) {
  const marker = kind === 'Core' ? "import { GameFlowOwner } from './gameFlowOwner'" : "import { getEditorGameFlowOwner } from '../editor/gameFlowAdapter'"
  if (!source.includes(marker)) return source
  const contract = JSON.parse(await readFile(new URL('../fixtures/game-flow-core-transform-v1.json', import.meta.url), 'utf8'))
  for (const step of [...contract[kind === 'Core' ? 'coreSteps' : 'compatSteps']].reverse()) {
    assert.equal(source.split(step.to).length - 1, step.count, `Exact GameFlow ${kind} wiring count: ${step.to}`)
    source = source.split(step.to).join(step.from)
  }
  assert.equal(createHash('sha256').update(source).digest('hex'), contract[`before${kind}Sha256`], `Entire ${kind} remains exact outside GameFlow wiring`)
  return source
}
export const canonicalCoreBeforeGameFlow = source => inverse(source, 'Core')
export const canonicalCompatBeforeGameFlow = source => inverse(source, 'Compat')

/** Compose only the reviewed Graph import relocation; prior Core assertions retain their entire inputs. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
const sha = value => createHash('sha256').update(value).digest('hex')
const previous = "import { planGraphHotReload } from '../visual/graphProduction'"
const current = "import { planGraphHotReload } from '../visual/graphRuntimeHotReload'"
export function canonicalCoreBeforeGraphHotReload(source) {
  if (!source.includes(current)) return source
  assert.equal(sha(source), '12e49ac5decc7baff824e1ebed42ffa509bbd36f029795b89b2d371ac7c0384c', 'Entire reviewed Graph Core import relocation is required')
  assert.equal(source.split(current).length - 1, 1, 'Only one Graph runtime planner import')
  const restored = source.replace(current, previous)
  assert.equal(sha(restored), '6ce4b54b396701e49f24eae3f508ef1a0cbda9dd95eb0a4c3aada1e92f0ac1b2', 'Graph Core inverse preserves every unrelated byte')
  return restored
}

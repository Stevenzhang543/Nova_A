/** Exact inverse of the components Owner call sites; all other Core bytes are checked. */
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
export async function canonicalCoreBeforeGameplayComponents(source) {
  if (!source.includes("import type { GameplayComponentsOwner } from './gameplayComponentsOwner'")) return source
  const change=JSON.parse(await readFile(new URL('../fixtures/gameplay-components-core-transform-v1.json',import.meta.url),'utf8'))
  for(const {from,to,count} of [...change.steps].reverse()) {
    assert.equal(source.split(to).length-1,count,`Exact components wiring count: ${to}`)
    source=source.split(to).join(from)
  }
  assert.equal(createHash('sha256').update(source).digest('hex'),change.beforeSha256,'Entire Core is exact outside components wiring')
  return source
}

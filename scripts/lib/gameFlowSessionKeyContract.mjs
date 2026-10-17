/** Exact, separately recorded inverse of the confirmed session dictionary correction. */
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
export async function canonicalGameFlowOwnerBeforeSessionKeys(source) {
  if (!source.includes('Object.prototype.hasOwnProperty.call(session, clean)')) return source
  const change=JSON.parse(await readFile(new URL('../fixtures/game-flow-session-key-transform-v1.json',import.meta.url),'utf8'))
  assert.equal(createHash('sha256').update(source).digest('hex'),change.afterSha256,'Entire Owner must match this session correction')
  assert.equal(source.split(change.to).length-1,change.count,'Exact corrected setter count')
  const restored=source.split(change.to).join(change.from)
  assert.equal(createHash('sha256').update(restored).digest('hex'),change.beforeSha256,'All other Owner bytes are preserved')
  return restored
}

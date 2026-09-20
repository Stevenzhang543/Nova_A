import assert from 'node:assert/strict'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'
import {propertyAudit22} from './lib/propertyAudit22.mjs'
const audit=await propertyAudit22('tilemap-bake'),checks=[],opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{tilemap:'runtime/tilemap',components:'world/components'})
const {tilemap:t,components:c}=opened.modules
const map=()=>{const value=new c.TileMap2D();value.width=8;value.height=8;value.chunkSize=4;t.normalizeTileMap(value);return value}
async function check(name,fn){try{await fn();checks.push({name,status:'passed',covers:['src/runtime/tilemap.ts#requestTileMapBake',...(/Explicit cancellation|Rejected malformed/.test(name)?['src/runtime/tilemap.ts#cancelTileMapBake']:[])]});console.log('PASS '+name)}catch(error){checks.push({name,status:'failed',error:error.stack});console.error('FAIL '+name+': '+error.message)}}
try{
 await check('Cancelled predecessor cannot stop or relabel the active replacement bake',async()=>{
  const larger=map();t.resizeTileMap(larger,12,12);const first=t.requestTileMapBake(map()),second=t.requestTileMapBake(larger);
  try{const cancelled=await first;assert.equal(cancelled.cancelled,true);assert.equal(cancelled.chunks,4);assert.equal(t.tileBakeState.active,true);assert.equal(t.tileBakeState.cancelled,false)}finally{await second}
  assert.equal(t.tileBakeState.active,false);assert.equal(t.tileBakeState.cancelled,false);assert.equal(t.tileBakeState.progress,1);assert.equal(t.tileBakeState.processedChunks,9)
 })
 await check('Explicit cancellation stops its request and idle cancellation is a no-op',async()=>{
  assert.equal(t.cancelTileMapBake(),false);const pending=t.requestTileMapBake(map());assert.equal(t.cancelTileMapBake(),true);const result=await pending;assert.equal(result.cancelled,true);assert.equal(t.tileBakeState.active,false);assert.equal(t.tileBakeState.cancelled,true);assert.equal(t.cancelTileMapBake(),false)
 })
 await check('Rejected malformed request leaves no active cancellation controller',async()=>{const before=JSON.stringify(t.tileBakeState);await assert.rejects(t.requestTileMapBake(null));assert.equal(t.cancelTileMapBake(),false);assert.equal(JSON.stringify(t.tileBakeState),before)})
 await check('Repeated completed bakes retain deterministic output and full chunk progress',async()=>{
  const component=map(),first=await t.requestTileMapBake(component),second=await t.requestTileMapBake(component);assert.deepEqual(second,first);assert.equal(first.cancelled,false);assert.equal(first.chunks,4);assert.match(first.artifactHash,/^[a-f0-9]{8}$/);assert.equal(t.tileBakeState.processedChunks,t.tileBakeState.totalChunks);assert.equal(t.tileBakeState.progress,1)
 })
}finally{t.cancelTileMapBake();await opened.close()}
await audit.write(checks,'Actual tilemap bake requests and cancellation over normalized four- and nine-chunk maps. Tests shared progress ownership and deterministic result retention; no timing/performance or GPU quality claim.')

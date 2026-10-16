/** Independent exact Tile phase normalization. No Audio/AI/Objects/helper imports. */
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {canonicalBeforeGraphParticle,createGraphParticleSourceReader} from './graphParticleSourceProjection.mjs'
const fixture=JSON.parse(readFileSync(new URL('./fixtures/tileMapOwner.contract.json',import.meta.url),'utf8'))
const sha=value=>createHash('sha256').update(value).digest('hex')
const rows=new Map(fixture.candidateFiles.map(row=>[row.path,row]))
export function verifyTileOwnerSourceSet(readSource){if(typeof readSource!=='function')throw new Error('TILE_SOURCE_PROVIDER_REQUIRED');const projected=createGraphParticleSourceReader(readSource);for(const row of rows.values())assert.equal(sha(projected(row.path)),row.sha256,'Actual linked Tile candidate '+row.path);return {files:rows.size,originalFunctions:fixture.functions.length,pureEntries:fixture.pureEntries}}
export function canonicalBeforeTileMapOwner(path,source,readLinkedSource){const row=rows.get(path);const prior=sha(source);if(row&&!row.newFile&&(prior===row.beforeSha256||(row.approvedHistoricalBeforeSha256??[]).includes(prior)))return source;const projected=createGraphParticleSourceReader(readLinkedSource);source=canonicalBeforeGraphParticle(path,source,readLinkedSource);if(!row||row.newFile)return source;const hash=sha(source);assert.equal(hash,row.sha256,'Exact Tile postimage '+path);if(typeof readLinkedSource!=='function')throw new Error('TILE_SOURCE_PROVIDER_REQUIRED');for(const linked of rows.values())if(linked.newFile)assert.equal(sha(projected(linked.path)),linked.sha256,'Linked Tile implementation '+linked.path);let inverse=source;for(const step of [...row.steps].reverse())for(const offset of [...step.offsets].reverse()){assert.equal(inverse.slice(offset,offset+step.to.length),step.to,'Exact Tile anchor '+path);inverse=inverse.slice(0,offset)+step.from+inverse.slice(offset+step.to.length)}assert.equal(sha(inverse),row.beforeSha256,'Whole Tile inverse '+path);return inverse}
export function createTileMapCanonicalSourceReader(readSource){verifyTileOwnerSourceSet(readSource);return path=>canonicalBeforeTileMapOwner(path,readSource(path),readSource)}
export const canonicalCoreBeforeTileMapOwner=(source,readSource)=>canonicalBeforeTileMapOwner('src/runtime/GameplayRuntimeCore.ts',source,readSource)
export const canonicalWorldGameplayBeforeTileMapOwner=(source,readSource)=>canonicalBeforeTileMapOwner('src/runtime/worldGameplayOwner.ts',source,readSource)
export const canonicalEditorWorldGameplayBeforeTileMapOwner=(source,readSource)=>canonicalBeforeTileMapOwner('src/editor/worldGameplayAdapter.ts',source,readSource)
export const canonicalPhysicsBeforeTileMapOwner=(source,readSource)=>canonicalBeforeTileMapOwner('src/store/physics.ts',source,readSource)
export const canonicalRendererAdapterBeforeTileMapOwner=(source,readSource)=>canonicalBeforeTileMapOwner('src/editor/rendererAdapter.ts',source,readSource)
export const canonicalWorldCanvasBeforeTileMapOwner=(source,readSource)=>canonicalBeforeTileMapOwner('src/components/WorldCanvas.vue',source,readSource)

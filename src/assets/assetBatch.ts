import type { AssetRecord } from './types'
import { assetSessionVersion, assetState, importAssetFiles, reimportAsset, resolveAsset } from './AssetDatabase'
export interface AssetBatchProgress {active: boolean;total: number;done: number;completed: number;failed: number;cancelled: number;name: string;results: Array<{name: string;status:'completed'|'failed';message:string}>}
export const emptyAssetBatch = (): AssetBatchProgress => ({active:false,total:0,done:0,completed:0,failed:0,cancelled:0,name:'',results:[]})
export interface AssetBatchOptions {signal: AbortSignal;progress(value: AssetBatchProgress): void}
async function run<T>(items:readonly T[],name:(item:T)=>string,operation:(item:T)=>Promise<void>,options:AssetBatchOptions):Promise<AssetBatchProgress>{
  if(items.length>2000)throw new Error('ASSET_BATCH_LIMIT: Choose at most2000 files per batch.')
  const session = assetSessionVersion()
  const progress={...emptyAssetBatch(),active:true,total:items.length}
  const publish=()=>options.progress({...progress,results:[...progress.results]})
  publish()
  try{for(const item of items){if(options.signal.aborted || session !== assetSessionVersion())break;progress.name=name(item);publish();try{await operation(item);progress.completed++;progress.results.push({name:progress.name,status:'completed',message:''})}catch(error){if(options.signal.aborted || session !== assetSessionVersion())break;progress.failed++;progress.results.push({name:progress.name,status:'failed',message:(error instanceof Error?error.message:String(error)).slice(0,2000)})}progress.done++;progress.results=progress.results.slice(-50);publish();await new Promise<void>(resolve=>setTimeout(resolve,0))}}
  finally{progress.cancelled=(options.signal.aborted || session !== assetSessionVersion())?progress.total-progress.done:0;progress.active=false;progress.name='';publish()}
  return progress
}
export async function importAssetBatch(files:readonly File[],folder:string|undefined,options:AssetBatchOptions):Promise<{progress:AssetBatchProgress;assets:AssetRecord[]}>{
  const imported:AssetRecord[]=[]
  const progress=await run(files,file=>file.name,async file=>{imported.push(...await importAssetFiles([file],folder,options.signal))},options)
  return {progress,assets:imported}
}
export function reimportAssetBatch(records:readonly AssetRecord[],options:AssetBatchOptions):Promise<AssetBatchProgress>{
  return run(records,record=>record.name,async record=>{
    if(record.derivedSprite)throw new Error('ASSET_BATCH_SOURCE: Reimport the linked original source.')
    if(resolveAsset(record.uuid)!==record)throw new Error('ASSET_BATCH_STALE: The asset is no longer in this project.')
    const source=record.source,settings=JSON.stringify(record.settings)
    let file:File
    if(record.interchange){if(!record.interchange.originalSource)throw new Error('ASSET_BATCH_SOURCE: Reimport the original atlas/map file once to retain its source for future batches.');file=new File([record.interchange.originalSource],record.interchange.sourceName,{type:'application/json',lastModified:record.sourceModified})}
    else {if(!/^(data:|blob:)/.test(source))throw new Error('ASSET_BATCH_SOURCE: Choose the original source file for this asset.');const response=await fetch(source,{signal:options.signal});if(!response.ok)throw new Error('ASSET_BATCH_SOURCE: Source could not be read.');file=new File([await response.blob()],record.name,{type:record.mimeType,lastModified:record.sourceModified})}
    if(options.signal.aborted||resolveAsset(record.uuid)!==record||record.source!==source||JSON.stringify(record.settings)!==settings)throw new Error('ASSET_BATCH_STALE: Source/settings changed during the batch.')
    if(!await reimportAsset(record.uuid,file,undefined,options.signal))throw new Error(record.pipeline?.error||'ASSET_BATCH_FAILED: The source could not be reimported.')
  },options)
}
/** UUIDs and derived ownership, not current folder contents, define the queued batch. */
export function reimportCandidates(records:readonly AssetRecord[]):AssetRecord[]{return records.filter(record=>!record.derivedSprite&&record.pipeline?.importerId!=='nova.inline'&&(!!record.interchange||/^(data:|blob:)/.test(record.source))&&assetState.records.includes(record))}

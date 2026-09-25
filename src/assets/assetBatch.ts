/** 资源批处理：调度批量导入及重新导入，并筛选可处理的资源候选。 */
import type { AssetRecord } from './types'
import { assetSessionVersion, assetState, importAssetFiles, reimportAsset, resolveAsset } from './AssetDatabase'
export interface AssetBatchProgress {active: boolean;total: number;done: number;completed: number;failed: number;cancelled: number;name: string;results: Array<{name: string;status:'completed'|'failed';message:string}>}
export const emptyAssetBatch = /** 构造并返回记录 {active:false,total:0,done:0,completed:0,failed:0,cancelled:0,name:'',results:[]}，字段按当前实参及捕获状态求值。 */ (): AssetBatchProgress => ({active:false,total:0,done:0,completed:0,failed:0,cancelled:0,name:'',results:[]})
export interface AssetBatchOptions {signal: AbortSignal;progress(value: AssetBatchProgress): void}
/** 在数量上限内顺序执行资源批次，检查取消与会话代次，记录有界逐项结果并在每项间让出事件循环。 */ async function run<T>(items:readonly T[],name:(item:T)=>string,operation:(item:T)=>Promise<void>,options:AssetBatchOptions):Promise<AssetBatchProgress>{
  if(items.length>2000)throw new Error('ASSET_BATCH_LIMIT: Choose at most2000 files per batch.')
  const session = assetSessionVersion()
  const progress={...emptyAssetBatch(),active:true,total:items.length}
  const publish=/* 调用 options.progress({...progress,results:[...progress.results]}) 并返回调用结果。 */ ()=>options.progress({...progress,results:[...progress.results]})
  publish()
  try{for(const item of items){if(options.signal.aborted || session !== assetSessionVersion())break;progress.name=name(item);publish();try{await operation(item);progress.completed++;progress.results.push({name:progress.name,status:'completed',message:''})}catch(error){if(options.signal.aborted || session !== assetSessionVersion())break;progress.failed++;progress.results.push({name:progress.name,status:'failed',message:(error instanceof Error?error.message:String(error)).slice(0,2000)})}progress.done++;progress.results=progress.results.slice(-50);publish();await new Promise<void>(/* 调用 setTimeout(resolve,0) 并返回调用结果。 */ resolve=>setTimeout(resolve,0))}}
  finally{progress.cancelled=(options.signal.aborted || session !== assetSessionVersion())?progress.total-progress.done:0;progress.active=false;progress.name='';publish()}
  return progress
}
/** 暂存全部文件后一次提交；失败或取消不留下部分依赖，并报告整批失败而非虚假成功。 */ export async function importAssetBatch(files:readonly File[],folder:string|undefined,options:AssetBatchOptions):Promise<{progress:AssetBatchProgress;assets:AssetRecord[]}>{
  if(files.length>2000)throw new Error('ASSET_BATCH_LIMIT: Choose at most2000 files per batch.')
  const session=assetSessionVersion(),progress={...emptyAssetBatch(),active:true,total:files.length}
  /** 复制进度数据，避免界面持有可变工作对象。 */ const publish=()=>options.progress({...progress,results:[...progress.results]})
  publish()
  let imported:AssetRecord[]=[]
  try {
    imported=await importAssetFiles(files,folder,options.signal,/** 暂存完成只更新读取进度，全部提交之前不报告成功。 */ (file,count)=>{progress.done=count;progress.name=file.name;publish()})
    progress.completed=files.length
    progress.results=files.slice(-50).map(/** 仅为已提交的整批记录成功。 */ file=>({name:file.name,status:'completed' as const,message:''}))
  } catch(error) {
    if(options.signal.aborted||session!==assetSessionVersion())progress.cancelled=files.length
    else {progress.failed=files.length;progress.results=files.slice(-50).map(/** 说明整批已回滚，并保留真实错误。 */ file=>({name:file.name,status:'failed' as const,message:(error instanceof Error?error.message:String(error)).slice(0,2000)}))}
  } finally {progress.active=false;progress.name='';publish()}
  return {progress,assets:imported}
}
/** 逐个重导入资源，验证原始来源和项目身份，并拒绝异步读取期间源或设置发生变化的项。 */ export function reimportAssetBatch(records:readonly AssetRecord[],options:AssetBatchOptions):Promise<AssetBatchProgress>{
  return run(records,/* 返回 record.name 的当前值。 */ record=>record.name,/** 恢复单个资源的原始文件，核对源、设置及身份快照，再执行可取消的重导入。 */ async record=>{
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
/** 筛选当前项目中保留可重读原始来源且非派生、非内联生成的资源。 */ export function reimportCandidates(records:readonly AssetRecord[]):AssetRecord[]{return records.filter(/** 只接受可重读来源、仍在当前项目且非派生或内联生成的批次候选。 */ record=>!record.derivedSprite&&record.pipeline?.importerId!=='nova.inline'&&(!!record.interchange||/^(data:|blob:)/.test(record.source))&&assetState.records.includes(record))}

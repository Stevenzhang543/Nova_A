/** 资源互通工作线程入口：接收格式转换请求并把结果或错误送回调用端。 */
/// <reference lib="webworker" />
import { importContentInterchange } from './contentInteroperability'

self.onmessage=/** 在 Worker 内转换交换格式内容，带请求 ID 返回结果或结构化错误消息。 */ (event:MessageEvent<{id:string;fileName:string;source:string;previous:Parameters<typeof importContentInterchange>[2]}>)=>{
  try{self.postMessage({id:event.data.id,result:importContentInterchange(event.data.fileName,event.data.source,event.data.previous)})}
  catch(error){self.postMessage({id:event.data.id,error:error instanceof Error?error.message:String(error)})}
}

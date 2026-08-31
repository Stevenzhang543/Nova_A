/// <reference lib="webworker" />
import { importContentInterchange } from './contentInteroperability'

self.onmessage=(event:MessageEvent<{id:string;fileName:string;source:string;previous:Parameters<typeof importContentInterchange>[2]}>)=>{
  try{self.postMessage({id:event.data.id,result:importContentInterchange(event.data.fileName,event.data.source,event.data.previous)})}
  catch(error){self.postMessage({id:event.data.id,error:error instanceof Error?error.message:String(error)})}
}

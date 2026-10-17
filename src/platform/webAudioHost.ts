import type {RuntimeAudioPlatform} from '../runtime/audioRuntimeContracts'
import {collectBoundedRuntimeByteStream} from './runtimeByteStream'
/** Real browser/WebView capabilities; API presence is not playback/permission certification. */
export function createWebAudioPlatform():RuntimeAudioPlatform{return {
 get Audio(){return typeof Audio==='undefined'?undefined:Audio},get AudioContext(){return typeof AudioContext==='undefined'?undefined:AudioContext},get mediaDevices(){return typeof navigator==='undefined'?undefined:navigator.mediaDevices},createReadAbortController:()=>new AbortController(),nowMilliseconds:()=>performance.now(),dateIso:()=>new Date().toISOString(),
 async readAudioBytes(source,maximumBytes,signal){
  if(signal?.aborted)throw signal.reason??new DOMException('Audio read aborted.','AbortError')
  const response=await fetch(source,{signal})
  if(signal?.aborted){await response.body?.cancel().catch(()=>undefined);throw signal.reason??new DOMException('Audio read aborted.','AbortError')}
  if(!response.ok){await response.body?.cancel().catch(()=>undefined);throw new Error(`Audio source read failed (${response.status}).`)}
  const limitError=new Error('AUDIO_CLIP_LIMIT: Compressed audio exceeds 32 MiB. Use streaming.')
  const advertised=Number(response.headers.get('content-length'))
  if(advertised>maximumBytes){await response.body?.cancel().catch(()=>undefined);throw limitError}
  if(!response.body)throw new Error('AUDIO_SOURCE_BODY_REQUIRED: Audio source has no bounded response body.')
  const data=await collectBoundedRuntimeByteStream(response.body,maximumBytes,signal,{overflowError:()=>limitError}).catch(error=>{if(signal?.aborted)throw signal.reason??new DOMException('Audio read aborted.','AbortError');throw error})
  return data.buffer as ArrayBuffer
 }
}}

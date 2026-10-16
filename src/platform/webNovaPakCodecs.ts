/** Actual browser/Worker codecs. Bounded collection owns cancellation and releases each stream reader once. */
import { assertRuntimePakActive } from '../runtime/novaPakReader'
import { collectBoundedRuntimeByteStream } from './runtimeByteStream'
import type { RuntimePakCapabilities } from '../runtime/novaPakReader'

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map(/* 调用 value.toString(16).padStart(2, '0') 并返回调用结果。 */ value => value.toString(16).padStart(2, '0')).join('')
}

export async function packageSha256(bytes: Uint8Array): Promise<string> {
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', input)))
}

/* Package transport and gzip use the same owned collector in runtimeByteStream. */

async function gunzip(bytes: Uint8Array, maximumDecodedBytes: number, signal?: AbortSignal): Promise<Uint8Array> {
  if (!('DecompressionStream' in globalThis)) throw new Error('This browser cannot decompress Nova packages')
  assertRuntimePakActive(signal)
  const stream = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)]).stream().pipeThrough(new DecompressionStream('gzip'))
  return collectBoundedRuntimeByteStream(stream, maximumDecodedBytes, signal)
}

export function createWebNovaPakCapabilities(): RuntimePakCapabilities {
  return Object.freeze({ digestSha256: packageSha256, gunzipBounded: gunzip })
}

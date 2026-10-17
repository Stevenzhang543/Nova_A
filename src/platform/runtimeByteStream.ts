/** One owned byte collector for package transport and decoded gzip. */
import { assertRuntimePakActive, runtimePakAbortError } from '../runtime/novaPakReader'

export interface RuntimeByteStreamAdmission {
  admissionError?: Error
  overflowError?: (requiredBytes: number, maximumBytes: number) => Error
  nonByteError?: Error
}

export async function collectBoundedRuntimeByteStream(stream: ReadableStream<Uint8Array>, maximumDecodedBytes: number, signal?: AbortSignal, admission?: RuntimeByteStreamAdmission): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maximumDecodedBytes) || maximumDecodedBytes < 0) throw new Error('RUNTIME_PAK_DECODED_LIMIT: Invalid stream byte budget.')
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0, finished = false
  let failure: unknown
  let cancellation: Promise<void> | undefined
  const cancelOnce = (reason: unknown): Promise<void> => cancellation ??= Promise.resolve().then(() => reader.cancel(reason)).catch(() => undefined)
  const abort = () => { void cancelOnce(runtimePakAbortError()) }
  signal?.addEventListener('abort', abort, { once: true })
  try {
    assertRuntimePakActive(signal)
    if (admission?.admissionError) throw admission.admissionError
    for (;;) {
      assertRuntimePakActive(signal)
      const result = await reader.read()
      assertRuntimePakActive(signal)
      if (result.done) { finished = true; break }
      if (!(result.value instanceof Uint8Array)) throw admission?.nonByteError ?? new Error('Nova package decompressor returned a non-byte chunk')
      total += result.value.byteLength
      if (!Number.isSafeInteger(total) || total > maximumDecodedBytes) throw admission?.overflowError?.(total, maximumDecodedBytes) ?? new Error('RUNTIME_PAK_DECODED_LIMIT: Decompressed bytes exceed the declared entry size.')
      if (result.value.byteLength > 0) chunks.push(new Uint8Array(result.value))
    }
    const decoded = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) { decoded.set(chunk, offset); offset += chunk.byteLength }
    return decoded
  } catch (error) {
    failure = error
    throw error
  } finally {
    signal?.removeEventListener('abort', abort)
    if (!finished) await cancelOnce(failure ?? runtimePakAbortError())
    reader.releaseLock()
  }
}

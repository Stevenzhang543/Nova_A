/** Browser/Worker HTTP package transport. The caller supplies the existing package byte policy. */
import { assertRuntimePakActive, runtimePakAbortError } from '../runtime/novaPakReader'
import { collectBoundedRuntimeByteStream } from './runtimeByteStream'

function packageLimitError(requiredBytes: number, maximumBytes: number): Error {
  return new Error(`RUNTIME_PACKAGE_TRANSPORT_LIMIT: Downloaded package requires at least ${requiredBytes} bytes; configured package limit is ${maximumBytes}.`)
}

function invalidPackageBudget(maximumBytes: number): Error | undefined {
  return !Number.isSafeInteger(maximumBytes) || maximumBytes <= 0
    ? new Error('RUNTIME_PACKAGE_TRANSPORT_LIMIT: Supply a positive safe package byte budget.')
    : undefined
}

/** Takes ownership of an actual Response body. No fallback to unbounded arrayBuffer exists. */
export async function readRuntimePackageResponse(response: Response, maximumBytes: number, signal?: AbortSignal): Promise<Uint8Array> {
  let admissionError = invalidPackageBudget(maximumBytes)
  if (!admissionError && !response.ok) admissionError = new Error(`RUNTIME_PACKAGE_HTTP_ERROR: HTTP ${response.status} ${response.statusText}`)
  if (!admissionError) {
    const length = response.headers.get('Content-Length')?.trim()
    // Missing, malformed or understated headers never replace enforcement on the actual chunks.
    if (length && /^\d+$/.test(length) && Number(length) > maximumBytes) admissionError = new Error(`RUNTIME_PACKAGE_TRANSPORT_LIMIT: Declared Content-Length ${length} bytes exceeds the configured package limit ${maximumBytes}.`)
  }
  const body = response.body
  if (!body) {
    assertRuntimePakActive(signal)
    if (admissionError) throw admissionError
    throw new Error('RUNTIME_PACKAGE_BODY_REQUIRED: This response has no readable body; unbounded arrayBuffer fallback is disabled.')
  }
  return collectBoundedRuntimeByteStream(body, invalidPackageBudget(maximumBytes) ? 0 : maximumBytes, signal, {
    admissionError,
    overflowError: packageLimitError,
    nonByteError: new Error('RUNTIME_PACKAGE_TRANSPORT_BYTES_REQUIRED: Response stream returned a non-byte chunk.')
  })
}

export async function fetchRuntimePackageBytes(source: string | URL, maximumBytes: number, signal?: AbortSignal): Promise<Uint8Array> {
  assertRuntimePakActive(signal)
  const invalidBudget = invalidPackageBudget(maximumBytes)
  if (invalidBudget) throw invalidBudget
  const response = await fetch(source, { cache: 'no-store', signal })
  return readRuntimePackageResponse(response, maximumBytes, signal)
}

function base64Digit(code: number): number {
  if (code >= 65 && code <= 90) return code - 65
  if (code >= 97 && code <= 122) return code - 71
  if (code >= 48 && code <= 57) return code + 4
  if (code === 43) return 62
  if (code === 47) return 63
  return -1
}

/** One temporary host-task wait; native scheduler continuation itself is not cancelled by this signal. */
function yieldRuntimePackageHostTask(signal?: AbortSignal): Promise<void> {
  assertRuntimePakActive(signal)
  return new Promise<void>((resolve, reject) => {
    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const finish = (error?: unknown) => {
      if (settled) return
      settled = true
      signal?.removeEventListener('abort', abort)
      if (timer !== undefined) { clearTimeout(timer); timer = undefined }
      if (error !== undefined) reject(error)
      else resolve()
    }
    const abort = () => finish(runtimePakAbortError())
    const fallback = () => {
      if (settled) return
      if (signal?.aborted) { abort(); return }
      try {
        timer = setTimeout(() => {
          timer = undefined
          if (signal?.aborted) abort()
          else finish()
        }, 0)
      } catch (error) { finish(error) }
    }
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) { abort(); return }
    try {
      const scheduler = (globalThis as typeof globalThis & { scheduler?: { yield?: () => PromiseLike<void> } }).scheduler
      if (typeof scheduler?.yield !== 'function') { fallback(); return }
      const continuation = scheduler.yield.call(scheduler)
      if (!continuation || typeof continuation.then !== 'function') { fallback(); return }
      // Both outcomes are consumed even after local cancellation; no late continuation restarts this wait.
      Promise.resolve(continuation).then(() => {
        if (signal?.aborted) abort()
        else finish()
      }, () => fallback())
    } catch { fallback() }
  })
}

/** Native STANDARD.encode is canonical padded Base64. The IPC string is already host-owned. */
export async function decodeRuntimePackageBase64(value: string, maximumBytes: number, signal?: AbortSignal): Promise<Uint8Array> {
  assertRuntimePakActive(signal)
  const invalidBudget = invalidPackageBudget(maximumBytes)
  if (invalidBudget) throw invalidBudget
  const invalidBase64 = () => new Error('RUNTIME_PACKAGE_BASE64_INVALID: Expected canonical padded STANDARD Base64.')
  if (typeof value !== 'string' || value.length % 4 !== 0) throw invalidBase64()
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  const decodedBytes = value.length / 4 * 3 - padding
  if (!Number.isSafeInteger(decodedBytes) || decodedBytes < 0) throw invalidBase64()
  if (decodedBytes > maximumBytes) throw packageLimitError(decodedBytes, maximumBytes)
  const digits = value.length - padding
  const encodedBlockBytes = 64 * 1024 // Divisible by four; at most 49,152 decoded bytes per temporary string.
  const hostTaskQuantumBytes = 1024 * 1024
  let workSinceYield = 0
  for (let offset = 0; offset < digits; offset += encodedBlockBytes) {
    assertRuntimePakActive(signal)
    const end = Math.min(offset + encodedBlockBytes, digits)
    for (let index = offset; index < end; index++) if (base64Digit(value.charCodeAt(index)) < 0) throw invalidBase64()
    workSinceYield += end - offset
    if (workSinceYield >= hostTaskQuantumBytes) { await yieldRuntimePackageHostTask(signal); workSinceYield = 0 }
  }
  for (let index = digits; index < value.length; index++) if (value.charCodeAt(index) !== 61) throw invalidBase64()
  if (padding === 2 && (digits < 2 || (base64Digit(value.charCodeAt(digits - 1)) & 15) !== 0)) throw invalidBase64()
  if (padding === 1 && (digits < 3 || (base64Digit(value.charCodeAt(digits - 1)) & 3) !== 0)) throw invalidBase64()
  assertRuntimePakActive(signal)
  if (typeof atob !== 'function') throw new Error('RUNTIME_PACKAGE_BASE64_UNAVAILABLE: This host has no Base64 decoder.')
  const decoded = new Uint8Array(decodedBytes)
  let outputOffset = 0
  for (let encodedOffset = 0; encodedOffset < value.length; encodedOffset += encodedBlockBytes) {
    assertRuntimePakActive(signal)
    const binary = atob(value.slice(encodedOffset, encodedOffset + encodedBlockBytes))
    assertRuntimePakActive(signal)
    for (let index = 0; index < binary.length; index++) decoded[outputOffset++] = binary.charCodeAt(index)
    assertRuntimePakActive(signal)
    workSinceYield += Math.min(encodedBlockBytes, value.length - encodedOffset)
    if (workSinceYield >= hostTaskQuantumBytes && encodedOffset + encodedBlockBytes < value.length) { await yieldRuntimePackageHostTask(signal); workSinceYield = 0 }
  }
  assertRuntimePakActive(signal)
  return decoded
}

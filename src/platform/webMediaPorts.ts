/** The one Web media decoder. Cancellation discards consumers, not executing browser codecs. */
import { auxiliaryWork } from '../runtime/performance/services'
import type { BudgetedWorkScheduler } from '../runtime/performance/workScheduler'
import type { MediaOperation, RuntimeMediaPorts, MediaDecodeOptions } from '../runtime/runtimeMediaOwner'

export function createWebMediaPorts(scheduler: BudgetedWorkScheduler = auxiliaryWork): RuntimeMediaPorts {
  const operation = <T>(source: string, options: MediaDecodeOptions, run: () => Promise<T>, timeoutMessage: string): MediaOperation<T> => {
    if (!Number.isSafeInteger(options.expectedBytes) || options.expectedBytes < 1) throw new Error('MEDIA_PLATFORM_REQUEST_INVALID')
    let rejectConsumer!: (error: Error) => void, resolveConsumer!: (value: T) => void, finishTerminal!: () => void
    let settled = false, timeout: ReturnType<typeof setTimeout> | undefined
    const result = new Promise<T>((resolve, reject) => { resolveConsumer = resolve; rejectConsumer = reject })
    const terminal = new Promise<void>(resolve => { finishTerminal = resolve })
    const fail = (error: Error) => { if (settled) return; settled = true; rejectConsumer(error); if (timeout !== undefined) clearTimeout(timeout) }
    const inputBytes = source.length * 2
    const work = scheduler.schedule<T>({ name: options.identity.slice(0, 512), owner: 'asset', workClass: 'required', inputRevision: options.revision,
      inputBytes, scratchBytes: options.expectedBytes, outputBytes: options.expectedBytes, readSet: [options.identity.slice(0, 1024)], writeSet: [], cooperative: false, cancelStrategy: 'discard-after-completion'
    }, async () => {
      timeout = setTimeout(() => fail(new Error(timeoutMessage)), 15000)
      try {
        const value = await run()
        if (!settled) { settled = true; resolveConsumer(value) }
        return value
      } catch (error) { fail(error instanceof Error ? error : new Error(String(error))); throw error }
      finally { if (timeout !== undefined) clearTimeout(timeout) }
    })
    // Public result rejects immediately on cancellation; actual terminal follows finish/lease release.
    let unsubscribe = () => undefined as void
    const observe = () => { if (scheduler.trace.some(trace => trace.id === work.id)) { unsubscribe(); finishTerminal() } }
    unsubscribe = scheduler.subscribe(observe); observe()
    void work.promise.catch(error => fail(error instanceof Error ? error : new Error(String(error))))
    void result.catch(() => undefined)
    return Object.freeze({ result, terminal, cancel(reason = 'Media request cancelled') { fail(new Error(reason)); work.cancel(reason); observe() } })
  }
  return {
    get fontsAvailable() { return typeof FontFace !== 'undefined' },
    decodeImage(source, options) {
      return operation(source, options, () => new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image()
        const finish = (error?: Error) => { image.onload = null; image.onerror = null; if (error) reject(error); else resolve(image) }
        image.onload = () => finish(); image.onerror = () => finish(new Error('IMAGE_METADATA: The image could not be decoded.')); image.src = source
      }), 'IMAGE_METADATA_TIMEOUT: Image decoding exceeded 15 seconds.')
    },
    loadFont(family, source, options) {
      return operation(source, options, async () => {
        const face = new FontFace(family, `url(${JSON.stringify(source)})`)
        return await face.load()
      }, 'FONT_METADATA_TIMEOUT: Font decoding exceeded 15 seconds.')
    },
    installFont(face) { document.fonts.add(face) },
    removeFont(face) { document.fonts.delete(face) },
    createCanvas() { return document.createElement('canvas') }
  }
}
// No platform timer, decoder or global Owner is created by importing this module.

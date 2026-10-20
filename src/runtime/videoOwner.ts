/** 26.43 脚本视频：play_video() 在游戏视图上方播放全屏视频（片头、过场），结束或跳过时发出信号。
 *
 * The video covers the game viewport (the rectangle the runtime renders into), letterboxed on
 * black. The game keeps running underneath; scripts that want a paused cutscene call
 * game_pause(true) and resume on the "video.finished" signal, whose payload is
 * #{ asset, reason } with reason "ended", "skipped", "stopped", "replaced" or "unavailable".
 * Skippable videos end on a click/tap or Escape, Enter or Space. Without a DOM (headless runs)
 * or a playable video asset the signal is emitted at once with reason "unavailable", so a script
 * waiting for it never hangs. Runtime only: no Editor or Vue imports. */

export interface VideoAssetLookup { (reference: string): { source: string; assetType: string; path: string } | null }
export interface VideoPlayOptions { skippable: boolean; volume: number; loop: boolean }
export type VideoFinishReason = 'ended' | 'skipped' | 'stopped' | 'replaced' | 'unavailable'

interface ActiveVideo {
  asset: string
  source: string
  root: HTMLDivElement
  element: HTMLVideoElement
  cleanup: () => void
}

export class RuntimeVideoOwner {
  private active: ActiveVideo | null = null
  private viewport: { left: number; top: number; width: number; height: number } | null = null
  readonly diagnostics = { started: 0, finished: 0, skipped: 0, unavailable: 0, mutedFallbacks: 0 }

  constructor(
    private readonly resolve: VideoAssetLookup,
    private readonly finished: (asset: string, reason: VideoFinishReason, source: string) => void,
    private readonly log: (message: string, level: 'info' | 'warning' | 'error') => void,
    private readonly host: { document?: Document } = typeof document === 'undefined' ? {} : { document }
  ) {}

  get playing(): boolean { return this.active !== null }
  get currentAsset(): string | null { return this.active?.asset ?? null }

  /** The runtime passes the game view rectangle every frame; the overlay follows it. */
  setViewport(rect: { left: number; top: number; width: number; height: number } | null | undefined): void {
    this.viewport = rect && rect.width > 0 && rect.height > 0 ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null
    if (this.active) this.place(this.active.root)
  }

  play(reference: string, options: VideoPlayOptions, source = ''): boolean {
    if (this.active) this.finish('replaced')
    const asset = this.resolve(reference)
    const doc = this.host.document
    if (!asset || asset.assetType !== 'video' || !asset.source || !doc?.body) {
      this.diagnostics.unavailable++
      this.log(!asset ? `play_video: no asset “${reference}”.` : asset.assetType !== 'video' ? `play_video: “${asset.path}” is not a video asset (import .mp4 or .webm).` : 'play_video: video playback needs a browser window.', asset ? 'warning' : 'error')
      this.finished(reference, 'unavailable', source)
      return false
    }
    const root = doc.createElement('div')
    root.className = 'nova-runtime-video'
    root.setAttribute('role', 'dialog')
    root.setAttribute('aria-label', options.skippable ? 'Video. Click, tap or press Escape to skip.' : 'Video')
    Object.assign(root.style, { position: 'fixed', zIndex: '2147483000', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', touchAction: 'manipulation' })
    const element = doc.createElement('video')
    element.src = asset.source
    element.playsInline = true
    element.setAttribute('playsinline', '')
    element.preload = 'auto'
    element.loop = options.loop
    element.volume = Math.min(1, Math.max(0, options.volume))
    element.controls = false
    Object.assign(element.style, { width: '100%', height: '100%', objectFit: 'contain', background: '#000' })
    root.appendChild(element)
    this.place(root)
    doc.body.appendChild(root)
    const finishWith = (reason: VideoFinishReason) => () => { if (this.active?.element === element) this.finish(reason) }
    const onEnded = finishWith('ended')
    const onError = () => { if (this.active?.element !== element) return; this.log(`play_video: “${asset.path}” could not be decoded by this browser.`, 'error'); this.finish('unavailable') }
    const onSkip = (event: Event) => { if (!options.skippable) return; event.preventDefault(); event.stopPropagation(); finishWith('skipped')() }
    const onKey = (event: KeyboardEvent) => { if (options.skippable && (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ')) onSkip(event) }
    element.addEventListener('ended', onEnded)
    element.addEventListener('error', onError)
    root.addEventListener('pointerdown', onSkip)
    doc.addEventListener('keydown', onKey, true)
    this.active = {
      asset: reference, source, root, element,
      cleanup: () => {
        element.removeEventListener('ended', onEnded); element.removeEventListener('error', onError)
        root.removeEventListener('pointerdown', onSkip); doc.removeEventListener('keydown', onKey, true)
        element.pause(); element.removeAttribute('src'); element.load(); root.remove()
      }
    }
    this.diagnostics.started++
    const started = element.play()
    if (started && typeof started.catch === 'function') {
      void started.catch(() => {
        if (this.active?.element !== element) return
        // Autoplay with sound can be refused before the first user gesture: play muted instead.
        element.muted = true
        this.diagnostics.mutedFallbacks++
        this.log('play_video: the browser blocked video sound before a user gesture; playing muted.', 'warning')
        void element.play().catch(() => { if (this.active?.element === element) this.finish('unavailable') })
      })
    }
    return true
  }

  stop(): void { if (this.active) this.finish('stopped') }

  /** Editor pause / host suspension pauses the video; resuming continues it. */
  setPaused(paused: boolean): void {
    const element = this.active?.element
    if (!element || element.paused === paused) return
    if (paused) element.pause()
    else void element.play()?.catch?.(() => undefined)
  }

  /** Ends any video without a signal (session stop). */
  dispose(): void { if (!this.active) return; const active = this.active; this.active = null; active.cleanup() }

  private finish(reason: VideoFinishReason): void {
    const active = this.active
    if (!active) return
    this.active = null
    active.cleanup()
    this.diagnostics.finished++
    if (reason === 'skipped') this.diagnostics.skipped++
    this.finished(active.asset, reason, active.source)
  }

  private place(root: HTMLDivElement): void {
    const rect = this.viewport
    Object.assign(root.style, rect
      ? { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` }
      : { left: '0', top: '0', width: '100vw', height: 'var(--vh100, 100vh)' })
  }
}

/** 26.43 独立播放器调试工具（仅开发版导出可用）：F3 显示帧统计，F4 显示物理调试层。
 * `?debug=stats,physics` 在开发版中直接打开。正式版（Release 配置）导出不创建这些工具。
 *
 * The stats panel samples once every 250 ms (no per-frame DOM writes). The physics layer uses the
 * shared debug drawing (src/renderer/physicsDebugDraw.ts) on its own canvas above the game, in the
 * game camera's world space, and costs nothing while it is off. */
import { activeGameCamera } from '../../renderer/sceneRenderer'
import { applyCameraWorldTransform, DEFAULT_PHYSICS_DEBUG_OPTIONS, drawPhysicsDebug, type PhysicsDebugCounts } from '../../renderer/physicsDebugDraw'
import type { GameplayRuntime } from '../GameplayRuntimeCore'
import type { RuntimeWorldHost } from '../runtimeWorldHost'
import type { PlayerSurface } from './playerSurface'
import type { PlayerViewStats } from './playerView'

export interface PlayerDebugFrame { readonly width: number; readonly height: number; readonly pixelRatio: number; readonly frameMs: number }
export interface PlayerDebugOverlay {
  readonly state: { stats: boolean; physics: boolean }
  afterFrame(frame: PlayerDebugFrame): void
  dispose(): void
}

const percentile = (values: readonly number[], fraction: number) => { if (!values.length) return 0; const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))] }

export function createPlayerDebugOverlay(root: HTMLElement, options: { runtime: GameplayRuntime; host: RuntimeWorldHost; surface: PlayerSurface; stats: PlayerViewStats; initial?: string | null }): PlayerDebugOverlay {
  const { runtime, host, surface, stats } = options
  const requested = new Set(String(options.initial ?? '').split(',').map(item => item.trim()))
  const state = { stats: requested.has('stats') || requested.has('1'), physics: requested.has('physics') }
  const canvas = document.createElement('canvas'); canvas.className = 'nova-player-debug-canvas'; canvas.setAttribute('aria-hidden', 'true'); canvas.hidden = true
  const panel = document.createElement('aside'); panel.className = 'nova-player-debug-stats'; panel.setAttribute('aria-label', 'Frame statistics'); panel.hidden = true
  root.append(canvas, panel)
  const context = canvas.getContext('2d')
  const frameTimes: number[] = [], frameStamps: number[] = []
  let lastPanel = 0, physicsCounts: PhysicsDebugCounts | null = null, drewPhysics = false
  const onKey = (event: KeyboardEvent) => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'F3') { state.stats = !state.stats; event.preventDefault(); event.stopPropagation() }
    else if (event.key === 'F4') { state.physics = !state.physics; event.preventDefault(); event.stopPropagation() }
  }
  window.addEventListener('keydown', onKey, true)

  function renderPanel(now: number, frame: PlayerDebugFrame): void {
    const windowMs = frameStamps.length > 1 ? frameStamps[frameStamps.length - 1] - frameStamps[0] : 0
    const fps = windowMs > 0 ? (frameStamps.length - 1) * 1000 / windowMs : 0
    const world = host.state.world, timings = runtime.diagnostics.timings, engine = host.state.engineDiagnostics
    const lines: Array<[string, string]> = [
      ['FPS', fps.toFixed(1)],
      ['Frame CPU', `${(frameTimes.reduce((sum, value) => sum + value, 0) / Math.max(1, frameTimes.length)).toFixed(2)} ms · P95 ${percentile(frameTimes, .95).toFixed(2)} ms`],
      ['Runtime', `physics ${timings.physicsMs.toFixed(2)} · scripts ${timings.scriptsMs.toFixed(2)} · audio ${timings.audioMs.toFixed(2)} ms`],
      ['Renderer', `${stats.backend}${stats.lightingBackend ? ` · light ${stats.lightingBackend}` : ''} · ${stats.drawCalls} draws${stats.rebuilds ? ` · ${stats.rebuilds} rebuilds` : ''}`],
      ['Surface', `${Math.round(frame.width)}×${Math.round(frame.height)} @${frame.pixelRatio.toFixed(2)}x`],
      ['Physics', `${engine.bodyCount} bodies · ${engine.stepsLastFrame} steps/frame · ${engine.eventCount} events${engine.droppedSeconds > 0 ? ` · ${engine.droppedSeconds.toFixed(2)} s dropped` : ''}`],
      ['World', `${world.entities.length} entities · ${runtime.diagnostics.scripts} scripts${runtime.diagnostics.scriptErrors ? ` · ${runtime.diagnostics.scriptErrors} errors` : ''}`],
      ...(physicsCounts ? [['Debug', `${physicsCounts.colliders} colliders · ${physicsCounts.sleeping} sleeping · ${physicsCounts.contacts} contacts`] as [string, string]] : []),
      ['Keys', 'F3 statistics · F4 physics']
    ]
    panel.replaceChildren(...lines.map(([label, value]) => { const row = document.createElement('div'); const name = document.createElement('span'); name.textContent = label; const text = document.createElement('b'); text.textContent = value; row.append(name, text); return row }))
    lastPanel = now
  }

  return {
    state,
    afterFrame(frame) {
      const now = performance.now()
      frameTimes.push(frame.frameMs); frameStamps.push(now)
      if (frameTimes.length > 120) frameTimes.shift()
      while (frameStamps.length > 2 && now - frameStamps[0] > 1000) frameStamps.shift()
      panel.hidden = !state.stats
      if (state.stats && now - lastPanel >= 250) renderPanel(now, frame)
      if (!context) return
      if (!state.physics) {
        if (drewPhysics) { context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, canvas.width, canvas.height); drewPhysics = false; physicsCounts = null }
        canvas.hidden = true
        return
      }
      canvas.hidden = false
      const width = Math.max(1, Math.round(frame.width * frame.pixelRatio)), height = Math.max(1, Math.round(frame.height * frame.pixelRatio))
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height }
      context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, width, height)
      context.setTransform(frame.pixelRatio, 0, 0, frame.pixelRatio, 0, 0)
      const world = host.state.world
      const camera = activeGameCamera(world.entities, frame.width, frame.height, surface.scene)?.view ?? { scale: host.state.camera.scale, offset: { ...host.state.camera.offset } }
      applyCameraWorldTransform(context, camera, frame.width, frame.height)
      physicsCounts = drawPhysicsDebug(context, { entities: world.entities, connections: world.connections, events: world.events, layerColors: host.state.globalSettings.layers, pixelsPerUnit: camera.scale }, { ...DEFAULT_PHYSICS_DEBUG_OPTIONS, showVelocities: true })
      drewPhysics = true
    },
    dispose() { window.removeEventListener('keydown', onKey, true); canvas.remove(); panel.remove() }
  }
}

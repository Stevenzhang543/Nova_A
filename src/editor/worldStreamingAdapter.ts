/** Editor-only policy/clock and unique same-raw streaming diagnostics bridge. */
import { reactive, toRaw } from 'vue'
import { performanceRuntimeSettings, performanceRuntimeState } from '../runtime/largeWorldPerformance'
import { WorldStreamingOwner, createWorldStreamingDiagnosticLease, type WorldStreamingWorld } from '../runtime/worldStreamingOwner'
import type { StreamLifecycleOwner } from '../runtime/streamLifecycle'
import { getLegacyWorldStreamingRawState, installLegacyWorldStreamingPort } from '../runtime/worldStreaming'
const stateView = reactive(getLegacyWorldStreamingRawState())
const lease = createWorldStreamingDiagnosticLease()
const owners = new WeakMap<WorldStreamingWorld, WorldStreamingOwner>()
export function createEditorWorldStreamingOwner(world: WorldStreamingWorld, lifecycle: StreamLifecycleOwner, options: { legacyRoot: boolean }): WorldStreamingOwner {
  const cached = owners.get(world)
  if (cached && !cached.isDisposed) { if (cached.lifecycle !== lifecycle || options.legacyRoot && cached.state !== stateView || !options.legacyRoot && cached.state === stateView) throw new Error('STREAM_EDITOR_OWNER_CLAIM_MISMATCH'); return cached }
  const metrics = options.legacyRoot ? {
    get streamingProcessed() { return performanceRuntimeState.streamingProcessed }, set streamingProcessed(value: number) { performanceRuntimeState.streamingProcessed = value },
    get streamingDeferred() { return performanceRuntimeState.streamingDeferred }, set streamingDeferred(value: number) { performanceRuntimeState.streamingDeferred = value }
  } : { streamingProcessed: 0, streamingDeferred: 0 }
  const owner = new WorldStreamingOwner(world, lifecycle, { settings: { get streamingBudgetMs() { return performanceRuntimeSettings.streamingBudgetMs } }, metrics, nowMs: () => performance.now(), isoNow: () => new Date().toISOString() }, options.legacyRoot ? stateView : undefined, options.legacyRoot ? lease : undefined)
  owners.set(world, owner); return owner
}
export function installEditorWorldStreamingOwnerProvider(getOwner: () => WorldStreamingOwner): void {
  installLegacyWorldStreamingPort({ stateView, unwrapState: toRaw, getOwner })
}

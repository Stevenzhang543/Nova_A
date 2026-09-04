export interface NetworkRollbackEntityState {
  uuid: string
  position?: [number, number]
  rotation?: number
  velocity?: [number, number]
}

export interface NetworkRollbackFrame {
  tick: number
  entities: NetworkRollbackEntityState[]
}

export interface NetworkRollbackReplay {
  state: NetworkRollbackEntityState
  replayedFrames: number
}

function finite(value: number | undefined, fallback = 0): number { return Number.isFinite(value) ? Number(value) : fallback }

/**
 * Restores an authoritative transform at `authoritativeTick`, then reapplies
 * the already-recorded local transform deltas through the current fixed tick.
 * This is deliberately limited to network-safe built-in state: arbitrary Rhai,
 * audio, filesystem, UI, and network side effects are never executed twice.
 */
export function replayNetworkTransformDeltas(authoritative: NetworkRollbackEntityState, authoritativeTick: number, frames: readonly NetworkRollbackFrame[]): NetworkRollbackReplay {
  const ordered = frames.filter(frame => Number.isSafeInteger(frame.tick) && frame.tick >= authoritativeTick).slice(-600).sort((a, b) => a.tick - b.tick)
  const base = ordered.find(frame => frame.tick === authoritativeTick)?.entities.find(entity => entity.uuid === authoritative.uuid)
  const state: NetworkRollbackEntityState = {
    uuid: authoritative.uuid,
    ...(authoritative.position ? { position: [finite(authoritative.position[0]), finite(authoritative.position[1])] as [number, number] } : {}),
    ...(authoritative.rotation !== undefined ? { rotation: finite(authoritative.rotation) } : {}),
    ...(authoritative.velocity ? { velocity: [finite(authoritative.velocity[0]), finite(authoritative.velocity[1])] as [number, number] } : {})
  }
  if (!base) return { state, replayedFrames: 0 }
  let previous = base, replayedFrames = 0
  for (const frame of ordered) {
    if (frame.tick <= authoritativeTick) continue
    const current = frame.entities.find(entity => entity.uuid === authoritative.uuid)
    if (!current) continue
    if (state.position && previous.position && current.position) state.position = [state.position[0] + finite(current.position[0] - previous.position[0]), state.position[1] + finite(current.position[1] - previous.position[1])]
    if (state.rotation !== undefined && previous.rotation !== undefined && current.rotation !== undefined) state.rotation += finite(current.rotation - previous.rotation)
    if (state.velocity && previous.velocity && current.velocity) state.velocity = [state.velocity[0] + finite(current.velocity[0] - previous.velocity[0]), state.velocity[1] + finite(current.velocity[1] - previous.velocity[1])]
    previous = current; replayedFrames++
  }
  return { state, replayedFrames }
}

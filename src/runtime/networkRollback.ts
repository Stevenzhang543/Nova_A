/** 网络回滚辅助：管理可恢复的帧状态及预测修正所需数据。 */
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

/* 根据 Number.isFinite(value) 的真假，分别返回 Number(value) 或 fallback。 */ function finite(value: number | undefined, fallback = 0): number { return Number.isFinite(value) ? Number(value) : fallback }

/**
 * Restores an authoritative transform at `authoritativeTick`, then reapplies
 * the already-recorded local transform deltas through the current fixed tick.
 * This is deliberately limited to network-safe built-in state: arbitrary Rhai,
 * audio, filesystem, UI, and network side effects are never executed twice.
 */
/** 结构说明（自动提取）：replayNetworkTransformDeltas；输入 authoritative、authoritativeTick、frames；直接调用 sort、slice、frames.filter、entities.find、ordered.find 等；写入 state.position、state.rotation、state.velocity、previous；包含循环处理。 */ export function replayNetworkTransformDeltas(authoritative: NetworkRollbackEntityState, authoritativeTick: number, frames: readonly NetworkRollbackFrame[]): NetworkRollbackReplay {
  const ordered = frames.filter(/* 先计算 Number.isSafeInteger(frame.tick)；仅当其为真值时求右侧 frame.tick >= authoritativeTick，返回短路求值结果。 */ frame => Number.isSafeInteger(frame.tick) && frame.tick >= authoritativeTick).slice(-600).sort(/* 计算表达式 a.tick - b.tick 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a.tick - b.tick)
  const base = ordered.find(/* 比较 frame.tick 与 authoritativeTick，返回严格相等的判断结果。 */ frame => frame.tick === authoritativeTick)?.entities.find(/* 比较 entity.uuid 与 authoritative.uuid，返回严格相等的判断结果。 */ entity => entity.uuid === authoritative.uuid)
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
    const current = frame.entities.find(/* 比较 entity.uuid 与 authoritative.uuid，返回严格相等的判断结果。 */ entity => entity.uuid === authoritative.uuid)
    if (!current) continue
    if (state.position && previous.position && current.position) state.position = [state.position[0] + finite(current.position[0] - previous.position[0]), state.position[1] + finite(current.position[1] - previous.position[1])]
    if (state.rotation !== undefined && previous.rotation !== undefined && current.rotation !== undefined) state.rotation += finite(current.rotation - previous.rotation)
    if (state.velocity && previous.velocity && current.velocity) state.velocity = [state.velocity[0] + finite(current.velocity[0] - previous.velocity[0]), state.velocity[1] + finite(current.velocity[1] - previous.velocity[1])]
    previous = current; replayedFrames++
  }
  return { state, replayedFrames }
}

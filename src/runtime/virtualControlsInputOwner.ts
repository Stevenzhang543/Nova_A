/** One virtual-controls binding to the chosen Runtime input. No clock, input sampler or UI dependency. */
export interface VirtualControlsInputSink {
  setVirtualAction(actionName: string, value: number | [number, number]): boolean
  releaseVirtualAction(actionName: string): void
}
export interface VirtualControlsRuntime {
  readonly input: VirtualControlsInputSink
  readonly presentation: { readonly world: object }
}
export interface VirtualControlsInputPorts {
  controls(): readonly { id: string; action: string }[]
  current(control: { id: string; action: string }): { x: number; y: number }
  actionKinds(): ReadonlyMap<string, 'button' | 'axis' | 'vector2'>
}
export interface VirtualControlsInputOwner {
  readonly input: VirtualControlsInputSink
  readonly world: object
  readonly active: boolean
  readonly ownedActions: readonly string[]
  recomputeAction(action: string): void
  releaseAll(): void
  dispose(): void
}
const bindings = new WeakMap<VirtualControlsInputSink, VirtualControlsInputOwner>()
export function createVirtualControlsInputOwner(runtime: VirtualControlsRuntime, world: object, ports: VirtualControlsInputPorts): VirtualControlsInputOwner {
  const input = runtime?.input
  if (!world || !input || typeof input.setVirtualAction !== 'function' || typeof input.releaseVirtualAction !== 'function'
    || runtime.presentation.world !== world || !ports || ['controls', 'current', 'actionKinds'].some(key => typeof ports[key as keyof VirtualControlsInputPorts] !== 'function')) {
    throw new Error('VIRTUAL_INPUT_OWNER_MISMATCH: Supply the chosen Runtime input and its fixed World.')
  }
  const ownedActions = new Set<string>()
  let disposed = false
  const previous = bindings.get(input)
  previous?.dispose()
  const actionKey = (value: string) => value.trim().slice(0, 80)
  const gameplayRuntime = { input: {
    setVirtualAction(action: string, value: number | [number, number]): boolean {
      const accepted = input.setVirtualAction(action, value)
      if (accepted) ownedActions.add(actionKey(action))
      return accepted
    },
    releaseVirtualAction(action: string): void {
      const key = actionKey(action)
      if (ownedActions.delete(key)) input.releaseVirtualAction(key)
    }
  } }
  const deviceInputSettings = { get virtualControls() { return ports.controls() } }
  const current = ports.current.bind(ports)
  const actionKinds = { get value() { return ports.actionKinds() } }
/** 累加同动作控件输入并限幅，近零时释放动作，否则按向量或标量类型提交。 */ function recomputeAction(action: string): void {
  let x = 0, y = 0
  for (const control of deviceInputSettings.virtualControls) {
    if (control.action !== action) continue
    const value = current(control); x += value.x; y += value.y
  }
  x = Math.min(1, Math.max(-1, x)); y = Math.min(1, Math.max(-1, y))
  const kind = actionKinds.value.get(action)
  if (Math.abs(x) < 1e-4 && Math.abs(y) < 1e-4) gameplayRuntime.input.releaseVirtualAction(action)
  else if (kind === 'vector2') gameplayRuntime.input.setVirtualAction(action, [x, y])
  else gameplayRuntime.input.setVirtualAction(action, Math.abs(x) >= Math.abs(y) ? x : y)
}

  function assertActive(): void {
    if (disposed || bindings.get(input) !== result) throw new Error('VIRTUAL_INPUT_OWNER_RETIRED: This binding no longer owns virtual controls.')
    if (runtime.input !== input || runtime.presentation.world !== world) throw new Error('VIRTUAL_INPUT_WORLD_CHANGED: Rebind virtual controls to the current Runtime.')
  }
  function releaseAll(): void {
    // Cleanup uses only the captured input, never an invalid World getter.
    if (disposed || bindings.get(input) !== result) return
    for (const action of ownedActions) input.releaseVirtualAction(action)
    ownedActions.clear()
  }
  const result: VirtualControlsInputOwner = {
    input, world,
    get active() { return !disposed && bindings.get(input) === result },
    get ownedActions() { return [...ownedActions] },
    recomputeAction(action) { assertActive(); recomputeAction(action) },
    releaseAll,
    dispose() {
      if (disposed) return
      try { releaseAll() } finally { disposed = true; if (bindings.get(input) === result) bindings.delete(input) }
    }
  }
  bindings.set(input, result)
  return result
}

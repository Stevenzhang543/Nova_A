/** Optional synchronous host views; all input settings and observations default to plain Owners. */
import { isDeviceInputStateAdapterInstalled, reserveDeviceInputStateAdapter } from './deviceInput'
import { isInputPromptStateAdapterInstalled, reserveInputPromptStateAdapter } from './inputModality'

export interface InputStateAdapter {
  wrap<T extends object>(target: T): T
  unwrap<T extends object>(view: T): T
}
let installed = false, preparing = false, reentered = false

function assertUninstalledTargets(): void {
  if (isDeviceInputStateAdapterInstalled() || isInputPromptStateAdapterInstalled()) {
    throw new Error('Input state aggregate installation cannot follow an independent module bootstrap')
  }
}

function assertSameOwner<T extends object>(target: T, view: T, adapter: InputStateAdapter): void {
  const pending: Array<{ target: object; view: object }> = [{ target, view }], visited = new WeakSet<object>()
  for (let index = 0; index < pending.length; index++) {
    const pair = pending[index]
    if (!pair.view || typeof pair.view !== 'object' || adapter.unwrap(pair.view) !== pair.target) {
      throw new TypeError('Input state adapter must retain the same raw Owner and nested targets')
    }
    if (visited.has(pair.target)) continue
    visited.add(pair.target)
    // Bootstrap only; this bounds validation work for an unexpectedly large host target.
    if (index >= 4_096) throw new RangeError('Input state same raw Owner validation budget exceeded')
    for (const key of Object.keys(pair.target)) {
      const value = (pair.target as Record<string, unknown>)[key], observed = (pair.view as Record<string, unknown>)[key]
      if (value && typeof value === 'object') pending.push({ target: value, view: observed as object })
      else if (!Object.is(value, observed)) throw new TypeError('Input state adapter must retain the same raw Owner values')
    }
  }
}

/** Trusted factory: no mutation, clones, async work or independent bootstrap during construction. */
export function installInputStateAdapter(adapter: InputStateAdapter): void {
  if (preparing) { reentered = true; throw new Error('Input state adapter installation is reentrant') }
  if (installed) return
  assertUninstalledTargets()
  preparing = true
  reentered = false
  const device = reserveDeviceInputStateAdapter()
  let prompt: ReturnType<typeof reserveInputPromptStateAdapter> | undefined
  try {
    prompt = reserveInputPromptStateAdapter()
    const settings = adapter.wrap(device.targets[0]), sensor = adapter.wrap(device.targets[1])
    const runtime = adapter.wrap(device.targets[2]), promptView = adapter.wrap(prompt.target)
    assertSameOwner(device.targets[0], settings, adapter)
    assertSameOwner(device.targets[1], sensor, adapter)
    assertSameOwner(device.targets[2], runtime, adapter)
    assertSameOwner(prompt.target, promptView, adapter)
    if (reentered) throw new Error('Input state adapter installation is reentrant')
    // All validation and host callbacks finish before publishing any live binding.
    device.commit([settings, sensor, runtime])
    prompt.commit(promptView)
    installed = true
  } finally {
    device.release()
    prompt?.release()
    preparing = false
  }
}

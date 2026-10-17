import { reactive, toRaw } from 'vue'
import { installInputStateAdapter, type InputStateAdapter } from '../runtime/inputStateAdapter'

const editorInputStateAdapter: InputStateAdapter = {
  wrap: target => reactive(target) as typeof target,
  unwrap: view => toRaw(view)
}

/** Install before Editor component setup/watchers; retain the original nested reactivity. */
export function installEditorInputState(): void { installInputStateAdapter(editorInputStateAdapter) }

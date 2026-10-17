import { reactive, toRaw } from 'vue'
import { installScriptStateAdapter, type ScriptStateAdapter } from '../runtime/scriptStateAdapter'

const wrapScriptState: ScriptStateAdapter = target => {
  const view = reactive(target) as typeof target
  if (toRaw(view) !== target) throw new TypeError('Editor script state must retain the same raw Owner')
  return view
}

/** Install before Editor watchers/component setup; preserve the original nested reactivity. */
export function installEditorScriptState(): void { installScriptStateAdapter(wrapScriptState) }

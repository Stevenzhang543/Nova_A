import { reactive } from 'vue'
import { installPackageStateAdapter } from '../runtime/packages'

/** Install before Editor panels mount; wraps the original package state object (no copy). */
export function installEditorPackageState(): void { installPackageStateAdapter(target => reactive(target) as typeof target) }

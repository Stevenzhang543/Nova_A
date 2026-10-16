import { reactive } from 'vue'
import { installProductionStateAdapter, type ProductionStateAdapter } from '../runtime/production'

const wrapProductionState: ProductionStateAdapter = target => reactive(target) as typeof target
/** Install before Editor service watchers and component setup, preserving the original configuration owner. */
export function installEditorProductionState(): void { installProductionStateAdapter(wrapProductionState) }

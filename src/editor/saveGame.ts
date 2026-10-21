/** Existing Editor save API; runtime instances own their state, callbacks and recovery map.
 * 26.45: moved from src/runtime (it is the Editor's reactive facade; Players use runtimeSaveOwner). */
import { reactive } from 'vue'
import { createRuntimeSaveState } from '../runtime/runtimeSaveOwner'
import { createEditorSaveOwner } from './saveOwnerAdapter'
export type { SaveScalar, SaveValue, SaveProgress, SaveSlotMetadata, SaveSerializer } from '../runtime/runtimeSaveOwner'
export const saveGameState = reactive(createRuntimeSaveState())
const owner = createEditorSaveOwner(saveGameState)
/** Existing Editor save state remains the unique legacy facade Owner. */
export function getEditorSaveOwner() { return owner }
export const platformSaveLocation = owner.platformSaveLocation
export const migrateSaveData = owner.migrateSaveData
export const normalizeSaveValue = owner.normalizeSaveValue
export const registerSaveSerializer = owner.registerSaveSerializer
export const useSaveProject = owner.useSaveProject
export const loadSaveSlot = owner.loadSaveSlot
export const recoverSaveSlot = owner.recoverSaveSlot
export const loadSaveSlotAsync = owner.loadSaveSlotAsync
export const saveSnapshot = owner.saveSnapshot
export const setSaveValue = owner.setSaveValue
export const deleteSaveValue = owner.deleteSaveValue
export const clearSaveValues = owner.clearSaveValues
export const commitSaveSlot = owner.commitSaveSlot
export const commitSaveSlotAsync = owner.commitSaveSlotAsync
export const listSaveSlots = owner.listSaveSlots
export const removeSaveSlot = owner.removeSaveSlot

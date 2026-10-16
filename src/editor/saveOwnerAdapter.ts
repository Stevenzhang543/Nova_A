/** Editor supplies live project configuration and browser storage to the pure save Owner. */
import { projectSessionState } from '../projects/projectSession'
import { productionSettings } from '../runtime/production'
import { createRuntimeSaveOwner, type RuntimeSaveState, type RuntimeSaveConfiguration } from '../runtime/runtimeSaveOwner'
export function createEditorSaveOwner(state?: RuntimeSaveState, context?: {projectId(): string; configuration(): RuntimeSaveConfiguration}) {
return createRuntimeSaveOwner({
projectId: context?.projectId ?? (() => projectSessionState.id),
configuration: context?.configuration ?? (() => productionSettings.data),
storage: () => typeof localStorage === 'undefined' ? undefined : localStorage,
origin: () => typeof location === 'undefined' ? 'headless-runtime' : location.origin,
timestamp: () => new Date().toISOString(),
abortError: message => new DOMException(message, 'AbortError')
}, state)
}

/** A Player/foreign Runtime captures its own game identity and schema, while storage stays a platform service. */
export function createDetachedEditorSaveOwner() {
  const projectId = projectSessionState.id, data = productionSettings.data
  const configuration: RuntimeSaveConfiguration = {saveSchemaVersion: data.saveSchemaVersion, saveMigrations: data.saveMigrations.map(migration => ({fromVersion: migration.fromVersion, toVersion: migration.toVersion, renames: {...migration.renames}, defaults: {...migration.defaults}, remove: [...migration.remove]}))}
  return createEditorSaveOwner(undefined, {projectId: () => projectId, configuration: () => configuration})
}

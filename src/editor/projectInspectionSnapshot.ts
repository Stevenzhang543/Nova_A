import { onActivated, shallowRef, watch } from 'vue'
import { assetState } from '../assets/AssetDatabase'
import { projectSessionState } from '../projects/projectSession'
import { getSceneJSON, historyState, sceneManager } from '../store/physics'

/**
 * Capture at authored transaction boundaries, outside computed dependency tracking.
 * getSceneJSON also captures the active scene and synchronizes dependency metadata;
 * calling it from computed inspectors makes those inspectors invalidate each other.
 */
export function useProjectInspectionSnapshot() {
  const snapshot = shallowRef<unknown>(null)
  function refresh() {
    try { snapshot.value = JSON.parse(getSceneJSON()) as unknown }
    catch { snapshot.value = null }
  }
  watch([
    () => projectSessionState.id,
    () => historyState.entries.slice(),
    () => historyState.index,
    () => assetState.generation,
    () => sceneManager.activeSceneUuid
  ], refresh, { immediate: true, flush: 'post' })
  // Kept-alive inspectors may be revisited before an in-progress edit is committed.
  onActivated(refresh)
  return snapshot
}


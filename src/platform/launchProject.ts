/** Opens a .nova document the desktop host received on its command line (Open With / file association). */
export async function openLaunchProject(): Promise<void> {
  if (!('__TAURI_INTERNALS__' in window)) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const launch = await invoke<{ fileName: string; directory: string; source: string } | null>('launch_project')
    if (!launch) return
    // A crash-recovery prompt comes first; the launched document opens once the user has answered it.
    const { recoveryState } = await import('../runtime/recovery')
    if (recoveryState.visible) {
      const { watch } = await import('vue')
      await new Promise<void>(resolve => { const stop = watch(() => recoveryState.visible, visible => { if (!visible) { stop(); resolve() } }) })
    }
    const { openProjectDocument } = await import('../projects/projectManager')
    await openProjectDocument(launch.source, launch.fileName, false, launch.directory)
  } catch (error) {
    const { projectManagerState } = await import('../projects/projectManager')
    projectManagerState.error = error instanceof Error ? error.message : String(error)
  }
}

export interface PreparedRuntimeSceneTransition {
  preservedEntityUuids: readonly string[]
  commit(): boolean
  readonly error: string | null
}

/** Shared scene identity policies; the Editor and Runtime use the same serialized values. */
export type EntityOwnership = 'Scene' | 'Prefab' | 'Runtime'
export type RuntimePersistencePolicy = 'Scene' | 'Session' | 'SaveGame' | 'Transient'

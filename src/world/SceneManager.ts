import { normalizeUuid } from './identity'
import { defaultSceneAuthoringSettings, normalizeSceneAuthoringSettings, type SceneAuthoringSettings, type SceneExternalState, type SceneValidationState } from '../editor/sceneAuthoring'

export interface SceneDocument {
  uuid: string
  name: string
  loaded: boolean
  data: Record<string, unknown>
  settings: SceneAuthoringSettings
  dependencies: string[]
  dirty: boolean
  externalState: SceneExternalState
  validationState: SceneValidationState
  prefabState: 'none' | 'source' | 'instance' | 'overridden'
  visitedAt: string
}

function cloneData(data: Record<string, unknown>): Record<string, unknown> {
  // Scene documents contain persistence-safe data only. JSON cloning also unwraps
  // Vue reactive proxies, which the native structured-clone algorithm rejects.
  return JSON.parse(JSON.stringify(data)) as Record<string, unknown>
}

function emptySceneData(): Record<string, unknown> {
  return {
    layers: [1],
    activeLayer: 1,
    renderLayer: 'all',
    entities: [],
    connections: []
  }
}

/** Owns loaded scene documents while the editor World represents the active one. */
export class SceneManager {
  scenes: SceneDocument[]
  activeSceneUuid: string
  navigationHistory: string[]
  navigationIndex: number

  constructor() {
    const scene = this.createDocument('Main Scene')
    this.scenes = [scene]
    this.activeSceneUuid = scene.uuid
    this.navigationHistory = [scene.uuid]
    this.navigationIndex = 0
  }

  get activeScene(): SceneDocument {
    return this.scenes.find(scene => scene.uuid === this.activeSceneUuid) ?? this.scenes[0]
  }

  create(name?: string): SceneDocument {
    const scene = this.createDocument(name?.trim() || `Scene ${this.scenes.length + 1}`)
    this.scenes.push(scene)
    return scene
  }

  captureActive(data: Record<string, unknown>, defensiveCopy = true): void {
    this.activeScene.data = defensiveCopy ? cloneData(data) : data
  }

  setActive(uuid: string): SceneDocument | null {
    const scene = this.scenes.find(candidate => candidate.uuid === uuid)
    if (!scene) return null
    scene.loaded = true
    this.activeSceneUuid = scene.uuid
    scene.visitedAt = new Date().toISOString()
    if (this.navigationHistory[this.navigationIndex] !== scene.uuid) {
      this.navigationHistory.splice(this.navigationIndex + 1)
      this.navigationHistory.push(scene.uuid)
      if (this.navigationHistory.length > 100) this.navigationHistory.shift()
      this.navigationIndex = this.navigationHistory.length - 1
    }
    return scene
  }

  navigate(offset: -1 | 1): SceneDocument | null {
    const index = this.navigationIndex + offset
    if (index < 0 || index >= this.navigationHistory.length) return null
    const scene = this.scenes.find(candidate => candidate.uuid === this.navigationHistory[index])
    if (!scene) return null
    this.navigationIndex = index
    scene.loaded = true
    scene.visitedAt = new Date().toISOString()
    this.activeSceneUuid = scene.uuid
    return scene
  }

  markDirty(uuid = this.activeSceneUuid): void { const scene = this.scenes.find(candidate => candidate.uuid === uuid); if (scene) scene.dirty = true }
  markSaved(): void { for (const scene of this.scenes) { scene.dirty = false; scene.externalState = 'clean' } }
  setExternalState(uuid: string, state: SceneExternalState): void { const scene = this.scenes.find(candidate => candidate.uuid === uuid); if (scene) scene.externalState = state }
  setValidationState(uuid: string, state: SceneValidationState): void { const scene = this.scenes.find(candidate => candidate.uuid === uuid); if (scene) scene.validationState = state }
  setPrefabState(uuid: string, state: SceneDocument['prefabState']): void { const scene = this.scenes.find(candidate => candidate.uuid === uuid); if (scene) scene.prefabState = state }

  setInheritance(uuid: string, sourceUuid: string | null): boolean {
    const scene = this.scenes.find(candidate => candidate.uuid === uuid)
    if (!scene || sourceUuid === uuid || (sourceUuid && !this.scenes.some(candidate => candidate.uuid === sourceUuid))) return false
    const visited = new Set<string>([uuid])
    let current = sourceUuid ? this.scenes.find(candidate => candidate.uuid === sourceUuid) : undefined
    while (current) {
      if (visited.has(current.uuid)) return false
      visited.add(current.uuid)
      current = current.settings.inheritanceSourceUuid ? this.scenes.find(candidate => candidate.uuid === current!.settings.inheritanceSourceUuid) : undefined
    }
    scene.settings.inheritanceSourceUuid = sourceUuid
    scene.dependencies = this.inspectDependencies(scene)
    scene.dirty = true
    return true
  }

  inspectDependencies(scene = this.activeScene): string[] {
    const references = new Set<string>()
    const visit = (value: unknown) => {
      if (typeof value === 'string') {
        for (const match of value.matchAll(/(?:scene|asset):\/\/([0-9a-f-]{36})/gi)) references.add(match[1].toLowerCase())
      } else if (Array.isArray(value)) value.forEach(visit)
      else if (value && typeof value === 'object') Object.values(value as Record<string, unknown>).forEach(visit)
    }
    visit(scene.data)
    if (scene.settings.inheritanceSourceUuid) references.add(scene.settings.inheritanceSourceUuid)
    references.delete(scene.uuid)
    return [...references].sort((a, b) => a.localeCompare(b))
  }

  reloadActive(): Record<string, unknown> {
    return cloneData(this.activeScene.data)
  }

  setLoaded(uuid: string, loaded: boolean): boolean {
    const scene = this.scenes.find(candidate => candidate.uuid === uuid)
    if (!scene) return false
    if (!loaded && scene.uuid === this.activeSceneUuid) {
      const fallback = this.scenes.find(candidate => candidate.uuid !== uuid && candidate.loaded)
      if (!fallback) return false
      this.activeSceneUuid = fallback.uuid
    }
    scene.loaded = loaded
    return true
  }

  importProject(records: unknown[], activeUuid?: unknown): void {
    const scenes = records.flatMap((record, index): SceneDocument[] => {
      if (!record || typeof record !== 'object') return []
      const source = record as Record<string, unknown>
      const { uuid: _uuid, name: _name, loaded: _loaded, authoringSettings: _settings, dependencies: _dependencies, ...data } = source
      const settings = normalizeSceneAuthoringSettings(source.authoringSettings, index)
      return [{
        uuid: normalizeUuid(typeof source.uuid === 'string' ? source.uuid : undefined),
        name: typeof source.name === 'string' && source.name.trim() ? source.name.trim() : `Scene ${index + 1}`,
        loaded: source.loaded !== false,
        data,
        settings,
        dependencies: Array.isArray(source.dependencies) ? [...new Set(source.dependencies.filter((item): item is string => typeof item === 'string').map(item => item.toLowerCase()))].sort((a, b) => a.localeCompare(b)) : [],
        dirty: false,
        externalState: 'clean',
        validationState: 'valid',
        prefabState: 'none',
        visitedAt: new Date().toISOString()
      }]
    })
    this.scenes = scenes.length ? scenes : [this.createDocument('Main Scene')]
    const requested = typeof activeUuid === 'string' ? this.scenes.find(scene => scene.uuid === activeUuid) : undefined
    const active = requested ?? this.scenes.find(scene => scene.loaded) ?? this.scenes[0]
    active.loaded = true
    this.activeSceneUuid = active.uuid
    this.navigationHistory = [active.uuid]
    this.navigationIndex = 0
  }

  serialize(): Array<Record<string, unknown>> {
    return this.scenes.map(scene => ({
      uuid: scene.uuid,
      name: scene.name,
      loaded: scene.loaded,
      authoringSettings: scene.settings,
      dependencies: this.inspectDependencies(scene),
      // The returned object is consumed synchronously by JSON/canonical
      // serialization and is never mutated. captureActive already owns the
      // defensive deep copy, so cloning every large scene again here only
      // multiplies save memory without adding isolation.
      ...scene.data
    }))
  }

  private createDocument(name: string): SceneDocument {
    return {
      uuid: normalizeUuid(undefined), name, loaded: true, data: emptySceneData(),
      settings: defaultSceneAuthoringSettings(this.scenes?.length ?? 0), dependencies: [], dirty: false,
      externalState: 'clean', validationState: 'valid', prefabState: 'none', visitedAt: new Date().toISOString()
    }
  }
}

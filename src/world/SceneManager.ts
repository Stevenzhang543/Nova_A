import { normalizeUuid } from './identity'

export interface SceneDocument {
  uuid: string
  name: string
  loaded: boolean
  data: Record<string, unknown>
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

  constructor() {
    const scene = this.createDocument('Main Scene')
    this.scenes = [scene]
    this.activeSceneUuid = scene.uuid
  }

  get activeScene(): SceneDocument {
    return this.scenes.find(scene => scene.uuid === this.activeSceneUuid) ?? this.scenes[0]
  }

  create(name?: string): SceneDocument {
    const scene = this.createDocument(name?.trim() || `Scene ${this.scenes.length + 1}`)
    this.scenes.push(scene)
    return scene
  }

  captureActive(data: Record<string, unknown>): void {
    this.activeScene.data = cloneData(data)
  }

  setActive(uuid: string): SceneDocument | null {
    const scene = this.scenes.find(candidate => candidate.uuid === uuid)
    if (!scene) return null
    scene.loaded = true
    this.activeSceneUuid = scene.uuid
    return scene
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
      const { uuid: _uuid, name: _name, loaded: _loaded, ...data } = source
      return [{
        uuid: normalizeUuid(typeof source.uuid === 'string' ? source.uuid : undefined),
        name: typeof source.name === 'string' && source.name.trim() ? source.name.trim() : `Scene ${index + 1}`,
        loaded: source.loaded !== false,
        data
      }]
    })
    this.scenes = scenes.length ? scenes : [this.createDocument('Main Scene')]
    const requested = typeof activeUuid === 'string' ? this.scenes.find(scene => scene.uuid === activeUuid) : undefined
    const active = requested ?? this.scenes.find(scene => scene.loaded) ?? this.scenes[0]
    active.loaded = true
    this.activeSceneUuid = active.uuid
  }

  serialize(): Array<Record<string, unknown>> {
    return this.scenes.map(scene => ({
      uuid: scene.uuid,
      name: scene.name,
      loaded: scene.loaded,
      ...cloneData(scene.data)
    }))
  }

  private createDocument(name: string): SceneDocument {
    return { uuid: normalizeUuid(undefined), name, loaded: true, data: emptySceneData() }
  }
}

/** 场景文档管理器：保存已加载场景、活动场景和导航记录，支持继承依赖与项目导入导出。 */
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

/** 通过 JSON 深拷贝可持久化场景数据，同时解开 Vue 响应式代理。 */ function cloneData(data: Record<string, unknown>): Record<string, unknown> {
  // Scene documents contain persistence-safe data only. JSON cloning also unwraps
  // Vue reactive proxies, which the native structured-clone algorithm rejects.
  return JSON.parse(JSON.stringify(data)) as Record<string, unknown>
}

/** 创建含默认图层且实体、连接均为空的新场景数据。 */ function emptySceneData(): Record<string, unknown> {
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

  /** 创建主场景并用它初始化活动标识与导航历史。 */ constructor() {
    const scene = this.createDocument('Main Scene')
    this.scenes = [scene]
    this.activeSceneUuid = scene.uuid
    this.navigationHistory = [scene.uuid]
    this.navigationIndex = 0
  }

  /** 按活动标识查找场景；标识失效时返回首个场景。 */ get activeScene(): SceneDocument {
    return this.scenes.find(/* 比较 scene.uuid 与 this.activeSceneUuid，返回严格相等的判断结果。 */ scene => scene.uuid === this.activeSceneUuid) ?? this.scenes[0]
  }

  /** 规范新场景名称，创建文档并加入管理器后返回。 */ create(name?: string): SceneDocument {
    const scene = this.createDocument(name?.trim() || `Scene ${this.scenes.length + 1}`)
    this.scenes.push(scene)
    return scene
  }

  /** 将 defensiveCopy ? cloneData(data) : data 赋给 this.activeScene.data，不显式返回值。 */ captureActive(data: Record<string, unknown>, defensiveCopy = true): void {
    this.activeScene.data = defensiveCopy ? cloneData(data) : data
  }

  /** 切换到存在的场景并标为已加载，更新时间和最多一百项的导航历史。 */ setActive(uuid: string): SceneDocument | null {
    const scene = this.scenes.find(/* 比较 candidate.uuid 与 uuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === uuid)
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

  /** 在现有导航历史内前进或后退，恢复目标场景并更新时间，不创建新历史项。 */ navigate(offset: -1 | 1): SceneDocument | null {
    const index = this.navigationIndex + offset
    if (index < 0 || index >= this.navigationHistory.length) return null
    const scene = this.scenes.find(/* 比较 candidate.uuid 与 this.navigationHistory[index]，返回严格相等的判断结果。 */ candidate => candidate.uuid === this.navigationHistory[index])
    if (!scene) return null
    this.navigationIndex = index
    scene.loaded = true
    scene.visitedAt = new Date().toISOString()
    this.activeSceneUuid = scene.uuid
    return scene
  }

  /** 将指定场景标记为未保存；目标不存在时不更改其他场景。 */ markDirty(uuid = this.activeSceneUuid): void { const scene = this.scenes.find(/* 比较 candidate.uuid 与 uuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === uuid); if (scene) scene.dirty = true }
  /** 清除所有场景的未保存标记和外部变更状态。 */ markSaved(): void { for (const scene of this.scenes) { scene.dirty = false; scene.externalState = 'clean' } }
  /** 仅更新找到的场景所对应的外部变更状态。 */ setExternalState(uuid: string, state: SceneExternalState): void { const scene = this.scenes.find(/* 比较 candidate.uuid 与 uuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === uuid); if (scene) scene.externalState = state }
  /** 仅更新找到的场景所对应的校验状态。 */ setValidationState(uuid: string, state: SceneValidationState): void { const scene = this.scenes.find(/* 比较 candidate.uuid 与 uuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === uuid); if (scene) scene.validationState = state }
  /** 仅更新找到的场景所对应的预制体来源状态。 */ setPrefabState(uuid: string, state: SceneDocument['prefabState']): void { const scene = this.scenes.find(/* 比较 candidate.uuid 与 uuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === uuid); if (scene) scene.prefabState = state }

  /** 校验来源存在且不形成继承环，更新继承 UUID、依赖和未保存状态。 */ setInheritance(uuid: string, sourceUuid: string | null): boolean {
    const scene = this.scenes.find(/* 比较 candidate.uuid 与 uuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === uuid)
    if (!scene || sourceUuid === uuid || (sourceUuid && !this.scenes.some(/* 比较 candidate.uuid 与 sourceUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === sourceUuid))) return false
    const visited = new Set<string>([uuid])
    let current = sourceUuid ? this.scenes.find(/* 比较 candidate.uuid 与 sourceUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === sourceUuid) : undefined
    while (current) {
      if (visited.has(current.uuid)) return false
      visited.add(current.uuid)
      current = current.settings.inheritanceSourceUuid ? this.scenes.find(/* 比较 candidate.uuid 与 current!.settings.inheritanceSourceUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === current!.settings.inheritanceSourceUuid) : undefined
    }
    scene.settings.inheritanceSourceUuid = sourceUuid
    scene.dependencies = this.inspectDependencies(scene)
    scene.dirty = true
    return true
  }

  /** 递归收集场景及资源 URI 标识，加上继承来源，去掉自身并排序去重。 */ inspectDependencies(scene = this.activeScene): string[] {
    const references = new Set<string>()
    const visit = /** 递归扫描字符串、数组和对象中的场景或资源 URI，将标识统一为小写加入集合。 */ (value: unknown) => {
      if (typeof value === 'string') {
        for (const match of value.matchAll(/(?:scene|asset):\/\/([0-9a-f-]{36})/gi)) references.add(match[1].toLowerCase())
      } else if (Array.isArray(value)) value.forEach(visit)
      else if (value && typeof value === 'object') Object.values(value as Record<string, unknown>).forEach(visit)
    }
    visit(scene.data)
    if (scene.settings.inheritanceSourceUuid) references.add(scene.settings.inheritanceSourceUuid)
    references.delete(scene.uuid)
    return [...references].sort(/* 调用 a.localeCompare(b) 并返回调用结果。 */ (a, b) => a.localeCompare(b))
  }

  /* 调用 cloneData(this.activeScene.data) 并返回调用结果。 */ reloadActive(): Record<string, unknown> {
    return cloneData(this.activeScene.data)
  }

  /** 只接受布尔状态；卸载活动场景前必须找到另一已加载场景作为后备。 */ setLoaded(uuid: string, loaded: boolean): boolean {
    if (typeof loaded !== 'boolean') return false
    const scene = this.scenes.find(/* 比较 candidate.uuid 与 uuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === uuid)
    if (!scene) return false
    if (!loaded && scene.uuid === this.activeSceneUuid) {
      const fallback = this.scenes.find(/* 先计算 candidate.uuid !== uuid；仅当其为真值时求右侧 candidate.loaded，返回短路求值结果。 */ candidate => candidate.uuid !== uuid && candidate.loaded)
      if (!fallback) return false
      this.activeSceneUuid = fallback.uuid
    }
    scene.loaded = loaded
    return true
  }

  /** 筛选并规范输入场景文档，保证至少存在主场景，选择活动场景并重置导航记录。 */ importProject(records: unknown[], activeUuid?: unknown): void {
    const scenes = records.flatMap(/** 忽略非对象记录，为合法记录补场景标识、名称、设置和状态后输出单元素列表。 */ (record, index): SceneDocument[] => {
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
        dependencies: Array.isArray(source.dependencies) ? [...new Set(source.dependencies.filter(/* 比较 typeof item 与 'string'，返回严格相等的判断结果。 */ (item): item is string => typeof item === 'string').map(/* 调用 item.toLowerCase() 并返回调用结果。 */ item => item.toLowerCase()))].sort(/* 调用 a.localeCompare(b) 并返回调用结果。 */ (a, b) => a.localeCompare(b)) : [],
        dirty: false,
        externalState: 'clean',
        validationState: 'valid',
        prefabState: 'none',
        visitedAt: new Date().toISOString()
      }]
    })
    this.scenes = scenes.length ? scenes : [this.createDocument('Main Scene')]
    const requested = typeof activeUuid === 'string' ? this.scenes.find(/* 比较 scene.uuid 与 activeUuid，返回严格相等的判断结果。 */ scene => scene.uuid === activeUuid) : undefined
    const active = requested ?? this.scenes.find(/* 返回 scene.loaded 的当前值。 */ scene => scene.loaded) ?? this.scenes[0]
    active.loaded = true
    this.activeSceneUuid = active.uuid
    this.navigationHistory = [active.uuid]
    this.navigationIndex = 0
  }

  /** 生成每个场景的持久化记录并刷新依赖；复用已由场景管理器持有的数据，避免重复深拷贝。 */ serialize(): Array<Record<string, unknown>> {
    return this.scenes.map(/** 输出场景身份、加载状态、设置及实时依赖，并展开持久化场景数据。 */ scene => ({
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

  /** 创建具有独立 UUID、默认编辑设置和清洁状态的已加载场景文档。 */ private createDocument(name: string): SceneDocument {
    return {
      uuid: normalizeUuid(undefined), name, loaded: true, data: emptySceneData(),
      settings: defaultSceneAuthoringSettings(this.scenes?.length ?? 0), dependencies: [], dirty: false,
      externalState: 'clean', validationState: 'valid', prefabState: 'none', visitedAt: new Date().toISOString()
    }
  }
}

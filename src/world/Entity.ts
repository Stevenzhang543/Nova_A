/** 场景实体基类：以稳定 UUID 管理组件，并提供编辑器及物理运行时使用的兼容属性访问。 */
import { Transform } from './Transform'
import type { Vec2 } from './types'
import { normalizeUuid } from './identity'
import {
  Collider2D,
  Camera2D,
  RigidBody2D,
  ShapeRenderer2D,
  SpriteRenderer2D,
  Script2D,
  TextRenderer2D,
  type Component2D,
  type ComponentKind,
  type EntityComponent
} from './components'
import type { EntityOwnership, RuntimePersistencePolicy } from '../editor/sceneAuthoring'

export interface PrefabInstanceLayer {
  asset: string
  instanceUuid: string
  sourceUuid: string
  overrides: Record<string, unknown>
}

export interface SceneInstanceLayer {
  asset: string
  instanceUuid: string
  sourceUuid: string
}

export type AuthoringObjectKind =
  | 'Empty' | 'Sprite' | 'AnimatedSprite' | 'WorldText' | 'Polygon' | 'Line' | 'Path' | 'Camera'
  | 'CanvasLayer' | 'ParallaxLayer' | 'Rectangle' | 'Circle' | 'Triangle' | 'Collider'
  | 'ScriptHost' | 'AudioEmitter' | 'Light' | 'NavigationRegion' | 'PackageObject'

export interface AuthoringMetadata2D {
  kind: AuthoringObjectKind
  origin: Vec2
  visible: boolean
  zOrder: number
  renderLayer: number
  sortMode: 'LayerThenOrder' | 'YSort'
  canvasLayer: { screenSpace: boolean; followCamera: boolean }
  parallax: { motionScale: Vec2; repeat: Vec2; mirror: boolean; depth: number }
  path: { points: Vec2[]; tangents: Array<{ incoming: Vec2; outgoing: Vec2 }>; closed: boolean; smoothing: number; asset: string | null; follower: { targetUuid: string | null; progress: number; speed: number; orient: boolean } }
}

/** 按基础形状创建独立的编辑元数据，初始化图层、视差、路径和跟随设置。 */ export function defaultAuthoringMetadata(entityType: 'Box' | 'Circle' | 'Triangle'): AuthoringMetadata2D {
  return {
    kind: entityType === 'Circle' ? 'Circle' : entityType === 'Triangle' ? 'Triangle' : 'Rectangle',
    origin: { x: 0, y: 0 }, visible: true, zOrder: 0, renderLayer: 1, sortMode: 'LayerThenOrder',
    canvasLayer: { screenSpace: false, followCamera: true },
    parallax: { motionScale: { x: .5, y: .5 }, repeat: { x: 0, y: 0 }, mirror: false, depth: 0 },
    path: { points: [], tangents: [], closed: false, smoothing: .5, asset: null, follower: { targetUuid: null, progress: 0, speed: 0, orient: true } }
  }
}

/** A scene identity with capabilities supplied entirely by components. */
export abstract class Entity {
  readonly id: number
  readonly uuid: string
  readonly entityType: 'Box' | 'Circle' | 'Triangle'
  name: string
  enabled = true
  editorVisible = true
  editorLocked = false
  tags: string[] = []
  groups: string[] = []
  namedLayer = 'World'
  ownerUuid: string | null = null
  ownership: EntityOwnership = 'Scene'
  editorOnly = false
  runtimePersistence: RuntimePersistencePolicy = 'Scene'
  persistentAcrossScenes = false
  objectBlueprintAsset: string | null = null
  prefabAsset: string | null = null
  prefabInstanceUuid: string | null = null
  prefabSourceUuid: string | null = null
  prefabOverrides: Record<string, unknown> = {}
  prefabLayers: PrefabInstanceLayer[] = []
  sceneLayers: SceneInstanceLayer[] = []
  authoring: AuthoringMetadata2D
  readonly componentMap = new Map<ComponentKind, Component2D>()

  /** 保存实体标识与形状类别，初始化编辑元数据，并安装不可移除的变换组件。 */ constructor(id: number, entityType: 'Box' | 'Circle' | 'Triangle', uuid?: string) {
    this.id = id
    this.uuid = normalizeUuid(uuid)
    this.entityType = entityType
    this.name = entityType
    this.authoring = defaultAuthoringMetadata(entityType)
    this.addComponent(new Transform())
  }

  /** 枚举组件映射并过滤软删除记录，返回当前有效组件数组。 */ get components(): Component2D[] {
    return [...this.componentMap.values()].filter(/* 返回 component.removed 的逻辑取反结果。 */ component => !component.removed)
  }

  /** 同类型组件已存在时重新启用原对象以保留身份；否则登记新组件。 */ addComponent<T extends Component2D>(component: T): T {
    const existing = this.componentMap.get(component.kind)
    if (existing) {
      existing.removed = false
      existing.enabled = true
      return existing as T
    }
    this.componentMap.set(component.kind, component)
    return component
  }

  /** 按组件类型查找；默认排除已移除记录，调用者可显式读取历史记录。 */ getComponent<T extends Component2D>(kind: ComponentKind, includeRemoved = false): T | null {
    const component = this.componentMap.get(kind) as T | undefined
    return component && (includeRemoved || !component.removed) ? component : null
  }

  /** 优先返回仍有效的任一种碰撞器；仅当允许且没有活动碰撞器时查找已移除记录。 */ getCollider(includeRemoved = false): Collider2D | null {
    const kinds = ['BoxCollider2D', 'EllipseCollider2D', 'PolygonCollider2D'] as const
    // Removed records preserve authoring history; they must not shadow a replacement.
    for (const kind of kinds) {
      const collider = this.getComponent<Collider2D>(kind)
      if (collider) return collider
    }
    if (includeRemoved) for (const kind of kinds) {
      const collider = this.getComponent<Collider2D>(kind, true)
      if (collider) return collider
    }
    return null
  }

  /* 比较 this.getComponent(kind) 与 null，返回严格不等的判断结果。 */ hasComponent(kind: ComponentKind): boolean {
    return this.getComponent(kind) !== null
  }

  /** 拒绝移除变换组件，将其他活动组件软删除并禁用以保留编辑历史。 */ removeComponent(kind: ComponentKind): boolean {
    if (kind === 'Transform2D') return false
    const component = this.componentMap.get(kind)
    if (!component || component.removed) return false
    component.removed = true
    component.enabled = false
    return true
  }

  /** 返回变换组件，包括保留的历史记录；实体初始化保证其存在。 */ get transform(): Transform {
    return this.getComponent<Transform>('Transform2D', true)!
  }

  /** 返回基础形状渲染组件，包括保留的历史记录，供兼容属性访问。 */ get renderer(): ShapeRenderer2D {
    return this.getComponent<ShapeRenderer2D>('ShapeRenderer2D', true)!
  }

  /** 返回基础刚体组件，包括保留的历史记录，供兼容物理属性访问。 */ get rigidBody(): RigidBody2D {
    return this.getComponent<RigidBody2D>('RigidBody2D', true)!
  }

  /* 调用 this.getComponent<SpriteRenderer2D>('SpriteRenderer2D') 并返回调用结果。 */ get spriteRenderer(): SpriteRenderer2D | null {
    return this.getComponent<SpriteRenderer2D>('SpriteRenderer2D')
  }

  /* 调用 this.getComponent<TextRenderer2D>('TextRenderer2D') 并返回调用结果。 */ get textRenderer(): TextRenderer2D | null {
    return this.getComponent<TextRenderer2D>('TextRenderer2D')
  }

  /* 调用 this.getComponent<Camera2D>('Camera2D') 并返回调用结果。 */ get camera2D(): Camera2D | null {
    return this.getComponent<Camera2D>('Camera2D')
  }

  /* 调用 this.getComponent<Script2D>('Script2D') 并返回调用结果。 */ get script2D(): Script2D | null {
    return this.getComponent<Script2D>('Script2D')
  }

  /** 返回当前或历史碰撞器记录，供兼容材质及形状属性访问。 */ get collider(): Collider2D {
    return this.getCollider(true)!
  }

  /* 返回 this.transform.parentUuid 的当前值。 */ get parentUuid(): string | null { return this.transform.parentUuid }
  /** 将 value 赋给 this.transform.parentUuid，不显式返回值。 */ set parentUuid(value: string | null) { this.transform.parentUuid = value }
  /* 返回 this.entityType 的当前值。 */ get shapeType(): string { return this.entityType }
  /* 当 this.spriteRenderer?.sortingLayer ?? this.textRenderer?.sortingLayer 为 null 或 undefined 时返回 this.renderer.sortingLayer，否则保留左侧值。 */ get layer(): number {
    return this.spriteRenderer?.sortingLayer ?? this.textRenderer?.sortingLayer ?? this.renderer.sortingLayer
  }
  /** 拒绝非有限层号，并同步形状、精灵及文字渲染组件的排序层。 */ set layer(value: number) {
    if (!Number.isFinite(value)) throw new RangeError('layer must be finite');
    this.renderer.sortingLayer = value
    const sprite = this.getComponent<SpriteRenderer2D>('SpriteRenderer2D', true)
    const text = this.getComponent<TextRenderer2D>('TextRenderer2D', true)
    if (sprite) sprite.sortingLayer = value
    if (text) text.sortingLayer = value
  }
  /* 返回 this.renderer.color 的当前值。 */ get color() { return this.renderer.color }
  /** 确认 RGB 三个通道均为有限数值后替换形状渲染颜色。 */ set color(value: { r: number; g: number; b: number }) { if (!value || !Number.isFinite(value.r) || !Number.isFinite(value.g) || !Number.isFinite(value.b)) throw new RangeError('color must contain finite channels'); this.renderer.color = value }
  /* 返回 this.renderer.opacity 的当前值。 */ get transparency(): number { return this.renderer.opacity }
  /** 拒绝非有限数值，再将 transparency 写入对应的渲染、刚体或碰撞材质属性。 */ set transparency(value: number) {
    if (!Number.isFinite(value)) throw new RangeError('transparency must be finite'); this.renderer.opacity = value }
  /* 返回 this.renderer.texture 的当前值。 */ get texture(): string | null { return this.renderer.texture }
  /** 将 value 赋给 this.renderer.texture，不显式返回值。 */ set texture(value: string | null) { this.renderer.texture = value }
  /* 返回 this.renderer.textureImage 的当前值。 */ get textureImage(): HTMLImageElement | undefined { return this.renderer.textureImage }
  /** 将 value 赋给 this.renderer.textureImage，不显式返回值。 */ set textureImage(value: HTMLImageElement | undefined) { this.renderer.textureImage = value }
  /* 返回 this.rigidBody.velocity 的当前值。 */ get velocity(): Vec2 { return this.rigidBody.velocity }
  /** 确认向量两个坐标均有限后写入刚体速度。 */ set velocity(value: Vec2) { if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) throw new RangeError('velocity must contain finite coordinates'); this.rigidBody.velocity = value }
  /* 返回 this.rigidBody.angularVelocity 的当前值。 */ get angularVelocity(): number { return this.rigidBody.angularVelocity }
  /** 拒绝非有限数值，再将 angularVelocity 写入对应的渲染、刚体或碰撞材质属性。 */ set angularVelocity(value: number) {
    if (!Number.isFinite(value)) throw new RangeError('angularVelocity must be finite'); this.rigidBody.angularVelocity = value }
  /* 返回 this.rigidBody.linearDamping 的当前值。 */ get linearDamping(): number { return this.rigidBody.linearDamping }
  /** 拒绝非有限数值，再将 linearDamping 写入对应的渲染、刚体或碰撞材质属性。 */ set linearDamping(value: number) {
    if (!Number.isFinite(value)) throw new RangeError('linearDamping must be finite'); this.rigidBody.linearDamping = value }
  /* 返回 this.rigidBody.angularDamping 的当前值。 */ get angularDamping(): number { return this.rigidBody.angularDamping }
  /** 拒绝非有限数值，再将 angularDamping 写入对应的渲染、刚体或碰撞材质属性。 */ set angularDamping(value: number) {
    if (!Number.isFinite(value)) throw new RangeError('angularDamping must be finite'); this.rigidBody.angularDamping = value }
  /* 返回 this.rigidBody.density 的当前值。 */ get density(): number { return this.rigidBody.density }
  /** 拒绝非有限数值，再将 density 写入对应的渲染、刚体或碰撞材质属性。 */ set density(value: number) {
    if (!Number.isFinite(value)) throw new RangeError('density must be finite'); this.rigidBody.density = value }
  /* 返回 this.rigidBody.mass 的当前值。 */ get mass(): number { return this.rigidBody.mass }
  /** 拒绝非有限数值，再将 mass 写入对应的渲染、刚体或碰撞材质属性。 */ set mass(value: number) {
    if (!Number.isFinite(value)) throw new RangeError('mass must be finite'); this.rigidBody.mass = value }
  /* 返回 this.rigidBody.autoInertia 的当前值。 */ get autoInertia(): boolean { return this.rigidBody.autoInertia }
  /** 仅接受布尔值并切换刚体自动惯性开关。 */ set autoInertia(value: boolean) { if (typeof value !== 'boolean') throw new TypeError('autoInertia must be boolean'); this.rigidBody.autoInertia = value }
  /* 返回 this.rigidBody.inertia 的当前值。 */ get inertia(): number { return this.rigidBody.inertia }
  /** 拒绝非有限数值，再将 inertia 写入对应的渲染、刚体或碰撞材质属性。 */ set inertia(value: number) {
    if (!Number.isFinite(value)) throw new RangeError('inertia must be finite'); this.rigidBody.inertia = value }
  /* 返回 this.rigidBody.gravityScale 的当前值。 */ get gravityScale(): number { return this.rigidBody.gravityScale }
  /** 拒绝非有限数值，再将 gravityScale 写入对应的渲染、刚体或碰撞材质属性。 */ set gravityScale(value: number) {
    if (!Number.isFinite(value)) throw new RangeError('gravityScale must be finite'); this.rigidBody.gravityScale = value }
  /* 返回 this.rigidBody.force 的当前值。 */ get force(): Vec2 { return this.rigidBody.force }
  /** 确认向量两个坐标均有限后写入刚体作用力。 */ set force(value: Vec2) { if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) throw new RangeError('force must contain finite coordinates'); this.rigidBody.force = value }
  /* 返回 this.rigidBody.torque 的当前值。 */ get torque(): number { return this.rigidBody.torque }
  /** 拒绝非有限数值，再将 torque 写入对应的渲染、刚体或碰撞材质属性。 */ set torque(value: number) {
    if (!Number.isFinite(value)) throw new RangeError('torque must be finite'); this.rigidBody.torque = value }
  /* 返回 this.rigidBody.localGravity 的当前值。 */ get gravity(): number { return this.rigidBody.localGravity }
  /** 拒绝非有限数值，再将 gravity 写入对应的渲染、刚体或碰撞材质属性。 */ set gravity(value: number) {
    if (!Number.isFinite(value)) throw new RangeError('gravity must be finite'); this.rigidBody.localGravity = value }
  /* 返回 this.rigidBody.acceleration 的当前值。 */ get acceleration(): Vec2 { return this.rigidBody.acceleration }
  /** 确认向量两个坐标均有限后写入刚体加速度。 */ set acceleration(value: Vec2) { if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) throw new RangeError('acceleration must contain finite coordinates'); this.rigidBody.acceleration = value }
  /* 返回 this.collider.material.restitution 的当前值。 */ get restitution(): number { return this.collider.material.restitution }
  /** 拒绝非有限数值，再将 restitution 写入对应的渲染、刚体或碰撞材质属性。 */ set restitution(value: number) {
    if (!Number.isFinite(value)) throw new RangeError('restitution must be finite'); this.collider.material.restitution = value }
  /* 返回 this.collider.material.restitutionThreshold 的当前值。 */ get restitutionThreshold(): number { return this.collider.material.restitutionThreshold }
  /** 拒绝非有限数值，再将 restitutionThreshold 写入对应的渲染、刚体或碰撞材质属性。 */ set restitutionThreshold(value: number) {
    if (!Number.isFinite(value)) throw new RangeError('restitutionThreshold must be finite'); this.collider.material.restitutionThreshold = value }
  /* 返回 this.collider.material.staticFriction 的当前值。 */ get staticFriction(): number { return this.collider.material.staticFriction }
  /** 拒绝非有限数值，再将 staticFriction 写入对应的渲染、刚体或碰撞材质属性。 */ set staticFriction(value: number) {
    if (!Number.isFinite(value)) throw new RangeError('staticFriction must be finite'); this.collider.material.staticFriction = value }
  /* 返回 this.collider.material.dynamicFriction 的当前值。 */ get dynamicFriction(): number { return this.collider.material.dynamicFriction }
  /** 拒绝非有限数值，再将 dynamicFriction 写入对应的渲染、刚体或碰撞材质属性。 */ set dynamicFriction(value: number) {
    if (!Number.isFinite(value)) throw new RangeError('dynamicFriction must be finite'); this.collider.material.dynamicFriction = value }
  /* 返回 this.collider.sensor 的当前值。 */ get isSensor(): boolean { return this.collider.sensor }
  /** 仅接受布尔值并切换碰撞器传感器开关。 */ set isSensor(value: boolean) { if (typeof value !== 'boolean') throw new TypeError('isSensor must be boolean'); this.collider.sensor = value }
  /* 比较 this.rigidBody.bodyType 与 'Static'，返回严格相等的判断结果。 */ get isStatic(): boolean { return this.rigidBody.bodyType === 'Static' }
  /** 仅接受布尔值；启用时设为静态，关闭时仅将当前静态刚体恢复为动态。 */ set isStatic(value: boolean) { if (typeof value !== 'boolean') throw new TypeError('isStatic must be boolean'); if (value) this.rigidBody.bodyType = 'Static'; else if (this.rigidBody.bodyType === 'Static') this.rigidBody.bodyType = 'Dynamic' }
  /* 比较 this.rigidBody.bodyType 与 'Kinematic'，返回严格相等的判断结果。 */ get isKinematic(): boolean { return this.rigidBody.bodyType === 'Kinematic' }
  /** 仅接受布尔值；启用时设为运动学模式，关闭时仅将当前运动学刚体恢复为动态。 */ set isKinematic(value: boolean) { if (typeof value !== 'boolean') throw new TypeError('isKinematic must be boolean'); if (value) this.rigidBody.bodyType = 'Kinematic'; else if (this.rigidBody.bodyType === 'Kinematic') this.rigidBody.bodyType = 'Dynamic' }
  /* 返回 this.rigidBody.contactCount 的当前值。 */ get contactCount(): number { return this.rigidBody.contactCount }
  /** 拒绝非有限数值，再将 contactCount 写入对应的渲染、刚体或碰撞材质属性。 */ set contactCount(value: number) {
    if (!Number.isFinite(value)) throw new RangeError('contactCount must be finite'); this.rigidBody.contactCount = value }
  /* 返回 this.rigidBody.contactNormal 的当前值。 */ get contactNormal(): Vec2 { return this.rigidBody.contactNormal }
  /** 确认向量两个坐标均有限后写入刚体接触法线。 */ set contactNormal(value: Vec2) { if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) throw new RangeError('contactNormal must contain finite coordinates'); this.rigidBody.contactNormal = value }
  /* 返回 this.rigidBody.penetrationDepth 的当前值。 */ get penetrationDepth(): number { return this.rigidBody.penetrationDepth }
  /** 拒绝非有限数值，再将 penetrationDepth 写入对应的渲染、刚体或碰撞材质属性。 */ set penetrationDepth(value: number) {
    if (!Number.isFinite(value)) throw new RangeError('penetrationDepth must be finite'); this.rigidBody.penetrationDepth = value }

  /** 给基础实体安装形状渲染、刚体及指定碰撞组件，复用同类型已有组件。 */ installStandardComponents(renderer: ShapeRenderer2D, collider: Collider2D): void {
    this.addComponent(renderer as EntityComponent)
    this.addComponent(new RigidBody2D())
    this.addComponent(collider as EntityComponent)
  }
}

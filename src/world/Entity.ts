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
  persistentAcrossScenes = false
  prefabAsset: string | null = null
  prefabInstanceUuid: string | null = null
  prefabSourceUuid: string | null = null
  prefabOverrides: Record<string, unknown> = {}
  prefabLayers: PrefabInstanceLayer[] = []
  sceneLayers: SceneInstanceLayer[] = []
  readonly componentMap = new Map<ComponentKind, Component2D>()

  constructor(id: number, entityType: 'Box' | 'Circle' | 'Triangle', uuid?: string) {
    this.id = id
    this.uuid = normalizeUuid(uuid)
    this.entityType = entityType
    this.name = entityType
    this.addComponent(new Transform())
  }

  get components(): Component2D[] {
    return [...this.componentMap.values()].filter(component => !component.removed)
  }

  addComponent<T extends Component2D>(component: T): T {
    const existing = this.componentMap.get(component.kind)
    if (existing) {
      existing.removed = false
      existing.enabled = true
      return existing as T
    }
    this.componentMap.set(component.kind, component)
    return component
  }

  getComponent<T extends Component2D>(kind: ComponentKind, includeRemoved = false): T | null {
    const component = this.componentMap.get(kind) as T | undefined
    return component && (includeRemoved || !component.removed) ? component : null
  }

  getCollider(includeRemoved = false): Collider2D | null {
    for (const kind of ['BoxCollider2D', 'EllipseCollider2D', 'PolygonCollider2D'] as const) {
      const collider = this.getComponent<Collider2D>(kind, includeRemoved)
      if (collider) return collider
    }
    return null
  }

  hasComponent(kind: ComponentKind): boolean {
    return this.getComponent(kind) !== null
  }

  removeComponent(kind: ComponentKind): boolean {
    if (kind === 'Transform2D') return false
    const component = this.componentMap.get(kind)
    if (!component || component.removed) return false
    component.removed = true
    component.enabled = false
    return true
  }

  get transform(): Transform {
    return this.getComponent<Transform>('Transform2D', true)!
  }

  get renderer(): ShapeRenderer2D {
    return this.getComponent<ShapeRenderer2D>('ShapeRenderer2D', true)!
  }

  get rigidBody(): RigidBody2D {
    return this.getComponent<RigidBody2D>('RigidBody2D', true)!
  }

  get spriteRenderer(): SpriteRenderer2D | null {
    return this.getComponent<SpriteRenderer2D>('SpriteRenderer2D')
  }

  get textRenderer(): TextRenderer2D | null {
    return this.getComponent<TextRenderer2D>('TextRenderer2D')
  }

  get camera2D(): Camera2D | null {
    return this.getComponent<Camera2D>('Camera2D')
  }

  get script2D(): Script2D | null {
    return this.getComponent<Script2D>('Script2D')
  }

  get collider(): Collider2D {
    return this.getCollider(true)!
  }

  get parentUuid(): string | null { return this.transform.parentUuid }
  set parentUuid(value: string | null) { this.transform.parentUuid = value }
  get shapeType(): string { return this.entityType }
  get layer(): number {
    return this.spriteRenderer?.sortingLayer ?? this.textRenderer?.sortingLayer ?? this.renderer.sortingLayer
  }
  set layer(value: number) {
    this.renderer.sortingLayer = value
    const sprite = this.getComponent<SpriteRenderer2D>('SpriteRenderer2D', true)
    const text = this.getComponent<TextRenderer2D>('TextRenderer2D', true)
    if (sprite) sprite.sortingLayer = value
    if (text) text.sortingLayer = value
  }
  get color() { return this.renderer.color }
  set color(value: { r: number; g: number; b: number }) { this.renderer.color = value }
  get transparency(): number { return this.renderer.opacity }
  set transparency(value: number) { this.renderer.opacity = value }
  get texture(): string | null { return this.renderer.texture }
  set texture(value: string | null) { this.renderer.texture = value }
  get textureImage(): HTMLImageElement | undefined { return this.renderer.textureImage }
  set textureImage(value: HTMLImageElement | undefined) { this.renderer.textureImage = value }
  get velocity(): Vec2 { return this.rigidBody.velocity }
  set velocity(value: Vec2) { this.rigidBody.velocity = value }
  get angularVelocity(): number { return this.rigidBody.angularVelocity }
  set angularVelocity(value: number) { this.rigidBody.angularVelocity = value }
  get linearDamping(): number { return this.rigidBody.linearDamping }
  set linearDamping(value: number) { this.rigidBody.linearDamping = value }
  get angularDamping(): number { return this.rigidBody.angularDamping }
  set angularDamping(value: number) { this.rigidBody.angularDamping = value }
  get density(): number { return this.rigidBody.density }
  set density(value: number) { this.rigidBody.density = value }
  get mass(): number { return this.rigidBody.mass }
  set mass(value: number) { this.rigidBody.mass = value }
  get autoInertia(): boolean { return this.rigidBody.autoInertia }
  set autoInertia(value: boolean) { this.rigidBody.autoInertia = value }
  get inertia(): number { return this.rigidBody.inertia }
  set inertia(value: number) { this.rigidBody.inertia = value }
  get gravityScale(): number { return this.rigidBody.gravityScale }
  set gravityScale(value: number) { this.rigidBody.gravityScale = value }
  get force(): Vec2 { return this.rigidBody.force }
  set force(value: Vec2) { this.rigidBody.force = value }
  get torque(): number { return this.rigidBody.torque }
  set torque(value: number) { this.rigidBody.torque = value }
  get gravity(): number { return this.rigidBody.localGravity }
  set gravity(value: number) { this.rigidBody.localGravity = value }
  get acceleration(): Vec2 { return this.rigidBody.acceleration }
  set acceleration(value: Vec2) { this.rigidBody.acceleration = value }
  get restitution(): number { return this.collider.material.restitution }
  set restitution(value: number) { this.collider.material.restitution = value }
  get restitutionThreshold(): number { return this.collider.material.restitutionThreshold }
  set restitutionThreshold(value: number) { this.collider.material.restitutionThreshold = value }
  get staticFriction(): number { return this.collider.material.staticFriction }
  set staticFriction(value: number) { this.collider.material.staticFriction = value }
  get dynamicFriction(): number { return this.collider.material.dynamicFriction }
  set dynamicFriction(value: number) { this.collider.material.dynamicFriction = value }
  get isSensor(): boolean { return this.collider.sensor }
  set isSensor(value: boolean) { this.collider.sensor = value }
  get isStatic(): boolean { return this.rigidBody.bodyType === 'Static' }
  set isStatic(value: boolean) { if (value) this.rigidBody.bodyType = 'Static'; else if (this.rigidBody.bodyType === 'Static') this.rigidBody.bodyType = 'Dynamic' }
  get isKinematic(): boolean { return this.rigidBody.bodyType === 'Kinematic' }
  set isKinematic(value: boolean) { if (value) this.rigidBody.bodyType = 'Kinematic'; else if (this.rigidBody.bodyType === 'Kinematic') this.rigidBody.bodyType = 'Dynamic' }
  get contactCount(): number { return this.rigidBody.contactCount }
  set contactCount(value: number) { this.rigidBody.contactCount = value }
  get contactNormal(): Vec2 { return this.rigidBody.contactNormal }
  set contactNormal(value: Vec2) { this.rigidBody.contactNormal = value }
  get penetrationDepth(): number { return this.rigidBody.penetrationDepth }
  set penetrationDepth(value: number) { this.rigidBody.penetrationDepth = value }

  installStandardComponents(renderer: ShapeRenderer2D, collider: Collider2D): void {
    this.addComponent(renderer as EntityComponent)
    this.addComponent(new RigidBody2D())
    this.addComponent(collider as EntityComponent)
  }
}

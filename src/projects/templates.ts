import { defaultAudioSettings } from '../runtime/audio'
import { defaultInputMap } from '../runtime/input'
import { defaultCollisionMatrix } from '../world/World'
import { newProjectMetadata } from './projectSession'
import {
  NOVA_ENGINE_VERSION, NOVA_PROJECT_FORMAT, NOVA_PROJECT_FORMAT_MAJOR,
  NOVA_PROJECT_SCHEMA_VERSION, projectCompatibility
} from './projectFormat'

export type ProjectTemplateId = 'empty' | 'platformer' | 'top-down' | 'physics-sandbox'

export interface ProjectTemplateDescriptor {
  id: ProjectTemplateId
  name: string
  description: string
  features: string[]
}

export const PROJECT_TEMPLATES: readonly ProjectTemplateDescriptor[] = [
  { id: 'empty', name: 'Empty 2D', description: 'A clean scene with a configured Camera2D.', features: ['Camera2D', 'Input map', 'Build settings'] },
  { id: 'platformer', name: 'Platformer', description: 'A playable foundation with a player, platforms, UI, animation, audio, and scripts.', features: ['Physics', 'TileMap2D', 'Animator', 'Audio', 'UI'] },
  { id: 'top-down', name: 'Top-down', description: 'A two-scene action template with triggers, enemies, prefabs, particles, and save data.', features: ['Prefabs', 'Scene switch', 'Triggers', 'Particles', 'Save API'] },
  { id: 'physics-sandbox', name: 'Physics Sandbox', description: 'A playground for materials, ropes, joints, and collision behavior.', features: ['Rigid bodies', 'Materials', 'Rope2D', 'Joints', 'Debugger'] }
] as const

type JsonRecord = Record<string, unknown>

function stableUuid(seed: string): string {
  let first = 0x811c9dc5
  let second = 0x9e3779b9
  for (const character of seed) {
    first = Math.imul(first ^ character.charCodeAt(0), 0x01000193) >>> 0
    second = Math.imul(second ^ character.charCodeAt(0), 0x85ebca6b) >>> 0
  }
  const half = `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
  const hex = `${half}${half}`
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

function component(seed: string, kind: string, data: JsonRecord = {}): JsonRecord {
  return { uuid: stableUuid(`${seed}:${kind}`), kind, enabled: true, removed: false, data }
}

function entity(seed: string, name: string, position: [number, number], components: JsonRecord[], entityType = 'Box'): JsonRecord {
  return {
    uuid: stableUuid(`entity:${seed}`), name, enabled: true, editorVisible: true, editorLocked: false,
    tags: [], persistentAcrossScenes: false, prefabAsset: null, prefabInstanceUuid: null,
    prefabSourceUuid: null, prefabOverrides: {}, entityType,
    components: [component(seed, 'Transform2D', { parentUuid: null, position: { x: position[0], y: position[1] }, rotation: 0, scale: { x: 1, y: 1 } }), ...components]
  }
}

function shape(seed: string, name: string, position: [number, number], size: [number, number], options: {
  type?: 'Box' | 'Circle' | 'Triangle'; color?: [number, number, number]; body?: 'Dynamic' | 'Kinematic' | 'Static';
  sensor?: boolean; restitution?: number; friction?: number; scriptAsset?: string; extra?: JsonRecord[]
} = {}): JsonRecord {
  const type = options.type ?? 'Box'
  const rendererShape = type === 'Circle' ? 'Ellipse' : type === 'Triangle' ? 'Polygon' : 'Rectangle'
  const colliderKind = type === 'Circle' ? 'EllipseCollider2D' : type === 'Triangle' ? 'PolygonCollider2D' : 'BoxCollider2D'
  const vertices = type === 'Triangle'
    ? [{ x: 0, y: -size[1] / 2 }, { x: size[0] / 2, y: size[1] / 2 }, { x: -size[0] / 2, y: size[1] / 2 }]
    : type === 'Box'
      ? [{ x: -size[0] / 2, y: -size[1] / 2 }, { x: size[0] / 2, y: -size[1] / 2 }, { x: size[0] / 2, y: size[1] / 2 }, { x: -size[0] / 2, y: size[1] / 2 }]
      : undefined
  const color = options.color ?? [105, 165, 255]
  const parts: JsonRecord[] = [
    component(seed, 'ShapeRenderer2D', { shape: rendererShape, vertices, radiusX: size[0] / 2, radiusY: size[1] / 2, color: { r: color[0], g: color[1], b: color[2] }, opacity: 100, strokeColor: { r: 220, g: 232, b: 255 }, strokeOpacity: 90, strokeWidth: .04, sortingLayer: 1, orderInLayer: 0, material: 'Default', filterMode: 'Linear' }),
    component(seed, 'RigidBody2D', { bodyType: options.body ?? 'Dynamic', massMode: 'Automatic', density: 1, mass: Math.max(1, size[0] * size[1]), autoInertia: true, gravityScale: 1, velocity: { x: 0, y: 0 }, continuousCollision: 'Discrete', sleepingAllowed: true }),
    component(seed, colliderKind, { size: { x: size[0], y: size[1] }, radiusX: size[0] / 2, radiusY: size[1] / 2, vertices, sensor: options.sensor === true, physicsLayer: 0, collisionMask: 0xffffffff, oneWay: false, material: { restitution: options.restitution ?? 0, restitutionThreshold: 1, staticFriction: options.friction ?? .55, dynamicFriction: options.friction ?? .4 } })
  ]
  if (options.scriptAsset) parts.push(component(seed, 'Script2D', { scriptAsset: `asset://${options.scriptAsset}`, properties: {} }))
  parts.push(...(options.extra ?? []))
  return entity(seed, name, position, parts, type)
}

function camera(seed = 'camera'): JsonRecord {
  return entity(seed, 'Main Camera', [0, 0], [component(seed, 'Camera2D', { active: true, orthographicSize: 10, zoom: 1, backgroundColor: { r: 20, g: 25, b: 34 }, pixelPerfect: false, viewport: { x: 0, y: 0, width: 1, height: 1 }, nearSortingLayer: -1000, farSortingLayer: 1000 })])
}

function canvasWithLabel(seed: string, text: string): JsonRecord[] {
  const canvasUuid = stableUuid(`entity:${seed}:canvas`)
  const canvas = entity(`${seed}:canvas`, 'HUD Canvas', [0, 0], [
    component(`${seed}:canvas`, 'RectTransform', { parentUuid: null, anchorPreset: 'stretch', position: { x: 0, y: 0 }, size: { x: 1920, y: 1080 } }),
    component(`${seed}:canvas`, 'Canvas', { referenceSize: { x: 1920, y: 1080 }, scaleWithScreen: true, sortingOrder: 100 })
  ])
  const label = entity(`${seed}:label`, 'Tutorial Hint', [0, 0], [
    component(`${seed}:label`, 'RectTransform', { parentUuid: canvasUuid, anchorPreset: 'top', position: { x: 0, y: 48 }, size: { x: 900, y: 72 } }),
    component(`${seed}:label`, 'Text', { text, fontSize: 26, fontWeight: 650, align: 'center', color: { r: 239, g: 245, b: 255 }, opacity: 100 })
  ])
  ;(label.components as JsonRecord[])[0] = component(`${seed}:label`, 'Transform2D', { parentUuid: canvasUuid, position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } })
  return [canvas, label]
}

function textAsset(seed: string, name: string, assetType: 'script' | 'animation' | 'controller' | 'prefab', path: string, source: string, mimeType: string): JsonRecord {
  return {
    uuid: stableUuid(`asset:${seed}`), name, path, assetType,
    mimeType, byteLength: source.length, source, sourceModified: 0, importedAt: 0,
    width: 0, height: 0, duration: 0, fontFamily: '',
    settings: { filterMode: 'Linear', compression: 'Lossless', pixelsPerUnit: 100, spriteRegion: null, pivot: { x: .5, y: .5 }, atlas: false }
  }
}

function scriptAsset(seed: string, name: string, source: string): JsonRecord {
  return { ...textAsset(seed, `${name}.rhai`, 'script', `Assets/Scripts/${name}.rhai`, source, 'text/x-rhai'), script: { version: 1, breakpoints: [], tests: [], packageDependencies: [] } }
}

function imageAsset(seed: string, name: string, color: string): JsonRecord {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="${color}"/><path d="M36 68l18 18 40-44" fill="none" stroke="#f8fbff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  return {
    ...textAsset(seed, `${name}.svg`, 'prefab', `Assets/Sprites/${name}.svg`, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, 'image/svg+xml'),
    assetType: 'image', width: 128, height: 128,
    settings: { filterMode: 'Linear', compression: 'Lossless', pixelsPerUnit: 100, spriteRegion: null, pivot: { x: .5, y: .5 }, atlas: true }
  }
}

function beepAsset(seed: string, name: string): JsonRecord {
  const sampleRate = 8_000
  const samples = 1_200
  const bytes = new Uint8Array(44 + samples)
  const view = new DataView(bytes.buffer)
  const word = (offset: number, value: string) => { for (let index = 0; index < value.length; index++) bytes[offset + index] = value.charCodeAt(index) }
  word(0, 'RIFF'); view.setUint32(4, 36 + samples, true); word(8, 'WAVE'); word(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true)
  word(36, 'data'); view.setUint32(40, samples, true)
  for (let index = 0; index < samples; index++) bytes[44 + index] = 128 + Math.round(Math.sin(index / sampleRate * Math.PI * 2 * 520) * 42 * (1 - index / samples))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return {
    ...textAsset(seed, `${name}.wav`, 'prefab', `Assets/Audio/${name}.wav`, `data:audio/wav;base64,${btoa(binary)}`, 'audio/wav'),
    assetType: 'audio', byteLength: bytes.byteLength, duration: samples / sampleRate
  }
}

function scene(seed: string, name: string, entities: JsonRecord[], connections: JsonRecord[] = []): JsonRecord {
  return {
    uuid: stableUuid(`scene:${seed}`), name, loaded: true, layers: [1], activeLayer: 1, renderLayer: 'all',
    globalSettings: { gravity: 9.8, airFriction: .01, timeScale: 1, tickRate: 60, maxCatchUpSteps: 8, collisionMatrix: defaultCollisionMatrix() },
    entities, connections
  }
}

function project(name: string, template: ProjectTemplateId, scenes: JsonRecord[], assets: JsonRecord[] = []): JsonRecord {
  const sceneIds = scenes.map(value => String(value.uuid))
  return {
    projectFormat: NOVA_PROJECT_FORMAT,
    projectFormatMajor: NOVA_PROJECT_FORMAT_MAJOR,
    formatVersion: NOVA_PROJECT_SCHEMA_VERSION,
    engineVersion: NOVA_ENGINE_VERSION,
    compatibility: projectCompatibility(),
    projectMetadata: newProjectMetadata(name, template),
    assets,
    assetFolders: ['Assets', 'Assets/Scenes', 'Assets/Sprites', 'Assets/Audio', 'Assets/Scripts', 'Assets/Fonts', 'Assets/Prefabs', 'Assets/Tiles', 'Assets/TileSets', 'Assets/Materials', 'Assets/Animations', 'Assets/Controllers', 'ProjectSettings', '.nova/cache', '.nova/imported'],
    plugins: [],
    projectSettings: {
      inputMap: defaultInputMap(), audio: defaultAudioSettings(), scripting: { customSignals: [], maxConsoleEntries: 2000, debuggerEnabled: true },
      rendering: { lightingEnabled: false, ambientColor: { r: 255, g: 255, b: 255 }, ambientIntensity: 1, shadowQuality: 'Soft', colorSpace: 'sRGB', postProcessing: { enabled: false, exposure: 0, contrast: 1, saturation: 1, vignette: 0, bloom: 0, blur: 0, userMaterial: null }, debugView: 'None' },
      build: { gameName: name, target: 'windows', architecture: 'x86_64', sceneOrder: sceneIds, startupSceneUuid: sceneIds[0], packageIntoExecutable: false, developmentBuild: true, outputDirectory: '' }
    },
    projectStructure: { assetsRoot: 'Assets', settingsRoot: 'ProjectSettings', cacheRoot: '.nova/cache', importedRoot: '.nova/imported' },
    activeSceneUuid: sceneIds[0], scenes
  }
}

function emptyTemplate(name: string): JsonRecord {
  return project(name, 'empty', [scene('main', 'Main Scene', [camera()])])
}

function platformerTemplate(name: string): JsonRecord {
  const scriptId = stableUuid('asset:platformer-controller')
  const spriteId = stableUuid('asset:platformer-player-sprite')
  const audioId = stableUuid('asset:platformer-jump-audio')
  const clipId = stableUuid('asset:platformer-idle-clip')
  const controllerId = stableUuid('asset:platformer-animator-controller')
  const source = `@export let speed = 8.0;\n@export let jump_force = 12.0;\nfn fixed_update(dt) {\n  let move = input_axis("MoveHorizontal");\n  set_velocity(move * speed, rigid_body().velocity_y);\n  if input_pressed("Jump") { apply_impulse(0.0, -jump_force); audio_play(); }\n}`
  const clip = JSON.stringify({ version: 1, name: 'Player Idle', loop: true, frameRate: 4, spriteFrames: [{ spriteAsset: `asset://${spriteId}`, duration: .25 }], tracks: [{ property: 'SpriteRenderer.opacity', keyframes: [{ time: 0, value: 82 }, { time: .5, value: 100 }, { time: 1, value: 82 }] }] })
  const controller = JSON.stringify({ version: 1, name: 'Player Controller', defaultState: 'idle', parameters: [], states: [{ id: 'idle', name: 'Idle', clipAsset: `asset://${clipId}`, speed: 1, x: 80, y: 80 }], transitions: [] })
  const player = shape('platformer-player', 'Player', [-4, -2], [1.1, 1.8], { color: [105, 168, 255], scriptAsset: scriptId, extra: [
    component('platformer-player', 'SpriteRenderer2D', { spriteAsset: `asset://${spriteId}`, tint: { r: 255, g: 255, b: 255 }, opacity: 100, size: { x: 1.1, y: 1.8 }, pivot: { x: .5, y: .5 }, flipX: false, flipY: false, sortingLayer: 1, orderInLayer: 2, material: 'Default', filterMode: 'Linear' }),
    component('platformer-player', 'Animator', { controllerAsset: `asset://${controllerId}`, speed: 1, autoplay: true, currentState: 'idle', parameters: {} }),
    component('platformer-player', 'AudioSource', { audioClip: `asset://${audioId}`, volume: .8, pitch: 1, loop: false, autoplay: false, bus: 'SFX', spatialBlend: 0, minDistance: 1, maxDistance: 50 })
  ] })
  const ground = shape('platformer-ground', 'Ground', [0, 4], [18, 1], { body: 'Static', color: [87, 107, 94], friction: .8 })
  const platform = shape('platformer-platform', 'Platform', [3, 1], [5, .7], { body: 'Static', color: [112, 137, 120], friction: .8 })
  const tileMap = entity('platformer-tilemap', 'World TileMap', [0, 0], [component('platformer-tilemap', 'TileMap2D', { width: 32, height: 18, tileSize: 1, chunkSize: 32, cells: [], tileSetAsset: null })])
  const tutorialScene = scene('platformer-main', 'Level 01', [camera('platformer-camera'), tileMap, ground, platform, player, ...canvasWithLabel('platformer-ui', 'Move, jump, and inspect every component in this template.')])
  const result = project(name, 'platformer', [tutorialScene], [
    scriptAsset('platformer-controller', 'PlayerController', source), imageAsset('platformer-player-sprite', 'Player', '#69a8ff'), beepAsset('platformer-jump-audio', 'Jump'),
    textAsset('platformer-idle-clip', 'PlayerIdle.nova-anim', 'animation', 'Assets/Animations/PlayerIdle.nova-anim', clip, 'application/x-nova-animation'),
    textAsset('platformer-animator-controller', 'Player.controller', 'controller', 'Assets/Controllers/Player.controller', controller, 'application/x-nova-controller')
  ])
  ;((result.projectSettings as JsonRecord).inputMap as JsonRecord[]) = [
    { name: 'MoveHorizontal', kind: 'axis', bindings: [{ device: 'keyboard', code: 'KeyA', scale: -1, x: -1, y: 0, gamepad: 0, deadzone: .15 }, { device: 'keyboard', code: 'KeyD', scale: 1, x: 1, y: 0, gamepad: 0, deadzone: .15 }] },
    { name: 'Jump', kind: 'button', bindings: [{ device: 'keyboard', code: 'Space', scale: 1, x: 0, y: 0, gamepad: 0, deadzone: .15 }] }
  ]
  return result
}

function topDownTemplate(name: string): JsonRecord {
  const scriptId = stableUuid('asset:top-down-controller')
  const enemyScriptId = stableUuid('asset:top-down-enemy')
  const enemyPrefabId = stableUuid('asset:top-enemy-prefab')
  const source = `@export let speed = 7.0;\nfn update(dt) {\n  let move = input_vector("Move");\n  set_velocity(move.x * speed, move.y * speed);\n  if input_pressed("Spawn") { instantiate("asset://${enemyPrefabId}"); }\n}\nfn on_trigger_enter(other, px, py, nx, ny, rvx, rvy) {\n  save_set("last_trigger", other);\n  save_set("checkpoint", [px, py]);\n  save_commit("slot1");\n  scene_load("Main Menu");\n}`
  const enemySource = `@export let patrol_speed = 2.0;\nfn fixed_update(dt) {\n  let pose = transform();\n  let body = rigid_body();\n  if pose.position_x > 7.0 { set_velocity(-patrol_speed, body.velocity_y); }\n  else if pose.position_x < 2.0 { set_velocity(patrol_speed, body.velocity_y); }\n  else if body.velocity_x == 0.0 { set_velocity(patrol_speed, body.velocity_y); }\n}`
  const player = shape('top-player', 'Player', [0, 0], [1.2, 1.2], { type: 'Circle', color: [94, 203, 181], scriptAsset: scriptId, extra: [component('top-player', 'ParticleEmitter2D', { emissionRate: 12, burst: 0, lifetime: 1, maxParticles: 128, velocityMin: { x: -.5, y: -.5 }, velocityMax: { x: .5, y: .5 }, colorStart: { r: 94, g: 203, b: 181 }, colorEnd: { r: 94, g: 203, b: 181 }, opacityStart: .7, opacityEnd: 0 })] })
  const enemy = shape('top-enemy', 'Enemy', [5, 0], [1.4, 1.4], { color: [242, 118, 118], body: 'Kinematic', scriptAsset: enemyScriptId })
  const trigger = shape('top-trigger', 'Exit Trigger', [8, 0], [2, 4], { color: [239, 190, 92], body: 'Static', sensor: true })
  const level = scene('top-level', 'World', [camera('top-camera'), player, enemy, trigger, ...canvasWithLabel('top-ui', 'Explore prefabs, triggers, particles, scene changes, and Save data.')])
  ;(level.globalSettings as JsonRecord).gravity = 0
  const menu = scene('top-menu', 'Main Menu', [camera('top-menu-camera'), ...canvasWithLabel('top-menu-ui', 'Top-down template — switch to the World scene to play.')])
  ;(menu.globalSettings as JsonRecord).gravity = 0
  const result = project(name, 'top-down', [level, menu], [
    scriptAsset('top-down-controller', 'TopDownController', source), scriptAsset('top-down-enemy', 'EnemyPatrol', enemySource),
    textAsset('top-enemy-prefab', 'Enemy.nova-prefab', 'prefab', 'Assets/Prefabs/Enemy.nova-prefab', JSON.stringify(enemy), 'application/x-nova-prefab')
  ])
  ;((result.projectSettings as JsonRecord).inputMap as JsonRecord[]) = [{ name: 'Move', kind: 'vector2', bindings: [
    { device: 'keyboard', code: 'KeyW', scale: 1, x: 0, y: -1, gamepad: 0, deadzone: .15 }, { device: 'keyboard', code: 'KeyS', scale: 1, x: 0, y: 1, gamepad: 0, deadzone: .15 },
    { device: 'keyboard', code: 'KeyA', scale: 1, x: -1, y: 0, gamepad: 0, deadzone: .15 }, { device: 'keyboard', code: 'KeyD', scale: 1, x: 1, y: 0, gamepad: 0, deadzone: .15 }
  ] }, { name: 'Spawn', kind: 'button', bindings: [{ device: 'keyboard', code: 'KeyE', scale: 1, x: 0, y: 0, gamepad: 0, deadzone: .15 }] }]
  return result
}

function physicsTemplate(name: string): JsonRecord {
  const first = shape('sandbox-box', 'Jointed Box', [-3, -2], [2, 2], { color: [103, 162, 255], restitution: .2, extra: [component('sandbox-box', 'DistanceJoint2D', { targetEntityUuid: stableUuid('entity:sandbox-ball'), distance: 6, stiffness: 900, damping: 35, collideConnected: false })] })
  const second = shape('sandbox-ball', 'Rope Ball', [3, -2], [1.8, 1.8], { type: 'Circle', color: [236, 154, 92], restitution: .7 })
  const anchors = [first, second].map(value => ({ entityUuid: value.uuid, mode: 'center', localPoint: { x: 0, y: 0 }, index: 0, sideT: .5 }))
  const rope = {
    uuid: stableUuid('connection:sandbox-rope'), name: 'Elastic Rope', type: 'rope', route: 'manual', anchors,
    manualPoints: [{ x: -3, y: -2 }, { x: 0, y: 0 }, { x: 3, y: -2 }], manualSegments: [], restLengths: [],
    stretchable: true, bendable: true, stiffness: 650, damping: 24, maxStretch: .45, bendTolerance: 120, stretchTolerance: 180,
    collisionEnabled: true, thickness: .18, ropeNodes: [], breakState: 'intact', breakLink: -1, tension: 0, strain: 0
  }
  return project(name, 'physics-sandbox', [scene('sandbox', 'Physics Playground', [camera('sandbox-camera'), shape('sandbox-ground', 'Ground', [0, 5], [20, 1], { body: 'Static', color: [89, 102, 116], friction: .85 }), first, second, ...canvasWithLabel('sandbox-ui', 'Press Play, then enable collider, joint, and rope debugger overlays.')], [rope])])
}

export function createTemplateProject(template: ProjectTemplateId, name: string): JsonRecord {
  const result = template === 'platformer' ? platformerTemplate(name)
    : template === 'top-down' ? topDownTemplate(name)
      : template === 'physics-sandbox' ? physicsTemplate(name)
        : emptyTemplate(name)
  const failures = auditTemplateProject(result, template)
  if (failures.length) throw new Error(`Template ${template} failed its release audit: ${failures.join('; ')}`)
  return result
}

export function auditTemplateProject(project: JsonRecord, template: ProjectTemplateId): string[] {
  const scenes = Array.isArray(project.scenes) ? project.scenes as JsonRecord[] : []
  const entities = scenes.flatMap(scene => Array.isArray(scene.entities) ? scene.entities as JsonRecord[] : [])
  const components = new Set(entities.flatMap(entity => Array.isArray(entity.components) ? (entity.components as JsonRecord[]).map(item => String(item.kind)) : []))
  const assets = Array.isArray(project.assets) ? project.assets as JsonRecord[] : []
  const assetTypes = new Set(assets.map(asset => String(asset.assetType)))
  const connections = scenes.flatMap(scene => Array.isArray(scene.connections) ? scene.connections as JsonRecord[] : [])
  const failures: string[] = []
  const requireComponents = (...kinds: string[]) => { for (const kind of kinds) if (!components.has(kind)) failures.push(`missing ${kind}`) }
  if (!scenes.length) failures.push('missing scene')
  requireComponents('Transform2D', 'Camera2D')
  for (const sourceScene of scenes) {
    const layers = new Set(Array.isArray(sourceScene.layers) ? sourceScene.layers.map(Number) : [1])
    const sceneEntities = Array.isArray(sourceScene.entities) ? sourceScene.entities as JsonRecord[] : []
    for (const sourceEntity of sceneEntities) {
      const renderers = Array.isArray(sourceEntity.components)
        ? (sourceEntity.components as JsonRecord[]).filter(item => ['ShapeRenderer2D', 'SpriteRenderer2D', 'TextRenderer2D', 'Panel', 'Image', 'Text', 'Button', 'Slider', 'ProgressBar', 'Checkbox', 'TextInput'].includes(String(item.kind)))
        : []
      for (const renderer of renderers) {
        const data = renderer.data as JsonRecord | undefined
        const opacity = Number(data?.opacity ?? 100)
        const sortingLayer = Number(data?.sortingLayer ?? 1)
        if (!Number.isFinite(opacity) || opacity < 10) failures.push(`${sourceEntity.name ?? 'entity'} renderer is barely visible`)
        if (!layers.has(sortingLayer)) failures.push(`${sourceEntity.name ?? 'entity'} uses undeclared sorting layer ${sortingLayer}`)
        if (data?.shape === 'Rectangle') {
          const vertices = Array.isArray(data.vertices) ? data.vertices as JsonRecord[] : []
          const xs = vertices.map(vertex => Number(vertex.x)).filter(Number.isFinite)
          const ys = vertices.map(vertex => Number(vertex.y)).filter(Number.isFinite)
          const width = xs.length ? Math.max(...xs) - Math.min(...xs) : 0
          const height = ys.length ? Math.max(...ys) - Math.min(...ys) : 0
          if (vertices.length < 4 || width < .1 || height < .1) failures.push(`${sourceEntity.name ?? 'entity'} has no visible rectangle geometry`)
        }
      }
    }
  }
  if (template === 'platformer') {
    requireComponents('SpriteRenderer2D', 'RigidBody2D', 'BoxCollider2D', 'Script2D', 'Animator', 'AudioSource', 'TileMap2D', 'Canvas', 'Text')
    for (const type of ['image', 'audio', 'script', 'animation', 'controller']) if (!assetTypes.has(type)) failures.push(`missing ${type} asset`)
  } else if (template === 'top-down') {
    requireComponents('Script2D', 'ParticleEmitter2D', 'Canvas', 'Text')
    if (scenes.length < 2) failures.push('missing scene transition target')
    for (const type of ['prefab', 'script']) if (!assetTypes.has(type)) failures.push(`missing ${type} asset`)
    const scripts = assets.filter(asset => asset.assetType === 'script').map(asset => String(asset.source)).join('\n')
    for (const api of ['instantiate(', 'scene_load(', 'save_commit(']) if (!scripts.includes(api)) failures.push(`missing ${api} tutorial call`)
  } else if (template === 'physics-sandbox') {
    requireComponents('RigidBody2D', 'DistanceJoint2D', 'BoxCollider2D', 'EllipseCollider2D')
    if (!connections.some(connection => connection.type === 'rope')) failures.push('missing Rope2D connection')
  }
  return failures
}

export function createTemplateProjectJson(template: ProjectTemplateId, name: string): string {
  return JSON.stringify(createTemplateProject(template, name))
}

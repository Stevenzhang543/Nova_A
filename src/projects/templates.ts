import { defaultAudioSettings } from '../runtime/audio'
import { defaultInputMap } from '../runtime/input'
import { defaultCollisionMatrix } from '../world/World'
import { defaultPhysicsLayers } from '../runtime/physicsProduction'
import { newProjectMetadata } from './projectSession'
import { normalizeProjectManifest } from './projectManifest'
import { assetSourceBytes, sha256Bytes } from '../assets/contentHash'
import {
  NOVA_ENGINE_VERSION, NOVA_PROJECT_FORMAT, NOVA_PROJECT_FORMAT_MAJOR,
  NOVA_PROJECT_SCHEMA_VERSION, projectCompatibility
} from './projectFormat'

export type ProjectTemplateId = 'empty' | 'platformer' | 'top-down' | 'physics-sandbox' | 'ui-showcase' | 'networked-optional'

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
  ,{ id: 'ui-showcase', name: 'UI Showcase', description: 'A responsive menu and HUD demonstrating themes, localization, focus, and audio.', features: ['Responsive UI', 'Themes', 'Localization', 'Focus', 'Audio mixer'] }
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
  const label = entity(`${seed}:label`, 'Scene Title', [0, 0], [
    component(`${seed}:label`, 'RectTransform', { parentUuid: canvasUuid, anchorPreset: 'top', position: { x: 0, y: 48 }, size: { x: 900, y: 72 } }),
    component(`${seed}:label`, 'Text', { text, fontSize: 26, fontWeight: 650, align: 'center', color: { r: 239, g: 245, b: 255 }, opacity: 100 })
  ])
  ;(label.components as JsonRecord[])[0] = component(`${seed}:label`, 'Transform2D', { parentUuid: canvasUuid, position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } })
  return [canvas, label]
}

function textAsset(seed: string, name: string, assetType: 'script' | 'animation' | 'controller' | 'prefab' | 'localization' | 'uiTheme' | 'tileset' | 'other', path: string, source: string, mimeType: string): JsonRecord {
  const hash = sha256Bytes(assetSourceBytes(source))
  return {
    uuid: stableUuid(`asset:${seed}`), name, path, assetType,
    mimeType, byteLength: source.length, source, sourceModified: 0, importedAt: 0,
    width: 0, height: 0, duration: 0, fontFamily: '',
    settings: { filterMode: 'Linear', compression: 'Lossless', pixelsPerUnit: 100, spriteRegion: null, pivot: { x: .5, y: .5 }, atlas: false },
    pipeline: { importerVersion: 'template-4.2', platform: 'web', sourceHash: hash, artifactHash: hash, contentHash: hash, cacheKey: hash, status: 'ready', lastValidSource: source, error: '', dependencies: [], reverseDependencies: [], cacheHit: false }
  }
}

function scriptAsset(seed: string, name: string, source: string): JsonRecord {
  return { ...textAsset(seed, `${name}.rhai`, 'script', `Assets/Scripts/${name}.rhai`, source, 'text/x-rhai'), script: { version: 1, apiVersion: 1, breakpoints: [], breakpointDetails: [], tests: [], packageDependencies: [], packageName: '', reloadPolicy: 'preserve', signalConnections: [], recoverySource: '', lastSavedHash: '' } }
}

function imageAsset(seed: string, name: string, color: string): JsonRecord {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="${color}"/><path d="M36 68l18 18 40-44" fill="none" stroke="#f8fbff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  return {
    ...textAsset(seed, `${name}.svg`, 'prefab', `Assets/Sprites/${name}.svg`, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, 'image/svg+xml'),
    assetType: 'image', width: 128, height: 128,
    settings: { filterMode: 'Linear', compression: 'Lossless', pixelsPerUnit: 100, spriteRegion: null, pivot: { x: .5, y: .5 }, atlas: true }
  }
}

function worldTileAssets(seed: string): JsonRecord[] {
  const imageUuid = stableUuid(`asset:${seed}-atlas`), tileSetUuid = stableUuid(`asset:${seed}-tileset`)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="32"><rect width="32" height="32" fill="#4f8d62"/><rect x="32" width="32" height="32" fill="#6b5642"/><rect x="64" width="32" height="32" fill="#6ba7d6"/><path d="M35 5h26v22H35z" fill="none" stroke="#9a8061" stroke-width="3"/></svg>`
  const image = { ...textAsset(`${seed}-atlas`, `${seed} Atlas.svg`, 'prefab', `Assets/Tiles/${seed}-atlas.svg`, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, 'image/svg+xml'), uuid: imageUuid, assetType: 'image', width: 96, height: 32 }
  const tiles = [
    { index: 0, name: 'Ground', collision: 'None', polygon: [], terrain: 'Ground', navigationCost: 1, occluder: false, navigationPolygon: [], occlusionPolygon: [], metadata: { biome: 'ground' }, sceneAsset: null, prefabAsset: null, sourceId: 'primary', region: null, animation: null, variants: [{ tile: 1, weight: .08 }] },
    { index: 1, name: 'Wall', collision: 'Box', polygon: [], terrain: 'Wall', navigationCost: 0, occluder: true, navigationPolygon: [], occlusionPolygon: [], metadata: { solid: true }, sceneAsset: null, prefabAsset: null, sourceId: 'primary', region: null, animation: null, variants: [] },
    { index: 2, name: 'Water', collision: 'None', polygon: [], terrain: 'Water', navigationCost: 4, occluder: false, navigationPolygon: [], occlusionPolygon: [], metadata: { surface: 'water' }, sceneAsset: null, prefabAsset: null, sourceId: 'primary', region: null, animation: { frames: [2, 0], framesPerSecond: 2, mode: 'PingPong' }, variants: [] }
  ]
  const document = { version: 2, textureAsset: `asset://${imageUuid}`, sources: [{ id: 'primary', name: 'Template atlas', textureAsset: `asset://${imageUuid}`, margin: 0, spacing: 0 }], tileWidth: 32, tileHeight: 32, columns: 3, rows: 1, tiles }
  const tileSet = { ...textAsset(`${seed}-tileset`, `${seed}.nova-tileset`, 'tileset', `Assets/TileSets/${seed}.nova-tileset`, JSON.stringify(document), 'application/x-nova-tileset'), uuid: tileSetUuid }
  return [image, tileSet]
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
    globalSettings: { gravity: 9.80665, airFriction: .01, timeScale: 1, tickRate: 60, maxCatchUpSteps: 8, collisionMatrix: defaultCollisionMatrix(), interpolation: 'Interpolate', layers: defaultPhysicsLayers() },
    entities, connections
  }
}

function project(name: string, template: ProjectTemplateId, scenes: JsonRecord[], assets: JsonRecord[] = []): JsonRecord {
  const sceneIds = scenes.map(value => String(value.uuid))
  const metadata = newProjectMetadata(name, template)
  return {
    projectFormat: NOVA_PROJECT_FORMAT,
    projectFormatMajor: NOVA_PROJECT_FORMAT_MAJOR,
    formatVersion: NOVA_PROJECT_SCHEMA_VERSION,
    engineVersion: NOVA_ENGINE_VERSION,
    compatibility: projectCompatibility(),
    projectMetadata: metadata,
    manifest: normalizeProjectManifest(null, metadata),
    assets: [textAsset(`tutorial-${template}`, 'Getting Started.md', 'other', 'Assets/Tutorials/Getting Started.md', `---\ndismissible: true\ntemplate: ${template}\n---\n# Welcome to ${name}\n\nThis project was created from the **${template}** template. Open the Scene, Assets, Script, Debug, and Manage workspaces to explore the configured systems. Dismiss this tutorial from its Asset Inspector when you are ready.`, 'text/markdown'), ...assets],
    assetFolders: ['Assets', 'Assets/Tutorials', 'Assets/Scenes', 'Assets/Sprites', 'Assets/Audio', 'Assets/Scripts', 'Assets/Fonts', 'Assets/Prefabs', 'Assets/Tiles', 'Assets/TileSets', 'Assets/Materials', 'Assets/Animations', 'Assets/Controllers', 'ProjectSettings', '.nova/cache', '.nova/imported'],
    assetDatabase: { version: 2, favorites: [], savedFilters: [], importPresets: [], collections: [], contentGroups: [{ id: 'main', name: 'Main', mode: 'embedded', optional: false }], viewMode: 'grid', thumbnailSize: 112 },
    plugins: [],
    packages: { manifestVersion: 1, installed: [], lockfile: [], offlineCache: [], offlineMode: true },
    projectSettings: {
      inputMap: defaultInputMap(), audio: defaultAudioSettings(), scripting: { apiVersion: 1, customSignals: [], maxConsoleEntries: 2000, debuggerEnabled: true, hotReloadEnabled: true, breakOnRuntimeError: true, deterministicTestSeed: 1, externalEditorProtocol: true },
      rendering: { lightingEnabled: false, ambientColor: { r: 255, g: 255, b: 255 }, ambientIntensity: 1, shadowQuality: 'Soft', colorSpace: 'sRGB', postProcessing: { enabled: false, exposure: 0, contrast: 1, saturation: 1, vignette: 0, bloom: 0, blur: 0, userMaterial: null }, debugView: 'None' },
      build: {
        gameName: name, target: 'windows', architecture: 'x86_64', runtimeMode: 'game', profile: 'debug', sceneOrder: sceneIds, startupSceneUuid: sceneIds[0], packageIntoExecutable: false, developmentBuild: true, outputDirectory: '',
        platform: { identifier: `top.whitelists.${name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'game'}`, version: '1.0.0', iconAsset: null, splashAsset: null, orientation: 'auto', permissions: [], signingMode: 'none', signingIdentity: '', notarizationProfile: '' },
        delivery: { deterministic: true, incremental: true, compression: 'balanced', patchManifest: true, structuredLogs: true, crashReports: true, telemetryEnabled: false, telemetryEndpoint: '', privacyPolicyUrl: '' }
      },
      world: { navigationDebug: false, areaDebug: false, chunkDebug: false, streamingEnabled: true, memoryBudgetMb: 256, originShiftThreshold: 10000 }
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
  const tileSetId = stableUuid('asset:platformer-world-tileset')
  const source = `@export(type="float", min=0, max=30, step=0.1, group="Movement", tooltip="Horizontal speed in world units per second") let speed = 8.0;\n@export(type="float", min=-100, max=0, step=0.1, group="Movement", tooltip="Vertical acceleration") let gravity = -22.0;\n@export(type="float", min=0, max=50, step=0.1, group="Movement", tooltip="Jump speed") let jump_speed = 12.0;\nfn fixed_update(dt) {\n  let move = input_axis("MoveHorizontal");\n  let vertical = rigid_body().velocity_y + gravity * dt;\n  if input_pressed("Jump") && can_coyote_jump() { vertical = jump_speed; audio_play(); }\n  move_character(move * speed * dt, vertical * dt);\n}`
  const clip = JSON.stringify({ version: 1, name: 'Player Idle', loop: true, frameRate: 4, spriteFrames: [{ spriteAsset: `asset://${spriteId}`, duration: .25 }], tracks: [{ property: 'SpriteRenderer.opacity', keyframes: [{ time: 0, value: 82 }, { time: .5, value: 100 }, { time: 1, value: 82 }] }] })
  const controller = JSON.stringify({ version: 1, name: 'Player Controller', defaultState: 'idle', parameters: [], states: [{ id: 'idle', name: 'Idle', clipAsset: `asset://${clipId}`, speed: 1, x: 80, y: 80 }], transitions: [] })
  const player = shape('platformer-player', 'Player', [-4, -2], [1.1, 1.8], { color: [105, 168, 255], body: 'Kinematic', scriptAsset: scriptId, extra: [
    component('platformer-player', 'CharacterBody2D', { maxSlopeAngle: 45, stepHeight: .35, floorSnap: .15, safeMargin: .001, maxSlides: 4, coyoteTime: .12, applyPlatformVelocity: true, collisionMask: 0xffffffff }),
    component('platformer-player', 'SpriteRenderer2D', { spriteAsset: `asset://${spriteId}`, tint: { r: 255, g: 255, b: 255 }, opacity: 100, size: { x: 1.1, y: 1.8 }, pivot: { x: .5, y: .5 }, flipX: false, flipY: false, sortingLayer: 1, orderInLayer: 2, material: 'Default', filterMode: 'Linear' }),
    component('platformer-player', 'Animator', { controllerAsset: `asset://${controllerId}`, speed: 1, autoplay: true, currentState: 'idle', parameters: {} }),
    component('platformer-player', 'AudioSource', { audioClip: `asset://${audioId}`, volume: .8, pitch: 1, loop: false, autoplay: false, bus: 'SFX', spatialBlend: 0, minDistance: 1, maxDistance: 50 })
  ] })
  const ground = shape('platformer-ground', 'Ground', [0, -4], [18, 1], { body: 'Static', color: [87, 107, 94], friction: .8, extra: [component('platformer-ground', 'ShadowCaster2D', { layerMask: 0xffffffff, selfShadows: false, opacity: .82 })] })
  const platform = shape('platformer-platform', 'Platform', [3, -1], [5, .7], { body: 'Static', color: [112, 137, 120], friction: .8, extra: [component('platformer-platform', 'ShadowCaster2D', { layerMask: 0xffffffff, selfShadows: false, opacity: .82 })] })
  const light = entity('platformer-light', 'Level Light', [-2, -1], [component('platformer-light', 'Light2D', { lightType: 'Point', color: { r: 255, g: 226, b: 178 }, intensity: .9, range: 10, innerAngle: 30, outerAngle: 55, areaSize: { x: 4, y: 2 }, layerMask: 0xffffffff, castsShadows: true, shadowSoftness: .58 })])
  const platformTiles = Array(32 * 18).fill(-1).map((_, index) => Math.floor(index / 32) < 2 ? 1 : index % 19 === 0 && Math.floor(index / 32) === 2 ? 0 : -1)
  const tileMap = entity('platformer-tilemap', 'World TileMap', [0, 0], [component('platformer-tilemap', 'TileMap2D', { width: 32, height: 18, tileSize: { x: 1, y: 1 }, chunkSize: 16, tiles: platformTiles, tileSetAsset: `asset://${tileSetId}`, layers: [{ id: 'terrain', name: 'Terrain', visible: true, locked: false, opacity: 1, blendMode: 'Alpha', parallax: { x: 1, y: 1 }, zOrder: 0, collisionEnabled: true, navigationEnabled: true, occlusionEnabled: true, tiles: platformTiles, transforms: Array(32 * 18).fill(0) }], activeLayer: 0, streamingEnabled: true, streamingRadius: 3, bakeCollision: true, bakeNavigation: true, bakeOccluders: true })])
  const navigation = entity('platformer-navigation', 'Platform Navigation', [0, 0], [component('platformer-navigation', 'NavigationRegion2D', { polygon: [{ x: -16, y: -9 }, { x: 16, y: -9 }, { x: 16, y: 9 }, { x: -16, y: 9 }], navigationMode: 'Grid', source: 'TileMap', sourceEntityUuid: stableUuid('entity:platformer-tilemap'), cellSize: .5, agentRadius: .4, navigationLayer: 1, navigationMask: 1, traversalCost: 1 })])
  const tutorialScene = scene('platformer-main', 'Level 01', [camera('platformer-camera'), tileMap, navigation, light, ground, platform, player, ...canvasWithLabel('platformer-ui', 'Platformer')])
  const result = project(name, 'platformer', [tutorialScene], [
    scriptAsset('platformer-controller', 'PlayerController', source), imageAsset('platformer-player-sprite', 'Player', '#69a8ff'), beepAsset('platformer-jump-audio', 'Jump'),
    textAsset('platformer-idle-clip', 'PlayerIdle.nova-anim', 'animation', 'Assets/Animations/PlayerIdle.nova-anim', clip, 'application/x-nova-animation'),
    textAsset('platformer-animator-controller', 'Player.controller', 'controller', 'Assets/Controllers/Player.controller', controller, 'application/x-nova-controller'),
    ...worldTileAssets('platformer-world')
  ])
  ;((result.projectSettings as JsonRecord).inputMap as JsonRecord[]) = [
    { name: 'MoveHorizontal', kind: 'axis', bindings: [{ device: 'keyboard', code: 'KeyA', scale: -1, x: -1, y: 0, gamepad: 0, deadzone: .15 }, { device: 'keyboard', code: 'KeyD', scale: 1, x: 1, y: 0, gamepad: 0, deadzone: .15 }] },
    { name: 'Jump', kind: 'button', bindings: [{ device: 'keyboard', code: 'Space', scale: 1, x: 0, y: 0, gamepad: 0, deadzone: .15 }] }
  ]
  const rendering = (result.projectSettings as JsonRecord).rendering as JsonRecord
  rendering.lightingEnabled = true
  rendering.ambientIntensity = .48
  return result
}

function topDownTemplate(name: string): JsonRecord {
  const scriptId = stableUuid('asset:top-down-controller')
  const enemyScriptId = stableUuid('asset:top-down-enemy')
  const enemyPrefabId = stableUuid('asset:top-enemy-prefab')
  const tileSetId = stableUuid('asset:top-down-world-tileset')
  const source = `@export(type="float", min=0, max=30, step=0.1, group="Movement", tooltip="Top-down movement speed") let speed = 7.0;\nfn update(dt) {\n  let move = input_vector("Move");\n  set_velocity(move.x * speed, move.y * speed);\n  if input_pressed("Spawn") { instantiate("asset://${enemyPrefabId}"); }\n}\nfn on_trigger_enter(other, px, py, nx, ny, rvx, rvy) {\n  save_set("last_trigger", other);\n  save_set("checkpoint", [px, py]);\n  save_commit("slot1");\n  scene_load("Main Menu");\n}`
  const enemySource = `@export(type="float", min=0, max=20, step=0.1, group="AI", tooltip="Patrol movement speed") let patrol_speed = 2.0;\nfn fixed_update(dt) {\n  let pose = transform();\n  let body = rigid_body();\n  if pose.position_x > 7.0 { set_velocity(-patrol_speed, body.velocity_y); }\n  else if pose.position_x < 2.0 { set_velocity(patrol_speed, body.velocity_y); }\n  else if body.velocity_x == 0.0 { set_velocity(patrol_speed, body.velocity_y); }\n}`
  const player = shape('top-player', 'Player', [0, 0], [1.2, 1.2], { type: 'Circle', color: [94, 203, 181], scriptAsset: scriptId, extra: [component('top-player', 'ParticleEmitter2D', { emissionRate: 12, burst: 0, lifetime: 1, maxParticles: 128, velocityMin: { x: -.5, y: -.5 }, velocityMax: { x: .5, y: .5 }, colorStart: { r: 94, g: 203, b: 181 }, colorEnd: { r: 94, g: 203, b: 181 }, opacityStart: .7, opacityEnd: 0 })] })
  const enemy = shape('top-enemy', 'Enemy', [5, 0], [1.4, 1.4], { color: [242, 118, 118], body: 'Kinematic', scriptAsset: enemyScriptId })
  const trigger = shape('top-trigger', 'Exit Trigger', [8, 0], [2, 4], { color: [239, 190, 92], body: 'Static', sensor: true })
  const topTiles = Array(40 * 24).fill(0).map((value, index) => index % 40 === 0 || index % 40 === 39 || Math.floor(index / 40) === 0 || Math.floor(index / 40) === 23 ? 1 : value)
  const topMap = entity('top-down-tilemap', 'World TileMap', [0, 0], [component('top-down-tilemap', 'TileMap2D', { width: 40, height: 24, tileSize: { x: 1, y: 1 }, chunkSize: 16, tiles: topTiles, tileSetAsset: `asset://${tileSetId}`, layers: [{ id: 'ground', name: 'Ground', visible: true, locked: false, opacity: 1, blendMode: 'Alpha', parallax: { x: 1, y: 1 }, zOrder: -10, collisionEnabled: true, navigationEnabled: true, occlusionEnabled: true, tiles: topTiles, transforms: Array(40 * 24).fill(0) }], activeLayer: 0, streamingEnabled: true, streamingRadius: 3, bakeCollision: true, bakeNavigation: true, bakeOccluders: true })])
  const topNavigation = entity('top-down-navigation', 'World Navigation', [0, 0], [component('top-down-navigation', 'NavigationRegion2D', { polygon: [{ x: -19, y: -11 }, { x: 19, y: -11 }, { x: 19, y: 11 }, { x: -19, y: 11 }], navigationMode: 'Grid', source: 'TileMap', sourceEntityUuid: stableUuid('entity:top-down-tilemap'), cellSize: .5, agentRadius: .5, navigationLayer: 1, navigationMask: 1, traversalCost: 1, links: [] })])
  const level = scene('top-level', 'World', [camera('top-camera'), topMap, topNavigation, player, enemy, trigger, ...canvasWithLabel('top-ui', 'Top-down')])
  ;(level.globalSettings as JsonRecord).gravity = 0
  const menu = scene('top-menu', 'Main Menu', [camera('top-menu-camera'), ...canvasWithLabel('top-menu-ui', 'Top-down')])
  ;(menu.globalSettings as JsonRecord).gravity = 0
  const result = project(name, 'top-down', [level, menu], [
    scriptAsset('top-down-controller', 'TopDownController', source), scriptAsset('top-down-enemy', 'EnemyPatrol', enemySource),
    textAsset('top-enemy-prefab', 'Enemy.nova-prefab', 'prefab', 'Assets/Prefabs/Enemy.nova-prefab', JSON.stringify(enemy), 'application/x-nova-prefab'),
    ...worldTileAssets('top-down-world')
  ])
  ;((result.projectSettings as JsonRecord).inputMap as JsonRecord[]) = [{ name: 'Move', kind: 'vector2', bindings: [
    { device: 'keyboard', code: 'KeyW', scale: 1, x: 0, y: -1, gamepad: 0, deadzone: .15 }, { device: 'keyboard', code: 'KeyS', scale: 1, x: 0, y: 1, gamepad: 0, deadzone: .15 },
    { device: 'keyboard', code: 'KeyA', scale: 1, x: -1, y: 0, gamepad: 0, deadzone: .15 }, { device: 'keyboard', code: 'KeyD', scale: 1, x: 1, y: 0, gamepad: 0, deadzone: .15 }
  ] }, { name: 'Spawn', kind: 'button', bindings: [{ device: 'keyboard', code: 'KeyE', scale: 1, x: 0, y: 0, gamepad: 0, deadzone: .15 }] }]
  return result
}

function physicsTemplate(name: string): JsonRecord {
  // Joint and rope examples use separate bodies. Coupling two independent
  // constraints across the same pair creates an over-constrained tutorial.
  const jointAnchor = shape('sandbox-joint-anchor', 'Joint Anchor', [-5, 0], [.8, .8], { body: 'Static', color: [132, 148, 166], friction: .8 })
  const jointedBox = shape('sandbox-box', 'Jointed Box', [-5, -3], [2, 2], { color: [103, 162, 255], restitution: .2, extra: [component('sandbox-box', 'DistanceJoint2D', { targetEntityUuid: stableUuid('entity:sandbox-joint-anchor'), distance: 3, stiffness: 240, damping: 28, collideConnected: false })] })
  const ropeEnd = shape('sandbox-rope-end', 'Rope End', [1, -2], [1.4, 1.4], { color: [120, 205, 176], restitution: .25 })
  const ropeBall = shape('sandbox-ball', 'Rope Ball', [5, -2], [1.8, 1.8], { type: 'Circle', color: [236, 154, 92], restitution: .7 })
  const anchors = [ropeEnd, ropeBall].map(value => ({ entityUuid: value.uuid, mode: 'center', localPoint: { x: 0, y: 0 }, index: 0, sideT: .5 }))
  const rope = {
    uuid: stableUuid('connection:sandbox-rope'), name: 'Elastic Rope', type: 'rope', route: 'manual', anchors,
    manualPoints: [{ x: 1, y: -2 }, { x: 3, y: -.8 }, { x: 5, y: -2 }], manualSegments: [], restLengths: [],
    stretchable: true, bendable: true, stiffness: 120, damping: 24, maxStretch: .45, bendTolerance: 120, stretchTolerance: 180,
    collisionEnabled: true, thickness: .18, ropeNodes: [], breakState: 'intact', breakLink: -1, tension: 0, strain: 0
  }
  return project(name, 'physics-sandbox', [scene('sandbox', 'Physics Playground', [camera('sandbox-camera'), shape('sandbox-ground', 'Ground', [0, -5], [20, 1], { body: 'Static', color: [89, 102, 116], friction: .85 }), jointAnchor, jointedBox, ropeEnd, ropeBall, ...canvasWithLabel('sandbox-ui', 'Physics Sandbox')], [rope])])
}

function uiElement(seed: string, name: string, parentUuid: string, position: [number, number], size: [number, number], kind: string, data: JsonRecord): JsonRecord {
  const result = entity(seed, name, [0, 0], [
    component(seed, 'RectTransform', { parentUuid, anchorPreset: 'center', position: { x: position[0], y: position[1] }, size: { x: size[0], y: size[1] }, minSize: { x: Math.min(80, size[0]), y: Math.min(32, size[1]) }, maxSize: { x: 4096, y: 4096 }, flexGrow: 0, flexShrink: 1 }),
    component(seed, kind, data)
  ])
  const transform = (result.components as JsonRecord[])[0].data as JsonRecord
  transform.parentUuid = parentUuid
  return result
}

function uiShowcaseTemplate(name: string): JsonRecord {
  const canvasUuid = stableUuid('entity:ui-showcase-canvas')
  const canvas = entity('ui-showcase-canvas', 'Responsive Canvas', [0, 0], [
    component('ui-showcase-canvas', 'RectTransform', { parentUuid: null, anchorPreset: 'stretch', position: { x: 0, y: 0 }, size: { x: 1920, y: 1080 }, minSize: { x: 320, y: 180 }, maxSize: { x: 7680, y: 4320 }, flexGrow: 1, flexShrink: 1 }),
    component('ui-showcase-canvas', 'Canvas', { referenceSize: { x: 1920, y: 1080 }, scaleWithScreen: true, sortingOrder: 100, safeArea: true })
  ])
  const panel = uiElement('ui-showcase-panel', 'Menu Panel', canvasUuid, [0, 0], [720, 620], 'Panel', { color: { r: 28, g: 34, b: 46 }, opacity: 96, cornerRadius: 24, layout: 'vertical', gap: 18, padding: 36, clipping: true, styleClass: 'menu-card' })
  const panelUuid = String(panel.uuid)
  const title = uiElement('ui-showcase-title', 'Localized Title', panelUuid, [0, -220], [600, 70], 'Text', { text: '{menu.title}', fontSize: 38, fontWeight: 700, align: 'center', color: { r: 244, g: 248, b: 255 }, opacity: 100, localizationKey: 'menu.title' })
  const nameInput = uiElement('ui-showcase-input', 'Player Name', panelUuid, [0, -110], [560, 58], 'TextInput', { value: '', placeholder: '{menu.playerName}', fontSize: 20, maxLength: 32, focusable: true, tabIndex: 1, styleClass: 'input' })
  const playButton = uiElement('ui-showcase-play', 'Play Button', panelUuid, [0, -20], [560, 62], 'Button', { text: '{menu.play}', action: 'StartGame', focusable: true, tabIndex: 2, styleClass: 'primary', accessibilityLabel: 'Start game' })
  const options = uiElement('ui-showcase-options', 'Options Toggle', panelUuid, [0, 70], [560, 54], 'Checkbox', { checked: true, label: '{menu.sound}', action: 'ToggleSound', focusable: true, tabIndex: 3, styleClass: 'checkbox' })
  const loading = uiElement('ui-showcase-progress', 'Loading Progress', panelUuid, [0, 160], [560, 28], 'ProgressBar', { value: 68, minimum: 0, maximum: 100, styleClass: 'progress' })
  const scroll = uiElement('ui-showcase-scroll', 'News Scroll View', panelUuid, [0, 245], [560, 90], 'Panel', { color: { r: 22, g: 27, b: 37 }, opacity: 100, cornerRadius: 12, clipping: true, scrollHorizontal: false, scrollVertical: true, contentSize: { x: 560, y: 360 }, scrollSpeed: 42, showScrollbars: true, styleClass: 'scroll' })
  const localization = JSON.stringify({ locale: 'en', entries: { 'menu.title': 'Nova_A UI Showcase', 'menu.playerName': 'Player name', 'menu.play': 'Play', 'menu.sound': 'Sound enabled' } })
  const theme = JSON.stringify({ version: 1, name: 'Showcase', variables: { accent: '#6ea8fe', radius: 12, spacing: 8 }, classes: { 'menu-card': { background: '#1d222c', radius: 24 }, primary: { background: '#4c8df6', foreground: '#ffffff' }, input: { background: '#11151b' } } })
  const result = project(name, 'ui-showcase', [scene('ui-showcase', 'UI Showcase', [camera('ui-showcase-camera'), canvas, panel, title, nameInput, playButton, options, loading, scroll])], [
    { ...textAsset('ui-showcase-locale', 'en.nova-locale', 'localization', 'Assets/Localization/en.nova-locale', localization, 'application/x-nova-localization'), settings: { localizationSettings: { locale: 'en', fallbackLocale: '' } } },
    textAsset('ui-showcase-theme', 'Showcase.nova-theme', 'uiTheme', 'Assets/Themes/Showcase.nova-theme', theme, 'application/x-nova-ui-theme'),
    beepAsset('ui-showcase-click', 'UIClick')
  ])
  ;((result.projectSettings as JsonRecord).presentation as JsonRecord) = { localization: { sourceLocale: 'en', previewLocale: 'en', fallbackChain: ['en'], pseudolocalization: false, buildLocales: ['en'] }, accessibility: { keyboardNavigation: true, gamepadNavigation: true, screenReaderMetadata: true, focusRingColor: '#79b2ff', focusRingWidth: 3, reducedMotion: false, announceFocusChanges: true } }
  return result
}

function networkedOptionalTemplate(name: string): JsonRecord {
  const first = shape('network-player-one', 'Server Player', [-3, 0], [1.4, 1.4], { type: 'Circle', color: [92, 181, 255], body: 'Kinematic' })
  const second = shape('network-player-two', 'Remote Player', [3, 0], [1.4, 1.4], { type: 'Circle', color: [242, 153, 92], body: 'Kinematic' })
  const result = project(name, 'networked-optional', [scene('network-arena', 'Network Arena', [camera('network-camera'), first, second, ...canvasWithLabel('network-ui', 'Network Arena')])])
  result.packages = { manifestVersion: 1, installed: [{
    manifest: { manifestVersion: 1, id: 'top.whitelists.novaa.networking', name: 'Nova Optional Networking', version: '2.9.0', description: 'Bounded replication and authoritative multiplayer tools.', engine: '>=2.9.0 <5.0.0', dependencies: {}, pluginApi: null, native: false, sha256: 'official-networking-2.9.0', signature: 'nova-a-official', publisher: 'Whitelist', publisherVerified: true, permissions: ['network.client', 'network.listen'], rating: 5, securityUrl: 'https://github.com/Stevenzhang543/Nova_A/security', documentationUrl: 'https://github.com/Stevenzhang543/Nova_A/' },
    source: { kind: 'registry', location: 'Nova_A official offline package' }, enabled: true, project: true, installedAt: 0
  }], lockfile: [{ id: 'top.whitelists.novaa.networking', version: '2.9.0', source: { kind: 'registry', location: 'Nova_A official offline package' }, sha256: 'official-networking-2.9.0' }], offlineCache: [], offlineMode: true }
  ;((result.projectSettings as JsonRecord).production as JsonRecord) = {
    performance: { traceCapacity: 600, memoryBudgetMb: 300, assetBudgetMb: 512, leakWindowFrames: 600, lifetimeCapacity: 2000 }, replay: { seed: 1313822273, capacity: 3600, strictChecksums: true }, testing: { defaultTimeoutMs: 10000, tests: [{ id: 'network-headless', name: 'Network headless smoke', kind: 'headless', sceneUuid: String((result.scenes as JsonRecord[])[0].uuid), steps: 120, timeoutMs: 10000, captureScreenshot: false, assertions: [{ kind: 'finitePhysics', target: '', expected: 'true' }, { kind: 'noRuntimeErrors', target: '', expected: 'true' }] }] }, data: { saveSchemaVersion: 1, saveMigrations: [] }, jobs: { maxWorkers: 2, maxQueued: 256, timeoutMs: 15000 },
    networking: { enabled: true, role: 'host', transport: 'websocket', endpoint: 'ws://127.0.0.1:7777', bindAddress: '127.0.0.1:7777', snapshotRate: 20, interpolationMs: 100, rollbackFrames: 120, bandwidthKbps: 256, reconnect: true, replicatedEntities: [first, second].map(value => ({ entityUuid: value.uuid, authority: 'server', properties: ['transform', 'rotation', 'velocity'], interpolate: true, predict: true })) }
  }
  return result
}

export function createTemplateProject(template: ProjectTemplateId, name: string): JsonRecord {
  const result = template === 'platformer' ? platformerTemplate(name)
    : template === 'top-down' ? topDownTemplate(name)
      : template === 'physics-sandbox' ? physicsTemplate(name)
        : template === 'ui-showcase' ? uiShowcaseTemplate(name)
          : template === 'networked-optional' ? networkedOptionalTemplate(name)
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
  const entityY = (name: string): number => {
    const sourceEntity = entities.find(item => item.name === name)
    const transform = Array.isArray(sourceEntity?.components) ? (sourceEntity.components as JsonRecord[]).find(item => item.kind === 'Transform2D') : undefined
    return Number(((transform?.data as JsonRecord | undefined)?.position as JsonRecord | undefined)?.y)
  }
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
    requireComponents('SpriteRenderer2D', 'RigidBody2D', 'BoxCollider2D', 'Script2D', 'Animator', 'AudioSource', 'TileMap2D', 'Light2D', 'ShadowCaster2D', 'Canvas', 'Text')
    for (const type of ['image', 'audio', 'script', 'animation', 'controller']) if (!assetTypes.has(type)) failures.push(`missing ${type} asset`)
    if (!(entityY('Ground') < entityY('Player'))) failures.push('gravity-driven player must start above the ground')
    const scripts = assets.filter(asset => asset.assetType === 'script').map(asset => String(asset.source)).join('\n')
    if (!scripts.includes('move_character(') || !scripts.includes('can_coyote_jump(')) failures.push('platformer must demonstrate exact CharacterBody2D motion and coyote time')
  } else if (template === 'top-down') {
    requireComponents('Script2D', 'ParticleEmitter2D', 'Canvas', 'Text')
    if (scenes.length < 2) failures.push('missing scene transition target')
    for (const type of ['prefab', 'script']) if (!assetTypes.has(type)) failures.push(`missing ${type} asset`)
    const scripts = assets.filter(asset => asset.assetType === 'script').map(asset => String(asset.source)).join('\n')
    for (const api of ['instantiate(', 'scene_load(', 'save_commit(']) if (!scripts.includes(api)) failures.push(`missing ${api} tutorial call`)
  } else if (template === 'physics-sandbox') {
    requireComponents('RigidBody2D', 'DistanceJoint2D', 'BoxCollider2D', 'EllipseCollider2D')
    if (!connections.some(connection => connection.type === 'rope')) failures.push('missing Rope2D connection')
    if (!(entityY('Ground') < Math.min(entityY('Jointed Box'), entityY('Rope End'), entityY('Rope Ball')))) failures.push('sandbox bodies must start above the collision ground')
  } else if (template === 'ui-showcase') {
    requireComponents('Canvas', 'Panel', 'Text', 'TextInput', 'Button', 'Checkbox', 'ProgressBar')
    for (const type of ['localization', 'uiTheme', 'audio']) if (!assetTypes.has(type)) failures.push(`missing ${type} asset`)
  } else if (template === 'networked-optional') {
    const packages = project.packages as JsonRecord | undefined
    const installed = Array.isArray(packages?.installed) ? packages.installed as JsonRecord[] : []
    if (!installed.some(item => (item.manifest as JsonRecord | undefined)?.id === 'top.whitelists.novaa.networking')) failures.push('missing optional networking package')
    const production = ((project.projectSettings as JsonRecord | undefined)?.production as JsonRecord | undefined)?.networking as JsonRecord | undefined
    if (production?.enabled !== true || !Array.isArray(production.replicatedEntities) || production.replicatedEntities.length !== 2) failures.push('network replication is not configured')
  }
  return failures
}

export function createTemplateProjectJson(template: ProjectTemplateId, name: string): string {
  return JSON.stringify(createTemplateProject(template, name))
}

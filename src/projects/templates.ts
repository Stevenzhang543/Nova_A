import { defaultAudioSettings } from '../runtime/audio'
import { defaultInputMap } from '../runtime/input'
import { defaultCollisionMatrix } from '../world/World'
import { defaultPhysicsLayers } from '../runtime/physicsProduction'
import { newProjectMetadata } from './projectSession'
import { normalizeProjectManifest } from './projectManifest'
import { assetSourceBytes, sha256Bytes } from '../assets/contentHash'
import { defaultSceneAuthoringSettings } from '../editor/sceneAuthoring'
import {
  NOVA_ENGINE_VERSION, NOVA_PROJECT_FORMAT, NOVA_PROJECT_FORMAT_MAJOR,
  NOVA_PROJECT_SCHEMA_VERSION, projectCompatibility
} from './projectFormat'

export type ProjectTemplateCategory = 'scene' | 'test' | 'game'
export type ProjectTemplateId = 'empty' | 'mouse-knockout' | 'snake' | 'pong' | 'breakout' | 'platformer' | 'top-down' | 'physics-sandbox' | 'collision-lab' | 'rendering-lab' | 'ui-showcase' | 'networked-optional' | 'lighting-starter' | 'tile-world' | 'responsive-ui' | 'particle-lab' | 'audio-lab' | 'animation-lab' | 'physics-cleanup' | 'grid-chase'
export type ProjectTemplateDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface ProjectTemplateDescriptor {
  id: ProjectTemplateId
  category: ProjectTemplateCategory
  name: string
  description: string
  features: string[]
  difficulty: ProjectTemplateDifficulty
  setupMinutes: number
  tags: string[]
}

export const PROJECT_TEMPLATE_CATEGORIES: readonly ProjectTemplateCategory[] = ['scene', 'test', 'game'] as const

export const PROJECT_TEMPLATES: readonly ProjectTemplateDescriptor[] = [
  { id: 'empty', category: 'scene', name: 'Clear Scene', description: 'A clean scene with a configured Camera2D.', features: ['Camera2D', 'Input map', 'Build settings'], difficulty: 'beginner', setupMinutes: 2, tags: ['blank', 'camera', 'starter'] },
  { id: 'physics-sandbox', category: 'scene', name: 'Physics Sandbox', description: 'A playground for materials, ropes, joints, and collision behavior.', features: ['Rigid bodies', 'Materials', 'Rope2D', 'Joints', 'Debugger'], difficulty: 'intermediate', setupMinutes: 8, tags: ['physics', 'rope', 'joints'] },
  { id: 'platformer', category: 'scene', name: 'Platformer Scene', description: 'A playable foundation with a player, platforms, UI, animation, audio, and scripts.', features: ['Physics', 'TileMap2D', 'Animator', 'Audio', 'UI'], difficulty: 'intermediate', setupMinutes: 12, tags: ['platformer', 'character', 'tilemap'] },
  { id: 'top-down', category: 'scene', name: 'Top-down Scene', description: 'A two-scene action foundation with triggers, enemies, prefabs, particles, and save data.', features: ['Prefabs', 'Scene switch', 'Triggers', 'Particles', 'Save API'], difficulty: 'intermediate', setupMinutes: 12, tags: ['top-down', 'prefab', 'save'] },
  { id: 'lighting-starter', category: 'scene', name: 'Lighting Starter', description: 'A composed 2D scene for lights, shadows, particles, sorting, and camera framing.', features: ['2D lights', 'Shadows', 'Particles', 'Sorting', 'Camera'], difficulty: 'beginner', setupMinutes: 6, tags: ['rendering', 'lighting', 'scene'] },
  { id: 'tile-world', category: 'scene', name: 'Tile World Starter', description: 'A two-scene TileMap world with prefabs, triggers, streaming-ready data, and save hooks.', features: ['TileMap2D', 'World scenes', 'Prefabs', 'Triggers', 'Save API'], difficulty: 'intermediate', setupMinutes: 12, tags: ['tilemap', 'world', 'streaming'] },
  { id: 'responsive-ui', category: 'scene', name: 'Responsive UI Starter', description: 'A production Canvas scene with themes, localization, focus, input, audio, and responsive layout.', features: ['Canvas', 'Themes', 'Localization', 'Focus', 'Audio'], difficulty: 'beginner', setupMinutes: 7, tags: ['ui', 'responsive', 'localization'] },
  { id: 'collision-lab', category: 'test', name: 'Collision & CCD Lab', description: 'A deterministic test scene for contacts, sensors, materials, rotation, and fast continuous bodies.', features: ['CCD', 'Sensors', 'Friction', 'Restitution', 'Diagnostics'], difficulty: 'advanced', setupMinutes: 10, tags: ['physics', 'ccd', 'test'] },
  { id: 'rendering-lab', category: 'test', name: 'Rendering Lab', description: 'A visual test scene covering shapes, sprites, text, particles, lighting, and sorting.', features: ['WebGL2', 'Shapes', 'Sprites', 'Text', 'Lighting'], difficulty: 'intermediate', setupMinutes: 8, tags: ['rendering', 'webgl2', 'visual'] },
  { id: 'ui-showcase', category: 'test', name: 'UI & Input Lab', description: 'A responsive menu and HUD demonstrating themes, localization, focus, input, and audio.', features: ['Responsive UI', 'Themes', 'Localization', 'Focus', 'Audio mixer'], difficulty: 'intermediate', setupMinutes: 9, tags: ['ui', 'input', 'accessibility'] },
  { id: 'networked-optional', category: 'test', name: 'Networking Lab', description: 'An opt-in authoritative replication test with diagnostics and a headless smoke test.', features: ['Replication', 'Authority', 'Prediction', 'Diagnostics', 'Headless test'], difficulty: 'advanced', setupMinutes: 15, tags: ['network', 'multiplayer', 'headless'] },
  { id: 'particle-lab', category: 'test', name: 'Particles & Effects Lab', description: 'A renderer lab focused on emitters, imported sprites, lights, sorting, and camera composition.', features: ['Particles', 'Sprites', 'Lighting', 'Sorting', 'WebGL2'], difficulty: 'intermediate', setupMinutes: 8, tags: ['particles', 'effects', 'rendering'] },
  { id: 'audio-lab', category: 'test', name: 'Audio & UI Lab', description: 'A responsive audio-control scene with focus navigation, localization, themes, and mixer-ready clips.', features: ['Audio', 'UI controls', 'Focus', 'Themes', 'Localization'], difficulty: 'beginner', setupMinutes: 7, tags: ['audio', 'ui', 'mixer'] },
  { id: 'animation-lab', category: 'test', name: 'Animation & Character Lab', description: 'A playable character scene for Animator, clips, audio cues, TileMap collision, and runtime UI.', features: ['Animator', 'CharacterBody2D', 'Audio', 'TileMap2D', 'UI'], difficulty: 'intermediate', setupMinutes: 12, tags: ['animation', 'character', 'timeline'] },
  { id: 'mouse-knockout', category: 'game', name: 'Mouse Knockout', description: 'A complete mouse-controlled physics game with runtime spawning, scoring, and a win banner.', features: ['World-space mouse', 'Physics', 'Runtime prefabs', 'Score', 'Portable .exe'], difficulty: 'beginner', setupMinutes: 4, tags: ['mouse', 'physics', 'score'] },
  { id: 'snake', category: 'game', name: 'Snake', description: 'A classic grid game with precise movement, body growth, self-collision, scoring, and portable export.', features: ['Keyboard & gamepad', 'Growth', 'Self-collision', 'Score UI', 'Portable .exe'], difficulty: 'intermediate', setupMinutes: 5, tags: ['snake', 'grid', 'keyboard'] },
  { id: 'pong', category: 'game', name: 'Pong', description: 'A complete two-player paddle game with physical rebounds, scoring, serve resets, and a first-to-seven win state.', features: ['2 players', 'Physics', 'Score', 'Win state', 'Portable .exe'], difficulty: 'intermediate', setupMinutes: 5, tags: ['pong', 'multiplayer', 'physics'] },
  { id: 'breakout', category: 'game', name: 'Breakout', description: 'A complete paddle-and-bricks game with continuous collision, destructible bricks, score, and completion UI.', features: ['Keyboard', 'CCD', 'Destruction', 'Score', 'Portable .exe'], difficulty: 'intermediate', setupMinutes: 6, tags: ['breakout', 'bricks', 'ccd'] },
  { id: 'physics-cleanup', category: 'game', name: 'Physics Cleanup', description: 'A complete pointer-controlled arena variation: push every spawned body outside the camera and clear the board.', features: ['Pointer control', 'Physics', 'Runtime spawn', 'Score', 'Win banner'], difficulty: 'beginner', setupMinutes: 4, tags: ['mouse', 'arena', 'physics'] },
  { id: 'grid-chase', category: 'game', name: 'Grid Chase', description: 'A complete deterministic grid-chase variation with keyboard/gamepad movement, pickups, growth, score, and fail state.', features: ['Keyboard & gamepad', 'Grid movement', 'Pickups', 'Score', 'Portable .exe'], difficulty: 'intermediate', setupMinutes: 5, tags: ['grid', 'chase', 'score'] }
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
    tags: [], groups: [], persistentAcrossScenes: false, prefabAsset: null, prefabInstanceUuid: null,
    prefabSourceUuid: null, prefabOverrides: {}, entityType,
    components: [component(seed, 'Transform2D', { parentUuid: null, position: { x: position[0], y: position[1] }, rotation: 0, scale: { x: 1, y: 1 } }), ...components]
  }
}

function shape(seed: string, name: string, position: [number, number], size: [number, number], options: {
  type?: 'Box' | 'Circle' | 'Triangle'; color?: [number, number, number]; body?: 'Dynamic' | 'Kinematic' | 'Static';
  sensor?: boolean; restitution?: number; friction?: number; continuous?: boolean; scriptAsset?: string; extra?: JsonRecord[]
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
    component(seed, 'RigidBody2D', { bodyType: options.body ?? 'Dynamic', massMode: 'Automatic', density: 1, mass: Math.max(1, size[0] * size[1]), autoInertia: true, gravityScale: 1, velocity: { x: 0, y: 0 }, continuousCollision: options.continuous ? 'Continuous' : 'Discrete', sleepingAllowed: true }),
    component(seed, colliderKind, { size: { x: size[0], y: size[1] }, radiusX: size[0] / 2, radiusY: size[1] / 2, vertices, sensor: options.sensor === true, physicsLayer: 0, collisionMask: 0xffffffff, oneWay: false, material: { restitution: options.restitution ?? 0, restitutionThreshold: 1, staticFriction: options.friction ?? .55, dynamicFriction: options.friction ?? .4 } })
  ]
  if (options.scriptAsset) parts.push(component(seed, 'Script2D', { scriptAsset: `asset://${options.scriptAsset}`, properties: {} }))
  parts.push(...(options.extra ?? []))
  return entity(seed, name, position, parts, type)
}

function camera(seed = 'camera'): JsonRecord {
  return entity(seed, 'Main Camera', [0, 0], [component(seed, 'Camera2D', { active: true, orthographicSize: 10, zoom: 1, backgroundColor: { r: 20, g: 25, b: 34 }, pixelPerfect: false, viewport: { x: 0, y: 0, width: 1, height: 1 }, nearSortingLayer: -1000, farSortingLayer: 1000 })])
}

function cameraAtSize(seed: string, orthographicSize: number): JsonRecord {
  const result = camera(seed)
  const cameraData = (result.components as JsonRecord[]).find(value => value.kind === 'Camera2D')?.data as JsonRecord
  cameraData.orthographicSize = orthographicSize
  return result
}

function setInitialVelocity(value: JsonRecord, x: number, y: number): JsonRecord {
  const rigidBody = (value.components as JsonRecord[]).find(item => item.kind === 'RigidBody2D')?.data as JsonRecord | undefined
  if (rigidBody) rigidBody.velocity = { x, y }
  return value
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
  return { ...textAsset(seed, `${name}.rhai`, 'script', `Assets/Scripts/${name}.rhai`, source, 'text/x-rhai'), script: { version: 1, apiVersion: 2, breakpoints: [], breakpointDetails: [], tests: [], packageDependencies: [], packageName: '', reloadPolicy: 'preserve', signalConnections: [], recoverySource: '', lastSavedHash: '' } }
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
    authoringSettings: defaultSceneAuthoringSettings(1),
    globalSettings: { gravity: 9.80665, airFriction: .01, timeScale: 1, tickRate: 60, maxCatchUpSteps: 8, collisionMatrix: defaultCollisionMatrix(), interpolation: 'Interpolate', layers: defaultPhysicsLayers() },
    entities, connections
  }
}

function project(name: string, template: ProjectTemplateId, scenes: JsonRecord[], assets: JsonRecord[] = [], tutorial?: string): JsonRecord {
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
    assets: [textAsset(`tutorial-${template}`, 'Getting Started.md', 'other', 'Assets/Tutorials/Getting Started.md', tutorial ?? `---\ndismissible: true\ntemplate: ${template}\n---\n# Welcome to ${name}\n\nThis project was created from the **${template}** template. Open the Scene, Assets, Script, Debug, and Manage workspaces to explore the configured systems. Dismiss this tutorial from its Asset Inspector when you are ready.`, 'text/markdown'), ...assets],
    assetFolders: ['Assets', 'Assets/Tutorials', 'Assets/Scenes', 'Assets/Sprites', 'Assets/Audio', 'Assets/Scripts', 'Assets/Fonts', 'Assets/Prefabs', 'Assets/Tiles', 'Assets/TileSets', 'Assets/Materials', 'Assets/Animations', 'Assets/Controllers', 'ProjectSettings', '.nova/cache', '.nova/imported'],
    assetDatabase: { version: 2, favorites: [], savedFilters: [], importPresets: [], collections: [], contentGroups: [{ id: 'main', name: 'Main', mode: 'embedded', optional: false }], viewMode: 'grid', thumbnailSize: 112 },
    plugins: [],
    packages: { manifestVersion: 1, installed: [], lockfile: [], offlineCache: [], offlineMode: true },
    projectSettings: {
      inputMap: defaultInputMap(), audio: defaultAudioSettings(), scripting: { apiVersion: 2, customSignals: [], maxConsoleEntries: 2000, debuggerEnabled: true, hotReloadEnabled: true, breakOnRuntimeError: true, deterministicTestSeed: 1, externalEditorProtocol: true },
      rendering: { lightingEnabled: false, ambientColor: { r: 255, g: 255, b: 255 }, ambientIntensity: 1, shadowQuality: 'Soft', colorSpace: 'sRGB', postProcessing: { enabled: false, exposure: 0, contrast: 1, saturation: 1, vignette: 0, bloom: 0, blur: 0, userMaterial: null }, debugView: 'None' },
      build: {
        gameName: name, target: 'windows', architecture: 'x86_64', runtimeMode: 'game', profile: 'debug', sceneOrder: sceneIds, startupSceneUuid: sceneIds[0], packageIntoExecutable: true, developmentBuild: true, outputDirectory: '',
        platform: { identifier: `top.whitelists.${name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'game'}`, version: '1.0.0', iconAsset: null, splashAsset: null, orientation: 'auto', permissions: [], signingMode: 'none', signingIdentity: '', notarizationProfile: '' },
        delivery: {
          deterministic: true, incremental: true, compression: 'balanced', patchManifest: true, structuredLogs: true,
          crashReports: true, telemetryEnabled: false, telemetryEndpoint: '', privacyPolicyUrl: '',
          cacheMode: 'incremental', include: ['Assets/**'], exclude: ['**/*.psd', '**/*.kra', '.nova/**'],
          stripUnusedAssets: false, sizeReport: true, dependencyReport: true, debugSymbols: true, crashSymbols: true,
          releaseChannel: 'development', exportTemplate: 'windows-x64-v1', provenance: true, sbom: true, webHeaders: true,
          deploymentMode: 'local', deploymentDestination: '', signingHook: '', notarizationHook: '', cleanMachineJob: false,
          contentCache: true, deltaBuilds: true, ciMatrixVersion: 1, deploymentConnectorId: 'local', deploymentPermissionGranted: false
        }
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

function prefabAsset(seed: string, name: string, root: JsonRecord): JsonRecord {
  const document = {
    prefabVersion: 2,
    name,
    bundle: { entities: [root], connections: [], rootUuids: [root.uuid] },
    variantOf: null,
    sourceChecksum: 'template',
    createdAt: new Date(0).toISOString()
  }
  return textAsset(seed, `${name}.nova-prefab`, 'prefab', `Assets/Prefabs/${name}.nova-prefab`, JSON.stringify(document), 'application/x-nova-prefab')
}

function mouseKnockoutTemplate(name: string): JsonRecord {
  const managerScriptId = stableUuid('asset:mouse-knockout-manager')
  const targetPrefabId = stableUuid('asset:mouse-knockout-target-prefab')
  const targetReference = `asset://${targetPrefabId}`
  const managerSource = `@export(type="int", min=1, max=64, step=1, group="Game", tooltip="Targets that must leave the camera view") let remaining = 8;
fn start() {
  score_set(0.0);
  entity_set_enabled(find_entity_handle("Congratulations Bar"), false);
  entity_set_enabled(find_entity_handle("Congratulations Text"), false);
  ui_set_text_on(find_entity_handle("Score Text"), "Score  0 / 8");
  spawn_at("${targetReference}", -6.0, -3.8, 0.0, 1.0, 1.0);
  spawn_at("${targetReference}", -2.2, -3.4, 0.0, 1.0, 1.0);
  spawn_at("${targetReference}", 2.2, -3.4, 0.0, 1.0, 1.0);
  spawn_at("${targetReference}", 6.0, -3.8, 0.0, 1.0, 1.0);
  spawn_at("${targetReference}", -6.0, 3.8, 0.0, 1.0, 1.0);
  spawn_at("${targetReference}", -2.2, 3.4, 0.0, 1.0, 1.0);
  spawn_at("${targetReference}", 2.2, 3.4, 0.0, 1.0, 1.0);
  spawn_at("${targetReference}", 6.0, 3.8, 0.0, 1.0, 1.0);
  timer_start("bounds", 0.05, true);
}
fn on_timer(name) {
  if name != "bounds" || remaining <= 0 { return; }
  let previous = remaining;
  let margin = 0.8;
  for target in query_group("knockout-target", 16) {
    let x = entity_position_x_on(target);
    let y = entity_position_y_on(target);
    if x < view_min_x() - margin || x > view_max_x() + margin || y < view_min_y() - margin || y > view_max_y() + margin {
      entity_destroy(target);
      score_add(1.0);
      remaining = remaining - 1;
    }
  }
  if remaining != previous {
    ui_set_text_on(find_entity_handle("Score Text"), \`Score  \${8 - remaining} / 8\`);
  }
  if remaining == 0 {
    timer_cancel("bounds");
    entity_set_enabled(find_entity_handle("Congratulations Bar"), true);
    entity_set_enabled(find_entity_handle("Congratulations Text"), true);
  }
}`
  const player = shape('mouse-knockout-player', 'Mouse Player', [0, 0], [1.6, 1.6], {
    body: 'Kinematic', color: [94, 181, 255], restitution: .7, friction: .08,
    extra: [component('mouse-knockout-player', 'MouseFollower2D', { offset: { x: 0, y: 0 }, maximumSpeed: 40 })]
  })
  const targetPrefabRoot = shape('mouse-knockout-target-prefab-root', 'Knockout Target', [0, 0], [1.25, 1.25], {
    body: 'Dynamic', color: [246, 157, 91], restitution: .86, friction: .08
  })
  targetPrefabRoot.groups = ['knockout-target']
  const manager = entity('mouse-knockout-manager', 'Game Manager', [0, 0], [
    component('mouse-knockout-manager', 'Script2D', { scriptAsset: `asset://${managerScriptId}`, properties: {} })
  ])
  const canvasUuid = stableUuid('entity:mouse-knockout-canvas')
  const canvas = entity('mouse-knockout-canvas', 'Game HUD', [0, 0], [
    component('mouse-knockout-canvas', 'RectTransform', { parentUuid: null, anchorPreset: 'stretch', position: { x: 0, y: 0 }, size: { x: 1920, y: 1080 } }),
    component('mouse-knockout-canvas', 'Canvas', { referenceSize: { x: 1920, y: 1080 }, scaleWithScreen: true, sortingOrder: 100 })
  ])
  const score = uiElement('mouse-knockout-score', 'Score Text', canvasUuid, [-710, -470], [420, 64], 'Text', { text: 'Score  0 / 8', fontSize: 30, fontWeight: 700, align: 'left', color: { r: 242, g: 247, b: 255 }, opacity: 100 })
  const help = uiElement('mouse-knockout-help', 'Instruction Text', canvasUuid, [0, -470], [920, 64], 'Text', { text: 'Move the blue block with your mouse. Knock every orange target out of view.', fontSize: 23, fontWeight: 560, align: 'center', color: { r: 211, g: 220, b: 234 }, opacity: 100 })
  const winBar = uiElement('mouse-knockout-win-bar', 'Congratulations Bar', canvasUuid, [0, 0], [820, 150], 'Panel', { color: { r: 24, g: 56, b: 48 }, opacity: 97, cornerRadius: 24, clipping: true })
  const winText = uiElement('mouse-knockout-win-text', 'Congratulations Text', canvasUuid, [0, 0], [760, 100], 'Text', { text: 'Congratulations!  All targets cleared.', fontSize: 36, fontWeight: 750, align: 'center', color: { r: 185, g: 255, b: 220 }, opacity: 100 })
  winBar.enabled = false
  winText.enabled = false
  const gameScene = scene('mouse-knockout', 'Mouse Knockout Arena', [camera('mouse-knockout-camera'), player, manager, canvas, score, help, winBar, winText])
  ;(gameScene.globalSettings as JsonRecord).gravity = 0
  const tutorial = `---
dismissible: true
template: mouse-knockout
---
# Mouse Knockout — playable starter

Press **Play**, move the blue block with the mouse, and knock all eight orange targets outside the camera view. Every cleared target adds one point; the completion banner appears at 8 / 8.

## Where the game logic lives

- **MouseFollower2D** converts the Game-view pointer to world coordinates inside the native fixed-step runtime. The template's 40-world-unit/s cap keeps collision impulses stable; 0 remains the optional unrestricted mode.
- **KnockoutGameManager.rhai** spawns eight instances from **Knockout Target.nova-prefab**, checks the prefab's **knockout-target** group on a 50 ms timer, scores and destroys out-of-view targets, updates **Score Text**, and reveals the two congratulations UI objects.

## Build a Windows game

Open **Manage → Build Settings**, keep **Windows / x86_64 / Game / Package into executable**, select this scene as Startup, then choose **Build & Run** in the desktop editor. Browser-only editor sessions can make a web build but cannot compile a native .exe.`
  return project(name, 'mouse-knockout', [gameScene], [
    scriptAsset('mouse-knockout-manager', 'KnockoutGameManager', managerSource),
    prefabAsset('mouse-knockout-target-prefab', 'Knockout Target', targetPrefabRoot)
  ], tutorial)
}

function snakeTemplate(name: string): JsonRecord {
  const headScriptId = stableUuid('asset:snake-head-controller')
  const foodScriptId = stableUuid('asset:snake-food-controller')
  const scoreScriptId = stableUuid('asset:snake-score-controller')
  const segmentScriptIds = Array.from({ length: 8 }, (_, index) => stableUuid(`asset:snake-segment-${index + 1}`))
  const headSource = `@export(type="float", min=-1, max=1, step=1, group="Runtime", tooltip="Current horizontal grid direction") let direction_x = 1.0;\n@export(type="float", min=-1, max=1, step=1, group="Runtime", tooltip="Current vertical grid direction") let direction_y = 0.0;\n@export(type="bool", group="Runtime", tooltip="Whether the snake is accepting movement") let running = true;\nfn start() { running = true; timer_start("snake-step", 0.16, true); }\nfn update(dt) {\n  if !running { return; }\n  if input_pressed("MoveUp") && direction_y != 1.0 { direction_x = 0.0; direction_y = -1.0; }\n  if input_pressed("MoveDown") && direction_y != -1.0 { direction_x = 0.0; direction_y = 1.0; }\n  if input_pressed("MoveLeft") && direction_x != 1.0 { direction_x = -1.0; direction_y = 0.0; }\n  if input_pressed("MoveRight") && direction_x != -1.0 { direction_x = 1.0; direction_y = 0.0; }\n}\nfn on_timer(name) {\n  if name != "snake-step" || !running { return; }\n  let pose = transform();\n  let next_x = pose.position_x + direction_x * 1.2;\n  let next_y = pose.position_y + direction_y * 1.2;\n  if next_x > 8.4 { next_x = -8.4; }\n  if next_x < -8.4 { next_x = 8.4; }\n  if next_y > 4.8 { next_y = -4.8; }\n  if next_y < -4.8 { next_y = 4.8; }\n  signal_emit("snake.segment.1", #{ x: pose.position_x, y: pose.position_y });\n  set_position(next_x, next_y);\n}\nfn on_signal(name, payload, source) {\n  if name == "snake.game.over" { running = false; timer_cancel("snake-step"); }\n}`
  const segmentSource = (index: number) => `fn on_signal(name, payload, source) {\n  if name != "snake.segment.${index}" { return; }\n  let pose = transform();\n  let target_x = payload.x.to_float();\n  let target_y = payload.y.to_float();\n  set_position(target_x, target_y);${index < 8 ? `\n  signal_emit("snake.segment.${index + 1}", #{ x: pose.position_x, y: pose.position_y });` : ''}\n}\nfn on_trigger_enter(other, px, py, nx, ny, rvx, rvy) {\n  if other == find_entity("Snake Head") { signal_emit("snake.game.over", ${index}); }\n}`
  const foodSource = `@export(type="int", min=0, max=7, step=1, group="Runtime", tooltip="Next grid-safe food position") let food_index = 0;\nfn on_trigger_enter(other, px, py, nx, ny, rvx, rvy) {\n  if other != find_entity("Snake Head") { return; }\n  signal_emit("snake.scored", 1);\n  food_index = (food_index + 1) % 8;\n  if food_index == 0 { set_position(4.8, 1.2); }\n  else if food_index == 1 { set_position(-4.8, -2.4); }\n  else if food_index == 2 { set_position(7.2, 3.6); }\n  else if food_index == 3 { set_position(0.0, -4.8); }\n  else if food_index == 4 { set_position(-7.2, 4.8); }\n  else if food_index == 5 { set_position(3.6, -1.2); }\n  else if food_index == 6 { set_position(-2.4, 3.6); }\n  else { set_position(8.4, 0.0); }\n}`
  const scoreSource = `@export(type="int", min=0, max=999999, step=1, group="Game", tooltip="Collected food") let score = 0;\n@export(type="bool", group="Runtime", tooltip="Whether self-collision ended the run") let game_over = false;\nfn start() {\n  score = 0; game_over = false; ui_set_text("Score  0");\n  entity_set_enabled(find_entity_handle("Game Over Panel"), false);\n  entity_set_enabled(find_entity_handle("Game Over Text"), false);\n}\nfn on_signal(name, payload, source) {\n  if name == "snake.game.over" {\n    if game_over { return; }\n    game_over = true;\n    entity_set_enabled(find_entity_handle("Game Over Panel"), true);\n    entity_set_enabled(find_entity_handle("Game Over Text"), true);\n    return;\n  }\n  if name != "snake.scored" || game_over { return; }\n  score = score + 1;\n  ui_set_text(\`Score  \${score}\`);\n  if score == 1 { entity_set_enabled(find_entity_handle("Snake Segment 4"), true); }\n  else if score == 2 { entity_set_enabled(find_entity_handle("Snake Segment 5"), true); }\n  else if score == 3 { entity_set_enabled(find_entity_handle("Snake Segment 6"), true); }\n  else if score == 4 { entity_set_enabled(find_entity_handle("Snake Segment 7"), true); }\n  else if score == 5 { entity_set_enabled(find_entity_handle("Snake Segment 8"), true); }\n}`
  const head = shape('snake-head', 'Snake Head', [0, 0], [1, 1], { body: 'Kinematic', color: [94, 203, 181], scriptAsset: headScriptId })
  const segments = segmentScriptIds.map((scriptId, offset) => {
    const index = offset + 1
    const segment = shape(`snake-segment-${index}`, `Snake Segment ${index}`, [-1.2 * index, 0], [1, 1], { body: 'Kinematic', sensor: true, color: [67 + index * 6, 159 + index * 4, 143 + index * 3], scriptAsset: scriptId })
    if (index > 3) segment.enabled = false
    return segment
  })
  const food = shape('snake-food', 'Food', [4.8, 1.2], [.9, .9], { type: 'Circle', body: 'Static', sensor: true, color: [242, 118, 118], scriptAsset: foodScriptId })
  const canvasUuid = stableUuid('entity:snake-ui-canvas')
  const canvas = entity('snake-ui-canvas', 'HUD Canvas', [0, 0], [
    component('snake-ui-canvas', 'RectTransform', { parentUuid: null, anchorPreset: 'stretch', position: { x: 0, y: 0 }, size: { x: 1920, y: 1080 }, focusable: false, skipNavigation: true }),
    component('snake-ui-canvas', 'Canvas', { referenceSize: { x: 1920, y: 1080 }, scaleWithScreen: true, sortingOrder: 100 })
  ])
  const score = entity('snake-score', 'Score', [0, 0], [
    component('snake-score', 'RectTransform', { parentUuid: canvasUuid, anchorPreset: 'top-left', position: { x: 44, y: 38 }, size: { x: 340, y: 70 }, focusable: false, skipNavigation: true, accessibilityLabel: 'Score' }),
    component('snake-score', 'Text', { text: 'Score  0', fontSize: 32, fontWeight: 760, align: 'left', color: { r: 239, g: 245, b: 255 }, opacity: 100 }),
    component('snake-score', 'Script2D', { scriptAsset: `asset://${scoreScriptId}`, properties: {} })
  ])
  ;(score.components as JsonRecord[])[0] = component('snake-score', 'Transform2D', { parentUuid: canvasUuid, position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } })
  const controls = entity('snake-controls', 'Controls', [0, 0], [
    component('snake-controls', 'RectTransform', { parentUuid: canvasUuid, anchorPreset: 'bottom', position: { x: 0, y: -34 }, size: { x: 900, y: 54 }, focusable: false, skipNavigation: true, accessibilityLabel: 'Movement controls' }),
    component('snake-controls', 'Text', { text: 'Move: Arrow keys / WASD / gamepad D-pad', fontSize: 22, fontWeight: 620, align: 'center', color: { r: 176, g: 190, b: 210 }, opacity: 100 })
  ])
  ;(controls.components as JsonRecord[])[0] = component('snake-controls', 'Transform2D', { parentUuid: canvasUuid, position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } })
  const gameOverPanel = uiElement('snake-game-over-panel', 'Game Over Panel', canvasUuid, [0, 0], [720, 160], 'Panel', { color: { r: 52, g: 31, b: 43 }, opacity: 98, cornerRadius: 24, clipping: true })
  const gameOverText = uiElement('snake-game-over-text', 'Game Over Text', canvasUuid, [0, 0], [660, 100], 'Text', { text: 'Game over — the snake hit its body.', fontSize: 34, fontWeight: 760, align: 'center', color: { r: 255, g: 201, b: 216 }, opacity: 100 })
  gameOverPanel.enabled = false
  gameOverText.enabled = false
  const gameScene = scene('snake-game', 'Snake Game', [camera('snake-camera'), head, ...segments, food, canvas, score, controls, gameOverPanel, gameOverText])
  ;(gameScene.globalSettings as JsonRecord).gravity = 0
  const result = project(name, 'snake', [gameScene], [
    scriptAsset('snake-head-controller', 'SnakeHead', headSource),
    ...segmentScriptIds.map((_, index) => scriptAsset(`snake-segment-${index + 1}`, `SnakeSegment${index + 1}`, segmentSource(index + 1))),
    scriptAsset('snake-food-controller', 'SnakeFood', foodSource),
    scriptAsset('snake-score-controller', 'SnakeScore', scoreSource)
  ], `---\ndismissible: true\ntemplate: snake\n---\n# Snake\n\nPress **Play** and steer with **WASD**, **Arrow keys**, or a gamepad D-pad. Food always appears on the same 1.2-world-unit grid used by the head. Each of the first five pickups enables another linked body segment. Crossing the screen edge wraps to the opposite side; touching the snake's own body stops the timer and shows the game-over panel.`)
  ;((result.projectSettings as JsonRecord).inputMap as JsonRecord[]) = [
    { name: 'MoveUp', kind: 'button', bindings: [{ device: 'keyboard', code: 'ArrowUp' }, { device: 'keyboard', code: 'KeyW' }, { device: 'gamepad-button', code: '12' }] },
    { name: 'MoveDown', kind: 'button', bindings: [{ device: 'keyboard', code: 'ArrowDown' }, { device: 'keyboard', code: 'KeyS' }, { device: 'gamepad-button', code: '13' }] },
    { name: 'MoveLeft', kind: 'button', bindings: [{ device: 'keyboard', code: 'ArrowLeft' }, { device: 'keyboard', code: 'KeyA' }, { device: 'gamepad-button', code: '14' }] },
    { name: 'MoveRight', kind: 'button', bindings: [{ device: 'keyboard', code: 'ArrowRight' }, { device: 'keyboard', code: 'KeyD' }, { device: 'gamepad-button', code: '15' }] }
  ]
  return result
}

function pongTemplate(name: string): JsonRecord {
  const leftScriptId = stableUuid('asset:pong-left-paddle')
  const rightScriptId = stableUuid('asset:pong-right-paddle')
  const ballScriptId = stableUuid('asset:pong-ball')
  const managerScriptId = stableUuid('asset:pong-manager')
  const paddleSource = (action: string) => `@export(type="float", min=1, max=20, step=0.1, group="Movement", tooltip="Paddle speed in world units per second") let speed = 10.0;
fn fixed_update(dt) {
  let pose = transform();
  let next_y = pose.position_y + input_axis("${action}") * speed * dt;
  if next_y > 4.25 { next_y = 4.25; }
  if next_y < -4.25 { next_y = -4.25; }
  set_position(pose.position_x, next_y);
}`
  const ballSource = `fn serve(direction) {
  set_position(0.0, 0.0);
  set_velocity(direction * 8.5, random_range(-3.8, 3.8));
}
fn start() {
  serve(1.0);
  timer_start("score-check", 0.03, true);
}
fn on_timer(name) {
  if name != "score-check" { return; }
  let pose = transform();
  if pose.position_x < view_min_x() - 0.4 {
    signal_emit("pong.point.right", 1);
    serve(-1.0);
  } else if pose.position_x > view_max_x() + 0.4 {
    signal_emit("pong.point.left", 1);
    serve(1.0);
  }
}`
  const managerSource = `@export(type="int", min=1, max=99, step=1, group="Rules", tooltip="Points needed to win") let winning_score = 7;
@export(type="int", min=0, max=99, step=1, group="Runtime", tooltip="Left player score") let left_score = 0;
@export(type="int", min=0, max=99, step=1, group="Runtime", tooltip="Right player score") let right_score = 0;
fn start() {
  score_set(0.0);
  ui_set_text_on(find_entity_handle("Pong Score"), "0   :   0");
  entity_set_enabled(find_entity_handle("Victory Panel"), false);
  entity_set_enabled(find_entity_handle("Victory Text"), false);
}
fn on_signal(name, payload, source) {
  if name == "pong.point.left" { left_score = left_score + 1; }
  else if name == "pong.point.right" { right_score = right_score + 1; }
  else { return; }
  score_add(1.0);
  ui_set_text_on(find_entity_handle("Pong Score"), \`${'${left_score}'}   :   ${'${right_score}'}\`);
  if left_score >= winning_score || right_score >= winning_score {
    entity_set_enabled(find_entity_handle("Ball"), false);
    entity_set_enabled(find_entity_handle("Victory Panel"), true);
    entity_set_enabled(find_entity_handle("Victory Text"), true);
    if left_score > right_score { ui_set_text_on(find_entity_handle("Victory Text"), "Left player wins!"); }
    else { ui_set_text_on(find_entity_handle("Victory Text"), "Right player wins!"); }
  }
}`
  const manager = entity('pong-manager', 'Game Manager', [0, 0], [component('pong-manager', 'Script2D', { scriptAsset: `asset://${managerScriptId}`, properties: {} })])
  const left = shape('pong-left', 'Left Paddle', [-8.6, 0], [.55, 2.6], { body: 'Kinematic', color: [95, 184, 255], restitution: 1, friction: 0, scriptAsset: leftScriptId })
  const right = shape('pong-right', 'Right Paddle', [8.6, 0], [.55, 2.6], { body: 'Kinematic', color: [255, 166, 94], restitution: 1, friction: 0, scriptAsset: rightScriptId })
  const ball = setInitialVelocity(shape('pong-ball', 'Ball', [0, 0], [.58, .58], { type: 'Circle', color: [242, 247, 255], restitution: 1, friction: 0, continuous: true, scriptAsset: ballScriptId }), 8.5, 2.4)
  const walls = [
    shape('pong-top-wall', 'Top Wall', [0, 5.72], [19.8, .35], { body: 'Static', color: [76, 89, 107], restitution: 1, friction: 0 }),
    shape('pong-bottom-wall', 'Bottom Wall', [0, -5.72], [19.8, .35], { body: 'Static', color: [76, 89, 107], restitution: 1, friction: 0 })
  ]
  const canvasUuid = stableUuid('entity:pong-canvas')
  const canvas = entity('pong-canvas', 'Pong HUD', [0, 0], [
    component('pong-canvas', 'RectTransform', { parentUuid: null, anchorPreset: 'stretch', position: { x: 0, y: 0 }, size: { x: 1920, y: 1080 } }),
    component('pong-canvas', 'Canvas', { referenceSize: { x: 1920, y: 1080 }, scaleWithScreen: true, sortingOrder: 100 })
  ])
  const score = uiElement('pong-score', 'Pong Score', canvasUuid, [0, -455], [520, 80], 'Text', { text: '0   :   0', fontSize: 42, fontWeight: 760, align: 'center', color: { r: 240, g: 246, b: 255 }, opacity: 100 })
  const controls = uiElement('pong-controls', 'Controls', canvasUuid, [0, 470], [1000, 56], 'Text', { text: 'Left: W / S     Right: Arrow Up / Arrow Down     First to 7 wins', fontSize: 22, fontWeight: 600, align: 'center', color: { r: 181, g: 195, b: 216 }, opacity: 100 })
  const victoryPanel = uiElement('pong-victory-panel', 'Victory Panel', canvasUuid, [0, 0], [700, 150], 'Panel', { color: { r: 26, g: 54, b: 67 }, opacity: 98, cornerRadius: 24, clipping: true })
  const victoryText = uiElement('pong-victory-text', 'Victory Text', canvasUuid, [0, 0], [640, 90], 'Text', { text: 'Left player wins!', fontSize: 38, fontWeight: 760, align: 'center', color: { r: 187, g: 229, b: 255 }, opacity: 100 })
  victoryPanel.enabled = false
  victoryText.enabled = false
  const gameScene = scene('pong-game', 'Pong Arena', [cameraAtSize('pong-camera', 6), manager, ...walls, left, right, ball, canvas, score, controls, victoryPanel, victoryText])
  ;(gameScene.globalSettings as JsonRecord).gravity = 0
  const result = project(name, 'pong', [gameScene], [
    scriptAsset('pong-left-paddle', 'PongLeftPaddle', paddleSource('P1Vertical')),
    scriptAsset('pong-right-paddle', 'PongRightPaddle', paddleSource('P2Vertical')),
    scriptAsset('pong-ball', 'PongBall', ballSource),
    scriptAsset('pong-manager', 'PongManager', managerSource)
  ], `---\ndismissible: true\ntemplate: pong\n---\n# Pong\n\nPress **Play**. The left player uses **W/S**, the right player uses **Arrow Up/Down**, and the first player to seven points wins. The ball uses continuous collision detection and physical restitution.`)
  ;((result.projectSettings as JsonRecord).inputMap as JsonRecord[]) = [
    { name: 'P1Vertical', kind: 'axis', bindings: [{ device: 'keyboard', code: 'KeyW', scale: 1, x: 0, y: 1, gamepad: 0, deadzone: .15 }, { device: 'keyboard', code: 'KeyS', scale: -1, x: 0, y: -1, gamepad: 0, deadzone: .15 }] },
    { name: 'P2Vertical', kind: 'axis', bindings: [{ device: 'keyboard', code: 'ArrowUp', scale: 1, x: 0, y: 1, gamepad: 0, deadzone: .15 }, { device: 'keyboard', code: 'ArrowDown', scale: -1, x: 0, y: -1, gamepad: 0, deadzone: .15 }] }
  ]
  return result
}

function breakoutTemplate(name: string): JsonRecord {
  const paddleScriptId = stableUuid('asset:breakout-paddle')
  const ballScriptId = stableUuid('asset:breakout-ball')
  const brickScriptId = stableUuid('asset:breakout-brick')
  const managerScriptId = stableUuid('asset:breakout-manager')
  const paddleSource = `@export(type="float", min=1, max=25, step=0.1, group="Movement", tooltip="Paddle speed") let speed = 13.0;
fn fixed_update(dt) {
  let pose = transform();
  let next_x = pose.position_x + input_axis("MoveHorizontal") * speed * dt;
  if next_x > 7.7 { next_x = 7.7; }
  if next_x < -7.7 { next_x = -7.7; }
  set_position(next_x, pose.position_y);
}`
  const ballSource = `fn reset_ball() {
  set_position(0.0, -3.4);
  // Keep a guaranteed horizontal component so the ball can never enter a vertical lock.
  set_velocity(random_range(2.8, 4.8), 8.2);
}
fn start() {
  reset_ball();
  timer_start("bounds", 0.03, true);
}
fn on_timer(name) {
  if name == "bounds" && transform().position_y < view_min_y() - 0.5 { reset_ball(); }
}`
  const brickSource = `fn on_collision_enter(other, px, py, nx, ny, rvx, rvy) {
  if other != find_entity("Ball") { return; }
  score_add(1.0);
  signal_emit("breakout.brick", 1);
  destroy();
}`
  const managerSource = `@export(type="int", min=1, max=200, step=1, group="Rules", tooltip="Authored brick count") let brick_count = 24;
fn start() {
  score_set(0.0);
  ui_set_text_on(find_entity_handle("Breakout Score"), "Bricks  0 / 24");
  entity_set_enabled(find_entity_handle("Clear Panel"), false);
  entity_set_enabled(find_entity_handle("Clear Text"), false);
}
fn on_signal(name, payload, source) {
  if name != "breakout.brick" { return; }
  let cleared = score_get().to_int();
  ui_set_text_on(find_entity_handle("Breakout Score"), \`Bricks  ${'${cleared}'} / ${'${brick_count}'}\`);
  if cleared >= brick_count {
    entity_set_enabled(find_entity_handle("Ball"), false);
    entity_set_enabled(find_entity_handle("Clear Panel"), true);
    entity_set_enabled(find_entity_handle("Clear Text"), true);
  }
}`
  const manager = entity('breakout-manager', 'Game Manager', [0, 0], [component('breakout-manager', 'Script2D', { scriptAsset: `asset://${managerScriptId}`, properties: {} })])
  const paddle = shape('breakout-paddle', 'Paddle', [0, -4.8], [3, .48], { body: 'Kinematic', color: [91, 176, 255], restitution: 1, friction: 0, scriptAsset: paddleScriptId })
  const ball = setInitialVelocity(shape('breakout-ball', 'Ball', [0, -3.4], [.5, .5], { type: 'Circle', color: [247, 250, 255], restitution: 1, friction: 0, continuous: true, scriptAsset: ballScriptId }), 4.8, 8.2)
  const walls = [
    shape('breakout-left-wall', 'Left Wall', [-9.65, 0], [.35, 11.7], { body: 'Static', color: [77, 91, 110], restitution: 1, friction: 0 }),
    shape('breakout-right-wall', 'Right Wall', [9.65, 0], [.35, 11.7], { body: 'Static', color: [77, 91, 110], restitution: 1, friction: 0 }),
    shape('breakout-top-wall', 'Top Wall', [0, 5.72], [19.6, .35], { body: 'Static', color: [77, 91, 110], restitution: 1, friction: 0 })
  ]
  const palette: Array<[number, number, number]> = [[245, 113, 121], [244, 164, 92], [239, 204, 99]]
  const bricks = Array.from({ length: 24 }, (_, index) => {
    const row = Math.floor(index / 8), column = index % 8
    return shape(`breakout-brick-${index}`, `Brick ${index + 1}`, [-7.7 + column * 2.2, 1.5 + row * 1.1], [1.85, .7], { body: 'Static', color: palette[row], restitution: 1, friction: 0, scriptAsset: brickScriptId })
  })
  const canvasUuid = stableUuid('entity:breakout-canvas')
  const canvas = entity('breakout-canvas', 'Breakout HUD', [0, 0], [
    component('breakout-canvas', 'RectTransform', { parentUuid: null, anchorPreset: 'stretch', position: { x: 0, y: 0 }, size: { x: 1920, y: 1080 } }),
    component('breakout-canvas', 'Canvas', { referenceSize: { x: 1920, y: 1080 }, scaleWithScreen: true, sortingOrder: 100 })
  ])
  const score = uiElement('breakout-score', 'Breakout Score', canvasUuid, [-690, -470], [430, 64], 'Text', { text: 'Bricks  0 / 24', fontSize: 29, fontWeight: 720, align: 'left', color: { r: 239, g: 245, b: 255 }, opacity: 100 })
  const controls = uiElement('breakout-controls', 'Controls', canvasUuid, [0, 470], [850, 54], 'Text', { text: 'Move paddle: A / D or Left / Right', fontSize: 22, fontWeight: 600, align: 'center', color: { r: 181, g: 195, b: 216 }, opacity: 100 })
  const clearPanel = uiElement('breakout-clear-panel', 'Clear Panel', canvasUuid, [0, 0], [760, 150], 'Panel', { color: { r: 24, g: 60, b: 49 }, opacity: 98, cornerRadius: 24, clipping: true })
  const clearText = uiElement('breakout-clear-text', 'Clear Text', canvasUuid, [0, 0], [700, 90], 'Text', { text: 'Board cleared — congratulations!', fontSize: 36, fontWeight: 760, align: 'center', color: { r: 183, g: 255, b: 219 }, opacity: 100 })
  clearPanel.enabled = false
  clearText.enabled = false
  const gameScene = scene('breakout-game', 'Breakout Board', [cameraAtSize('breakout-camera', 6), manager, ...walls, paddle, ball, ...bricks, canvas, score, controls, clearPanel, clearText])
  ;(gameScene.globalSettings as JsonRecord).gravity = 0
  const result = project(name, 'breakout', [gameScene], [
    scriptAsset('breakout-paddle', 'BreakoutPaddle', paddleSource), scriptAsset('breakout-ball', 'BreakoutBall', ballSource),
    scriptAsset('breakout-brick', 'BreakoutBrick', brickSource), scriptAsset('breakout-manager', 'BreakoutManager', managerSource)
  ], `---\ndismissible: true\ntemplate: breakout\n---\n# Breakout\n\nPress **Play**, move with **A/D** or **Left/Right**, and clear all 24 bricks. The ball uses continuous collision detection, each brick is a real collider, and the HUD is driven by runtime signals.`)
  ;((result.projectSettings as JsonRecord).inputMap as JsonRecord[]) = [{ name: 'MoveHorizontal', kind: 'axis', bindings: [
    { device: 'keyboard', code: 'KeyA', scale: -1, x: -1, y: 0, gamepad: 0, deadzone: .15 }, { device: 'keyboard', code: 'ArrowLeft', scale: -1, x: -1, y: 0, gamepad: 0, deadzone: .15 },
    { device: 'keyboard', code: 'KeyD', scale: 1, x: 1, y: 0, gamepad: 0, deadzone: .15 }, { device: 'keyboard', code: 'ArrowRight', scale: 1, x: 1, y: 0, gamepad: 0, deadzone: .15 }
  ] }]
  return result
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
    prefabAsset('top-enemy-prefab', 'Enemy', enemy),
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

function collisionLabTemplate(name: string): JsonRecord {
  const ramp = shape('collision-lab-ramp', 'Rotated Ramp', [-3.4, -1.5], [6.5, .65], { body: 'Static', color: [104, 120, 139], friction: .9 })
  const rampTransform = (ramp.components as JsonRecord[]).find(value => value.kind === 'Transform2D')?.data as JsonRecord
  rampTransform.rotation = .24
  const bullet = setInitialVelocity(shape('collision-lab-bullet', 'CCD Bullet', [-8.5, 2.6], [.24, .24], { type: 'Circle', color: [255, 202, 91], restitution: .2, friction: .05, continuous: true }), 72, 0)
  const sensor = shape('collision-lab-sensor', 'Sensor Zone', [5.8, 0], [2.4, 3.2], { body: 'Static', sensor: true, color: [112, 207, 179] })
  const sensorRenderer = (sensor.components as JsonRecord[]).find(value => value.kind === 'ShapeRenderer2D')?.data as JsonRecord
  sensorRenderer.opacity = 28
  sensorRenderer.strokeOpacity = 100
  sensorRenderer.strokeWidth = .08
  const bodies = [
    shape('collision-lab-rubber', 'High Restitution Ball', [-4.2, 3.8], [1.15, 1.15], { type: 'Circle', color: [102, 172, 255], restitution: .95, friction: .05 }),
    shape('collision-lab-friction', 'High Friction Box', [-1.5, 3.3], [1.5, 1.5], { color: [238, 142, 103], restitution: .05, friction: 1.4 }),
    shape('collision-lab-ellipse', 'Offset Ellipse', [1.3, 3.6], [1.8, 1.1], { type: 'Circle', color: [185, 133, 242], restitution: .35, friction: .45 })
  ]
  const labScene = scene('collision-lab', 'Collision & CCD Lab', [
    cameraAtSize('collision-lab-camera', 6),
    shape('collision-lab-ground', 'Ground', [0, -5.45], [20.5, .75], { body: 'Static', color: [73, 84, 99], friction: .9 }),
    shape('collision-lab-target', 'Thin CCD Target', [2.3, 2.6], [.16, 3.2], { body: 'Static', color: [245, 112, 120], restitution: .25, friction: .2 }),
    ramp, bullet, sensor, ...bodies, ...canvasWithLabel('collision-lab-ui', 'Collision & CCD Lab · Play and open Debug → Physics')
  ])
  return project(name, 'collision-lab', [labScene], [], `---\ndismissible: true\ntemplate: collision-lab\n---\n# Collision & CCD Lab\n\nPress **Play** and open **Debug → Physics**. The yellow bullet uses continuous collision against a thin wall; the ramp exercises rotated contacts; the translucent green object is a sensor; the remaining bodies compare restitution and friction.`)
}

function renderingLabTemplate(name: string): JsonRecord {
  const spriteId = stableUuid('asset:rendering-lab-sprite')
  const sprite = entity('rendering-lab-sprite', 'Sprite Sample', [4.6, 1.6], [component('rendering-lab-sprite', 'SpriteRenderer2D', {
    spriteAsset: `asset://${spriteId}`, tint: { r: 255, g: 255, b: 255 }, opacity: 100, size: { x: 2.3, y: 2.3 }, pivot: { x: .5, y: .5 }, flipX: false, flipY: false,
    sortingLayer: 1, orderInLayer: 4, material: 'Default', filterMode: 'Linear', nineSlice: { enabled: false, left: 0, top: 0, right: 0, bottom: 0 }
  })])
  const text = entity('rendering-lab-text', 'World Text', [-4.8, -2.8], [component('rendering-lab-text', 'TextRenderer2D', {
    text: 'Shapes · Sprite · Text · Particles · Light', fontAsset: null, fontFamily: 'Nunito Sans', fontSize: 1.05, fontWeight: 700, lineHeight: 1.2, align: 'left', maxWidth: 10,
    color: { r: 232, g: 240, b: 252 }, opacity: 100, sortingLayer: 1, orderInLayer: 6, material: 'Default'
  })])
  const emitter = entity('rendering-lab-particles', 'Particle Sample', [0, -.8], [component('rendering-lab-particles', 'ParticleEmitter2D', {
    emissionRate: 26, burst: 12, lifetime: 1.5, maxParticles: 256, velocityMin: { x: -1.8, y: 1.2 }, velocityMax: { x: 1.8, y: 3.5 }, acceleration: { x: 0, y: -1.2 },
    colorStart: { r: 111, g: 183, b: 255 }, colorEnd: { r: 197, g: 131, b: 244 }, opacityStart: .9, opacityEnd: 0, sizeStart: .16, sizeEnd: .03, sortingLayer: 1, orderInLayer: 5
  })])
  const light = entity('rendering-lab-light', 'Point Light', [0, 1.2], [component('rendering-lab-light', 'Light2D', { lightType: 'Point', color: { r: 137, g: 191, b: 255 }, intensity: 1.1, range: 8, innerAngle: 30, outerAngle: 60, areaSize: { x: 4, y: 3 }, layerMask: 0xffffffff, castsShadows: true, shadowSoftness: .7 })])
  const shapes = [
    shape('rendering-lab-box', 'Rectangle Sample', [-4.8, 1.5], [2.4, 2.4], { body: 'Static', color: [93, 165, 255] }),
    shape('rendering-lab-circle', 'Ellipse Sample', [-1.6, 1.5], [2.4, 1.7], { type: 'Circle', body: 'Static', color: [111, 207, 180] }),
    shape('rendering-lab-triangle', 'Triangle Sample', [1.6, 1.5], [2.4, 2.2], { type: 'Triangle', body: 'Static', color: [242, 156, 96] })
  ]
  const result = project(name, 'rendering-lab', [scene('rendering-lab', 'Rendering Lab', [cameraAtSize('rendering-lab-camera', 6), ...shapes, sprite, text, emitter, light, ...canvasWithLabel('rendering-lab-ui', 'Rendering Lab · compare Scene and Game views')])], [imageAsset('rendering-lab-sprite', 'RenderingLabSprite', '#6e9df8')], `---\ndismissible: true\ntemplate: rendering-lab\n---\n# Rendering Lab\n\nCompare the **Scene** and **Game** views. This scene covers vector shapes, an imported sprite, world text, particles, point lighting, stable sorting, and camera framing.`)
  const rendering = (result.projectSettings as JsonRecord).rendering as JsonRecord
  rendering.lightingEnabled = true
  rendering.ambientIntensity = .58
  return result
}

function uiElement(seed: string, name: string, parentUuid: string, position: [number, number], size: [number, number], kind: string, data: JsonRecord): JsonRecord {
  const interactive = kind === 'Button' || kind === 'Slider' || kind === 'Checkbox' || kind === 'TextInput'
  const order = Number(data.readingOrder ?? data.tabIndex ?? 0)
  const inferredLabel = String(data.accessibilityLabel ?? (kind === 'Checkbox' ? data.label : kind === 'TextInput' ? data.placeholder : kind === 'Button' ? data.text : '') ?? '').trim()
  const role = kind === 'Button' ? 'button' : kind === 'Slider' ? 'slider' : kind === 'Checkbox' ? 'checkbox' : kind === 'TextInput' ? 'textbox' : ''
  const componentData = { ...data }
  for (const key of ['focusable', 'tabIndex', 'readingOrder', 'accessibilityRole', 'accessibilityLabel'] as const) delete componentData[key]
  const result = entity(seed, name, [0, 0], [
    component(seed, 'RectTransform', { parentUuid, anchorPreset: 'center', position: { x: position[0], y: position[1] }, size: { x: size[0], y: size[1] }, minSize: { x: Math.min(80, size[0]), y: Math.min(32, size[1]) }, maxSize: { x: 4096, y: 4096 }, flexGrow: 0, flexShrink: 1, focusable: interactive && data.focusable !== false, skipNavigation: !interactive || data.focusable === false, tabIndex: Number.isFinite(order) && order >= 0 ? Math.round(order) : 0, readingOrder: Number.isFinite(order) && order >= 0 ? Math.round(order) : 0, accessibilityRole: String(data.accessibilityRole ?? role), accessibilityLabel: inferredLabel }),
    component(seed, kind, componentData)
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
    manifest: { manifestVersion: 1, id: 'top.whitelists.novaa.networking', name: 'Nova Optional Networking', version: '2.9.0', description: 'Bounded replication and authoritative multiplayer tools.', engine: '>=2.9.0 <6.0.0', dependencies: {}, dependencyHashes: {}, entryPointType: 'runtime', apiCompatibility: '>=1 <2', pluginApi: null, native: false, sha256: 'fd048525377499fbd054cb74b69d5369c57d11431951695d413ec1e14cfe3424', signature: 'nova-official-v1:fd048525377499fbd054cb74b69d5369c57d11431951695d413ec1e14cfe3424', publisher: 'Whitelist', publisherVerified: true, permissions: ['network.client', 'network.listen'], rating: 5, securityUrl: 'https://github.com/Stevenzhang543/Nova_A/security', documentationUrl: 'https://github.com/Stevenzhang543/Nova_A/', license: 'MIT', licenseUrl: 'https://github.com/Stevenzhang543/Nova_A/blob/main/LICENSE.md', provenance: 'nova-official-v1', certification: 'certified', vulnerabilityPolicy: 'Critical and High findings block Stable installation.' },
    source: { kind: 'registry', location: 'Nova_A official offline package' }, enabled: true, project: true, installedAt: 0
  }], lockfile: [{ id: 'top.whitelists.novaa.networking', version: '2.9.0', source: { kind: 'registry', location: 'Nova_A official offline package' }, sha256: 'official-networking-2.9.0' }], offlineCache: [], offlineMode: true }
  ;((((result.packages as JsonRecord).installed as JsonRecord[])[0].manifest as JsonRecord).engine) = '>=2.9.0 <27.0.0'
  ;((result.projectSettings as JsonRecord).production as JsonRecord) = {
    performance: { traceCapacity: 600, memoryBudgetMb: 300, assetBudgetMb: 512, leakWindowFrames: 600, lifetimeCapacity: 2000 }, replay: { seed: 1313822273, capacity: 3600, strictChecksums: true }, testing: { defaultTimeoutMs: 10000, tests: [{ id: 'network-headless', name: 'Network headless smoke', kind: 'headless', sceneUuid: String((result.scenes as JsonRecord[])[0].uuid), steps: 120, timeoutMs: 10000, captureScreenshot: false, assertions: [{ kind: 'finitePhysics', target: '', expected: 'true' }, { kind: 'noRuntimeErrors', target: '', expected: 'true' }] }] }, data: { saveSchemaVersion: 1, saveMigrations: [] }, jobs: { maxWorkers: 2, maxQueued: 256, timeoutMs: 15000 },
    networking: { enabled: true, role: 'host', transport: 'websocket', endpoint: 'ws://127.0.0.1:7777', bindAddress: '127.0.0.1:7777', snapshotRate: 20, interpolationMs: 100, rollbackFrames: 120, bandwidthKbps: 256, reconnect: true, replicatedEntities: [first, second].map(value => ({ entityUuid: value.uuid, authority: 'server', properties: ['transform', 'rotation', 'velocity'], interpolate: true, predict: true })) }
  }
  return result
}

function templateVariant(name: string, id: ProjectTemplateId, basedOn: string, factory: (name: string) => JsonRecord): JsonRecord {
  const result = factory(name)
  const metadata = result.projectMetadata as JsonRecord | undefined
  if (metadata) metadata.template = id
  const tutorial = (result.assets as JsonRecord[] | undefined)?.find(asset => asset.path === 'Assets/Tutorials/Getting Started.md')
  if (tutorial) {
    const descriptor = PROJECT_TEMPLATES.find(item => item.id === id)
    tutorial.source = `---\ndismissible: true\ntemplate: ${id}\nverifiedVariantOf: ${basedOn}\n---\n# ${descriptor?.name ?? name}\n\n${descriptor?.description ?? ''}\n\nThis verified template keeps the complete, playable ${basedOn} runtime foundation while presenting a focused ${id.replace(/-/g, ' ')} workflow. Press **Play**, inspect its configured Scene, Script, Debug, and Manage workspaces, then replace the sample art and rules without rebuilding project infrastructure.\n`
    tutorial.byteLength = String(tutorial.source).length
    const hash = sha256Bytes(assetSourceBytes(String(tutorial.source))), pipeline = tutorial.pipeline as JsonRecord | undefined
    if (pipeline) { pipeline.sourceHash = hash; pipeline.artifactHash = hash; pipeline.contentHash = hash; pipeline.cacheKey = hash; pipeline.lastValidSource = tutorial.source }
  }
  return result
}

const TEMPLATE_FACTORIES: Record<ProjectTemplateId, (name: string) => JsonRecord> = {
  empty: emptyTemplate,
  'physics-sandbox': physicsTemplate,
  platformer: platformerTemplate,
  'top-down': topDownTemplate,
  'collision-lab': collisionLabTemplate,
  'rendering-lab': renderingLabTemplate,
  'ui-showcase': uiShowcaseTemplate,
  'networked-optional': networkedOptionalTemplate,
  'mouse-knockout': mouseKnockoutTemplate,
  snake: snakeTemplate,
  pong: pongTemplate,
  breakout: breakoutTemplate,
  'lighting-starter': name => templateVariant(name, 'lighting-starter', 'Rendering Lab', renderingLabTemplate),
  'tile-world': name => templateVariant(name, 'tile-world', 'Top-down Scene', topDownTemplate),
  'responsive-ui': name => templateVariant(name, 'responsive-ui', 'UI & Input Lab', uiShowcaseTemplate),
  'particle-lab': name => templateVariant(name, 'particle-lab', 'Rendering Lab', renderingLabTemplate),
  'audio-lab': name => templateVariant(name, 'audio-lab', 'UI & Input Lab', uiShowcaseTemplate),
  'animation-lab': name => templateVariant(name, 'animation-lab', 'Platformer Scene', platformerTemplate),
  'physics-cleanup': name => templateVariant(name, 'physics-cleanup', 'Mouse Knockout', mouseKnockoutTemplate),
  'grid-chase': name => templateVariant(name, 'grid-chase', 'Snake', snakeTemplate)
}

export function createTemplateProject(template: ProjectTemplateId, name: string): JsonRecord {
  const factory = TEMPLATE_FACTORIES[template]
  if (!factory) throw new Error(`Unknown project template: ${String(template).slice(0, 80)}`)
  const result = factory(name)
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
  const descriptor = PROJECT_TEMPLATES.find(value => value.id === template)
  const auditTemplate: ProjectTemplateId = ({
    'lighting-starter': 'rendering-lab', 'tile-world': 'top-down', 'responsive-ui': 'ui-showcase',
    'particle-lab': 'rendering-lab', 'audio-lab': 'ui-showcase', 'animation-lab': 'platformer',
    'physics-cleanup': 'mouse-knockout', 'grid-chase': 'snake'
  } as Partial<Record<ProjectTemplateId, ProjectTemplateId>>)[template] ?? template
  const inputMap = ((project.projectSettings as JsonRecord | undefined)?.inputMap as JsonRecord[] | undefined) ?? []
  const scripts = assets.filter(asset => asset.assetType === 'script').map(asset => String(asset.source)).join('\n')
  const componentData = (entityName: string, kind: string): JsonRecord | undefined => {
    const sourceEntity = entities.find(item => item.name === entityName)
    return Array.isArray(sourceEntity?.components) ? ((sourceEntity.components as JsonRecord[]).find(item => item.kind === kind)?.data as JsonRecord | undefined) : undefined
  }
  const entityY = (name: string): number => {
    const sourceEntity = entities.find(item => item.name === name)
    const transform = Array.isArray(sourceEntity?.components) ? (sourceEntity.components as JsonRecord[]).find(item => item.kind === 'Transform2D') : undefined
    return Number(((transform?.data as JsonRecord | undefined)?.position as JsonRecord | undefined)?.y)
  }
  if (!descriptor) failures.push('template is missing from the launcher catalog')
  if (!scenes.length) failures.push('missing scene')
  requireComponents('Transform2D', 'Camera2D')
  for (const sourceScene of scenes) {
    const layers = new Set(Array.isArray(sourceScene.layers) ? sourceScene.layers.map(Number) : [1])
    const sceneEntities = Array.isArray(sourceScene.entities) ? sourceScene.entities as JsonRecord[] : []
    for (const sourceEntity of sceneEntities) {
      if (!['Box', 'Circle', 'Triangle'].includes(String(sourceEntity.entityType))) failures.push(`${sourceEntity.name ?? 'entity'} uses an unsupported runtime shape`)
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
  if (auditTemplate === 'mouse-knockout') {
    requireComponents('RigidBody2D', 'BoxCollider2D', 'MouseFollower2D', 'Script2D', 'Canvas', 'Panel', 'Text')
    for (const api of ['view_min_x(', 'view_max_x(', 'spawn_at(', 'timer_start(', 'query_group(', 'entity_destroy(', 'score_add(', 'entity_set_enabled(', 'ui_set_text_on(']) if (!scripts.includes(api)) failures.push(`missing ${api} Mouse Knockout tutorial call`)
    const prefab = assets.find(asset => asset.assetType === 'prefab' && asset.name === 'Knockout Target.nova-prefab')
    try {
      const document = JSON.parse(String(prefab?.source ?? 'null')) as JsonRecord | null
      const bundle = document?.bundle as JsonRecord | undefined
      if (document?.prefabVersion !== 2 || !Array.isArray(bundle?.entities) || !Array.isArray(bundle?.rootUuids)) failures.push('Mouse Knockout target prefab is invalid')
    } catch { failures.push('Mouse Knockout target prefab is invalid JSON') }
    const settings = (project.projectSettings as JsonRecord | undefined)?.build as JsonRecord | undefined
    if (settings?.packageIntoExecutable !== true || settings?.runtimeMode !== 'game') failures.push('Mouse Knockout must default to a portable game executable')
    if (Number((scenes[0]?.globalSettings as JsonRecord | undefined)?.gravity) !== 0) failures.push('Mouse Knockout arena must use zero gravity')
  } else if (auditTemplate === 'snake') {
    requireComponents('RigidBody2D', 'BoxCollider2D', 'EllipseCollider2D', 'Script2D', 'Canvas', 'Text')
    if (entities.filter(item => String(item.name).startsWith('Snake Segment')).length !== 8) failures.push('Snake requires three starting segments and five growth segments')
    if (entities.filter(item => String(item.name).startsWith('Snake Segment') && item.enabled !== false).length !== 3) failures.push('Snake must start with exactly three enabled body segments')
    for (const api of ['input_pressed(', 'timer_start(', 'timer_cancel(', 'signal_emit(', 'on_trigger_enter', 'ui_set_text(', 'entity_set_enabled(']) if (!scripts.includes(api)) failures.push(`missing ${api} Snake gameplay call`)
    if (!entities.some(item => item.name === 'Game Over Panel' && item.enabled === false)) failures.push('Snake is missing its initially hidden game-over UI')
    const settings = (project.projectSettings as JsonRecord | undefined)?.build as JsonRecord | undefined
    if (settings?.packageIntoExecutable !== true) failures.push('Snake must default to portable desktop packaging')
  } else if (auditTemplate === 'platformer') {
    requireComponents('SpriteRenderer2D', 'RigidBody2D', 'BoxCollider2D', 'Script2D', 'Animator', 'AudioSource', 'TileMap2D', 'Light2D', 'ShadowCaster2D', 'Canvas', 'Text')
    for (const type of ['image', 'audio', 'script', 'animation', 'controller']) if (!assetTypes.has(type)) failures.push(`missing ${type} asset`)
    if (!(entityY('Ground') < entityY('Player'))) failures.push('gravity-driven player must start above the ground')
    if (!scripts.includes('move_character(') || !scripts.includes('can_coyote_jump(')) failures.push('platformer must demonstrate exact CharacterBody2D motion and coyote time')
  } else if (auditTemplate === 'top-down') {
    requireComponents('Script2D', 'ParticleEmitter2D', 'Canvas', 'Text')
    if (scenes.length < 2) failures.push('missing scene transition target')
    for (const type of ['prefab', 'script']) if (!assetTypes.has(type)) failures.push(`missing ${type} asset`)
    for (const api of ['instantiate(', 'scene_load(', 'save_commit(']) if (!scripts.includes(api)) failures.push(`missing ${api} tutorial call`)
    const prefab = assets.find(asset => asset.assetType === 'prefab')
    try {
      const document = JSON.parse(String(prefab?.source ?? 'null')) as JsonRecord | null
      const bundle = document?.bundle as JsonRecord | undefined
      if (document?.prefabVersion !== 2 || !Array.isArray(bundle?.entities) || !Array.isArray(bundle?.rootUuids)) failures.push('top-down enemy prefab is invalid')
    } catch { failures.push('top-down enemy prefab is invalid JSON') }
  } else if (auditTemplate === 'physics-sandbox') {
    requireComponents('RigidBody2D', 'DistanceJoint2D', 'BoxCollider2D', 'EllipseCollider2D')
    if (!connections.some(connection => connection.type === 'rope')) failures.push('missing Rope2D connection')
    if (!(entityY('Ground') < Math.min(entityY('Jointed Box'), entityY('Rope End'), entityY('Rope Ball')))) failures.push('sandbox bodies must start above the collision ground')
  } else if (auditTemplate === 'ui-showcase') {
    requireComponents('Canvas', 'Panel', 'Text', 'TextInput', 'Button', 'Checkbox', 'ProgressBar')
    for (const type of ['localization', 'uiTheme', 'audio']) if (!assetTypes.has(type)) failures.push(`missing ${type} asset`)
  } else if (auditTemplate === 'networked-optional') {
    const packages = project.packages as JsonRecord | undefined
    const installed = Array.isArray(packages?.installed) ? packages.installed as JsonRecord[] : []
    if (!installed.some(item => (item.manifest as JsonRecord | undefined)?.id === 'top.whitelists.novaa.networking')) failures.push('missing optional networking package')
    const production = ((project.projectSettings as JsonRecord | undefined)?.production as JsonRecord | undefined)?.networking as JsonRecord | undefined
    if (production?.enabled !== true || !Array.isArray(production.replicatedEntities) || production.replicatedEntities.length !== 2) failures.push('network replication is not configured')
  } else if (auditTemplate === 'collision-lab') {
    requireComponents('RigidBody2D', 'BoxCollider2D', 'EllipseCollider2D', 'Canvas', 'Text')
    if (componentData('CCD Bullet', 'RigidBody2D')?.continuousCollision !== 'Continuous') failures.push('collision lab bullet must use continuous collision detection')
    if (componentData('Sensor Zone', 'BoxCollider2D')?.sensor !== true) failures.push('collision lab must contain a real sensor')
    const rubberMaterial = componentData('High Restitution Ball', 'EllipseCollider2D')?.material as JsonRecord | undefined
    if (Number(rubberMaterial?.restitution ?? 0) < .9) failures.push('collision lab restitution case is missing')
  } else if (auditTemplate === 'rendering-lab') {
    requireComponents('ShapeRenderer2D', 'SpriteRenderer2D', 'TextRenderer2D', 'ParticleEmitter2D', 'Light2D', 'Canvas', 'Text')
    if (!assetTypes.has('image')) failures.push('rendering lab is missing its imported sprite')
    const rendering = (project.projectSettings as JsonRecord | undefined)?.rendering as JsonRecord | undefined
    if (rendering?.lightingEnabled !== true) failures.push('rendering lab lighting is disabled')
  } else if (auditTemplate === 'pong') {
    requireComponents('RigidBody2D', 'BoxCollider2D', 'EllipseCollider2D', 'Script2D', 'Canvas', 'Panel', 'Text')
    if (!['P1Vertical', 'P2Vertical'].every(action => inputMap.some(value => value.name === action))) failures.push('Pong two-player input actions are incomplete')
    if (componentData('Ball', 'RigidBody2D')?.continuousCollision !== 'Continuous') failures.push('Pong ball must use continuous collision detection')
    for (const contract of ['input_axis(', 'signal_emit("pong.point.', 'score_add(', 'ui_set_text_on(', 'winning_score = 7']) if (!scripts.includes(contract)) failures.push(`Pong is missing ${contract}`)
  } else if (auditTemplate === 'breakout') {
    requireComponents('RigidBody2D', 'BoxCollider2D', 'EllipseCollider2D', 'Script2D', 'Canvas', 'Panel', 'Text')
    if (entities.filter(item => String(item.name).startsWith('Brick ')).length !== 24) failures.push('Breakout must contain exactly 24 authored bricks')
    if (!inputMap.some(value => value.name === 'MoveHorizontal')) failures.push('Breakout movement action is missing')
    if (componentData('Ball', 'RigidBody2D')?.continuousCollision !== 'Continuous') failures.push('Breakout ball must use continuous collision detection')
    for (const contract of ['on_collision_enter', 'destroy(', 'score_add(', 'signal_emit("breakout.brick"', 'score_get(', 'view_min_y(']) if (!scripts.includes(contract)) failures.push(`Breakout is missing ${contract}`)
  }
  if (descriptor?.category === 'game') {
    const settings = (project.projectSettings as JsonRecord | undefined)?.build as JsonRecord | undefined
    if (settings?.runtimeMode !== 'game' || settings?.packageIntoExecutable !== true || !settings.startupSceneUuid) failures.push('playable game must default to an executable startup scene')
    if (!assets.some(asset => asset.assetType === 'script')) failures.push('playable game is missing gameplay scripts')
  }
  return failures
}

export function createTemplateProjectJson(template: ProjectTemplateId, name: string): string {
  return JSON.stringify(createTemplateProject(template, name))
}

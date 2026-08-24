import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'reference-projects')
const projectsDirectory = join(output, 'projects')
const pluginsDirectory = join(output, 'plugins', 'hello-plugin')
await mkdir(projectsDirectory, { recursive: true })
await mkdir(pluginsDirectory, { recursive: true })

function normalizeProjectAssets(project) {
  project.engineVersion = '4.4.0'
  project.assetDatabase = { ...(project.assetDatabase ?? {}), version: 2, collections: project.assetDatabase?.collections ?? [], contentGroups: [{ id: 'main', name: 'Main', mode: 'embedded', optional: false }], viewMode: project.assetDatabase?.viewMode ?? 'grid', thumbnailSize: project.assetDatabase?.thumbnailSize ?? 112 }
  project.projectSettings = { ...(project.projectSettings ?? {}), build: { ...(project.projectSettings?.build ?? {}), delivery: { ...(project.projectSettings?.build?.delivery ?? {}), include: ['Assets/**'], exclude: ['.nova/**'], stripUnusedAssets: false } } }
  for (const asset of project.assets ?? []) {
    const source = typeof asset.source === 'string' ? asset.source : ''
    const hash = createHash('sha256').update(source).digest('hex')
    asset.pipeline = {
      importerVersion: asset.pipeline?.importerVersion ?? `nova-${asset.assetType ?? 'asset'}-3.5`,
      platform: asset.pipeline?.platform ?? 'web',
      sourceHash: asset.pipeline?.sourceHash ?? hash,
      artifactHash: asset.pipeline?.artifactHash ?? hash,
      contentHash: asset.pipeline?.contentHash ?? hash,
      cacheKey: asset.pipeline?.cacheKey ?? hash,
      dependencies: asset.pipeline?.dependencies ?? [],
      reverseDependencies: asset.pipeline?.reverseDependencies ?? [],
    }
  }
  return project
}

async function writeProjectBundle(slug, project, demonstrates) {
  normalizeProjectAssets(project)
  const directory = join(projectsDirectory, slug)
  await mkdir(directory, { recursive: true })
  const source = `${JSON.stringify(project, null, 2)}\n`
  await writeFile(join(directory, 'project.nova'), source, 'utf8')
  const entityCount = (project.scenes ?? []).reduce((total, scene) => total + (scene.entities?.length ?? 0), 0)
  await writeFile(join(directory, 'expected-output.json'), `${JSON.stringify({ engineVersion: '4.4.0', schema: 29, projectName: project.projectMetadata?.name ?? project.name ?? slug, minimumScenes: project.scenes?.length ?? 0, minimumEntities: entityCount, expectedValidation: slug === 'data-foundation-validation' ? 'repair-required' : 'pass', demonstrates }, null, 2)}\n`, 'utf8')
  await writeFile(join(directory, 'test-controls.json'), `${JSON.stringify({ open: 'Project Manager > Open Project > project.nova', run: 'Top action bar > Play; Pause; Step; Stop', validate: 'Project Health must report no blocking project-format error', export: 'Build Settings > Overview > Build', command: `pnpm nova export --project ./reference-projects/projects/${slug}/project.nova --target web --profile release --output ./Builds/reference-${slug} --cache validate --jsonl` }, null, 2)}\n`, 'utf8')
  const requiredPackages = project.packages?.installed?.filter(item => item.enabled).map(item => `${item.manifest.id}@${item.manifest.version}`) ?? []
  await writeFile(join(directory, 'README.md'), `# ${project.projectMetadata?.name ?? slug}\n\nEngine **4.3.0**, Project Format 2, schema 29.\n\n## Expected behavior\n\nDemonstrates: ${demonstrates.join(', ')}. Open the project, run Play/Pause/Step/Stop, and compare the scene/entity minimums and diagnostics with \`expected-output.json\`.\n\n## Test procedure and IDs\n\n1. Open \`project.nova\` from Project Manager and review the compatibility preflight.\n2. Confirm Project Health has no blocking project-format error.\n3. Run every entry in \`test-controls.json\`; that file is the authoritative UI/keyboard test-ID map.\n4. Run the validation export:\n\n\`\`\`powershell\npnpm nova export --project ./reference-projects/projects/${slug}/project.nova --target web --profile release --output ./Builds/reference-${slug} --cache validate --jsonl\n\`\`\`\n\n## Requirements\n\n- Required packages: ${requiredPackages.length ? requiredPackages.join(', ') : 'None; Nova_A core only'}.\n- Target platforms: Windows x86-64 editor/runtime and the supported Chromium web runtime.\n- Project identity: version-pinned \`project.nova\`, expected output, and stable control IDs ship together.\n\n## Known limitations\n\nThis focused fixture proves only the behavior listed above. It does not substitute for external GPU, audio-device, network, signing, clean-machine installer, physical mixed-DPI-monitor, accessibility-operator, or long-duration soak gates where those gates apply.\n`, 'utf8')
  const readmePath = join(directory, 'README.md')
  await writeFile(readmePath, (await readFile(readmePath, 'utf8')).replace('Engine **4.3.0**', 'Engine **4.4.0**'), 'utf8')
}

if (!globalThis.btoa) globalThis.btoa = value => Buffer.from(value, 'binary').toString('base64')
const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
try {
  const { PROJECT_TEMPLATES, createTemplateProject } = await server.ssrLoadModule('/src/projects/templates.ts')
  for (const descriptor of PROJECT_TEMPLATES) {
    const project = createTemplateProject(descriptor.id, `Nova_A ${descriptor.name} Reference`)
    normalizeProjectAssets(project)
    await writeFile(join(projectsDirectory, `${descriptor.id}.nova`), `${JSON.stringify(project, null, 2)}\n`, 'utf8')
    await writeProjectBundle(descriptor.id, project, descriptor.features)
  }
  const physicsReferences = [
    ['platformer-character', 'platformer', ['character slopes and steps', 'moving platform behavior', 'floor/wall/ceiling contacts']],
    ['top-down-character', 'top-down', ['top-down character motion', 'triggers', 'named collision layers']],
    ['joint-showcase', 'physics-sandbox', ['distance, revolute, prismatic, weld, spring, rope and motor joints', 'limits and break thresholds']],
    ['trigger-showcase', 'top-down', ['trigger enter, stay and exit', 'stable contact data order']],
    ['ccd-test', 'physics-sandbox', ['continuous collision detection', 'thin-wall tunneling reference']],
    ['stacking-test', 'physics-sandbox', ['stable stacks', 'friction, restitution, sleep and wake']]
  ]
  for (const [slug, template, features] of physicsReferences) {
    const title = slug.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ')
    const project = createTemplateProject(template, `Nova_A ${title}`)
    if (slug === 'ccd-test') for (const scene of project.scenes ?? []) for (const entity of scene.entities ?? []) for (const component of entity.components ?? []) if (component.kind === 'RigidBody2D') component.data.continuousCollision = 'Continuous'
    await writeProjectBundle(slug, project, features)
  }
  const scriptReferences = [
    ['script-lifecycle-signals', 'Lifecycle and Signals', `@export(type="float", min=0, max=20, step=0.1, group="Movement", tooltip="Movement speed") let speed = 5.0;
fn awake() { log_info("awake"); }
fn start() { timer_start("announce", 0.1, false); }
fn fixed_update(dt) { move_character(input_axis("MoveHorizontal") * speed * dt, 0.0); }
fn update(dt) { }
fn late_update(dt) { }
fn on_timer(name) { signal_emit("sample.ready", #{ entity: entity(), timer: name }); }
fn on_signal(name, payload, source) { log_debug(name); }
fn on_destroy() { timer_cancel("announce"); }`, ['all lifecycle callbacks', 'typed exported property metadata', 'editor-visible signals']],
    ['script-async-tasks', 'Async Tasks', `@export(type="float", min=0, max=10, step=0.05, group="Tasks") let delay = 0.25;
fn start() { task_wait("phase_two", delay); timer_start("heartbeat", 1.0, true); }
fn on_task(name) { signal_emit("task.completed", #{ name: name }); }
fn on_timer(name) { log_info(name); }
fn on_destroy() { task_cancel("phase_two"); timer_cancel("heartbeat"); }`, ['cancellable tasks', 'timers', 'error propagation and ownership']],
    ['script-debugger-scenarios', 'Debugger Scenarios', `@export(type="integer", min=0, max=100, step=1, group="Debug") let counter = 0;
fn update(dt) { counter += 1; let pose = transform(); if counter == 10 { log_info("position: " + pose.position_x); } }
fn fixed_update(dt) { let body = rigid_body(); if body.valid { set_velocity(body.velocity_x, body.velocity_y); } }`, ['line/function/conditional/hit-count breakpoints', 'logpoints', 'locals, watches and callback stacks']],
    ['script-test-runner', 'Script Test Runner', `@export(type="integer", min=0, max=100, step=1, group="Tests") let score = 0;
fn before_each() { score = 2; }
// @test tags=unit,fast timeout=1000 seed=42 cases=first|second
fn test_score_math() { expect(score + 2 == 4, "score math"); }
// @test tags=unit skip
fn test_future_behavior() { expect(true, "placeholder"); }
fn after_each() { score = 0; }`, ['setup and teardown', 'parameterized cases', 'tags, skip, timeout, deterministic seed and CI output']],
    ['script-api-v1-examples', 'API v1 Examples', `@export(type="resource", resource="AudioClip", group="Resources", tooltip="Optional sound", serialize=true) let sound = "";
fn awake() { let self = entity_handle(); let body = component_handle("RigidBody2D"); expect(api_version() == 1 && self.valid, "API v1 handle"); log_info(api_namespace("scene_load")); }
fn update(dt) { if input_pressed("Jump") { apply_impulse(0.0, 4.0); animator_trigger("jump"); audio_play(); save_set("jumped", true); } }
fn on_signal(name, payload, source) { if name == "go" { navigation_set_target(4.0, 2.0); } }`, ['API v1 handles', 'input, physics, animation, audio, navigation, save and resources']]
  ]
  for (const [slug, title, source, features] of scriptReferences) {
    const project = createTemplateProject('platformer', `Nova_A ${title}`)
    const script = (project.assets ?? []).find(asset => asset.assetType === 'script')
    if (!script) throw new Error(`Missing script asset for ${slug}`)
    script.name = `${title}.rhai`; script.path = `Assets/Scripts/${title.replace(/\s+/g, '')}.rhai`; script.source = source; script.byteLength = source.length
    script.script = { version: 1, apiVersion: 1, breakpoints: [], breakpointDetails: slug === 'script-debugger-scenarios' ? [{ id: 'conditional-counter', line: 2, functionName: 'update', condition: 'properties.counter >= 10', hitCondition: 10, logMessage: '', enabled: true, hitCount: 0 }] : [], tests: slug === 'script-test-runner' ? ['test_score_math', 'test_future_behavior'] : [], packageDependencies: [], packageName: `samples.${slug}`, reloadPolicy: 'preserve', signalConnections: slug === 'script-lifecycle-signals' ? [{ signal: 'sample.ready', source: '', target: '', callback: 'on_signal', enabled: true }] : [], recoverySource: '', lastSavedHash: '' }
    await writeProjectBundle(slug, project, features)
  }
  const presentationReferences = [
    ['responsive-menu', 'Responsive Menu', ['responsive anchors, safe areas and DPI previews', 'row, column, grid, flow and overlay layout containers']],
    ['accessible-hud', 'Accessible HUD', ['accessible names, roles, values and live regions', 'scalable text, minimum targets and high contrast']],
    ['controller-navigation', 'Controller Navigation', ['focus-order visualization', 'keyboard and gamepad directional navigation']],
    ['runtime-rebinding', 'Runtime Rebinding', ['runtime rebinding UI', 'binding conflict detection and persisted modifiers/chords']],
    ['localization-workflow', 'Localization Workflow', ['structured string tables and CSV', 'context, plural forms, fallback metadata and extraction']],
    ['pseudoloc-stress', 'Pseudolocalization Stress', ['35% string expansion', 'clipping and missing-key audit']],
    ['rtl-interface', 'RTL Interface', ['right-to-left direction preview', 'mirrored focus and layout behavior']],
    ['animator-state-machine', 'Animator State Machine', ['parameters, transitions and blend trees', 'live animator debugging']],
    ['sprite-animation', 'Sprite Animation', ['sprite frame tracks and onion skin', 'events, audio and nested animation tracks']]
  ]
  for (const [slug, title, features] of presentationReferences) {
    const project = createTemplateProject(slug.startsWith('animator') || slug.startsWith('sprite') ? 'platformer' : 'ui-showcase', `Nova_A ${title}`)
    const presentation = project.projectSettings?.presentation
    if (presentation?.localization) {
      presentation.localization.pseudolocalization = slug === 'pseudoloc-stress'
      presentation.localization.pseudolocalizationMode = slug === 'rtl-interface' ? 'bidi' : 'expanded'
      presentation.localization.expansionRatio = slug === 'pseudoloc-stress' ? .35 : presentation.localization.expansionRatio ?? .35
      presentation.localization.previewLocale = slug === 'rtl-interface' ? 'ar' : presentation.localization.previewLocale
    }
    await writeProjectBundle(slug, project, features)
  }
  const recoveryProject = createTemplateProject('empty', 'Workspace and Recovery Validation')
  normalizeProjectAssets(recoveryProject)
  await writeFile(join(projectsDirectory, 'workspace-recovery-validation.nova'), `${JSON.stringify(recoveryProject, null, 2)}\n`, 'utf8')
  await writeProjectBundle('workspace-recovery-validation', recoveryProject, ['workspace import/export', 'docking', '100-step history', 'autosave recovery', 'safe layout', 'read-only recovery'])
} finally {
  await server.close()
}

const dataFoundationSource = await readFile(join(projectsDirectory, 'data-foundation-validation.nova'), 'utf8')
await writeProjectBundle('data-foundation-validation', JSON.parse(dataFoundationSource), ['manifest and directory policy', 'nested scenes', 'nested prefabs', 'per-property overrides', 'imported artifact hashes', 'dependency graph', 'missing-resource repair'])

const optionalNetworkPath = join(projectsDirectory, 'networked-optional.nova')
const optionalNetworkProject = JSON.parse(await readFile(optionalNetworkPath, 'utf8'))
optionalNetworkProject.engineVersion = '4.0.0'
optionalNetworkProject.formatVersion = 29
optionalNetworkProject.compatibility.schemaVersion = 29
optionalNetworkProject.manifest.schemaVersion = 29
optionalNetworkProject.manifest.engineCompatibility = { minimum: '3.9.0', maximumExclusive: '5.0.0' }
for (const item of optionalNetworkProject.packages?.installed ?? []) item.manifest.engine = String(item.manifest.engine ?? '').replace('<4.0.0', '<5.0.0')
await writeFile(optionalNetworkPath, `${JSON.stringify(optionalNetworkProject, null, 2)}\n`, 'utf8')
await writeProjectBundle('networked-optional', optionalNetworkProject, ['opt-in Experimental networking package', 'replication and prediction', 'diagnostics', 'headless configuration'])

const baseAuthoringProject = JSON.parse(await readFile(join(projectsDirectory, 'empty.nova'), 'utf8'))
const stableUuid = seed => {
  const hex = createHash('sha256').update(seed).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`
}
const authoringComponent = (seed, kind, data = {}) => ({ uuid: stableUuid(`${seed}:${kind}`), kind, enabled: true, removed: false, data })
const authoredEntity = (seed, kind, x, y, options = {}) => {
  const transform = authoringComponent(seed, 'Transform2D', { parentUuid: options.parentUuid ?? null, position: { x, y }, rotation: options.rotation ?? 0, scale: options.scale ?? { x: 1, y: 1 } })
  const components = [transform]
  if (kind === 'Camera') components.push(authoringComponent(seed, 'Camera2D', { active: true, orthographicSize: options.orthographicSize ?? 10, viewport: options.viewport ?? { x: 0, y: 0, width: 1, height: 1 }, backgroundColor: { r: 17, g: 21, b: 27 }, pixelPerfect: options.pixelPerfect === true, zoom: options.zoom ?? 1, smoothing: { enabled: false, speed: 5 }, limits: { enabled: false, left: -100, right: 100, bottom: -100, top: 100 }, dragMargins: { enabled: false, left: .1, right: .1, top: .1, bottom: .1 }, previewInEditor: true, priority: options.priority ?? 0, stackOrder: options.priority ?? 0, cullingMask: 0xffffffff, clearColor: true }))
  else if (kind === 'WorldText') components.push(authoringComponent(seed, 'TextRenderer2D', { text: options.name ?? 'Resolution independent text', fontAsset: null, fontFamily: 'Nunito Sans', fontSize: 1, fontWeight: 600, lineHeight: 1.2, align: 'center', color: options.color ?? { r: 235, g: 242, b: 255 }, opacity: 100, maxWidth: 12, sortingLayer: options.layer ?? 1, orderInLayer: options.order ?? 0, material: 'Default' }))
  else if (kind === 'Sprite') components.push(authoringComponent(seed, 'SpriteRenderer2D', { spriteAsset: options.spriteAsset ?? null, tint: { r: 255, g: 255, b: 255 }, opacity: 100, flipX: false, flipY: false, pivot: options.pivot ?? { x: .5, y: .5 }, size: options.size ?? { x: 1, y: 1 }, sortingLayer: options.layer ?? 1, orderInLayer: options.order ?? 0, material: 'Default', filterMode: options.filterMode ?? 'Linear', nineSlice: { enabled: false, left: 0, top: 0, right: 0, bottom: 0 } }))
  else if (kind === 'ParallaxLayer' || kind === 'CanvasLayer' || kind === 'Empty') { /* Transform-only hierarchy host. */ }
  else components.push(authoringComponent(seed, 'ShapeRenderer2D', { shape: options.shape ?? 'Rectangle', vertices: options.vertices ?? [{ x: -.5, y: -.5 }, { x: .5, y: -.5 }, { x: .5, y: .5 }, { x: -.5, y: .5 }], radiusX: .5, radiusY: .5, color: options.color ?? { r: 105, g: 165, b: 255 }, opacity: 100, strokeColor: { r: 230, g: 240, b: 255 }, strokeOpacity: 100, strokeWidth: .04, sortingLayer: options.layer ?? 1, orderInLayer: options.order ?? 0, material: 'Default', filterMode: options.filterMode ?? 'Linear' }))
  return { uuid: stableUuid(`entity:${seed}`), name: options.name ?? `${kind} ${seed}`, enabled: true, editorVisible: true, editorLocked: false, tags: options.tags ?? [], persistentAcrossScenes: false, prefabAsset: options.prefabAsset ?? null, prefabInstanceUuid: options.prefabInstanceUuid ?? null, prefabSourceUuid: options.prefabSourceUuid ?? null, prefabOverrides: options.prefabOverrides ?? {}, prefabLayers: options.prefabLayers ?? [], sceneLayers: [], authoring: { kind, origin: { x: 0, y: 0 }, visible: true, zOrder: options.order ?? 0, renderLayer: options.layer ?? 1, sortMode: options.sortMode ?? 'LayerThenOrder', canvasLayer: { screenSpace: false, followCamera: true }, parallax: options.parallax ?? { motionScale: { x: 1, y: 1 }, repeat: { x: 0, y: 0 } }, path: { closed: false, smoothing: 0, points: [] } }, entityType: options.entityType ?? 'Box', components }
}
const authoringProject = (slug, name, entities, assets = []) => {
  const project = structuredClone(baseAuthoringProject)
  project.engineVersion = '4.0.0'; project.formatVersion = 29; project.compatibility.schemaVersion = 29; project.manifest.schemaVersion = 29; project.manifest.engineCompatibility = { minimum: '3.9.0', maximumExclusive: '5.0.0' }; project.projectMetadata.name = name; project.projectMetadata.template = slug; project.manifest.name = name
  project.scenes[0].name = 'Authoring Demonstration'; project.scenes[0].entities = entities; project.assets = assets
  return project
}
const pixelAssetUuid = stableUuid('asset:pixel-art')
const pixelSource = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16"%3E%3Cpath fill="%236aa8ff" d="M0 0h8v8H0zm8 8h8v8H8z"/%3E%3C/svg%3E'
const pixelHash = createHash('sha256').update(pixelSource).digest('hex')
const pixelAsset = { uuid: pixelAssetUuid, name: 'Pixel Marker.svg', path: 'Assets/Sprites/Pixel Marker.svg', assetType: 'image', mimeType: 'image/svg+xml', byteLength: pixelSource.length, source: pixelSource, sourceModified: 0, importedAt: 0, width: 16, height: 16, duration: 0, fontFamily: '', settings: { textureProfile: 'PixelArt', filterMode: 'Nearest', compression: 'Lossless', colorSpace: 'sRGB', platformVariants: {}, pixelsPerUnit: 16, spriteRegion: null, pivot: { x: .5, y: .5 }, atlas: true, atlasSettings: { maxSize: 2048, padding: 2, trim: true }, transparentTrim: true, spriteSheet: { enabled: false, columns: 1, rows: 1, margin: 0, spacing: 0 }, borders: { left: 0, top: 0, right: 0, bottom: 0 } }, pipeline: { importerVersion: 'nova-image-3.7', platform: 'web', sourceHash: pixelHash, artifactHash: pixelHash, contentHash: pixelHash, cacheKey: pixelHash, dependencies: [], reverseDependencies: [] } }
const pixelEntities = [authoredEntity('pixel-camera', 'Camera', 0, 0, { pixelPerfect: true, orthographicSize: 6 }), ...Array.from({ length: 24 }, (_, index) => authoredEntity(`pixel-${index}`, 'Sprite', index % 8 - 3.5, Math.floor(index / 8) - 1, { spriteAsset: `asset://${pixelAssetUuid}`, filterMode: 'Nearest', size: { x: 1, y: 1 } }))]
await writeProjectBundle('authoring-pixel-art', authoringProject('authoring-pixel-art', 'Pixel Art Authoring', pixelEntities, [pixelAsset]), ['nearest filtering', 'pixel-perfect camera', 'sprite asset drop', 'selection outlines at multiple zooms'])

const resolutionEntities = [authoredEntity('resolution-camera', 'Camera', 0, 0, { orthographicSize: 10 }), ...Array.from({ length: 15 }, (_, index) => authoredEntity(`resolution-${index}`, index % 3 === 0 ? 'WorldText' : 'Rectangle', (index % 5 - 2) * 3, (Math.floor(index / 5) - 1) * 3, { scale: { x: 2, y: 1 }, color: { r: 92 + index * 6, g: 145, b: 225 } }))]
await writeProjectBundle('authoring-resolution-independent', authoringProject('authoring-resolution-independent', 'Resolution Independent Authoring', resolutionEntities), ['world-unit scaling', 'common-resolution overlays', 'vector shapes', 'camera aspect previews'])

const parallaxRoot = authoredEntity('parallax-root', 'ParallaxLayer', 0, 0, { name: 'Parallax 0.35x', parallax: { motionScale: { x: .35, y: .35 }, repeat: { x: 32, y: 18 } } })
const parallaxEntities = [authoredEntity('parallax-camera', 'Camera', 0, 0, { orthographicSize: 8 }), parallaxRoot, ...Array.from({ length: 30 }, (_, index) => authoredEntity(`parallax-${index}`, 'Rectangle', (index % 10 - 5) * 4, Math.floor(index / 10) * 3 - 4, { parentUuid: parallaxRoot.uuid, color: { r: 65 + index * 3, g: 100 + index * 2, b: 170 + index } }))]
await writeProjectBundle('authoring-parallax', authoringProject('authoring-parallax', 'Parallax Authoring', parallaxEntities), ['parallax parent layer', 'camera-relative motion scale', 'repeat metadata', 'hierarchy reparenting'])

const cameraEntities = [authoredEntity('camera-a', 'Camera', -5, 0, { name: 'Main Camera', viewport: { x: 0, y: 0, width: .7, height: 1 }, priority: 0 }), authoredEntity('camera-b', 'Camera', 6, 2, { name: 'Mini Map Camera', viewport: { x: .72, y: .04, width: .25, height: .3 }, orthographicSize: 18, priority: 1 }), authoredEntity('camera-c', 'Camera', 0, 0, { name: 'Pixel Preview Camera', pixelPerfect: true, viewport: { x: .72, y: .38, width: .25, height: .3 }, priority: 2 }), ...Array.from({ length: 36 }, (_, index) => authoredEntity(`camera-subject-${index}`, 'Rectangle', index % 9 * 2 - 8, Math.floor(index / 9) * 2 - 3))]
await writeProjectBundle('authoring-multiple-cameras', authoringProject('authoring-multiple-cameras', 'Multiple Camera Authoring', cameraEntities), ['camera stacking', 'split viewports', 'pixel-perfect preview', 'camera frame overlays'])

const vehicleAssetUuid = '00000000-0000-4000-8000-000000000101', wheelAssetUuid = '00000000-0000-4000-8000-000000000102', prefabSource = '{}', prefabHash = createHash('sha256').update(prefabSource).digest('hex')
const nestedAssets = [{ uuid: vehicleAssetUuid, name: 'Vehicle.nova-prefab', path: 'Assets/Prefabs/Vehicle.nova-prefab', assetType: 'prefab' }, { uuid: wheelAssetUuid, name: 'Wheel.nova-prefab', path: 'Assets/Prefabs/Wheel.nova-prefab', assetType: 'prefab' }].map(asset => ({ ...asset, mimeType: 'application/x-nova-prefab', byteLength: prefabSource.length, source: prefabSource, sourceModified: 0, importedAt: 0, width: 0, height: 0, duration: 0, fontFamily: '', settings: { filterMode: 'Linear', compression: 'Lossless', pixelsPerUnit: 100, spriteRegion: null, pivot: { x: .5, y: .5 }, atlas: false }, pipeline: { importerVersion: 'nova-prefab-3.3', platform: 'web', sourceHash: prefabHash, artifactHash: prefabHash, contentHash: prefabHash, cacheKey: prefabHash, dependencies: [], reverseDependencies: [] } }))
const nestedRoot = authoredEntity('nested-root', 'Rectangle', 0, 0, { name: 'Vehicle Prefab Root', prefabAsset: `asset://${vehicleAssetUuid}`, prefabInstanceUuid: stableUuid('instance:vehicle'), prefabSourceUuid: stableUuid('source:vehicle'), prefabOverrides: { 'Transform.position.x': 0 }, prefabLayers: [{ asset: `asset://${wheelAssetUuid}`, instanceUuid: stableUuid('instance:wheel'), sourceUuid: stableUuid('source:wheel'), overrides: { 'Sprite.opacity': 85 } }] })
const nestedEntities = [authoredEntity('nested-camera', 'Camera', 0, 0), nestedRoot, ...Array.from({ length: 8 }, (_, index) => authoredEntity(`nested-child-${index}`, index % 2 ? 'Sprite' : 'Rectangle', index - 4, -1, { parentUuid: nestedRoot.uuid, prefabAsset: 'asset://00000000-0000-4000-8000-000000000102', prefabInstanceUuid: stableUuid('instance:wheel'), prefabSourceUuid: stableUuid(`source:wheel:${index}`) }))]
await writeProjectBundle('authoring-nested-prefabs', authoringProject('authoring-nested-prefabs', 'Nested Prefab Authoring', nestedEntities, nestedAssets), ['nested prefab layers', 'per-property overrides', 'status badges', 'world/local reparent modes'])

const stressEntities = [authoredEntity('stress-camera', 'Camera', 50, 25, { orthographicSize: 35 }), ...Array.from({ length: 5_000 }, (_, index) => authoredEntity(`stress-${index}`, index % 11 === 0 ? 'Sprite' : 'Rectangle', index % 100, Math.floor(index / 100), { name: `Stress Object ${String(index + 1).padStart(4, '0')}`, tags: [`row-${Math.floor(index / 100)}`, index % 11 === 0 ? 'sprite' : 'shape'], order: index % 20, color: { r: 70 + index % 140, g: 100 + index % 110, b: 155 + index % 90 } }))]
await writeProjectBundle('authoring-5000-stress', authoringProject('authoring-5000-stress', '5,000 Object Authoring Stress', stressEntities), ['5,000 objects', 'performance mode', 'component and tag search', 'box selection'])

const defaultReferenceSettings = () => ({
  textureProfile: 'General', filterMode: 'Linear', compression: 'Lossless', colorSpace: 'sRGB', pixelArt: false, pixelsPerUnit: 100,
  spriteRegion: null, pivot: { x: .5, y: .5 }, atlas: false, transparentTrim: false,
  platformVariants: {}, spriteSheet: { enabled: false, columns: 1, rows: 1, margin: 0, spacing: 0 }, borders: { left: 0, top: 0, right: 0, bottom: 0 },
  atlasSettings: { maxSize: 2048, padding: 2, trim: true },
  audioSettings: { profile: 'SoundEffect', codec: 'Original', quality: .8, streaming: false, normalize: false, normalizationGain: 1, targetPeakDb: -1, sampleRate: 48000, loopStart: 0, loopEnd: 0, trimStart: 0, trimEnd: 0 },
  fontSettings: { renderMode: 'Scalable', fallbackFamilies: ['Nunito Sans', 'Segoe UI', 'sans-serif'], bitmapSize: 32, outlineWidth: 0, shaping: true }
})
const referenceAsset = (seed, name, path, assetType, mimeType, source, settings = {}) => ({
  uuid: stableUuid(`asset:${seed}`), name, path, assetType, mimeType, byteLength: Buffer.byteLength(source), source, sourceModified: 0, importedAt: 0,
  width: 0, height: 0, duration: 0, fontFamily: assetType === 'font' ? `NovaAsset_${stableUuid(`asset:${seed}`).replace(/-/g, '')}` : '', settings: { ...defaultReferenceSettings(), ...settings }
})
const addComponent = (entity, seed, kind, data) => { entity.components.push(authoringComponent(seed, kind, data)); return entity }

const lightingEntities = [
  authoredEntity('lighting-camera', 'Camera', 0, 0, { orthographicSize: 8 }),
  addComponent(authoredEntity('lighting-key', 'Empty', -2, 2, { name: 'Warm point light' }), 'lighting-key', 'Light2D', { lightType: 'Point', color: { r: 255, g: 210, b: 150 }, intensity: 1.35, range: 8, innerAngle: 30, outerAngle: 55, areaSize: { x: 4, y: 2 }, layerMask: 0xffffffff, castsShadows: true, shadowSoftness: .65 }),
  ...Array.from({ length: 7 }, (_, index) => addComponent(authoredEntity(`lighting-caster-${index}`, 'Rectangle', index * 2 - 6, index % 2 ? 1 : -1, { scale: { x: 1.2, y: 2.4 }, color: { r: 70 + index * 14, g: 105 + index * 8, b: 175 + index * 6 } }), `lighting-caster-${index}`, 'ShadowCaster2D', { layerMask: 0xffffffff, selfShadows: false, opacity: .85 }))
]
const lightingProject = authoringProject('rendering-lighting-shadows', 'Lighting and Shadows', lightingEntities)
Object.assign(lightingProject.projectSettings.rendering, { lightingEnabled: true, ambientColor: { r: 74, g: 82, b: 112 }, ambientIntensity: .35, shadowQuality: 'Soft', qualityPreset: 'High' })
await writeProjectBundle('rendering-lighting-shadows', lightingProject, ['ambient and point lighting', 'layer masks, occluders and soft shadows', 'quality presets and renderer fallback'])

const particleEntity = addComponent(authoredEntity('particles-emitter', 'Empty', 0, -2, { name: 'Gradient fountain' }), 'particles-emitter', 'ParticleEmitter2D', { textureAsset: null, emissionRate: 120, burst: 24, lifetime: 2.4, initialVelocityMin: { x: -2.5, y: 3 }, initialVelocityMax: { x: 2.5, y: 7 }, gravity: { x: 0, y: -6 }, rotationMin: 0, rotationMax: 6.283185, angularVelocityMin: -2, angularVelocityMax: 2, startScale: .28, endScale: .04, startColor: { r: 112, g: 192, b: 255 }, endColor: { r: 176, g: 90, b: 255 }, startOpacity: 100, endOpacity: 0, maxParticles: 1400, autoplay: true, looping: true, worldSpace: true, sortingLayer: 2, orderInLayer: 0, material: 'Particles', blendMode: 'Additive', emissionShape: 'Circle', shapeSize: { x: 1, y: 1 }, shapeRadius: 1.2, scaleCurve: [{ time: 0, value: .4 }, { time: .25, value: 1 }, { time: 1, value: .1 }], colorGradient: [{ time: 0, color: { r: 80, g: 180, b: 255 }, opacity: 100 }, { time: .55, color: { r: 175, g: 100, b: 255 }, opacity: 85 }, { time: 1, color: { r: 255, g: 90, b: 125 }, opacity: 0 }], subEmitterUuid: null, subEmitterCount: 1, previewInEditor: true })
const particleProject = authoringProject('rendering-particles', 'Particle Authoring', [authoredEntity('particles-camera', 'Camera', 0, 1, { orthographicSize: 8 }), particleEntity])
particleProject.projectSettings.rendering.particleBudget = 10_000
await writeProjectBundle('rendering-particles', particleProject, ['editor particle preview', 'curves, gradients and emission shapes', 'particle budget diagnostics and additive blending'])

const materialSource = JSON.stringify({ version: 2, name: 'Typed Uniform Showcase', fragment: '#include <nova/color>\nuniform float glow; // @range(0, 2, 0.05)\nuniform vec4 tint; // @color\nuniform bool pulse; // @toggle\nvec4 nova_material(vec4 baseColor, vec2 uv) { vec4 mixed = baseColor * tint; return vec4(nova_linear_to_srgb(mixed.rgb * (1.0 + glow)), mixed.a); }', textures: {}, uniforms: { glow: .35, tint: [0.6, 0.82, 1, 1], pulse: true }, uniformSchema: [], includes: ['nova/color'], variants: { cool: '#define NOVA_COOL 1' }, activeVariant: 'cool', parentMaterial: null, blendMode: 'Alpha', sampling: 'Linear', colorSpace: 'sRGB', writeColor: true }, null, 2)
const materialAsset = referenceAsset('typed-material', 'Typed Uniform Showcase.nova-material', 'Assets/Materials/Typed Uniform Showcase.nova-material', 'material', 'application/json', `data:application/json;charset=utf-8,${encodeURIComponent(materialSource)}`)
const materialReference = `asset://${materialAsset.uuid}`
const materialEntities = [authoredEntity('material-camera', 'Camera', 0, 0, { orthographicSize: 7 }), ...Array.from({ length: 9 }, (_, index) => authoredEntity(`material-shape-${index}`, 'Rectangle', index % 3 * 3 - 3, Math.floor(index / 3) * 2.4 - 2.4, { color: { r: 110, g: 170, b: 255 }, scale: { x: 2.2, y: 1.5 } }))]
for (const entity of materialEntities) { const renderer = entity.components.find(component => component.kind === 'ShapeRenderer2D'); if (renderer) renderer.data.material = materialReference }
await writeProjectBundle('rendering-shader-uniforms', authoringProject('rendering-shader-uniforms', 'Shader and Typed Uniforms', materialEntities, [materialAsset]), ['typed reflected shader uniforms', 'includes, variants and compile cache', 'source-linked safe-shader diagnostics and material serialization'])

const textureCamera = authoredEntity('render-texture-camera', 'Camera', -5, 0, { name: 'Render texture camera', orthographicSize: 5, priority: 0 })
textureCamera.components.find(component => component.kind === 'Camera2D').data.renderTexture = 'preview-target'
const textureProject = authoringProject('rendering-render-textures', 'Render Textures and Cameras', [textureCamera, authoredEntity('render-texture-composite', 'Camera', 5, 0, { name: 'Composite camera', orthographicSize: 9, priority: 1 }), ...Array.from({ length: 20 }, (_, index) => authoredEntity(`render-target-subject-${index}`, 'Rectangle', index % 5 * 2 - 4, Math.floor(index / 5) * 2 - 3, { color: { r: 75 + index * 5, g: 135, b: 220 } }))])
Object.assign(textureProject.projectSettings.rendering.postProcessing, { enabled: true, exposure: .05, contrast: 1.08, saturation: 1.05, vignette: .12, bloom: .15 })
await writeProjectBundle('rendering-render-textures', textureProject, ['multiple cameras and viewports', 'named render-texture target', 'post-processing render graph and fallback'])

const fontAsset = referenceAsset('multilingual-font', 'Multilingual Fallback Font', 'Assets/Fonts/Multilingual Fallback.font-profile', 'font', 'application/x-nova-font-profile', '', { fontSettings: { renderMode: 'Scalable', fallbackFamilies: ['Nunito Sans', 'Segoe UI', 'Microsoft YaHei UI', 'sans-serif'], bitmapSize: 32, outlineWidth: .025, shaping: true } })
const fontEntities = [authoredEntity('fonts-camera', 'Camera', 0, 0, { orthographicSize: 8 }), authoredEntity('font-en', 'WorldText', 0, 2.5, { name: 'Fast, clear 2D rendering', color: { r: 115, g: 185, b: 255 } }), authoredEntity('font-de', 'WorldText', 0, 0, { name: 'Schnelle, klare 2D-Darstellung', color: { r: 135, g: 220, b: 170 } }), authoredEntity('font-zh', 'WorldText', 0, -2.5, { name: '快速、清晰的二维渲染', color: { r: 255, g: 190, b: 110 } })]
for (const entity of fontEntities) { const renderer = entity.components.find(component => component.kind === 'TextRenderer2D'); if (renderer) { renderer.data.fontAsset = `asset://${fontAsset.uuid}`; renderer.data.fontSize = 1.25; renderer.data.maxWidth = 16 } }
await writeProjectBundle('rendering-fonts-multilingual', authoringProject('rendering-fonts-multilingual', 'Multilingual Font Pipeline', fontEntities, [fontAsset]), ['scalable and cached bitmap text paths', 'fallback families, shaping and outlines', 'English, German and Chinese rendering'])

function waveDataUrl(frequency = 440, seconds = .35, sampleRate = 22050) {
  const frames = Math.floor(seconds * sampleRate), bytes = Buffer.alloc(44 + frames * 2)
  bytes.write('RIFF', 0); bytes.writeUInt32LE(36 + frames * 2, 4); bytes.write('WAVEfmt ', 8); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(sampleRate, 24); bytes.writeUInt32LE(sampleRate * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(frames * 2, 40)
  for (let index = 0; index < frames; index++) bytes.writeInt16LE(Math.round(Math.sin(index / sampleRate * frequency * Math.PI * 2) * 9000 * Math.min(1, index / 300) * Math.min(1, (frames - index) / 500)), 44 + index * 2)
  return `data:audio/wav;base64,${bytes.toString('base64')}`
}
const audioSourceData = (clip, overrides = {}) => ({ audioClip: clip, volume: .7, pitch: 1, loop: true, autoplay: true, spatialBlend: 1, minDistance: 1, maxDistance: 14, bus: 'SFX', attenuationCurve: 'Inverse', customAttenuation: [{ distance: 0, gain: 1 }, { distance: 1, gain: 0 }], voicePriority: 50, polyphony: 4, randomPitch: .05, randomVolume: .08, virtualizeWhenLimited: true, streamOverride: 'ImportSetting', ...overrides })
const toneSource = waveDataUrl(), toneAsset = referenceAsset('positional-tone', 'Positional Tone.wav', 'Assets/Audio/Positional Tone.wav', 'audio', 'audio/wav', toneSource, { audioSettings: { profile: 'SoundEffect', codec: 'PCM', quality: 1, streaming: false, normalize: true, normalizationGain: 1, loopStart: 0, loopEnd: .35, trimStart: 0, trimEnd: .35 } })
toneAsset.duration = .35
const listenerCamera = addComponent(authoredEntity('audio-listener', 'Camera', 0, 0, { orthographicSize: 10 }), 'audio-listener', 'AudioListener', { active: true })
const positionalEntities = [listenerCamera, ...[-6, 0, 6].map((x, index) => addComponent(authoredEntity(`audio-source-${index}`, 'Rectangle', x, index % 2 ? 3 : -2, { name: `Spatial source ${index + 1}`, color: { r: 90, g: 165 + index * 20, b: 255 } }), `audio-source-${index}`, 'AudioSource', audioSourceData(`asset://${toneAsset.uuid}`, { pitch: .8 + index * .2 })))]
await writeProjectBundle('audio-positional', authoringProject('audio-positional', 'Positional Audio', positionalEntities, [toneAsset]), ['2D listener, panning and distance attenuation', 'polyphony, deterministic pitch/volume variation', 'voice priority and limits'])

const effectsProject = authoringProject('audio-bus-effects', 'Audio Bus Effects', positionalEntities, [structuredClone(toneAsset)])
effectsProject.projectSettings.audio.mixer.buses.find(bus => bus.id === 'SFX').effects = [{ id: 'compressor', kind: 'Compressor', enabled: true, wet: 1, frequency: 1200, q: .7, threshold: -18, ratio: 4, time: .1, feedback: .2 }, { id: 'delay', kind: 'Delay', enabled: true, wet: .2, frequency: 1200, q: .7, threshold: -24, ratio: 4, time: .16, feedback: .22 }]
effectsProject.projectSettings.audio.mixer.snapshots.push({ id: 'quiet', name: 'Quiet mix', masterVolume: .8, busGains: { Master: 1, Music: .75, SFX: .55, UI: 1 } })
effectsProject.projectSettings.audio.mixer.ducking.push({ id: 'sfx-ducks-music', triggerBus: 'SFX', targetBus: 'Music', reductionDb: -9, attack: .04, release: .35, enabled: true })
await writeProjectBundle('audio-bus-effects', effectsProject, ['bus routing, compressor and delay effects', 'snapshots, sends, meters and ducking', 'deterministic voice limits'])

const streamAsset = structuredClone(toneAsset); streamAsset.uuid = stableUuid('asset:streaming-tone'); streamAsset.name = 'Streaming Music.wav'; streamAsset.path = 'Assets/Audio/Streaming Music.wav'; streamAsset.settings.audioSettings = { profile: 'Streaming', codec: 'Vorbis', quality: .72, streaming: true, normalize: true, normalizationGain: 1, loopStart: .02, loopEnd: .33, trimStart: .02, trimEnd: .33 }
const streamEntity = addComponent(authoredEntity('stream-source', 'Empty', 0, 0, { name: 'Streaming music source' }), 'stream-source', 'AudioSource', audioSourceData(`asset://${streamAsset.uuid}`, { bus: 'Music', spatialBlend: 0, polyphony: 1, randomPitch: 0, randomVolume: 0, streamOverride: 'Stream' }))
await writeProjectBundle('audio-streaming', authoringProject('audio-streaming', 'Streaming Audio', [listenerCamera, streamEntity], [streamAsset]), ['streaming import profile and codec metadata', 'trimmed loop points and gap qualification', 'device changes, latency and underrun diagnostics'])

const worldAtlasSource = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="32"%3E%3Cpath fill="%23558f68" d="M0 0h32v32H0z"/%3E%3Cpath fill="%237a5e45" d="M32 0h32v32H32z"/%3E%3Cpath fill="%235b9ed3" d="M64 0h32v32H64z"/%3E%3C/svg%3E'
const worldAtlas = referenceAsset('world-atlas', 'World Atlas.svg', 'Assets/Tiles/World Atlas.svg', 'image', 'image/svg+xml', worldAtlasSource, { textureProfile: 'PixelArt', filterMode: 'Nearest', pixelsPerUnit: 32, atlas: true })
worldAtlas.width = 96; worldAtlas.height = 32
const worldTileSetDocument = {
  version: 2, textureAsset: `asset://${worldAtlas.uuid}`, sources: [{ id: 'primary', name: 'World atlas', textureAsset: `asset://${worldAtlas.uuid}`, margin: 0, spacing: 0 }], tileWidth: 32, tileHeight: 32, columns: 3, rows: 1,
  tiles: [
    { index: 0, name: 'Ground', collision: 'None', polygon: [], terrain: 'Ground', navigationCost: 1, occluder: false, navigationPolygon: [], occlusionPolygon: [], metadata: { biome: 'meadow', footstep: 'grass' }, sceneAsset: null, prefabAsset: null, sourceId: 'primary', region: null, animation: null, variants: [{ tile: 2, weight: .08 }] },
    { index: 1, name: 'Wall', collision: 'Box', polygon: [], terrain: 'Wall', navigationCost: 0, occluder: true, navigationPolygon: [], occlusionPolygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], metadata: { solid: true }, sceneAsset: null, prefabAsset: null, sourceId: 'primary', region: null, animation: null, variants: [] },
    { index: 2, name: 'Animated water', collision: 'None', polygon: [], terrain: 'Water', navigationCost: 3, occluder: false, navigationPolygon: [], occlusionPolygon: [], metadata: { liquid: true }, sceneAsset: null, prefabAsset: null, sourceId: 'primary', region: null, animation: { frames: [2, 0], framesPerSecond: 2, mode: 'PingPong' }, variants: [] }
  ]
}
const worldTileSet = referenceAsset('world-tileset', 'World.nova-tileset', 'Assets/TileSets/World.nova-tileset', 'tileset', 'application/x-nova-tileset', JSON.stringify(worldTileSetDocument))
const worldTerrainRules = referenceAsset('world-terrain', 'Ground.nova-terrain', 'Assets/TerrainRules/Ground.nova-terrain', 'terrainRules', 'application/json', JSON.stringify({ version: 1, terrain: 'Ground', rules: Object.fromEntries(Array.from({ length: 16 }, (_, mask) => [String(mask), mask === 15 ? 0 : 1])) }))
const worldTiles = Array.from({ length: 64 * 40 }, (_, index) => { const x = index % 64, y = Math.floor(index / 64); return x === 0 || y === 0 || x === 63 || y === 39 ? 1 : (x + y) % 31 === 0 ? 2 : 0 })
const worldTransforms = worldTiles.map((_, index) => index % 97 === 0 ? 5 : 0)
const worldMapEntity = addComponent(authoredEntity('world-tilemap', 'Empty', 0, 0, { name: 'Tilemap 2.0 World' }), 'world-tilemap', 'TileMap2D', { tileSetAsset: `asset://${worldTileSet.uuid}`, width: 64, height: 40, tileSize: { x: 1, y: 1 }, chunkSize: 16, tiles: worldTiles, layers: [{ id: 'ground', name: 'Ground', visible: true, locked: false, opacity: 1, blendMode: 'Alpha', parallax: { x: 1, y: 1 }, zOrder: 0, collisionEnabled: true, navigationEnabled: true, occlusionEnabled: true, tiles: worldTiles, transforms: worldTransforms }, { id: 'detail', name: 'Detail', visible: true, locked: false, opacity: .8, blendMode: 'Alpha', parallax: { x: .9, y: .9 }, zOrder: 1, collisionEnabled: false, navigationEnabled: false, occlusionEnabled: false, tiles: worldTiles.map((_, index) => index % 173 === 0 ? 2 : -1), transforms: Array(64 * 40).fill(0) }], activeLayer: 0, streamingEnabled: true, streamingRadius: 3, bakeCollision: true, bakeNavigation: true, bakeOccluders: true, revision: 1 })
const worldNavigationEntity = addComponent(authoredEntity('world-navigation', 'Empty', 0, 0, { name: 'Polygon Navigation Region' }), 'world-navigation', 'NavigationRegion2D', { polygon: [{ x: -31, y: -19 }, { x: 31, y: -19 }, { x: 31, y: 19 }, { x: -31, y: 19 }], cellSize: .5, navigationMode: 'Polygon', algorithm: 'AStar', allowDiagonal: true, dynamic: true, rebakeInterval: .5, navigationLayer: 1, navigationMask: 1, traversalCost: 1, source: 'Manual', sourceEntityUuid: null, agentRadius: .4, links: [{ id: 'bridge', start: { x: -2, y: 0 }, end: { x: 2, y: 0 }, bidirectional: true, cost: .8, enabled: true }] })
const worldChunkEntity = addComponent(authoredEntity('world-chunk', 'Empty', 0, 0, { name: 'Streamed Cell A' }), 'world-chunk', 'WorldChunk2D', { size: { x: 64, y: 40 }, loadDistance: 48, unloadDistance: 72, prefetchDistance: 96, preloadPriority: 1, memoryEstimateMb: 8, sceneUuid: '', initiallyLoaded: true, ownership: 'world-reference', dependencies: [], cachePolicy: 'LRU', saveStateKey: 'world.cell.a' })
const worldBaseEntities = [authoredEntity('world-camera', 'Camera', 0, 0, { orthographicSize: 14 }), worldMapEntity, worldNavigationEntity, worldChunkEntity]
const worldAssets = [worldAtlas, worldTileSet, worldTerrainRules]
for (const [slug, title, features] of [
  ['tilemap-multilayer', 'Multi-layer Tilemap 2.0', ['multi-layer tilemap', 'blend, parallax and z order', 'collision/navigation/occlusion masks', 'rotate and mirror transforms']],
  ['tilemap-terrain-rules', 'Terrain Rules and Validation', ['complete 16-mask terrain rules', 'weighted deterministic variants', 'terrain validation and preview']],
  ['tilemap-animated', 'Animated and Metadata Tiles', ['animated tiles', 'custom metadata', 'scene/prefab placement fields', 'atlas sources']],
  ['navigation-world', 'Grid and Polygon Navigation', ['grid and polygon navigation', 'costs, links and regions', 'dynamic obstacles and avoidance', 'navigation profiling']],
  ['streamed-world', 'Asynchronous Streamed World', ['explicit cell bounds and ownership', 'async lifecycle and dependency prefetch', 'memory budget, cache policy and event log', 'save-state handoff']]
]) await writeProjectBundle(slug, authoringProject(slug, title, structuredClone(worldBaseEntities), structuredClone(worldAssets)), features)

const saveMigrationProject = authoringProject('save-migration', 'Save Migration and Recovery', [authoredEntity('save-camera', 'Camera', 0, 0), authoredEntity('save-help', 'WorldText', 0, 0, { name: 'Inspect Debug → Save Data' })])
saveMigrationProject.projectSettings.production = {
  performance: { traceCapacity: 600, memoryBudgetMb: 300, assetBudgetMb: 512, leakWindowFrames: 600, lifetimeCapacity: 2000 }, replay: { seed: 1313822273, capacity: 3600, strictChecksums: true }, testing: { defaultTimeoutMs: 10000, tests: [] },
  data: { saveSchemaVersion: 3, saveMigrations: [{ fromVersion: 1, toVersion: 2, renames: { score: 'total_score' }, defaults: { checkpoint: 'start' }, remove: [] }, { fromVersion: 2, toVersion: 3, renames: {}, defaults: { difficulty: 'normal' }, remove: ['legacy_flag'] }] },
  jobs: { maxWorkers: 2, maxQueued: 256, timeoutMs: 15000 }, networking: { enabled: false, role: 'client', transport: 'websocket', endpoint: 'ws://127.0.0.1:7777', bindAddress: '127.0.0.1:0', snapshotRate: 20, interpolationMs: 100, rollbackFrames: 120, bandwidthKbps: 256, reconnect: true, replicatedEntities: [] }
}
await writeProjectBundle('save-migration', saveMigrationProject, ['deterministic save migrations', 'checksum and transaction journal', 'backup and corruption recovery', 'async progress and cancellation'])

const poolEntity = addComponent(authoredEntity('pool-owner', 'Empty', 0, 0, { name: 'Optional Object Pool' }), 'pool-owner', 'ObjectPool2D', { prefabAsset: null, prewarm: 16, capacity: 64, autoExpand: true, resetContract: 'FullSerializedState', maximumLifetime: 12, activeCount: 0, createdCount: 0, reusedCount: 0, leakedCount: 0 })
const poolProject = authoringProject('optional-object-pool', 'Optional Object Pool Package', [authoredEntity('pool-camera', 'Camera', 0, 0), poolEntity])
poolProject.packages.installed.push({ manifest: { manifestVersion: 1, id: 'top.whitelists.novaa.object-pool', name: 'Nova Object Pool', version: '3.8.0', description: 'Optional bounded object pool runtime.', engine: '>=3.8.0 <5.0.0', apiCompatibility: '>=1 <2', entryPointType: 'runtime', dependencies: {}, dependencyHashes: {}, pluginApi: null, native: false, sha256: '1bb0707fffc9aa16790924146797791413754147129750608f29360bd2ee4e86', signature: 'nova-official-v1:1bb0707fffc9aa16790924146797791413754147129750608f29360bd2ee4e86', publisher: 'Whitelist', publisherVerified: true, permissions: [], rating: 5, securityUrl: 'https://github.com/Stevenzhang543/Nova_A/security', documentationUrl: 'https://github.com/Stevenzhang543/Nova_A/' }, source: { kind: 'registry', location: 'Nova_A official offline package' }, enabled: true, project: true, installedAt: 0, securityStatus: 'verified', grantedPermissions: [], deprecations: [] })
await writeProjectBundle('optional-object-pool', poolProject, ['optional package enable/disable/removal', 'reset contracts', 'capacity and lifetime', 'reuse and leak diagnostics'])

const releaseBuildSettings = target => ({
  gameName: 'NovaReference', target, architecture: 'x86_64', runtimeMode: 'game', profile: 'release', sceneOrder: [], startupSceneUuid: '', packageIntoExecutable: target === 'windows', developmentBuild: false, outputDirectory: '', presetName: `${target}-release`,
  platform: { identifier: 'top.whitelists.novaa.reference', version: '1.0.0', iconAsset: null, splashAsset: null, orientation: 'auto', permissions: [], signingMode: 'none', signingIdentity: '', notarizationProfile: '', manifestAsset: null, versionMetadata: { channel: 'reference' } },
  delivery: { deterministic: true, incremental: true, compression: 'maximum', patchManifest: true, structuredLogs: true, crashReports: false, telemetryEnabled: false, telemetryEndpoint: '', privacyPolicyUrl: '', cacheMode: 'validate', include: ['Assets/**'], exclude: ['**/*.psd', '.nova/**'], stripUnusedAssets: true, sizeReport: true, dependencyReport: true, debugSymbols: false, crashSymbols: true }
})

const buildAutomationProject = authoringProject('build-automation', 'Build Automation Reference', [authoredEntity('build-camera', 'Camera', 0, 0), authoredEntity('build-label', 'WorldText', 0, 0, { name: 'CLI validate → build → export' })])
buildAutomationProject.projectSettings.build = releaseBuildSettings('windows'); buildAutomationProject.projectSettings.build.sceneOrder = [buildAutomationProject.scenes[0].uuid]; buildAutomationProject.projectSettings.build.startupSceneUuid = buildAutomationProject.scenes[0].uuid
await writeProjectBundle('build-automation', buildAutomationProject, ['all seven CLI commands', 'clean/incremental/validated cache modes', 'content and symbol reports', 'machine-readable CI logs'])

const packageManifestDocument = { manifestVersion: 1, id: 'com.example.reference-tools', name: 'Reference Tools', version: '1.0.0', description: 'Package authoring reference only.', engine: '>=4.0.0 <5.0.0', apiCompatibility: '>=1 <2', entryPointType: 'editor', dependencies: {}, dependencyHashes: {}, permissions: ['editor.selection.read'], pluginApi: 2, native: false, sha256: '2d97968912658ad86e8469c859f8209109bea8c105ddaf6dcd1e5e498907ee98', signature: 'example-registry-signature', publisher: 'Example', publisherVerified: false, securityUrl: 'https://example.com/security', documentationUrl: 'https://example.com/docs' }
const packageManifestAsset = referenceAsset('package-authoring-manifest', 'manifest.json', 'Assets/Packages/ReferenceTools/manifest.json', 'script', 'application/json', JSON.stringify(packageManifestDocument, null, 2))
const packageAuthoringProject = authoringProject('package-authoring', 'Package Authoring Reference', [authoredEntity('package-camera', 'Camera', 0, 0), authoredEntity('package-label', 'WorldText', 0, 0, { name: 'Review → validate → sign → publish' })], [packageManifestAsset])
await writeProjectBundle('package-authoring', packageAuthoringProject, ['manifest types and API range', 'permission review and escalation', 'signature failure and quarantine', 'offline lock and verified rollback'])

const sourcePrefab = referenceAsset('source-control-prefab', 'DiffTarget.nova-prefab', 'Assets/Prefabs/DiffTarget.nova-prefab', 'prefab', 'application/x-nova-prefab', JSON.stringify({ format: 'nova-prefab', version: 2, entities: [] }))
const sourceResource = referenceAsset('source-control-resource', 'Balance.nova-data', 'Assets/Data/Balance.nova-data', 'dataTable', 'application/json', JSON.stringify({ rows: [{ id: 'player', speed: 6 }] }))
const sourceControlProject = authoringProject('source-control-workflow', 'Source Control Workflow', [authoredEntity('source-camera', 'Camera', 0, 0), authoredEntity('source-label', 'WorldText', 0, 0, { name: 'Canonical diffs and lock changes' })], [sourcePrefab, sourceResource])
const sourceSecondScene = structuredClone(sourceControlProject.scenes[0]); sourceSecondScene.uuid = stableUuid('source-control:scene:second'); sourceSecondScene.name = 'Merge Target'; sourceSecondScene.entities = []
sourceControlProject.scenes.push(sourceSecondScene)
await writeProjectBundle('source-control-workflow', sourceControlProject, ['scene, prefab, resource, settings and package diffs', 'external reload and compare', 'canonical no-op saves', 'Git, pre-commit, CI and optional locks'])

const webDeploymentProject = authoringProject('web-deployment', 'Web Deployment Reference', [authoredEntity('web-camera', 'Camera', 0, 0), authoredEntity('web-label', 'WorldText', 0, 0, { name: 'HTTPS web runtime' })])
webDeploymentProject.projectSettings.build = releaseBuildSettings('web'); webDeploymentProject.projectSettings.build.packageIntoExecutable = false; webDeploymentProject.projectSettings.build.sceneOrder = [webDeploymentProject.scenes[0].uuid]; webDeploymentProject.projectSettings.build.startupSceneUuid = webDeploymentProject.scenes[0].uuid
await writeProjectBundle('web-deployment', webDeploymentProject, ['Tier-1 browser matrix', 'deterministic web package', 'HTTPS/MIME deployment', 'size, dependency and patch reports'])

const headlessNetworkProject = authoringProject('headless-networking', 'Optional Headless Networking', [authoredEntity('server-root', 'Empty', 0, 0, { name: 'Authoritative server root' })])
headlessNetworkProject.projectSettings.build = releaseBuildSettings('windows'); headlessNetworkProject.projectSettings.build.runtimeMode = 'headless-server'; headlessNetworkProject.projectSettings.build.sceneOrder = [headlessNetworkProject.scenes[0].uuid]; headlessNetworkProject.projectSettings.build.startupSceneUuid = headlessNetworkProject.scenes[0].uuid
headlessNetworkProject.projectSettings.production = structuredClone(saveMigrationProject.projectSettings.production)
headlessNetworkProject.projectSettings.production.networking = { enabled: true, role: 'server', transport: 'native-udp', endpoint: 'udp://127.0.0.1:7777', bindAddress: '127.0.0.1:7777', snapshotRate: 20, interpolationMs: 100, rollbackFrames: 120, bandwidthKbps: 256, reconnect: true, replicatedEntities: [] }
headlessNetworkProject.packages.installed.push({ manifest: { manifestVersion: 1, id: 'top.whitelists.novaa.networking', name: 'Nova Optional Networking', version: '2.9.0', description: 'Experimental networking reference.', engine: '>=2.9.0 <5.0.0', apiCompatibility: '>=1 <2', entryPointType: 'runtime', dependencies: {}, dependencyHashes: {}, pluginApi: null, native: false, sha256: 'fd048525377499fbd054cb74b69d5369c57d11431951695d413ec1e14cfe3424', signature: 'nova-official-v1:fd048525377499fbd054cb74b69d5369c57d11431951695d413ec1e14cfe3424', publisher: 'Whitelist', publisherVerified: true, permissions: ['network.client', 'network.listen'], rating: 5, securityUrl: 'https://github.com/Stevenzhang543/Nova_A/security', documentationUrl: 'https://github.com/Stevenzhang543/Nova_A/' }, source: { kind: 'registry', location: 'Nova_A official offline package' }, enabled: true, project: true, installedAt: 0, securityStatus: 'verified', grantedPermissions: ['network.client', 'network.listen'], deprecations: [] })
await writeProjectBundle('headless-networking', headlessNetworkProject, ['experimental transport/RPC/authority contracts', 'replication, prediction and diagnostics', 'headless fixed-tick interface', 'security and packet-loss gates'])

// Minimal, dependency-free Plugin API 2 WASM. It exports the required API
// version and initialization functions and deliberately has no permissions.
const wasm = Uint8Array.from([
  0x00,0x61,0x73,0x6d,0x01,0x00,0x00,0x00,
  0x01,0x05,0x01,0x60,0x00,0x01,0x7f,
  0x03,0x03,0x02,0x00,0x00,
  0x07,0x2e,0x02,
  0x17,0x6e,0x6f,0x76,0x61,0x5f,0x70,0x6c,0x75,0x67,0x69,0x6e,0x5f,0x61,0x70,0x69,0x5f,0x76,0x65,0x72,0x73,0x69,0x6f,0x6e,0x00,0x00,
  0x10,0x6e,0x6f,0x76,0x61,0x5f,0x70,0x6c,0x75,0x67,0x69,0x6e,0x5f,0x69,0x6e,0x69,0x74,0x00,0x01,
  0x0a,0x0b,0x02,0x04,0x00,0x41,0x02,0x0b,0x04,0x00,0x41,0x01,0x0b
])
if (!WebAssembly.validate(wasm)) throw new Error('The generated reference plugin is not valid WebAssembly.')
await writeFile(join(pluginsDirectory, 'hello-plugin.wasm'), wasm)
await writeFile(join(pluginsDirectory, 'plugin.json'), `${JSON.stringify({
  id: 'top.whitelists.novaa.samples.hello', name: 'Hello Plugin API 2', version: '1.0.0', apiVersion: 2,
  engine: '>=3.0.0 <5.0.0', entry: 'hello-plugin.wasm', entryType: 'wasm', permissions: [], enabled: true,
  projectEnabled: true, sha256: createHash('sha256').update(wasm).digest('hex'), signature: '', publicKey: '', contributions: {}
}, null, 2)}\n`, 'utf8')

await writeFile(join(output, 'workspace-recovery-validation.nova-workspaces'), `${JSON.stringify({
  format: 'nova-workspaces', version: 2,
  workspaces: [{ id: 'validation-layout', name: 'Recovery Validation', page: 'scene', hierarchyVisible: true, inspectorVisible: true, bottomPanelVisible: true, bottomPanelOpen: true, bottomPanelTab: 'project', bottomPanelHeight: 300, hierarchyWidth: 260, inspectorWidth: 310, hierarchyDock: 'left', inspectorDock: 'right' }]
}, null, 2)}\n`, 'utf8')

await writeFile(join(output, 'README.md'), `# Nova_A 4.1 reference projects

These are generated, schema-valid source projects. Open any \`.nova\` file through **File → Import Project**, inspect it, press **Play**, run its project tests, and export it from **Build Settings**.

| Project | Demonstrates |
| --- | --- |
| \`empty.nova\` | Camera, input map, scene editing, save/load, and build settings |
| \`platformer.nova\` | Platformer movement, collisions, tilemap, animation, audio, lighting/shadows, UI, scripts, and export |
| \`top-down.nova\` | Top-down input, prefabs, particles, triggers, scene transitions, and Save API |
| \`physics-sandbox.nova\` | Rigid bodies, materials, joints, Rope2D, collision diagnostics, and physics monitoring |
| \`platformer-character/project.nova\` | Character slopes, steps, floor snap, moving platforms, edges and ceilings |
| \`top-down-character/project.nova\` | Top-down character motion, named collision layers, and triggers |
| \`joint-showcase/project.nova\` | Seven joint workflows, limits, motors and break thresholds |
| \`trigger-showcase/project.nova\` | Stable trigger enter/stay/exit ordering and contact data |
| \`ccd-test/project.nova\` | Continuous collision reference against thin geometry |
| \`stacking-test/project.nova\` | Stacking, friction, restitution, sleep and wake stability |
| \`ui-showcase.nova\` | Responsive UI, text input, themes, localization, focus navigation, and audio mixer |
| \`networked-optional.nova\` | Opt-in networking package, replication, prediction, diagnostics, and headless test configuration |
| \`workspace-recovery-validation.nova\` | Workspace import/export, docking, 100-step undo, autosave recovery, safe layout, and read-only recovery qualification |
| \`data-foundation-validation.nova\` | Manifest, nested scenes/prefabs, overrides, imported hashes, dependency graph, and missing-resource repair |
| \`authoring-pixel-art/project.nova\` | Nearest filtering, pixel-perfect camera, sprite drops, and zoom comparisons |
| \`authoring-resolution-independent/project.nova\` | World-unit scaling and common-resolution overlays |
| \`authoring-parallax/project.nova\` | Parallax hierarchy, motion scale, and repeat metadata |
| \`authoring-multiple-cameras/project.nova\` | Camera stacking, viewports, previews, and overlays |
| \`authoring-nested-prefabs/project.nova\` | Nested prefab layers, overrides, and hierarchy statuses |
| \`authoring-5000-stress/project.nova\` | 5,000-object viewport, search, navigation, and selection workload |
| \`rendering-lighting-shadows/project.nova\` | Ambient/point lighting, masks, occluders, soft shadows, and quality fallback |
| \`rendering-particles/project.nova\` | Particle preview, curves, gradients, shapes, additive blending, and budgets |
| \`rendering-shader-uniforms/project.nova\` | Typed uniforms, safe shaders, includes, variants, cache, and material serialization |
| \`rendering-render-textures/project.nova\` | Multiple cameras, render textures, render graph, and post-processing |
| \`rendering-fonts-multilingual/project.nova\` | Scalable/bitmap text cache, fallbacks, shaping, outlines, and multilingual text |
| \`audio-positional/project.nova\` | 2D panning/attenuation, listeners, polyphony, randomization, and priority |
| \`audio-bus-effects/project.nova\` | Buses, effects, snapshots, meters, ducking, and voice limits |
| \`audio-streaming/project.nova\` | Streaming profile, trim/loop points, codec metadata, latency, and underruns |
| \`script-lifecycle-signals/project.nova\` | Complete callback order, property metadata, and editor-visible signal connections |
| \`script-async-tasks/project.nova\` | Timers, deferred tasks, cancellation, and entity ownership |
| \`script-debugger-scenarios/project.nova\` | Conditional/function/hit-count breakpoints, logpoints, locals, and watches |
| \`script-test-runner/project.nova\` | Setup/teardown, cases, tags, skip, timeout, deterministic seeds, and CI reports |
| \`script-api-v1-examples/project.nova\` | Stable handles and API v1 namespace coverage |
| \`build-automation/project.nova\` | Seven-command CLI, presets, caches, content rules, reports and CI logs |
| \`package-authoring/project.nova\` | Manifest contract, permissions, signature failures, quarantine and rollback |
| \`source-control-workflow/project.nova\` | Structured diffs, no-op output, Git setup, CI and locks |
| \`web-deployment/project.nova\` | Tier-1 browser matrix and deterministic HTTPS deployment |
| \`headless-networking/project.nova\` | Optional Experimental networking and headless-server gates |

\`plugins/hello-plugin\` is a minimal, permission-free Plugin API 2 package. Import its manifest in **Packages → Plugin API** and select the included WASM entry. Plugin failures are isolated and can be bypassed with Safe Mode.

Import \`workspace-recovery-validation.nova-workspaces\` from **View → Manage Workspaces**. The validation project is deliberately small enough to exercise repeated edits, 100 undo/redo operations, autosave snapshots, forced termination, safe-layout startup, and monitor recovery without unrelated content noise.

Generated by \`pnpm references\`. Do not hand-edit generated project files; edit \`src/projects/templates.ts\` and regenerate them.
`, 'utf8')

console.log('Generated foundation, physics, API v1, authoring, visual/audio pipeline references, a workspace fixture, and one Plugin API 2 package.')

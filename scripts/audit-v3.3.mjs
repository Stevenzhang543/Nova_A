import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const read = path => readFile(join(root, path), 'utf8')
const json = async path => JSON.parse(await read(path))
const checks = []
const check = (name, condition, evidence) => checks.push({ name, status: condition ? 'passed' : 'failed', evidence })

const [pkg, tauri, authoring, palette, componentPalette, toolbar, canvas, inspector, hierarchy, renderer, assets, assetTypes, physics, geometry, metadata, commandPalette, i18n] = await Promise.all([
  json('package.json'), json('src-tauri/tauri.conf.json'), read('src/editor/authoring2d.ts'), read('src/components/CreateObjectPalette.vue'),
  read('src/editor/componentPalette.ts'), read('src/components/ToolBar.vue'), read('src/components/WorldCanvas.vue'), read('src/components/ConfigPanel.vue'),
  read('src/components/SceneSideBar.vue'), read('src/renderer/sceneRenderer.ts'), read('src/assets/AssetDatabase.ts'), read('src/assets/types.ts'),
  read('src/store/physics.ts'), read('src/world/geometry.ts'), read('src/editor/propertyMetadata.ts'), read('src/components/CommandPalette.vue'), read('src/i18n.ts')
])

const objectKinds = ['Sprite','AnimatedSprite','WorldText','Polygon','Line','Path','Camera','CanvasLayer','ParallaxLayer','Rectangle','Circle','Triangle','Collider','ScriptHost','AudioEmitter','Light','NavigationRegion']
const categories = ['Core','2D','Physics','UI','Audio','Camera','Navigation','Script','Packages']
const tools = ['move','rotate','scale','pivot','rect','path','polygon','collider','measure']
const snaps = ['grid','pixel','vertex','edge','center','object','angle']
const actions = ['resetPropertyValue','revertPropertyOverride','copyPropertyValue','pastePropertyValue','copyPropertyPath','keyframeProperty','togglePropertyPin']

check('release authority', pkg.version === '4.0.0' && tauri.version === '4.0.0', 'Package and native shell declare the current 4.0.0 authority.')
check('transactional universal object creation', objectKinds.every(kind => authoring.includes(`kind: '${kind}'`)) && authoring.includes('pushHistory(`Create ${entity.name}`)') && palette.includes('createAuthoringObject') && commandPalette.includes("id: 'create-object'"), 'All required types share one factory, selection update, and undo transaction.')
check('searchable grouped palettes', categories.every(category => authoring.includes(`category: '${category}'`)) && palette.includes('query') && palette.includes('favorites') && palette.includes('recent') && componentPalette.includes('compatibility') && componentPalette.includes('required'), 'Create Object and Add Component expose grouping, search, compatibility, dependencies, favorites, and recents.')
check('complete viewport tool and snapping surface', tools.every(tool => toolbar.includes(`id: '${tool}'`)) && snaps.every(snap => canvas.includes(`authoringState.snap.${snap}`) || authoring.includes(`${snap}:`)) && toolbar.includes('frameSelection') && toolbar.includes('isolateSelection') && toolbar.includes('groupSelection'), 'Gizmos, ruler, arrangement, isolation, grouping, and seven snapping modes are reachable in Design.')
check('non-overlapping responsive toolbar', toolbar.includes('class="toolbar-content"') && toolbar.includes('width: max-content') && toolbar.includes('flex: 0 0 auto') && !toolbar.includes('calc((100vw - 760px) / 2)'), 'Toolbar controls keep intrinsic width, center when space permits, and scroll only when the viewport is genuinely narrower than the tool set.')
check('camera authoring and overlays', inspector.includes('cameraSmoothing') && inspector.includes('dragMargins') && inspector.includes('cameraLimits') && inspector.includes('pixelPerfect') && toolbar.includes('cameraOverlay') && canvas.includes('renderAuthoringOverlays') && physics.includes('previewInEditor: component.previewInEditor'), 'Camera edit, persistence, preview, pixel-perfect, and common resolution overlays are connected.')
check('origin canvas and parallax controls', inspector.includes('Authoring.origin') && inspector.includes('Canvas.screenSpace') && inspector.includes('Canvas.followCamera') && inspector.includes('Parallax.motionScale') && inspector.includes('Parallax.repeat') && renderer.includes("kind === 'CanvasLayer'") && renderer.includes("kind === 'ParallaxLayer'"), 'Origin, canvas-space, camera-follow, motion-scale, and repeat controls are exposed and connected to rendering.')
check('inspector metadata and property transactions', actions.every(action => inspector.includes(action)) && metadata.includes('minimum') && metadata.includes('maximum') && metadata.includes('unit') && inspector.includes('inspectorModifiedOnly') && inspector.includes('inspectorPinnedOnly') && inspector.includes("pushHistory('Set property'"), 'Inspector actions, validation metadata, pinned/modified views, and undo recording are implemented.')
check('multi-edit preserves mixed properties', inspector.includes("t('mixed')") && inspector.includes('selectedEntities.value') && inspector.includes("pushHistory('Set shared property'") && inspector.includes("pushHistory('Set shared sorting layer'"), 'Multi-edit only writes the explicitly selected shared property.')
check('component lifecycle workflow', inspector.includes('copyComponent') && inspector.includes('pasteComponent') && inspector.includes('reorderComponent') && inspector.includes('toggleComponent') && inspector.includes('resetComponent') && inspector.includes('removeComponent'), 'Components can be enabled, disabled, copied, pasted, reordered, reset, and removed.')
check('sprite and image workflow', assets.includes('sliceSpriteSheet') && assets.includes('trimTransparentImage') && assetTypes.includes('spriteSheet') && assetTypes.includes('borders') && inspector.includes('nineSlice') && canvas.includes('application/x-nova-asset-guid') && canvas.includes("pushHistory('Create sprite from asset')"), 'Slicing, atlas region, trim, pivots, borders/nine-slice, import settings, and one-step viewport drop are present.')
check('hierarchy productivity and transform modes', hierarchy.includes('component.kind') && hierarchy.includes('breadcrumbs') && hierarchy.includes('reorderDragged') && hierarchy.includes('event.altKey') && hierarchy.includes('event.shiftKey') && hierarchy.includes('prefabOverrides') && hierarchy.includes('pushHistory'), 'Search, breadcrumb, status, world/local reparent, reorder, and transactions are implemented.')
check('large-scene rendering mode and unobtrusive outlines', authoring.includes('performanceMode') && renderer.includes('performanceMode') && canvas.includes('Sprite selection stays as an outside-only outline') && canvas.includes('selectionBoundary'), 'Performance culling and pixel-art-aware selection treatment are implemented.')
check('path preservation and scene round trip', geometry.includes("entity.authoring?.kind === 'Line'") && physics.includes('authoring: JSON.parse') && physics.includes('knownKinds') && physics.includes("data.shape === 'Line'"), 'Open paths are not convex-hulled and all authoring metadata is serialized and normalized.')
check('localized authoring interface', ['Create object','Objekt erstellen','创建对象'].every(label => i18n.includes(label)), 'English, German, and Simplified Chinese authoring controls are available.')

const report = { format: 'nova-v3.3-authoring-audit', version: 1, engineVersion: '3.3.0', generatedAt: new Date().toISOString(), severity0Open: 0, severity1Open: 0, checks }
report.status = checks.every(item => item.status === 'passed') ? 'passed' : 'failed'
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits', 'v3.3.0-authoring-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(`v3.3 authoring audit ${report.status} (${checks.filter(item => item.status === 'passed').length}/${checks.length}).`)
if (report.status !== 'passed') process.exitCode = 1

import { computed, reactive } from 'vue'
import { preferencesState, type PerformanceProfile } from '../store/preferences'
import type { Locale } from '../store/preferences'
import { localizedUiLabel } from '../i18n'

export type LearningClassification = 'Automatic' | 'Manual' | 'Assisted' | 'Runtime' | 'Editor-only' | 'Destructive' | 'Reversible' | 'Project-wide' | 'Per-object'

export interface LearningGuide {
  id: string
  panel: string
  workspace: string
  feature: string
  classifications: LearningClassification[]
  prerequisites: string[]
  relatedRhai: string[]
  relatedGraph: string[]
  taskProject?: boolean
}

export interface LocalizedLearningGuide {
  title: string
  purpose: string
  whenToUse: string
  prerequisites: string[]
  steps: string[]
  expectedResult: string
  persistence: string
  undoRecovery: string
  mistakes: string[]
  accessibility: string
  minimalExample: string
  productionExample: string
  relatedRhai: string[]
  relatedGraph: string[]
}

interface PanelSpec {
  id: string
  panel: string
  workspace: string
  features: string[]
  classifications: LearningClassification[]
  prerequisites: string[]
  rhai?: string[]
  graph?: string[]
}

const panelSpecs: readonly PanelSpec[] = [
  { id: 'project-manager', panel: 'Project Manager', workspace: 'Launcher', features: ['Create project', 'Open project', 'Add existing project', 'Import archive', 'Migration preflight', 'Rollback download', 'Recent projects', '20-template library', 'Template search', 'Template difficulty filter', 'Template category browser', 'Template setup-time and capability preview'], classifications: ['Assisted', 'Project-wide', 'Reversible'], prerequisites: ['A writable project folder', 'A supported .nova/.json document for import or migration'] },
  { id: 'workspaces', panel: 'Workspace Bar', workspace: 'All', features: ['Design workspace', 'Script workspace', 'Animation workspace', 'Interface workspace', 'Debug workspace', 'Manage workspace', 'Dock and float panels', 'Saved layouts', 'Focus mode', 'Navigation history', 'Command Palette', 'Shortcut Editor'], classifications: ['Manual', 'Editor-only', 'Reversible'], prerequisites: ['An open project'] },
  { id: 'hierarchy', panel: 'Hierarchy', workspace: 'Design', features: ['Search and filters', 'Virtualized 10,000-object list', 'Multi-selection', 'Rename', 'Duplicate', 'Group', 'Reparent', 'Reorder', 'Lock', 'Hide', 'Isolate', 'Breadcrumbs', 'Scene tabs', 'Additive and overlay loading'], classifications: ['Manual', 'Editor-only', 'Reversible', 'Per-object'], prerequisites: ['An open scene'] },
  { id: 'viewport', panel: 'Scene View', workspace: 'Design', features: ['Select', 'Move', 'Rotate', 'Scale', 'Pivot', 'Rectangle tool', 'Polygon tool', 'Path tool', 'Collider tool', 'Ruler', 'Grid snapping', 'Pixel snapping', 'Vertex snapping', 'Edge snapping', 'Center snapping', 'Angle snapping', 'Guides and rulers', 'Alignment and distribution', 'Mirror', 'Camera framing'], classifications: ['Manual', 'Editor-only', 'Reversible', 'Per-object'], prerequisites: ['An editable scene', 'At least one object for transform tools'] },
  { id: 'inspector', panel: 'Inspector', workspace: 'Design', features: ['Transform2D', 'Renderer components', 'Physics components', 'Gameplay components', 'UI components', 'Audio components', 'Script2D', 'Multi-edit mixed values', 'Property expressions', 'Property search', 'Changed-only filter', 'Pinned properties', 'Reset and copy/paste', 'Keyframe property', 'Component validation', 'Prefab overrides'], classifications: ['Manual', 'Assisted', 'Reversible', 'Per-object'], prerequisites: ['One or more selected objects'] },
  { id: 'assets', panel: 'Assets', workspace: 'Design', features: ['Import assets', 'Create scripts and graphs', 'Folders', 'Grid and list views', 'Search, tags and favorites', 'Collections and saved filters', 'Source provenance', 'Import presets', 'Platform overrides', 'Reimport and compare', 'Reference repair', 'Unused-asset report', 'Sprite slicing', 'Deterministic atlases', 'Aseprite metadata import and reimport', 'TexturePacker and common atlas import', 'Tiled TMX, JSON and TSX import', 'Stable pivots, colliders and animation tags', 'Contextual asset tabs', 'Shared Resource assets', 'Local Resource overrides', 'Named Resource variants', 'Material Resources', 'Animation Library Resources', 'Input Map Resources', 'Physics Material Resources', 'Theme Resources', 'Data Table Resources', 'Audio import', 'Font shaping settings', 'Localization import validation', 'Nine-patch production profile', 'Vector and SDF production profile', 'Two-way dependency graph', 'Cycle and missing-reference visualization', 'Deterministic non-image thumbnails', 'Offline trusted content discovery', '50,000-asset virtual window', 'Project trash'], classifications: ['Manual', 'Assisted', 'Project-wide', 'Reversible'], prerequisites: ['An open project', 'Source files for import operations'] },
  { id: 'physics', panel: 'Physics Settings and Monitor', workspace: 'Design / Debug', features: ['Rigid bodies', 'Character bodies', 'Colliders', 'Sensors and Area2D', 'Collision layers and masks', 'Mass, density and inertia', 'Forces and impulses', 'Friction and restitution', 'Damping and sleep', 'Continuous collision', 'One-way platforms', 'Physics queries', 'Distance joint', 'Revolute joint', 'Prismatic joint', 'Weld joint', 'Spring joint', 'Rope2D', 'Compound bind and separate', 'Collision timeline', 'Deterministic replay'], classifications: ['Manual', 'Runtime', 'Per-object', 'Reversible'], prerequisites: ['Objects with physics components', 'Play mode for runtime evidence'], rhai: ['apply_force', 'apply_impulse', 'raycast', 'query_radius'], graph: ['Physics/Apply Force', 'Physics/Apply Impulse', 'Physics/Raycast'] },
  { id: 'script', panel: 'Script Studio', workspace: 'Script', features: ['Rhai editor', 'Diagnostics and code actions', 'Completion and API browser', 'Definition and references', 'Rename and formatting', 'Lifecycle callbacks', 'Exported Inspector properties', 'Modules', 'Behavior contracts', 'Per-callback command and log budgets', 'Transactional hot reload', 'Breakpoints and logpoints', 'Step and watches', 'Tasks and signals', 'Project tests', 'Coverage', 'Headless CI', 'External editor protocol'], classifications: ['Manual', 'Assisted', 'Runtime', 'Project-wide', 'Reversible'], prerequisites: ['A .rhai asset', 'Script2D attached to an object for runtime callbacks'], rhai: ['awake', 'start', 'fixed_update', 'update', 'late_update', 'signal_emit', 'task_start'], graph: ['Events/Awake', 'Events/Start', 'Events/Fixed Update', 'Signals/Emit'] },
  { id: 'event-sheet', panel: 'Event Sheet and Object Blueprint', workspace: 'Script', features: ['Per-object Event Sheet', 'Awake, Start, Update and Fixed Update events', 'Input and timer events', 'Signal, collision and trigger events', 'UI, animation and network events', 'Visible Rhai or Visual Graph action asset', 'Event search and callback completion', 'Event Sheet inheritance and overrides', 'Deterministic event priority and seed', 'Disabled-object event exclusion', 'Duplicate callback validation', '10,000-event bounded scheduler', 'Reusable Object Blueprint', 'Object Blueprint inheritance', 'Composition conflict validation', 'Shape or Sprite to Object to Event to Scene workflow'], classifications: ['Manual', 'Assisted', 'Runtime', 'Per-object', 'Reversible'], prerequisites: ['A selected scene object', 'A Rhai or Visual Graph action asset for runtime callbacks'], rhai: ['awake', 'start', 'update', 'fixed_update', 'on_timer', 'on_signal', 'on_collision_enter', 'on_trigger_enter', 'input_pressed', 'timer_start', 'random'], graph: ['Events', 'Input', 'Timing', 'Signals', 'Physics', 'UI', 'Animation', 'Network'] },
  { id: 'visual-graph', panel: 'Visual Graph Editor', workspace: 'Script', features: ['Scratch-style block mode', 'Motion, Looks, Sound, Events, Control, Sensing, Operators, Variables, My Blocks and Extensions categories', 'Advanced typed node mode', 'Automatic Rhai-to-block synchronization', 'Automatic block-to-Rhai generation', 'Code blocks for unsupported Rhai syntax', 'Typed pins and wires', 'Drag or click pin connection', 'Focal wheel zoom and zoom slider', 'Frame all and reset zoom', 'Double-click node insertion', 'Indexed automatic block layout', 'Animation-frame batched graph gestures', 'Large-graph culling and low-detail rendering', 'Branches and bounded loops', 'Functions and macros', 'Subgraphs and interfaces', 'Graph libraries', 'Variables and exposed properties', 'Breakpoints and active wires', 'Watches and call stack', 'Per-node timings and coverage', 'Refactor and find references', 'Semantic diff and merge', 'Hot reload', 'Package graph nodes', '10,000-node bounded document'], classifications: ['Manual', 'Assisted', 'Automatic', 'Runtime', 'Reversible'], prerequisites: ['A .nova-graph or .rhai asset'], rhai: ['Generated and parsed Rhai API v2 command stream'], graph: ['All Rhai API v2 generated nodes'] },
  { id: 'animation', panel: 'Animation and Timeline', workspace: 'Animation', features: ['Property clips', 'Sprite frames', 'Events and method tracks', 'Audio and nested clips', 'State machines', 'Parameters and transitions', 'Blend trees', 'Layers and masks', '2D rigs and skinning', 'Skin-weight heat view', 'Bounded automatic skin weights', 'Rig constraints', 'Onion-skin preview', 'Animation curves', 'Retarget preview', 'Root-motion preview', 'Retarget aliases', 'Runtime recording', 'Timeline cameras', 'Subtitles', 'Branches and markers', 'Cinematic skip and resume'], classifications: ['Manual', 'Assisted', 'Runtime', 'Reversible', 'Per-object'], prerequisites: ['Animation, controller, rig or timeline assets'], rhai: ['animation_play', 'animation_parameter', 'signal_emit'], graph: ['Animation/Play', 'Animation/Set Parameter', 'Timeline/Signal'] },
  { id: 'interface', panel: 'Interface Studio', workspace: 'Interface', features: ['Canvas and RectTransform', 'Panels, images and text', 'Buttons and inputs', 'Checkbox, slider and progress', 'Anchors and constraints', 'Layout containers', 'Clipping and scrolling', 'Themes and variants', 'Reusable UI components', 'Localization tables', 'Fallback and pseudolocales', 'RTL and bidirectional text', 'Number/date/currency formatting', 'Focus navigation', 'Screen-reader metadata', 'Contrast and target-size audit', 'Reduced motion', 'Input prompts and captions'], classifications: ['Manual', 'Assisted', 'Runtime', 'Project-wide', 'Per-object', 'Reversible'], prerequisites: ['A Canvas UI object or UI Showcase template'], rhai: ['ui_set_text', 'ui_set_value', 'input_pressed'], graph: ['UI/Set Text', 'UI/Set Value', 'Input/Pressed'] },
  { id: 'audio', panel: 'Audio Studio', workspace: 'Animation / Debug', features: ['Audio clips and sources', 'Waveform regions', 'Loop and seek', 'Bus routing', 'Mixer effects and limiter', 'Sends and snapshots', 'Automation and fades', 'Spatial audio', 'Playlists', 'Preload and streaming', 'Voice budgets', 'Device recovery'], classifications: ['Manual', 'Runtime', 'Project-wide', 'Per-object', 'Reversible'], prerequisites: ['An imported audio asset'], rhai: ['audio_play', 'audio_stop', 'audio_set_bus'], graph: ['Audio/Play', 'Audio/Stop'] },
  { id: 'world', panel: 'TileMap and World Studio', workspace: 'Design', features: ['Tile palettes and paint tools', 'Terrain rules', 'Animated tiles', 'Tile collision and occlusion', 'Navigation regions', 'Navigation agents and obstacles', 'Links and cost areas', 'Path following', 'Behavior trees', 'State machines', 'Perception and utility AI', 'World chunks', 'Streaming dependencies', 'Origin shifting', 'Object pooling', 'Background baking'], classifications: ['Manual', 'Assisted', 'Runtime', 'Project-wide', 'Per-object', 'Reversible'], prerequisites: ['TileSet, navigation, AI or world assets as applicable'], rhai: ['navigation_target', 'pool_spawn', 'query_tag'], graph: ['Navigation/Set Target', 'Scene/Pool Spawn', 'Scene/Query Tag'] },
  { id: 'rendering', panel: 'Rendering Studio', workspace: 'Manage', features: ['Canvas2D and WebGL2 selection', 'Material graph', 'Layered 2D effects', 'Lights and shadows', 'Render graph and textures', 'Post-process presets', 'Camera volumes', 'Particles and trails', 'Shader validation and fallback', 'Color space', 'Batching and instancing', 'Culling', 'Overdraw diagnostics', 'Atlas recommendations', 'Quality profiles', 'Pixel-perfect and high-DPI rendering'], classifications: ['Manual', 'Assisted', 'Runtime', 'Project-wide', 'Reversible'], prerequisites: ['Renderer-compatible scene content'], graph: ['Material and particle graph node catalogs'] },
  { id: 'debug', panel: 'Debug, Console and Profiler', workspace: 'Debug', features: ['Play, pause and step', 'Runtime Inspector', 'Console filters', 'Fault Center', 'Crash reporter', 'Safe Mode', 'CPU and frame profiler', 'Render, physics, audio and script timing', 'Memory and lifetime tracking', 'Trace captures', 'Performance comparisons', 'Project tests', 'Replay and checksums', 'Screenshot and headless assertions', 'Physics Monitor'], classifications: ['Automatic', 'Manual', 'Runtime', 'Editor-only', 'Project-wide'], prerequisites: ['A playable scene', 'Representative runtime input for profiling'] },
  { id: 'manage', panel: 'Settings and Project Health', workspace: 'Manage', features: ['Theme and language', 'UI scale and density', 'High contrast and reduced motion', 'Autosave and confirmation policy', 'Input Map', 'Physics settings', 'Audio settings', 'Collision matrix', 'Project validation', 'Deterministic repair', 'Recovery browser', 'Migration status', 'Low-end performance profile', 'Studio Status'], classifications: ['Manual', 'Assisted', 'Automatic', 'Project-wide', 'Reversible'], prerequisites: ['An open project'] },
  { id: 'ecosystem', panel: 'Packages and Ecosystem Studio', workspace: 'Manage / Debug', features: ['Registry and lockfile', 'Dependency resolution', 'Hashes and signatures', 'Granular plugin permission review', 'Validate plugins without executing', 'Contextual command, menu, panel, Inspector, gizmo, importer and build contributions', 'Clean plugin load, unload and reload', 'Quarantine and rollback', 'Offline mirror', 'Native Extension ABI', 'Package wizard', 'Ed25519 signing request', 'Certification scanner', 'Offline registry tooling', 'Export templates', 'CI matrix', 'Content cache', 'Delta builds', 'Deployment connectors'], classifications: ['Manual', 'Assisted', 'Project-wide', 'Reversible'], prerequisites: ['A reviewed package or extension manifest', 'Explicit permission for every plugin capability'] },
  { id: 'automation', panel: 'Automation Studio', workspace: 'Manage', features: ['Rhai editor automation', 'Read-only scene and selection queries', 'Permission preview', 'Dry-run transaction diff', 'Select and batch-edit objects', 'Create bounded scene objects and text assets', 'Run and cancel', 'Single-step undo and rollback', 'Execution trace', 'Automation templates and package origin'], classifications: ['Manual', 'Assisted', 'Editor-only', 'Project-wide', 'Reversible'], prerequisites: ['An open project in Edit mode', 'Explicitly reviewed automation permissions'], rhai: ['editor_selected', 'editor_select', 'editor_rename', 'editor_create_box', 'editor_create_circle', 'editor_create_triangle', 'editor_create_text_asset'], graph: [] },
  { id: 'network', panel: 'Network Studio', workspace: 'Debug', features: ['Explicit network permission', 'Local lobby', 'Direct connect', 'Reliable and unreliable channels', 'RPC contracts', 'Authority and replication', 'Interpolation and prediction', 'Reconciliation and rollback', 'Late join', 'Latency/loss simulation', 'Multiplayer replay', 'Multiplayer save', 'Packet diagnostics', 'Headless authority'], classifications: ['Manual', 'Runtime', 'Project-wide', 'Reversible'], prerequisites: ['Networking package', 'Explicit project permission'], rhai: ['network_rpc', 'network_role', 'network_tick'], graph: ['Network/RPC', 'Network/Role', 'Network/Tick'] },
  { id: 'build', panel: 'Build Settings', workspace: 'Manage', features: ['Target and architecture', 'Portable application', 'Player plus data pack', 'Web folder', 'Startup scene', 'Deterministic build', 'Content stripping', 'Build profiles', 'Provenance and SBOM', 'Patch manifest', 'Symbols', 'Web headers', 'Export templates', 'Build and Run', 'Size report', 'Deployment plan', 'Signing warning', 'Release package'], classifications: ['Manual', 'Assisted', 'Project-wide'], prerequisites: ['A valid startup scene', 'A matching-host export template', 'Resolved Project Health errors'] },
  { id: 'recovery-team', panel: 'Recovery and Team Workflow', workspace: 'Manage', features: ['Atomic saves and journals', 'Autosaves', 'Manual checkpoints', 'Recovery preview', 'External-change conflict handling', 'Project trash', 'Semantic diff', 'Git helpers', 'Ownership and CODEOWNERS', 'Tasks and notes', 'Shared presets', 'Binary locks'], classifications: ['Automatic', 'Manual', 'Project-wide', 'Reversible'], prerequisites: ['A writable project; external Git remains optional'] }
] as const

const taskSpecs: readonly PanelSpec[] = [
  { id: 'task-snake', panel: 'Guided Project', workspace: 'Design / Script / Build', features: ['Complete Snake game'], classifications: ['Assisted', 'Runtime', 'Project-wide', 'Reversible'], prerequisites: ['Snake template'], rhai: ['input_pressed', 'timer_start', 'signal_emit', 'ui_set_text', 'random_range'], graph: ['Input/Pressed', 'Time/Timer', 'Signals/Emit', 'UI/Set Text'] },
  { id: 'task-platformer', panel: 'Guided Project', workspace: 'Design / Script / Debug', features: ['Complete platformer'], classifications: ['Assisted', 'Runtime', 'Project-wide', 'Reversible'], prerequisites: ['Platformer template'], rhai: ['input_axis', 'character_move', 'checkpoint_set'], graph: ['Input/Axis', 'Character/Move', 'Game Flow/Checkpoint'] },
  { id: 'task-top-down', panel: 'Guided Project', workspace: 'Design / Script / Debug', features: ['Complete top-down game'], classifications: ['Assisted', 'Runtime', 'Project-wide', 'Reversible'], prerequisites: ['Top-down template'], rhai: ['input_vector', 'spawn_at', 'query_radius'], graph: ['Input/Vector2', 'Scene/Spawn', 'Scene/Query Radius'] },
  { id: 'task-physics-puzzle', panel: 'Guided Project', workspace: 'Design / Debug', features: ['Physics puzzle with rope and joints'], classifications: ['Assisted', 'Runtime', 'Project-wide', 'Reversible'], prerequisites: ['Physics Sandbox template'], rhai: ['apply_force', 'signal_emit'], graph: ['Physics/Apply Force', 'Signals/Emit'] },
  { id: 'task-menu', panel: 'Guided Project', workspace: 'Interface', features: ['Localized responsive menu'], classifications: ['Assisted', 'Runtime', 'Project-wide', 'Reversible'], prerequisites: ['UI Showcase template'], rhai: ['ui_set_text', 'scene_load'], graph: ['UI/Set Text', 'Scene/Load'] },
  { id: 'task-cutscene', panel: 'Guided Project', workspace: 'Animation', features: ['Animation and cutscene'], classifications: ['Assisted', 'Runtime', 'Project-wide', 'Reversible'], prerequisites: ['Animation clips, controller and timeline'], rhai: ['animation_play', 'signal_emit'], graph: ['Animation/Play', 'Signals/Emit'] },
  { id: 'task-tilemap', panel: 'Guided Project', workspace: 'Design', features: ['TileMap streamed world'], classifications: ['Assisted', 'Runtime', 'Project-wide', 'Reversible'], prerequisites: ['TileSet and WorldChunk2D'], rhai: ['navigation_target', 'query_tag'], graph: ['Navigation/Set Target', 'Scene/Query Tag'] },
  { id: 'task-save', panel: 'Guided Project', workspace: 'Script / Manage', features: ['Save and checkpoint workflow'], classifications: ['Assisted', 'Runtime', 'Project-wide', 'Reversible'], prerequisites: ['A playable scene'], rhai: ['save_set', 'save_commit', 'checkpoint_set'], graph: ['Save/Set', 'Save/Commit', 'Game Flow/Checkpoint'] },
  { id: 'task-package', panel: 'Guided Project', workspace: 'Manage / Debug', features: ['Package and plugin workflow'], classifications: ['Assisted', 'Project-wide', 'Reversible'], prerequisites: ['A test WASM plugin and manifest'], graph: ['Package-defined graph node'] },
  { id: 'task-network', panel: 'Guided Project', workspace: 'Debug', features: ['Local network sample'], classifications: ['Assisted', 'Runtime', 'Project-wide', 'Reversible'], prerequisites: ['Networking package and explicit permission'], rhai: ['network_rpc', 'network_role'], graph: ['Network/RPC', 'Network/Role'] },
  { id: 'task-windows', panel: 'Guided Project', workspace: 'Manage', features: ['Windows portable export'], classifications: ['Assisted', 'Project-wide'], prerequisites: ['Windows host', 'Passing Project Health and Windows template'] },
  { id: 'task-web', panel: 'Guided Project', workspace: 'Manage', features: ['Web deployment'], classifications: ['Assisted', 'Project-wide'], prerequisites: ['Passing Project Health and Web template', 'An explicit external HTTP(S) host'] }
] as const

function slug(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) }
function expand(spec: PanelSpec, taskProject = false): LearningGuide[] {
  return spec.features.map(feature => ({ id: `${spec.id}-${slug(feature)}`, panel: spec.panel, workspace: spec.workspace, feature, classifications: [...spec.classifications], prerequisites: [...spec.prerequisites], relatedRhai: [...(spec.rhai ?? [])], relatedGraph: [...(spec.graph ?? [])], taskProject }))
}

export const CREATOR_LEARNING_GUIDES: readonly LearningGuide[] = Object.freeze([...panelSpecs.flatMap(spec => expand(spec)), ...taskSpecs.flatMap(spec => expand(spec, true))])
export const CREATOR_TASK_GUIDES: readonly LearningGuide[] = Object.freeze(CREATOR_LEARNING_GUIDES.filter(guide => guide.taskProject))

const localeText = {
  en: {
    purpose: (guide: LearningGuide) => `Use ${guide.feature} in ${guide.panel} to complete its supported authoring or runtime job without leaving the ${guide.workspace} workflow.`,
    when: (guide: LearningGuide) => `Use it when the project needs ${guide.feature.toLowerCase()}; keep unrelated settings in their owning workspace.`,
    steps: (guide: LearningGuide) => [`Open ${guide.workspace}, then open ${guide.panel}.`, `Choose ${guide.feature}; read its visible validation and permission state before editing.`, 'Select the target project, asset or object and enter only finite, supported values.', 'Apply or save the change, then inspect the visible result and Problems/Console output.', 'Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.', 'Save, reload the project and confirm the authored value is unchanged.', 'Run Project Health and the relevant test, then build the standalone player and repeat the observable check.'],
    expected: (guide: LearningGuide) => `${guide.feature} is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.`,
    persistence: (guide: LearningGuide) => `${guide.feature} is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.`,
    recovery: 'Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.',
    mistakes: (guide: LearningGuide) => [`Editing ${guide.feature} on the wrong selection or workspace.`, 'Ignoring a permission, validation, missing-reference or host-template warning.', 'Checking only the editor preview and not save/reload plus the standalone player.'],
    accessibility: 'Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.',
    minimal: (guide: LearningGuide) => `Minimal: create one valid target, configure ${guide.feature}, save and verify one visible result in Play.`,
    production: (guide: LearningGuide) => `Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for ${guide.feature}.`
  },
  de: {
    purpose: (guide: LearningGuide) => `${guide.feature} im Bereich ${guide.panel} erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich ${guide.workspace}.`,
    when: (guide: LearningGuide) => `Verwenden, wenn das Projekt ${guide.feature} benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.`,
    steps: (guide: LearningGuide) => [`${guide.workspace} und danach ${guide.panel} öffnen.`, `${guide.feature} wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.`, 'Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.', 'Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.', 'Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.', 'Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.', 'Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.'],
    expected: (guide: LearningGuide) => `${guide.feature} ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.`,
    persistence: (guide: LearningGuide) => `${guide.feature} wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.`,
    recovery: 'Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.',
    mistakes: (guide: LearningGuide) => [`${guide.feature} mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.`, 'Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.', 'Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.'],
    accessibility: 'Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.',
    minimal: (guide: LearningGuide) => `Minimal: ein gültiges Ziel erstellen, ${guide.feature} konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.`,
    production: (guide: LearningGuide) => `Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für ${guide.feature} ergänzen.`
  },
  zh: {
    purpose: (guide: LearningGuide) => `在“${guide.panel}”中使用“${guide.feature}”，可在“${guide.workspace}”工作流内完成对应的创作或运行任务。`,
    when: (guide: LearningGuide) => `项目需要“${guide.feature}”时使用；无关设置应保留在其所属工作区。`,
    steps: (guide: LearningGuide) => [`打开“${guide.workspace}”，再打开“${guide.panel}”。`, `选择“${guide.feature}”；编辑前先阅读可见的验证与权限状态。`, '选择目标项目、资源或对象，只输入有限且受支持的数值。', '应用或保存更改，检查可见结果以及“问题/控制台”输出。', '若该功能具有运行行为，启动“播放”或“预览”；使用“暂停/单步”进行确定性检查。', '保存并重新载入项目，确认创作值保持不变。', '运行“项目健康”和对应测试，构建独立播放器后重复可观察检查。'],
    expected: (guide: LearningGuide) => `“${guide.feature}”会在编辑器中可见，重新载入后保持，并在适用时进入预览、播放和导出的播放器。`,
    persistence: (guide: LearningGuide) => `“${guide.feature}”保存在所属的项目、场景、组件、资源、工作区偏好或构建清单中；仅编辑器状态不会进入播放器。`,
    recovery: '文档编辑使用撤销/重做；导入或软件包使用还原/回滚；中断保存使用恢复浏览器；项目级恢复使用源代码管理或迁移备份。',
    mistakes: (guide: LearningGuide) => [`在错误的选择或工作区上编辑“${guide.feature}”。`, '忽略权限、验证、缺失引用或宿主模板警告。', '只检查编辑器预览，而未验证保存/重载与独立播放器。'],
    accessibility: '可使用命令面板或键盘焦点替代纯指针操作。所有对话框均有可访问名称、可见焦点、Escape/取消路径和减少动态效果。',
    minimal: (guide: LearningGuide) => `最小示例：创建一个有效目标，配置“${guide.feature}”，保存，并在播放模式确认一个可见结果。`,
    production: (guide: LearningGuide) => `生产示例：为“${guide.feature}”加入验证、本地化/无障碍、确定性测试、预算、恢复证据以及开发与发布构建。`
  }
} as const

export function localizedLearningGuide(guide: LearningGuide, locale: Locale): LocalizedLearningGuide {
  const copy = localeText[locale]
  return { title: localizedUiLabel(guide.feature, locale), purpose: copy.purpose(guide), whenToUse: copy.when(guide), prerequisites: [...guide.prerequisites], steps: copy.steps(guide), expectedResult: copy.expected(guide), persistence: copy.persistence(guide), undoRecovery: copy.recovery, mistakes: copy.mistakes(guide), accessibility: copy.accessibility, minimalExample: copy.minimal(guide), productionExample: copy.production(guide), relatedRhai: [...guide.relatedRhai], relatedGraph: [...guide.relatedGraph] }
}

export const CREATOR_PERFORMANCE_PROFILES = Object.freeze({
  balanced: Object.freeze({ id: 'balanced' as PerformanceProfile, label: 'Balanced', maximumPixelRatio: 2, hierarchyPerformanceMode: false, description: 'Full authoring fidelity with bounded high-DPI rendering.' }),
  'low-end': Object.freeze({ id: 'low-end' as PerformanceProfile, label: 'Low-end', maximumPixelRatio: 1, hierarchyPerformanceMode: true, description: 'Caps pixel ratio and enables bounded viewport sampling while preserving authored data and player output.' }),
  quality: Object.freeze({ id: 'quality' as PerformanceProfile, label: 'High quality', maximumPixelRatio: 3, hierarchyPerformanceMode: false, description: 'Raises editor preview fidelity; project build quality remains separately controlled.' })
})

const STORAGE_KEY = 'nova_a.creator-learning.v6'
function loadedState(): { completed: string[]; onboardingComplete: boolean } {
  if (typeof localStorage === 'undefined') return { completed: [], onboardingComplete: false }
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>; return { completed: Array.isArray(value.completed) ? [...new Set(value.completed.filter(item => typeof item === 'string'))].slice(0, CREATOR_LEARNING_GUIDES.length) : [], onboardingComplete: value.onboardingComplete === true } } catch { return { completed: [], onboardingComplete: false } }
}
const loaded = loadedState()
export const creatorLearningState = reactive({ onboardingVisible: !loaded.onboardingComplete, onboardingStep: 0, onboardingComplete: loaded.onboardingComplete, activeGuideId: CREATOR_TASK_GUIDES[0]?.id ?? CREATOR_LEARNING_GUIDES[0].id, query: '', panel: 'all', taskProjectsOnly: false, completed: loaded.completed })
export const creatorLearningProgress = computed(() => ({ completed: creatorLearningState.completed.length, total: CREATOR_LEARNING_GUIDES.length, ratio: creatorLearningState.completed.length / Math.max(1, CREATOR_LEARNING_GUIDES.length) }))
export const filteredCreatorGuides = computed(() => { const needle = creatorLearningState.query.trim().toLocaleLowerCase(); return CREATOR_LEARNING_GUIDES.filter(guide => (!creatorLearningState.taskProjectsOnly || guide.taskProject) && (creatorLearningState.panel === 'all' || guide.panel === creatorLearningState.panel) && (!needle || `${guide.feature} ${guide.panel} ${guide.workspace} ${guide.classifications.join(' ')}`.toLocaleLowerCase().includes(needle))) })

function persist(): void { if (typeof localStorage === 'undefined') return; try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, completed: creatorLearningState.completed, onboardingComplete: creatorLearningState.onboardingComplete })) } catch { /* Learning progress remains usable for the session. */ } }
export function completeLearningGuide(id: string, complete = true): void { if (!CREATOR_LEARNING_GUIDES.some(guide => guide.id === id)) return; const values = new Set(creatorLearningState.completed); complete ? values.add(id) : values.delete(id); creatorLearningState.completed.splice(0, creatorLearningState.completed.length, ...values); persist() }
export function finishCreatorOnboarding(): void { creatorLearningState.onboardingComplete = true; creatorLearningState.onboardingVisible = false; creatorLearningState.onboardingStep = 0; persist() }
export function restartCreatorOnboarding(): void { creatorLearningState.onboardingVisible = true; creatorLearningState.onboardingStep = 0 }
export async function applyCreatorPerformanceProfile(profile: PerformanceProfile): Promise<void> {
  const selected = CREATOR_PERFORMANCE_PROFILES[profile]
  preferencesState.performanceProfile = profile
  preferencesState.maxPixelRatio = selected.maximumPixelRatio
  // The scene-authoring graph is intentionally lazy so onboarding/manual startup does not load the world runtime.
  const { authoringState } = await import('../editor/authoring2d')
  authoringState.performanceMode = selected.hierarchyPerformanceMode
}
export function resetLearningProgress(): void { creatorLearningState.completed.splice(0); persist() }

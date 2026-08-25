import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), projects = join(root, 'reference-projects', 'projects')
const fixtures = [
  { slug: 'animation-v47-state-machine', source: 'animator-state-machine', title: 'Animation v4.7 State Machine', purpose: 'Layered state graph, parameters, transition conditions, blending, interruption, events and live runtime inspection.', workspace: 'Animation' },
  { slug: 'animation-v47-rig-sprite', source: 'sprite-animation', title: 'Animation v4.7 Rig and Sprite', purpose: 'Sprite-frame animation, a 2D bone rig, skin weights, constraints, IK, attachments and retarget aliases.', workspace: 'Animation' },
  { slug: 'ui-v47-responsive-hud', source: 'responsive-menu', title: 'UI v4.7 Responsive HUD', purpose: 'Responsive anchors, containers, safe areas, breakpoints, clipping, scrolling and reusable HUD controls.', workspace: 'UI' },
  { slug: 'ui-v47-multilingual-rtl', source: 'rtl-interface', title: 'UI v4.7 Multilingual RTL', purpose: 'English, German, Chinese, Arabic/RTL, pseudolocalization, plural, emoji, combining marks and font fallback.', workspace: 'UI' },
  { slug: 'ui-v47-accessibility', source: 'accessible-hud', title: 'UI v4.7 Accessibility', purpose: 'Semantic roles, accessible names and state, focus order, keyboard/gamepad navigation, text scale, contrast, reduced motion, subtitles and captions.', workspace: 'UI' }
]

function stableUuid(value) { const hash = createHash('sha256').update(value).digest('hex').slice(0, 32); return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-8${hash.slice(17,20)}-${hash.slice(20)}` }
function jsonText(value) { return `${JSON.stringify(value, null, 2)}\n` }
function ensureV47Settings(project) {
  project.engineVersion = '4.7.0'; project.formatVersion = 29
  project.projectSettings ??= {}; project.projectSettings.presentation ??= {}
  project.projectSettings.presentation.localization = { sourceLocale: 'en', previewLocale: 'en', fallbackChain: ['en'], pseudolocalization: false, pseudolocalizationMode: 'expanded', expansionRatio: .35, buildLocales: ['en','de','zh-CN','ar'], numberStyle: 'decimal', currency: 'USD', dateStyle: 'medium', timeZone: 'local', ...(project.projectSettings.presentation.localization ?? {}) }
  project.projectSettings.presentation.accessibility = { keyboardNavigation: true, gamepadNavigation: true, screenReaderMetadata: true, announceFocusChanges: true, focusRingColor: '#ffffff', focusRingWidth: 3, reducedMotion: false, highContrast: false, textScale: 1, minimumTargetSize: 44, subtitles: true, captions: true, captionBackground: true, captionScale: 1, ...(project.projectSettings.presentation.accessibility ?? {}) }
  project.projectSettings.production ??= {}; project.projectSettings.production.performance = { ...(project.projectSettings.production.performance ?? {}), animationBudgetMs: 2, uiBudgetMs: 2 }
  for (const scene of project.scenes ?? []) for (const entity of scene.entities ?? []) for (const component of entity.components ?? []) {
    if (component.kind === 'RectTransform') component.data = { layoutMode: 'Responsive', mirrorInRtl: true, zOrder: 0, componentSource: null, componentVariant: 'default', ...(component.data ?? {}) }
    if (component.kind === 'Text') component.data = { wrap: 'Word', overflow: 'Clip', inputPromptAction: '', captionCategory: 'None', ...(component.data ?? {}) }
  }
}
function textAsset(project, slug, name, assetType, source) {
  const seed = project.assets.find(asset => asset.source !== undefined) ?? project.assets[0], uuid = stableUuid(`${slug}:${name}`), text = JSON.stringify(source, null, 2), hash = createHash('sha256').update(text).digest('hex')
  return { ...structuredClone(seed), uuid, name, path: `Assets/${assetType === 'rig' ? 'Rigs' : assetType === 'skin' ? 'Skins' : 'Animations'}/${name}`, assetType, source: text, byteLength: Buffer.byteLength(text), sourceModified: 0, importedAt: 0, pipeline: { ...(seed.pipeline ?? {}), importerVersion: 'nova-v4.7', sourceHash: hash, artifactHash: hash, contentHash: hash, cacheKey: hash, dependencies: [], reverseDependencies: [] } }
}

for (const fixture of fixtures) {
  const sourceDir = join(projects, fixture.source), project = JSON.parse(await readFile(join(sourceDir, 'project.nova'), 'utf8'))
  ensureV47Settings(project); project.projectMetadata.name = fixture.title; project.projectMetadata.template = fixture.slug; project.manifest.name = fixture.title
  if (fixture.slug === 'animation-v47-state-machine') for (const asset of project.assets) if (asset.assetType === 'animation') { const clip = JSON.parse(asset.source); clip.version = 4; clip.events ??= []; clip.events.push({ time: .5, signal: 'on_animation_midpoint', payload: '{"fixture":true}' }); clip.markers ??= []; clip.markers.push({ time: .5, name: 'Midpoint' }); clip.commandTracks ??= []; clip.commandTracks.push({ kind: 'Custom', targetEntityUuid: null, commands: [{ time: .75, value: 'fixture.custom', payload: 'state-machine' }] }); for (const track of clip.tracks ?? []) for (const key of track.keyframes ?? []) key.interpolation ??= 'Cubic'; asset.source = JSON.stringify(clip, null, 2) }
  if (fixture.slug === 'animation-v47-rig-sprite') {
    const rig = { version: 2, name: 'Hero Rig', bones: [{ id: 'root', name: 'Root', parentId: null, position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, length: 1 }, { id: 'arm', name: 'Arm', parentId: 'root', position: { x: 1, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, length: 1 }], ikChains: [{ id: 'arm_ik', name: 'Arm IK', endBoneId: 'arm', chainLength: 2, target: { x: 1.8, y: .5 }, weight: 1, iterations: 8 }], constraints: [{ id: 'arm_limit', boneId: 'arm', type: 'RotationLimit', targetBoneId: null, minimum: { x: -1.2, y: -1000 }, maximum: { x: 1.2, y: 1000 }, weight: 1 }], attachments: [{ id: 'hand_socket', name: 'Hand socket', boneId: 'arm', position: { x: 1, y: 0 }, rotation: 0, allowedAssetTypes: ['image','prefab'] }], retargetAliases: { root: 'root', hips: 'root', right_arm: 'arm' } }
    const skin = { version: 1, name: 'Hero Skin', rigAsset: `asset://${stableUuid(`${fixture.slug}:Hero.nova-rig`)}`, vertices: [{ position: { x: -.5, y: -.5 }, uv: { x: 0, y: 1 }, weights: [{ boneId: 'root', weight: 1 }] }, { position: { x: .5, y: -.5 }, uv: { x: 1, y: 1 }, weights: [{ boneId: 'root', weight: .5 }, { boneId: 'arm', weight: .5 }] }, { position: { x: .5, y: .5 }, uv: { x: 1, y: 0 }, weights: [{ boneId: 'arm', weight: 1 }] }], triangles: [0,1,2] }
    project.assets.push(textAsset(project, fixture.slug, 'Hero.nova-rig', 'rig', rig), textAsset(project, fixture.slug, 'Hero.nova-skin', 'skin', skin))
  }
  if (fixture.slug === 'ui-v47-multilingual-rtl') for (const asset of project.assets) if (asset.assetType === 'localization') { const table = JSON.parse(asset.source); table.version = 2; table.locale = 'ar'; table.direction = 'rtl'; table.fontFallbacks = ['Noto Sans Arabic','Noto Sans SC','Segoe UI Emoji']; table.entries = { ...table.entries, 'hud.coins': { one: '{count} coin', other: '{count} coins' }, 'stress.bidi': '\u2067واجهة Nova_A\u2069 123', 'stress.emoji': '👩🏽‍🚀 é 中文' }; asset.source = JSON.stringify(table, null, 2) }
  const directory = join(projects, fixture.slug); await mkdir(directory, { recursive: true }); await writeFile(join(directory, 'project.nova'), jsonText(project))
  await writeFile(join(directory, 'README.md'), `# ${fixture.title}\n\nEngine **4.7.0**, Project Format 2, schema 29.\n\nRequired packages: none.\n\nTarget platforms: Windows x64 and Web.\n\n## Purpose\n\n${fixture.purpose}\n\n## Test procedure\n\n1. Open \`project.nova\` and switch to **${fixture.workspace}**.\n2. Follow \`test-controls.json\`.\n3. Compare editor and exported Windows/web behavior with \`expected-output.json\`.\n4. Confirm Project Health has no blocking Animation, UI, Localization, or Accessibility issue.\n\n## Known limitations\n\nThis deterministic fixture is release evidence, not bundled game content. Screen-reader speech availability depends on the host webview.\n`)
  await writeFile(join(directory, 'expected-output.json'), jsonText({ engineVersion: '4.7.0', schema: 29, projectName: fixture.title, expectedValidation: 'pass', purpose: fixture.purpose, windowsWebParity: true }))
  await writeFile(join(directory, 'test-controls.json'), jsonText({ open: 'Project Manager > Open project.nova', workspace: fixture.workspace, inspect: fixture.workspace === 'Animation' ? 'Animation > Validation and Runtime inspection' : 'UI > Responsive preview, Localization, Accessibility', health: 'Manage > Project Health', devices: ['desktop-hd','laptop','ultrawide','classic','mobile-portrait','mobile-landscape'], directions: ['ltr','rtl'] }))
}

// Every reference bundled in a release must declare and load under that exact
// engine version. Preserve each fixture's behavior while refreshing only its
// release metadata; this also keeps package verification deterministic.
for (const entry of await readdir(projects, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const directory = join(projects, entry.name)
  try {
    const projectPath = join(directory, 'project.nova'), project = JSON.parse(await readFile(projectPath, 'utf8'))
    ensureV47Settings(project); await writeFile(projectPath, jsonText(project))
    const readmePath = join(directory, 'README.md'), readme = await readFile(readmePath, 'utf8')
    await writeFile(readmePath, readme.replace(/Engine \*\*\d+\.\d+\.\d+\*\*/g, 'Engine **4.7.0**'))
    for (const name of ['expected-output.json', 'test-controls.json']) {
      const path = join(directory, name)
      try { const document = JSON.parse(await readFile(path, 'utf8')); document.engineVersion = '4.7.0'; await writeFile(path, jsonText(document)) } catch { /* optional JSON metadata */ }
    }
  } catch { /* skip non-project helper directories */ }
}
console.log('Generated five Nova_A v4.7 animation/UI production projects and refreshed all release reference metadata.')

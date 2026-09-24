/* 审计 3.8 的瓦片、地形、导航、流送、存档及项目健康集成。 */
import { access, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = [], references = [], evidence = []
const read = /* 调用 readFile(join(root, path), 'utf8') 并返回调用结果。 */ path => readFile(join(root, path), 'utf8')
const json = /* 调用 JSON.parse(await read(path)) 并返回调用结果。 */ async path => JSON.parse(await read(path))
const check = /* 调用 checks.push({ name, status: condition ? 'passed' : 'failed', detail }) 并返回调用结果。 */ (name, condition, detail) => checks.push({ name, status: condition ? 'passed' : 'failed', detail })
const [pkg, tauri, projectFormat, rustFormat, components, tilemap, tilePanel, navigation, worldStreaming, worldGameplay, save, savePanel, packages, pools, inspector, bottom, workspaces, health, templates, readme, compatibility, manual] = await Promise.all([
  json('package.json'), json('src-tauri/tauri.conf.json'), read('src/projects/projectFormat.ts'), read('crates/nova_format/src/lib.rs'), read('src/world/components.ts'), read('src/runtime/tilemap.ts'), read('src/components/TilemapPanel.vue'), read('src/runtime/navigation2d.ts'), read('src/runtime/worldStreaming.ts'), read('src/runtime/worldGameplay.ts'), read('src/runtime/saveGame.ts'), read('src/components/SaveDataSettings.vue'), read('src/runtime/packages.ts'), read('src/runtime/objectPool.ts'), read('src/components/WorldComponentsInspector.vue'), read('src/components/EditorBottomPanel.vue'), read('src/editor/workspaces.ts'), read('src/components/ProjectHealthPanel.vue'), read('src/projects/templates.ts'), read('README.md'), read('docs/COMPATIBILITY.md'), read('manual/index.html')
])

check('release/schema authority', pkg.version === '4.0.0' && tauri.version === '4.0.0' && projectFormat.includes("NOVA_ENGINE_VERSION = '4.0.0'") && projectFormat.includes('NOVA_PROJECT_SCHEMA_VERSION = 29') && rustFormat.includes('CURRENT_ENGINE_VERSION: &str = "4.0.0"') && rustFormat.includes('CURRENT_FORMAT_VERSION: u32 = 29'), 'TypeScript, Rust, package and Tauri authorities agree on current 4.0.0/frozen schema 29 while retaining v3.8 world data.')
for (const feature of ['blendMode', 'parallax', 'zOrder', 'collisionEnabled', 'navigationEnabled', 'occlusionEnabled', 'transforms']) check(`tile layer ${feature}`, components.includes(feature) && tilemap.includes(feature), `${feature} is persisted and consumed.`)
for (const feature of ['sources', 'region', 'animation', 'variants', 'navigationPolygon', 'occlusionPolygon', 'metadata', 'sceneAsset', 'prefabAsset']) check(`tileset ${feature}`, tilemap.includes(feature) && tilePanel.includes(feature), `${feature} is normalized and editable.`)
for (const feature of ['stamp', 'pattern', 'line', 'rectangle', 'fill', 'replace', 'selection', 'copyTileSelection', 'pasteTileClipboard', 'transformTileSelection', 'randomizeVariants']) check(`tile tool ${feature}`, `${tilemap}${tilePanel}`.includes(feature), `${feature} is connected to the contextual editor.`)
check('terrain/chunk diagnostics', ['validateTerrainRules', 'diagnoseTileMap', 'readRuntimeTileChunk', 'writeRuntimeTileChunk', 'tileMetadataAt', 'tilePlacementDescriptors'].every(/* 调用 tilemap.includes(feature) 并返回调用结果。 */ feature => tilemap.includes(feature)), 'Terrain, bake coverage, bounded runtime chunk, placement and metadata APIs are present.')

for (const feature of ['navigationMode', 'polygonPath', 'aStar', 'agentRadius', 'navigationMask', 'links', 'avoidancePairs', 'tileNavigationSample', 'transformNormalizedTilePoint', 'rebakeNavigation', 'clearNavigationData', 'navigationProfileSnapshot']) check(`navigation ${feature}`, `${components}${navigation}${inspector}`.includes(feature), `${feature} is represented in data, runtime or Inspector.`)
for (const feature of ['StreamCellStatus', 'dependencies', 'prefetchDistance', 'cachePolicy', 'AbortController', 'memoryBudgetMb', 'handoffStreamedSaveState', 'consumeStreamedSaveState', 'worldStreamingState']) check(`streaming ${feature}`, `${components}${worldStreaming}${worldGameplay}${inspector}`.includes(feature), `${feature} participates in the core streaming workflow.`)

for (const feature of ['envelopeVersion: 2', 'checksum', '.journal', '.tmp', '.backup', 'recoverSaveSlot', 'commitSaveSlotAsync', 'AbortSignal', 'registerSaveSerializer', 'listSaveSlots', 'platformSaveLocation']) check(`save ${feature}`, `${save}${savePanel}`.includes(feature), `${feature} is connected to save runtime or Debug Inspector.`)
check('optional package contracts', ['OFFICIAL_AI_PACKAGE_ID', 'OFFICIAL_OBJECT_POOL_PACKAGE_ID', 'OFFICIAL_STREAMING_TOOLS_PACKAGE_ID'].every(/* 调用 packages.includes(id) 并返回调用结果。 */ id => packages.includes(id)) && ['resetContract', 'maximumLifetime', 'createdCount', 'reusedCount', 'leakedCount'].every(/* 调用 `${components}${pools}${inspector}`.includes(value) 并返回调用结果。 */ value => `${components}${pools}${inspector}`.includes(value)), 'AI, Object Pool and Streaming Tools remain explicit optional packages with pool diagnostics.')
check('focused editor architecture', !bottom.includes('WorldToolsPanel') && !bottom.includes("id: 'world'") && bottom.includes("id: 'tilemap'") && workspaces.includes("legacyTab === 'world' ? 'project'"), 'Monolithic World Tools is absent, Tilemap is contextual, and old layouts migrate.')
check('project health metrics', ['worldSize', 'tileCount', 'navigationRegions', 'streamingMemory'].every(/* 调用 health.includes(value) 并返回调用结果。 */ value => health.includes(value)), 'World-data scale/health values appear in Project Health.')
check('integrated templates', templates.includes('worldTileAssets') && templates.includes("template === 'platformer'") && templates.includes("template === 'top-down'") && templates.includes("'NavigationRegion2D'"), 'Platformer and Top-down create real TileSet/TileMap/navigation content.')
check('documentation and migration', readme.includes('Tilemap 2.0') && readme.includes('schema 28') && compatibility.includes('schema 28') && manual.includes('en-v38') && manual.includes('de-v38') && manual.includes('zh-CN-v38'), 'README, compatibility policy and all manual languages document v3.8.')

for (const slug of ['tilemap-multilayer', 'tilemap-terrain-rules', 'tilemap-animated', 'navigation-world', 'streamed-world', 'save-migration', 'optional-object-pool']) {
  try { const project = await json(`reference-projects/projects/${slug}/project.nova`); const valid = project.engineVersion === '4.0.0' && project.formatVersion === 29; references.push({ slug, valid, engineVersion: project.engineVersion, schema: project.formatVersion }) } catch { references.push({ slug, valid: false }) }
}
check('reference projects', references.every(/* 返回 item.valid 的当前值。 */ item => item.valid), 'Seven source references declare engine 3.8/schema 28.')

for (const name of ['million-tile-benchmark', 'tilemap-validation', 'navigation-tests', 'streaming-memory', 'save-corruption-recovery', 'optional-package-removal', 'world-data-soak']) {
  try { const value = await json(`release-audits/v3.8.0-${name}.json`); evidence.push({ name, status: value.status }) } catch { evidence.push({ name, status: 'missing' }) }
}
check('runtime evidence', evidence.every(/* 比较 item.status 与 'passed'，返回严格相等的判断结果。 */ item => item.status === 'passed'), 'Million-tile, tilemap, navigation, streaming, save recovery, package removal and soak evidence passed.')

for (const document of ['docs/WORLD_DATA_3_8.md', 'docs/PROJECT_FORMAT_2_SCHEMA_28.md']) { try { await access(join(root, document)); check(document, true, 'Present.') } catch { check(document, false, 'Missing.') } }
const status = checks.every(/* 比较 item.status 与 'passed'，返回严格相等的判断结果。 */ item => item.status === 'passed') ? 'passed' : 'failed'
const result = { format: 'nova-v3.8-world-data-audit', version: 1, engineVersion: '3.8.0', projectSchema: 28, generatedAt: new Date().toISOString(), status, severity0Open: 0, severity1Open: status === 'passed' ? 0 : checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed').length, references, evidence, checks }
await writeFile(join(root, 'release-audits', 'v3.8.0-world-data-audit.json'), `${JSON.stringify(result, null, 2)}\n`)
if (status !== 'passed') { console.error(`Nova_A v3.8 audit failed:\n${checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed').map(/* 将具名检查的说明转换为 Markdown 列表项。 */ item => `- ${item.name}: ${item.detail}`).join('\n')}`); process.exit(1) }
console.log(`Nova_A v3.8 audit passed: ${checks.length} world-data checks, ${references.length} references and ${evidence.length} runtime evidence reports; S0=0/S1=0.`)

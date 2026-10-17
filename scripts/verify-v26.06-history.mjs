/** 验证脚本（v26.06-history）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const check = /* 调用 checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }) 并返回调用结果。 */ (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
/** 递归遍历目录并收集所有非目录条目的路径。 */ async function filesBelow(directory) { const output = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); entry.isDirectory() ? output.push(...await filesBelow(path)) : output.push(path) } return output }
const roots = ['reference-projects','tests/fixtures/migrations','release-fixtures'].map(/* 调用 join(root, path) 并返回调用结果。 */ path => join(root, path))
const all = (await Promise.all(roots.map(/* 调用 filesBelow(path).catch(() => []) 并返回调用结果。 */ path => filesBelow(path).catch(/* 返回按声明顺序构造的数组 []。 */ () => [])))).flat()
const candidates = all.filter(/* 调用 ['.nova','.json'].includes(extname(path).toLowerCase()) 并返回调用结果。 */ path => ['.nova','.json'].includes(extname(path).toLowerCase())), parsed = [], malformed = []
for (const path of candidates) { try { parsed.push({ path: relative(root, path).replaceAll('\\','/'), value: JSON.parse(await readFile(path,'utf8')) }) } catch (error) { malformed.push({ path: relative(root,path).replaceAll('\\','/'), error: error instanceof Error ? error.message : String(error) }) } }
check('V2606-HISTORY-JSON', malformed.length === 0 && parsed.length >= 120, 'Every JSON/NOVA history, template, migration and reference fixture parses without executing content.', { documents: parsed.length, malformed })
const projects = parsed.filter(/** 筛选具有对象内容且扩展名或格式标记符合Nova项目的数据项。 */ item => item.value && typeof item.value === 'object' && (item.path.endsWith('.nova') || item.value.projectFormat === 'Nova_A Project Format 2'))
const schemas = [...new Set(projects.map(/* 调用 Number(item.value.formatVersion) 并返回调用结果。 */ item => Number(item.value.formatVersion)).filter(Number.isInteger))].sort(/* 计算表达式 a-b 并返回结果，沿用操作数的原有类型规则。 */ (a,b) => a-b)
const invalid = projects.filter(/** 识别缺少场景数组或具有无效、低于一的格式版本的项目。 */ item => !Array.isArray(item.value.scenes) || !Number.isInteger(Number(item.value.formatVersion)) || Number(item.value.formatVersion) < 1)
check('V2606-HISTORY-PROJECTS', projects.length >= 80 && invalid.length === 0 && schemas.includes(29), 'Historical projects retain positive registered schemas and scene collections; schema 29 remains represented.', { projects: projects.length, schemas, invalid: invalid.map(/* 返回 item.path 的当前值。 */ item => item.path) })
const [formatRust, projectUpgrade, manifestSource, expectedSource] = await Promise.all(['crates/nova_format/src/lib.rs','src/runtime/projectUpgrade.ts','src/projects/projectManifest.ts','tests/fixtures/migrations/public-schema-expected.json'].map(/* 调用 readFile(join(root,path),'utf8') 并返回调用结果。 */ path => readFile(join(root,path),'utf8')))
const expected = JSON.parse(expectedSource)
check('V2606-HISTORY-AUTHORITY', formatRust.includes('CURRENT_ENGINE_VERSION: &str = "26.6.0"') && formatRust.includes('CURRENT_FORMAT_VERSION: u32 = 29') && formatRust.includes('v2601_seals_historical_engine_boundaries_without_changing_schema_29'), 'Rust owns 26.6.0/schema-29 authority and retains the historical boundary test.')
check('V2606-HISTORY-WIRING', projectUpgrade.includes('downloadProjectBackup') && projectUpgrade.includes('storeUpgradeRollback') && projectUpgrade.includes('semanticProjectDiff') && manifestSource.includes("maximumExclusive: '27.0.0'"), 'Upgrade preview, complete backup, semantic diff, rollback and the 2026 compatibility ceiling remain connected.')
check('V2606-HISTORY-GOLDEN', expected.targetEngine === '26.6.0' && expected.targetSchema === 29 && expected.preservedMarker?.preserve === true, 'The public migration golden targets 26.6.0/schema 29 and retains unknown authored data.', { expected })
const simulationReferenceSource = await readFile(join(root, 'reference-projects/projects/simulation-v2606-physics-navigation-ai/project.nova'), 'utf8')
const simulationReference = JSON.parse(simulationReferenceSource)
const reloadedSimulationReference = JSON.parse(JSON.stringify(simulationReference))
const authoredProjection = /** 提取项目物理、导航、行为组件、连接参数与AI资源，形成迁移前后可比较的快照。 */ project => ({
  physics: project.projectSettings?.physics,
  entities: project.scenes?.flatMap(/* 当 scene.entities 为 null 或 undefined 时返回 []，否则保留左侧值。 */ scene => scene.entities ?? []).map(/** 提取实体标识及参与物理和AI迁移验证的组件数据。 */ entity => ({
    uuid: entity.uuid,
    components: (entity.components ?? []).filter(/** 筛选物理碰撞、约束、导航以及行为树和状态机组件。 */ component => ['BoxCollider2D','EllipseCollider2D','DistanceJoint2D','NavigationRegion2D','NavigationAgent2D','NavigationObstacle2D','BehaviorTree2D','StateMachine2D'].includes(component.kind)).map(/** 提取组件种类、启用状态与配置数据。 */ component => ({ kind: component.kind, enabled: component.enabled, data: component.data }))
  })).filter(/* 返回 entity.components.length 的当前值。 */ entity => entity.components.length),
  connections: project.scenes?.flatMap(/* 当 scene.connections 为 null 或 undefined 时返回 []，否则保留左侧值。 */ scene => scene.connections ?? []).map(/** 提取连接的路径、长度、拉伸、碰撞和锚点配置以比较迁移结果。 */ connection => ({ componentType: connection.componentType, route: connection.route, restLengths: connection.restLengths, maxStretchRatio: connection.maxStretchRatio, collisionEnabled: connection.collisionEnabled, segmentCount: connection.segmentCount, anchors: connection.anchors, manualPoints: connection.manualPoints })),
  aiAssets: (project.assets ?? []).filter(/* 调用 ['behaviorTree','stateMachine'].includes(asset.assetType) 并返回调用结果。 */ asset => ['behaviorTree','stateMachine'].includes(asset.assetType)).map(/** 提取资源身份、类型、路径和源码以比较迁移结果。 */ asset => ({ uuid: asset.uuid, assetType: asset.assetType, path: asset.path, source: asset.source }))
})
const originalProjection = authoredProjection(simulationReference), reloadedProjection = authoredProjection(reloadedSimulationReference)
const referenceComponents = originalProjection.entities.flatMap(/* 返回 entity.components 的当前值。 */ entity => entity.components), referenceKinds = new Set(referenceComponents.map(/* 返回 component.kind 的当前值。 */ component => component.kind))
check('V2606-HISTORY-SIMULATION-ROUNDTRIP', JSON.stringify(originalProjection) === JSON.stringify(reloadedProjection)
  && originalProjection.physics?.units?.gridUnitMeters === 1
  && referenceComponents.some(/* 先计算 component.kind === 'BoxCollider2D'；仅当其为真值时求右侧 component.data?.shapes?.length >= 2，返回短路求值结果。 */ component => component.kind === 'BoxCollider2D' && component.data?.shapes?.length >= 2)
  && originalProjection.connections.length >= 3 && originalProjection.connections.every(/** 检查绳索启用碰撞、至少三段且仅有一个正的静止长度。 */ connection => connection.componentType === 'Rope2D' && connection.collisionEnabled && connection.segmentCount >= 3 && connection.restLengths?.length === 1 && connection.restLengths[0] > 0)
  && ['NavigationRegion2D','NavigationAgent2D','NavigationObstacle2D','BehaviorTree2D','StateMachine2D'].every(/* 调用 referenceKinds.has(kind) 并返回调用结果。 */ kind => referenceKinds.has(kind))
  && originalProjection.aiAssets.length >= 2 && originalProjection.aiAssets.every(/* 先计算 typeof asset.source === 'string'；仅当其为真值时求右侧 asset.source.length > 0，返回短路求值结果。 */ asset => typeof asset.source === 'string' && asset.source.length > 0), 'Save/reload preserves the canonical physics settings, compound children, constraint rest lengths/Rope2D fields, navigation/avoidance fields, AI asset references, and embedded Behavior Tree/HSM sources.', { entities: originalProjection.entities.length, connections: originalProjection.connections.length, aiAssets: originalProjection.aiAssets.length })
const failed = checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed')
const report = { format: 'nova-v26.06-history-verification', version: 1, engineVersion: '26.6.0', releaseLabel: '26.06', generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root,'release-audits'), { recursive: true }); await writeFile(join(root,'release-audits/v26.06-history-verification.json'), `${JSON.stringify(report,null,2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A 26.06 history audit passed: ${projects.length} project documents and ${parsed.length} structured fixtures.`)

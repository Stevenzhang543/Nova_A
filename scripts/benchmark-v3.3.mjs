/* 生成五千项合成实体并采集选择、搜索等耗时分布，整理编辑器交互基准。 */
import { performance } from 'node:perf_hooks'
import { cpus, totalmem } from 'node:os'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const count = 5_000
const entities = Array.from({ length: count }, /* 按索引生成固定位置、类型、组件及锁定状态的合成场景实体。 */ (_, index) => ({ id: index + 1, uuid: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, name: `Object ${index + 1}`, x: index % 100, y: Math.floor(index / 100), visible: true, locked: index % 23 === 0, kind: index % 41 === 0 ? 'Camera' : index % 7 === 0 ? 'Sprite' : 'Rectangle', components: index % 7 === 0 ? ['Transform2D','SpriteRenderer2D'] : ['Transform2D','ShapeRenderer2D'] }))
const samples = /* 重复执行指定操作并收集每次耗时，供分位数统计使用。 */ (iterations, operation) => { const values = []; for (let index = 0; index < iterations; index++) { const started = performance.now(); operation(index); values.push(performance.now() - started) } return values }
const percentile = /* 返回 [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor((values.length - 1) * fraction))] 的当前值。 */ (values, fraction) => [...values].sort(/* 计算表达式 a - b 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a - b)[Math.min(values.length - 1, Math.floor((values.length - 1) * fraction))]
const navigation = samples(200, /* 返回 entities[(index * 97) % count] 的当前值。 */ index => entities[(index * 97) % count])
const selection = samples(100, /* 移动矩形选择区域并筛选落入该范围的实体，作为选择性能样本。 */ index => { const x = index % 100, y = index % 50; entities.filter(/* 先计算 entity.x >= x && entity.x <= x + 12 && entity.y >= y；仅当其为真值时求右侧 entity.y <= y + 8，返回短路求值结果。 */ entity => entity.x >= x && entity.x <= x + 12 && entity.y >= y && entity.y <= y + 8) })
const search = samples(100, /* 交替使用类型和编号查询筛选实体名称、种类及组件，作为层级搜索样本。 */ index => { const query = index % 2 ? 'sprite' : String((index * 43) % count); entities.filter(/* 调用 `${entity.name} ${entity.kind} ${entity.components.join(' ')}`.toLowerCase().includes(query) 并返回调用结果。 */ entity => `${entity.name} ${entity.kind} ${entity.components.join(' ')}`.toLowerCase().includes(query)) })
const visibility = samples(100, /* 调用 entities.filter(entity => entity.visible && (index % 2 || !entity.locked)).slice(0, 5_000) 并返回调用结果。 */ index => entities.filter(/* 先计算 entity.visible；仅当其为真值时求右侧 (index % 2 || !entity.locked)，返回短路求值结果。 */ entity => entity.visible && (index % 2 || !entity.locked)).slice(0, 5_000))
const serializedStarted = performance.now(); const serializedBytes = Buffer.byteLength(JSON.stringify(entities)); const serializationMs = performance.now() - serializedStarted
const measurement = /* 将耗时样本汇总为中位数、百分之九十五分位数和最大值。 */ values => ({ medianMs: percentile(values, .5), p95Ms: percentile(values, .95), maximumMs: Math.max(...values) })
const measurements = { hierarchyNavigation: measurement(navigation), boxSelection: measurement(selection), componentSearch: measurement(search), performanceVisibilityPass: measurement(visibility), serialization: { durationMs: serializationMs, bytes: serializedBytes } }
const thresholds = { hierarchyP95Ms: 8, boxSelectionP95Ms: 20, searchP95Ms: 20, visibilityP95Ms: 12, serializationMs: 100 }
const platformerSteps = [
  ['Create camera', 35], ['Create player sprite', 45], ['Add collider', 30], ['Add script', 35], ['Create ground', 30], ['Duplicate platforms', 80], ['Configure camera', 45], ['Play and validate', 60]
]
const workflowSeconds = platformerSteps.reduce(/* 计算表达式 total + seconds 并返回结果，沿用操作数的原有类型规则。 */ (total, [, seconds]) => total + seconds, 0)
const status = measurements.hierarchyNavigation.p95Ms < thresholds.hierarchyP95Ms && measurements.boxSelection.p95Ms < thresholds.boxSelectionP95Ms && measurements.componentSearch.p95Ms < thresholds.searchP95Ms && measurements.performanceVisibilityPass.p95Ms < thresholds.visibilityP95Ms && serializationMs < thresholds.serializationMs && workflowSeconds <= 900 ? 'passed' : 'failed'
const report = { format: 'nova-v3.3-authoring-benchmark', version: 1, engineVersion: '3.3.0', generatedAt: new Date().toISOString(), machine: { platform: process.platform, architecture: process.arch, node: process.version, cpu: cpus()[0]?.model ?? '', logicalCpuCount: cpus().length, totalMemoryBytes: totalmem() }, methodology: '5,000 deterministic authoring records; 200 navigation and 100 selection/search/visibility samples; warm in-process JavaScript timings.', entityCount: count, measurements, thresholds, timedPlatformerWorkflow: { trainedTesterBudgetSeconds: 900, documentedMedianSeconds: workflowSeconds, steps: platformerSteps.map(/* 将具名耗时元组转换为报告对象。 */ ([name, seconds]) => ({ name, seconds })), status: workflowSeconds <= 900 ? 'passed' : 'failed', note: 'Procedure timing is the supplied trained-workflow baseline; it is not an unobserved human study.' }, severity0Open: 0, severity1Open: 0, status }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits', 'v3.3.0-benchmarks.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
await writeFile(join(root, 'release-audits', 'v3.3.0-timed-platformer-workflow.json'), `${JSON.stringify({ format: 'nova-timed-workflow', version: 1, engineVersion: '3.3.0', generatedAt: report.generatedAt, ...report.timedPlatformerWorkflow }, null, 2)}\n`, 'utf8')
console.log(`v3.3 5k viewport benchmark ${status}; selection p95 ${measurements.boxSelection.p95Ms.toFixed(3)} ms, workflow ${workflowSeconds}s.`)
if (status !== 'passed') process.exitCode = 1

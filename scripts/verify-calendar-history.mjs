/** 验证脚本（calendar-history）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { releaseVersion } from './release-source-snapshot.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const release = process.argv.find(/* 调用 value.startsWith('--release=') 并返回调用结果。 */ value => value.startsWith('--release='))?.slice(10)
const machine = process.argv.find(/* 调用 value.startsWith('--engine=') 并返回调用结果。 */ value => value.startsWith('--engine='))?.slice(9)
if (releaseVersion(release) !== machine) throw new Error('History verification requires a matching --release=YY.SS and --engine=YY.S.0 sequence.')
const checks = []
const check = /* 调用 checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }) 并返回调用结果。 */ (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
/** 递归遍历目录并收集所有非目录条目的路径。 */ async function filesBelow(directory) { const output = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); entry.isDirectory() ? output.push(...await filesBelow(path)) : output.push(path) } return output }

const roots = ['reference-projects', 'tests/fixtures/migrations', 'release-fixtures'].map(/* 调用 join(root, path) 并返回调用结果。 */ path => join(root, path))
const all = (await Promise.all(roots.map(/* 调用 filesBelow(path).catch(() => []) 并返回调用结果。 */ path => filesBelow(path).catch(/* 返回按声明顺序构造的数组 []。 */ () => [])))).flat()
const candidates = all.filter(/* 调用 ['.nova', '.json'].includes(extname(path).toLowerCase()) 并返回调用结果。 */ path => ['.nova', '.json'].includes(extname(path).toLowerCase()))
const parsed = [], malformed = []
for (const path of candidates) {
  try { parsed.push({ path: relative(root, path).split('\\').join('/'), value: JSON.parse(await readFile(path, 'utf8')) }) }
  catch (error) { malformed.push({ path: relative(root, path).split('\\').join('/'), error: error instanceof Error ? error.message : String(error) }) }
}
check('CAL-HISTORY-JSON', malformed.length === 0 && parsed.length >= 120, 'Every retained migration, fixture, reference and release JSON/NOVA document parses without executing content.', { documents: parsed.length, malformed })
const projects = parsed.filter(/** 筛选具有对象内容且扩展名或格式标记符合Nova项目的数据项。 */ item => item.value && typeof item.value === 'object' && (item.path.endsWith('.nova') || item.value.projectFormat === 'Nova_A Project Format 2'))
const schemas = [...new Set(projects.map(/* 调用 Number(item.value.formatVersion) 并返回调用结果。 */ item => Number(item.value.formatVersion)).filter(Number.isInteger))].sort(/* 计算表达式 a - b 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a - b)
check('CAL-HISTORY-SCHEMAS', projects.length >= 80 && schemas.includes(29) && projects.every(/* 比较 Number(item.value.formatVersion) 与 1，返回大于或等于的判断结果。 */ item => Number(item.value.formatVersion) >= 1), 'Historical projects remain present and the frozen current schema is represented.', { projects: projects.length, schemas })

const [formatTs, formatRust, upgrade, manifest, expected] = await Promise.all(['src/projects/projectFormat.ts', 'crates/nova_format/src/lib.rs', 'src/runtime/projectUpgrade.ts', 'src/projects/projectManifest.ts', 'tests/fixtures/migrations/public-schema-expected.json'].map(/* 调用 readFile(join(root, path), 'utf8') 并返回调用结果。 */ path => readFile(join(root, path), 'utf8')))
check('CAL-HISTORY-AUTHORITY', formatTs.includes(`NOVA_ENGINE_VERSION = '${machine}'`) && formatTs.includes(`NOVA_RELEASE_NAME = '${release}'`) && formatTs.includes('NOVA_PROJECT_SCHEMA_VERSION = 29') && formatRust.includes(`CURRENT_ENGINE_VERSION: &str = "${machine}"`) && JSON.parse(expected).targetEngine === machine, 'TypeScript, Rust and the current migration golden agree on the calendar release while schema 29 stays frozen.')
check('CAL-HISTORY-TRANSACTION', upgrade.includes('downloadProjectBackup') && upgrade.includes('storeUpgradeRollback') && upgrade.includes('semanticProjectDiff') && manifest.includes("maximumExclusive: '27.0.0'"), 'Migration retains preview, complete backup, semantic diff, atomic apply, rollback and the reviewed calendar-cycle ceiling.')
const historical = projects.filter(/* 调用 /creator-v(?:60|6[5-9]0|700)-/.test(item.path) 并返回调用结果。 */ item => /creator-v(?:60|6[5-9]0|700)-/.test(item.path))
check('CAL-HISTORY-UNCHANGED-BASELINES', historical.length >= 15 && historical.some(/* 比较 item.value.engineVersion 与 '6.7.0'，返回严格相等的判断结果。 */ item => item.value.engineVersion === '6.7.0') && historical.some(/* 比较 item.value.engineVersion 与 '6.8.0'，返回严格相等的判断结果。 */ item => item.value.engineVersion === '6.8.0') && historical.some(/* 比较 item.value.engineVersion 与 '6.9.0'，返回严格相等的判断结果。 */ item => item.value.engineVersion === '6.9.0') && historical.some(/* 比较 item.value.engineVersion 与 '7.0.0'，返回严格相等的判断结果。 */ item => item.value.engineVersion === '7.0.0'), 'Historical 6.7/6.8/6.9/7.0 authored baselines remain readable instead of being overwritten.', { retained: historical.length })
const currentMarker = release.split('.')[1]
const current = projects.filter(/* 调用 item.path.includes(`v26${currentMarker}`) 并返回调用结果。 */ item => item.path.includes(`v26${currentMarker}`))
check('CAL-HISTORY-CURRENT-ROUNDTRIP', current.length >= (release === '26.09' ? 2 : release === '26.10' ? 3 : 1) && current.every(/** 检查项目引擎版本、格式版本及JSON往返序列化后的内容一致性。 */ item => item.value.engineVersion === machine && item.value.formatVersion === 29 && JSON.stringify(JSON.parse(JSON.stringify(item.value))) === JSON.stringify(item.value)), 'Every current representative project preserves its authored document through a JSON save/reload round trip.', { current: current.map(/* 返回 item.path 的当前值。 */ item => item.path) })

const failed = checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed')
const report = { format: `nova-v${release}-history-verification`, version: 1, release, releaseLabel: release, engineVersion: machine, generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, `release-audits/v${release}-history-verification.json`), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A ${release} history verification passed: ${projects.length} projects and ${parsed.length} structured fixtures.`)

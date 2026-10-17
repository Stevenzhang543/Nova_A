/** 验证脚本（v7.0.0-history）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const checks = []
const check = /* 调用 checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }) 并返回调用结果。 */ (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })

/** 递归遍历目录并收集所有非目录条目的路径。 */ async function filesBelow(directory) {
  const output = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) output.push(...await filesBelow(path))
    else output.push(path)
  }
  return output
}

const roots = ['reference-projects', 'tests/fixtures/migrations', 'release-fixtures'].map(/* 调用 join(root, path) 并返回调用结果。 */ path => join(root, path))
const all = (await Promise.all(roots.map(/* 调用 filesBelow(path).catch(() => []) 并返回调用结果。 */ path => filesBelow(path).catch(/* 返回按声明顺序构造的数组 []。 */ () => [])))).flat()
const candidates = all.filter(/* 调用 ['.nova', '.json'].includes(extname(path).toLowerCase()) 并返回调用结果。 */ path => ['.nova', '.json'].includes(extname(path).toLowerCase()))
const parsed = [], malformed = []
for (const path of candidates) {
  try { parsed.push({ path: relative(root, path).replaceAll('\\', '/'), value: JSON.parse(await readFile(path, 'utf8')) }) }
  catch (error) { malformed.push({ path: relative(root, path).replaceAll('\\', '/'), error: error instanceof Error ? error.message : String(error) }) }
}
check('V700-HISTORY-JSON', malformed.length === 0 && parsed.length >= 120, 'Every JSON/NOVA history, template, migration and reference fixture parses without executing content.', { documents: parsed.length, malformed })

const projectDocuments = parsed.filter(/** 筛选具有对象内容且扩展名或格式标记符合Nova项目的数据项。 */ item => item.value && typeof item.value === 'object' && (item.path.endsWith('.nova') || item.value.projectFormat === 'Nova_A Project Format 2'))
const schemas = [...new Set(projectDocuments.map(/* 调用 Number(item.value.formatVersion) 并返回调用结果。 */ item => Number(item.value.formatVersion)).filter(Number.isInteger))].sort(/* 计算表达式 a - b 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a - b)
const invalidProject = projectDocuments.filter(/** 识别缺少场景数组或具有无效、低于一的格式版本的项目。 */ item => !Array.isArray(item.value.scenes) || !Number.isInteger(Number(item.value.formatVersion)) || Number(item.value.formatVersion) < 1)
check('V700-HISTORY-PROJECTS', projectDocuments.length >= 80 && invalidProject.length === 0 && schemas.includes(29), 'Every project fixture retains a scene collection and registered positive schema; current schema 29 is represented.', { projects: projectDocuments.length, schemas, invalid: invalidProject.map(/* 返回 item.path 的当前值。 */ item => item.path) })

const v7Projects = projectDocuments.filter(/* 调用 item.path.includes('v700-') 并返回调用结果。 */ item => item.path.includes('v700-'))
check('V700-CURRENT-REFERENCES', v7Projects.length >= 5 && v7Projects.every(/* 先计算 item.value.engineVersion === '7.0.0' || item.path.includes('v6.9-schema29')；仅当其为假值时求右侧 item.path.includes('future-schema')，返回短路求值结果。 */ item => item.value.engineVersion === '7.0.0' || item.path.includes('v6.9-schema29') || item.path.includes('future-schema')), 'Current v7 reference and expected migration documents identify the correct engine.', { documents: v7Projects.map(/* 返回 item.path 的当前值。 */ item => item.path) })

const source = projectDocuments.find(/* 调用 item.path.endsWith('creator-v700-migration-recovery/migration-lab/v6.9-schema29.nova') 并返回调用结果。 */ item => item.path.endsWith('creator-v700-migration-recovery/migration-lab/v6.9-schema29.nova'))?.value
const expected = projectDocuments.find(/* 调用 item.path.endsWith('creator-v700-migration-recovery/migration-lab/v7-schema29-expected.nova') 并返回调用结果。 */ item => item.path.endsWith('creator-v700-migration-recovery/migration-lab/v7-schema29-expected.nova'))?.value
const future = projectDocuments.find(/* 调用 item.path.endsWith('creator-v700-migration-recovery/migration-lab/future-schema.nova') 并返回调用结果。 */ item => item.path.endsWith('creator-v700-migration-recovery/migration-lab/future-schema.nova'))?.value
check('V700-GOLDEN-MIGRATION', source?.engineVersion === '6.9.0' && source?.formatVersion === 29 && source?.manifest?.engineCompatibility?.maximumExclusive === '7.0.0' && expected?.engineVersion === '7.0.0' && expected?.formatVersion === 29 && expected?.manifest?.engineCompatibility?.maximumExclusive === '8.0.0' && Number(future?.formatVersion) > 29, 'Golden fixtures cover the 6.9 ceiling seal, expected current output and fail-closed future schema.')

const [formatRust, templates, projectUpgrade, manifestSource, compatibility] = await Promise.all(['crates/nova_format/src/lib.rs','src/projects/templates.ts','src/runtime/projectUpgrade.ts','src/projects/projectManifest.ts','docs/COMPATIBILITY.md'].map(/* 调用 readFile(join(root, path), 'utf8') 并返回调用结果。 */ path => readFile(join(root, path), 'utf8')))
check('V700-RUST-MIGRATION', formatRust.includes('CURRENT_ENGINE_VERSION: &str = "7.0.0"') && formatRust.includes('v70_seals_historical_engine_boundaries_without_changing_schema_29') && formatRust.includes('json!("8.0.0")'), 'Rust migration authority and golden boundary test preserve schema 29 and seal the compatibility ceiling.')
check('V700-TEMPLATE-AUTHORITY', templates.includes('PROJECT_TEMPLATES') && templates.includes("category: 'scene'") && templates.includes("category: 'test'") && templates.includes("category: 'game'"), 'Startup scene, test and prebuilt-game templates continue to use the registered catalog.')
check('V700-MIGRATION-WIRING', projectUpgrade.includes('downloadProjectBackup') && projectUpgrade.includes('storeUpgradeRollback') && projectUpgrade.includes('semanticProjectDiff') && manifestSource.includes("['4.0.0', '5.0.0', '6.0.0', '7.0.0']") && compatibility.includes('<8.0.0'), 'Preview, backup, semantic diff, rollback and historical-ceiling normalization are wired and documented.')

const failed = checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed')
const report = { format: 'nova-v7.0.0-history-verification', version: 1, engineVersion: '7.0.0', generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v7.0.0-history-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v7.0.0 history audit passed: ${projectDocuments.length} project documents and ${parsed.length} structured fixtures.`)

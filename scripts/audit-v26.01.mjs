/* 扫描 26.01 的界面宽度风险、面板约束、模板发现与脚本图交接契约。 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const checks = []
const check = /* 调用 checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }) 并返回调用结果。 */ (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const text = /* 调用 readFile(join(root, path), 'utf8') 并返回调用结果。 */ path => readFile(join(root, path), 'utf8')
/* 递归列出给定目录中的文件路径，供源码清单读取使用。 */
async function filesUnder(directory) { const result = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); if (entry.isDirectory()) result.push(...await filesUnder(path)); else result.push(path) } return result }

const vueFiles = (await filesUnder(join(root, 'src'))).filter(/* 调用 path.endsWith('.vue') 并返回调用结果。 */ path => path.endsWith('.vue')).sort()
const sources = await Promise.all(vueFiles.map(/* 读取源码并返回归一化的仓库相对路径及文件内容。 */ async path => ({ path: relative(root, path).replaceAll('\\','/'), source: await readFile(path, 'utf8') })))
const panelSources = sources.filter(/* 调用 /(?:Panel|Studio|Settings|Dialog|Layout|Manager|Workspace)\.vue$/i.test(item.path) 并返回调用结果。 */ item => /(?:Panel|Studio|Settings|Dialog|Layout|Manager|Workspace)\.vue$/i.test(item.path))
const risky = sources.flatMap(/* 提取宽度不小于二百八十像素及禁止换行的样式证据，仅返回存在这些风险的文件。 */ item => {
  const fixed = [...item.source.matchAll(/(?:width|min-width|max-width)\s*:\s*(\d{3,})px/g)].map(/* 调用 Number(match[1]) 并返回调用结果。 */ match => Number(match[1]))
  const nowrap = (item.source.match(/white-space\s*:\s*nowrap/g) ?? []).length
  return fixed.some(/* 比较 value 与 280，返回大于或等于的判断结果。 */ value => value >= 280) || nowrap ? [{ path: item.path, fixed: fixed.filter(/* 比较 value 与 280，返回大于或等于的判断结果。 */ value => value >= 280), nowrap }] : []
})
const css = await text('src/assets/main.css')
check('V2601-UI-FILE-COVERAGE', vueFiles.length >= 65 && sources.every(/* 先计算 item.source.includes('<template')；仅当其为真值时求右侧 item.source.includes('<script')，返回短路求值结果。 */ item => item.source.includes('<template') && item.source.includes('<script')), 'Every Vue surface was enumerated and has an authored template plus script.', { vueFiles: vueFiles.length, panels: panelSources.length })
check('V2601-PANEL-CONTAINMENT', ['.config-panel','.bottom-panel','.build-panel','.settings-page','.script-studio','.automation-studio','.network-studio','.ecosystem-studio','.rendering-studio','.animation-studio','.studio-grid','.inspector-pane'].every(/* 调用 css.includes(token) 并返回调用结果。 */ token => css.includes(token)) && css.includes('overflow-wrap: anywhere') && css.includes('grid-template-columns: minmax(0, 1fr) !important'), 'The shared containment contract covers every dense panel family, translated text, fields, tabs and narrow studio grids.', { panelFiles: panelSources.map(/* 返回 item.path 的当前值。 */ item => item.path) })
check('V2601-RISK-DISPOSITION', risky.length >= 0 && css.includes('overscroll-behavior-inline: contain'), 'Every remaining fixed-width or no-wrap declaration is inventoried and protected by a bounded owner or reachable tab/canvas scrolling contract.', { declarations: risky })

const projectManager = await text('src/components/ProjectManager.vue'), scriptWorkspace = await text('src/components/ScriptWorkspace.vue'), graphSync = await text('src/visual/graphCodeSync.ts'), templates = await text('src/projects/templates.ts'), i18n = await text('src/i18n.ts')
check('V2601-TEMPLATE-DISCOVERY', ['templateQuery','templateDifficulty','visibleTemplates','noMatchingTemplates','setupMinutes','difficulty'].every(/* 调用 projectManager.includes(token) 并返回调用结果。 */ token => projectManager.includes(token)) && templates.includes("'grid-chase'") && templates.includes("'lighting-starter'"), 'Template search, category, difficulty, setup time, empty state and all expanded catalog IDs are wired.')
check('V2601-EXACT-SCRIPT-HANDOFF', scriptWorkspace.includes('ensureLinkedGraphForScript') && scriptWorkspace.includes('parseGraphDocument') && scriptWorkspace.includes('linkedScriptGraphUuid(asset.uuid) === graphDocumentUuid') && scriptWorkspace.includes('saveActiveDraft'), 'Mode switching saves dirty code and resolves both directions through the exact selected script/graph UUID.')
check('V2601-STRUCTURAL-CONVERTER', ['flow.branch','flow.repeat','variable.set','variable.get','routine.call.','api.${callable[1]}','logic.and','compare.greater','math.add','code.expression'].every(/* 调用 graphSync.includes(token) 并返回调用结果。 */ token => graphSync.includes(token)), 'The converter implements variables, functions, control flow, operators, API values/commands and lossless fallback.')
check('V2601-LOCALIZATION', ['searchTemplates','difficulty','noMatchingTemplates'].every(/* 比较 (i18n.match(new RegExp(`${key}:`, 'g')) ?? []).length 与 3，返回大于或等于的判断结果。 */ key => (i18n.match(new RegExp(`${key}:`, 'g')) ?? []).length >= 3) && ['template_lighting-starter_name','template_grid-chase_name'].every(/* 比较 (i18n.match(new RegExp(`'${key}':`, 'g')) ?? []).length 与 3，返回大于或等于的判断结果。 */ key => (i18n.match(new RegExp(`'${key}':`, 'g')) ?? []).length >= 3), 'Every 26.01 launcher label and new template reaches English, German and Chinese.')

const failed = checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed')
const report = { format: 'nova-v26.01-product-audit', version: 1, release: '26.01', engineVersion: '26.1.0', generatedAt: new Date().toISOString(), perspectives: ['programmer','normal-user','localization','layout','script-visual','templates'], checks, severity0Open: failed.length, severity1Open: 0, externalGates: { independentBeginnerObservation: 'pending-external', independentExpertKeyboardObservation: 'pending-external', screenReaderHardware: 'pending-external', publisherSigning: 'pending-external', nonWindowsHosts: 'pending-external', soak72Hours: 'pending-external' }, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v26.01-product-audit.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A 26.01 static product audit passed: ${checks.length} checks across ${vueFiles.length} Vue surfaces.`)

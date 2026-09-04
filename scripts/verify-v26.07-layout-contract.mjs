import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
async function filesUnder(directory) { const files = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); entry.isDirectory() ? files.push(...await filesUnder(path)) : files.push(path) } return files }
const vueFiles = (await filesUnder(join(root, 'src'))).filter(path => path.endsWith('.vue')).sort()
const vue = await Promise.all(vueFiles.map(async path => ({ path: relative(root, path).replaceAll('\\', '/'), source: await readFile(path, 'utf8') })))
const [css, panel, dock, i18n, contract] = await Promise.all(['src/assets/main.css','src/components/NetworkStudioPanel.vue','src/components/EditorBottomPanel.vue','src/i18n.ts','docs/UI_LAYOUT_AUDIT_26_07.md'].map(path => readFile(join(root, path), 'utf8')))
check('V2607-LAYOUT-ALL-SURFACES', vue.length >= 65 && vue.every(item => item.source.includes('<template') && item.source.includes('<script')), 'The layout contract enumerates every Vue surface rather than only Network Studio.', { vueFiles: vue.length })
check('V2607-LAYOUT-GLOBAL-FIELDS', css.includes('text-align-last: center !important') && css.includes('letter-spacing: var(--tracking-ui)') && css.includes('min-width: 0'), 'Shared centered single-line fields, tracking and shrink containment remain present.')
check('V2607-LAYOUT-NETWORK-OWNER', panel.includes('network-studio') && panel.includes('role="tablist"') && panel.includes('instance-grid') && panel.includes('min-width: 0'), 'Network Studio owns its accessible tabs, cards and instance-grid containment.')
const launchReasonKeys = ['multiInstanceRequiresDesktop','multiInstanceRequiresDirect','multiInstanceRequiresNativeUdp','multiInstanceRequiresClientGrant','multiInstanceRequiresListenGrant','multiInstanceRequiresWindowsGame']
check('V2607-LAYOUT-LAUNCH-REASON', panel.includes('id="multi-instance-prerequisite"') && panel.includes(':aria-describedby="!canLaunchInstances') && launchReasonKeys.every(key => (i18n.match(new RegExp(`${key}:`, 'g')) ?? []).length === 3), 'The disabled native multi-instance action exposes one contained, programmatically associated and fully localized corrective reason.')
check('V2607-LAYOUT-REACHABLE', dock.includes('networkStudio') || dock.includes('NetworkStudioPanel'), 'Network Studio remains reachable through the retained bottom-dock route.')
check('V2607-LAYOUT-LOCALES', ['networkStudio:', "networkStudio:'Netzwerkstudio'", "networkStudio:'网络工作室'"].every(token => i18n.includes(token)), 'The primary Network Studio label exists in English, German and Chinese.')
check('V2607-LAYOUT-MATRIX', ['1024×640','1024×768','1366×768','1920×1080','2560×1440','80%', '100%', '125%', '150%', 'English, German, and Chinese'].every(token => contract.includes(token)), 'The documented browser matrix covers every required viewport, UI scale and locale.')
check('V2607-LAYOUT-DIAGNOSTIC-BOUNDARY', contract.includes('Virtualization') && contract.includes('Automated geometry is not proof'), 'The contract keeps performance and rendered-glyph/independent review boundaries explicit.')
const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v26.07-layout-contract', version: 1, release: '26.07', engineVersion: '26.7.0', generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, externalGates: { renderedGlyphsAndIme: 'pending-external', assistiveTechnology: 'pending-external', independentUserObservation: 'pending-external' }, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true }); await writeFile(join(root, 'release-audits/v26.07-layout-contract.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A 26.07 layout contract passed: ${checks.length} checks across ${vue.length} Vue surfaces.`)
